import { SignJWT, jwtVerify } from "jose";
import type { AuthUser } from "@/lib/types";

export const SESSION_COOKIE = "na_admin_session";
const ALG = "HS256";

function secret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  user: AuthUser;
  /** Raw backend access token, when present (real backend). */
  accessToken?: string;
}

export async function createSessionToken(
  payload: SessionPayload,
  maxAgeSeconds = 60 * 60 * 8,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret());
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    const p = payload as unknown as SessionPayload;
    if (!p.user || !p.user.role) return null;
    return p;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = 60 * 60 * 8;
