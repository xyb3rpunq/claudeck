// STEP 7 — Rate limiting sederhana (in-memory, cukup untuk MVP single-instance).
// Untuk production multi-instance, ganti dengan Upstash Redis / rate limiter terdistribusi.

const WINDOW_MS = 60_000; // 1 menit
const MAX_REQUESTS = 20; // maksimal 20 request per menit per user

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Satu request chat per user pada satu waktu. Tanpa ini, user bersaldo tipis
// bisa menembakkan banyak request paralel yang semuanya lolos pengecekan saldo
// (cek-lalu-potong bukan operasi atomik) dan membuat saldo jebol jauh ke minus.
const inFlight = new Set<string>();

export function acquireChatSlot(userId: string): boolean {
  if (inFlight.has(userId)) return false;
  inFlight.add(userId);
  return true;
}

export function releaseChatSlot(userId: string): void {
  inFlight.delete(userId);
}

/** Hanya untuk test — mengosongkan seluruh state in-memory. */
export function __resetRateLimitState(): void {
  buckets.clear();
  inFlight.clear();
}
