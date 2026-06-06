export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthenticatedUser | null;
}
