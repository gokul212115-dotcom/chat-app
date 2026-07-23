export interface User {
  id: number;
  phoneNumber: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
