import { AppUser } from "#/types";

export type JwtUser = {
  id: number;
};

export type AuthResponse = {
  token: string;
  user: AppUser;
};
