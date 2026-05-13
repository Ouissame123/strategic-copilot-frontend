import { useMutation } from "@tanstack/react-query";
import { helperApi } from "@/api/helper.api";
import type { HelperChatRequest, ValidationsRequest } from "@/types/api.types";

export const useHelperChat = () =>
    useMutation({
        mutationFn: (body: HelperChatRequest) => helperApi.chat(body).then((response) => response.data),
    });

export const useHelperValidations = () =>
    useMutation({
        mutationFn: (body?: ValidationsRequest) =>
            helperApi.validations(body).then((response) => response.data),
    });
