import type { DefaultSession } from "next-auth";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface User {
    avatar?: string;
    role?: Role;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: {
      id: string;
      avatar?: string;
      role?: Role;
    } & DefaultSession["user"];
    accessToken?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    avatar?: string;
    role?: Role;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
