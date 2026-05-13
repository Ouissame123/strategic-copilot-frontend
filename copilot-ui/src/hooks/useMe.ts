import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router";
import { authStorage } from "@/lib/auth-storage";
import { imageFileToPngBlob, uploadUserAvatarPng } from "@/lib/supabase-avatar-upload";
import { authMeApi } from "@/services/auth.api";
import type { MeResponse } from "@/services/auth.api";
import { useAuth } from "@/providers/auth-provider";

export const useMe = () =>
    useQuery<MeResponse | null>({
        queryKey: ["me"],
        queryFn: async () => {
            try {
                return (await authMeApi.get()).data;
            } catch (e) {
                if (isAxiosError(e) && e.response?.status === 401) return null;
                throw e;
            }
        },
        staleTime: 60_000,
        retry: (failureCount, error) => {
            if (isAxiosError(error) && error.response?.status === 401) return false;
            return failureCount < 1;
        },
    });

export const useUpdateProfile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: { full_name?: string; email?: string; avatar_url?: string }) => authMeApi.updateProfile(body),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["me"] });
        },
    });
};

export const useUploadAvatar = () => {
    const qc = useQueryClient();
    const { syncSession } = useAuth();
    return useMutation({
        mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
            const png = await imageFileToPngBlob(file);
            const publicBase = await uploadUserAvatarPng(userId, png);
            const finalUrl = `${publicBase}?t=${Date.now()}`;
            const { data } = await authMeApi.updateProfile({ avatar_url: finalUrl });
            return { data, finalUrl };
        },
        onSuccess: async ({ data, finalUrl }) => {
            qc.setQueryData<MeResponse | null>(["me"], (prev) => {
                if (!prev?.user) return prev;
                const nextAvatar = data?.user?.avatar_url ?? finalUrl;
                const mergedUser = data?.user ? { ...prev.user, ...data.user, avatar_url: nextAvatar } : { ...prev.user, avatar_url: nextAvatar };
                return { ...prev, user: mergedUser };
            });
            await qc.invalidateQueries({ queryKey: ["me"] });
            await syncSession();
        },
    });
};

export const useChangePassword = () => {
    const navigate = useNavigate();
    return useMutation({
        mutationFn: (body: { current_password: string; new_password: string }) => authMeApi.changePassword(body).then((r) => r.data),
        onSuccess: (data) => {
            if (data.security?.requires_relogin) {
                authStorage.clear();
                setTimeout(() => navigate("/login"), 1500);
            }
        },
    });
};
