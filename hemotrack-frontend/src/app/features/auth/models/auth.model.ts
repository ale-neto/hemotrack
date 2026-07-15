export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}
