export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token?: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
}

export interface MessageResponse {
  message: string;
}

export interface AuthResponse {
  user: UserResponse;
  access_token: string;
}

export interface Claims {
  sub: string;
  exp: number;
}
