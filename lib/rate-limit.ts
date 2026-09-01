// STEP 7 — Rate limiting sederhana (in-memory, cukup untuk MVP single-instance).
// Untuk production multi-instance, ganti dengan Upstash Redis / rate limiter terdistribusi.

type Bucket = { count: number; windowStart: number };

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Pembuat limiter berbasis jendela tetap. Kuncinya bebas: userId, IP, dsb. */
export function createLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((bucket.windowStart + windowMs - now) / 1000),
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { check, reset: () => buckets.clear() };
}

/** Chat: maksimal 20 request per menit per user. */
const chatLimiter = createLimiter(20, 60_000);

export function checkRateLimit(userId: string): RateLimitResult {
  return chatLimiter.check(userId);
}

/**
 * Pendaftaran: maksimal 5 akun per jam per IP. Tanpa ini satu orang bisa
 * membuat akun tanpa batas — misalnya untuk memanen bonus kredit atau
 * membebani database.
 */
const registerLimiter = createLimiter(5, 60 * 60_000);

export function checkRegisterRateLimit(ip: string): RateLimitResult {
  return registerLimiter.check(ip);
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
  chatLimiter.reset();
  registerLimiter.reset();
  inFlight.clear();
}
