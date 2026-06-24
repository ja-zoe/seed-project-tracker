import type { Permission } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

/**
 * Module augmentation: add our custom fields to the Auth.js session + JWT so
 * they're strongly typed everywhere (`session.user.permissions`, etc.).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      status: "PENDING" | "ACTIVE" | "SUSPENDED";
      roleName: string | null;
      permissions: Permission[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    status?: "PENDING" | "ACTIVE" | "SUSPENDED";
    roleName?: string | null;
    permissions?: Permission[];
  }
}
