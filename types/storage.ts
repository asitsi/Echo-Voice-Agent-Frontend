import type { AuthUser } from "@/types/auth";

export interface StoredSession {
  token: string;
  user: AuthUser;
}
