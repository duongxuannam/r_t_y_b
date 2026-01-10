export type RegisterRequest = {
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type UserResponse = {
  id: string
  email: string
}

export type AuthResponse = {
  user: UserResponse
  access_token: string
}

export type ForgotPasswordRequest = {
  email: string
}

export type ResetPasswordRequest = {
  token: string
  password: string
}

export type MessageResponse = {
  message: string
}
