const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const failures = new Map<string, { count: number; resetAt: number }>();

export function isLoginBlocked(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(ip: string) {
  const entry = failures.get(ip);
  if (entry && entry.resetAt >= Date.now()) entry.count += 1;
  else failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}
