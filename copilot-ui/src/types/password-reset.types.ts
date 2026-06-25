export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    success: boolean;
    message: string;
    error?: string;
    demo?: {
        reset_url: string;
        expires_in_minutes: number;
        note: string;
    };
}

export interface ResetPasswordRequest {
    token: string;
    new_password: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message: string;
    error?: string;
}
