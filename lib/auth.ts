import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "laige_admin";
const SESSION_SECONDS = 12 * 60 * 60;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function signature(expires: string, password: string): Buffer {
  return createHmac("sha256", `laige-admin-session:${password}`).update(expires).digest();
}

export function isPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function isCorrectPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(sha256(candidate), sha256(password));
}

export async function startSession() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const token = `${expires}.${signature(expires, password).toString("hex")}`;
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!password || !token) return false;

  const [expires, signed] = token.split(".");
  if (!expires || !signed || Number(expires) * 1000 < Date.now()) return false;

  const expected = signature(expires, password);
  const received = Buffer.from(signed, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Every admin page and action calls this; a layout alone does not protect them. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
