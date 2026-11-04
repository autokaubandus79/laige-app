"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, isCorrectPassword, isPasswordConfigured, requireAdmin, startSession } from "@/lib/auth";
import { DB_ERROR_MESSAGE } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { STATUSES, type Status } from "@/lib/logic";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "@/lib/login-limit";

export type LoginState = { error: string | null };

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  if (!isPasswordConfigured()) {
    return { error: "Sisselogimine ei ole seadistatud: Railway keskkonnamuutuja ADMIN_PASSWORD puudub." };
  }

  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  if (isLoginBlocked(ip)) return { error: "Liiga palju katseid. Proovi 15 minuti pärast uuesti." };

  const password = formData.get("password");
  if (typeof password !== "string" || !isCorrectPassword(password)) {
    recordLoginFailure(ip);
    return { error: "Vale parool." };
  }

  clearLoginFailures(ip);
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateRequest(id: number, status: Status, internalNote: string): Promise<ActionResult> {
  await requireAdmin();
  if (!STATUSES.includes(status)) return { ok: false, error: "Tundmatu staatus." };
  if (internalNote.length > 2000) return { ok: false, error: "Märkus on liiga pikk." };

  try {
    await prisma.cleaningRequest.update({
      where: { id },
      data: { status, internalNote: internalNote.trim() || null },
    });
  } catch (error) {
    console.error("Updating a request failed", error);
    return { ok: false, error: DB_ERROR_MESSAGE };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteSampleRequests(): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.cleaningRequest.deleteMany({ where: { isSample: true } });
  } catch (error) {
    console.error("Deleting sample requests failed", error);
    return { ok: false, error: DB_ERROR_MESSAGE };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
