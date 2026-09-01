import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetRateLimitState,
  acquireChatSlot,
  checkRateLimit,
  checkRegisterRateLimit,
  createLimiter,
  releaseChatSlot,
} from "@/lib/rate-limit";

afterEach(() => {
  __resetRateLimitState();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("mengizinkan 20 request pertama dalam satu menit", () => {
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit("user-a").allowed).toBe(true);
    }
  });

  it("menolak request ke-21 dan memberi Retry-After", () => {
    for (let i = 0; i < 20; i++) checkRateLimit("user-b");
    const result = checkRateLimit("user-b");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("menghitung kuota terpisah per user", () => {
    for (let i = 0; i < 20; i++) checkRateLimit("user-c");
    expect(checkRateLimit("user-c").allowed).toBe(false);
    expect(checkRateLimit("user-d").allowed).toBe(true);
  });

  it("memulihkan kuota setelah jendela satu menit lewat", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 20; i++) checkRateLimit("user-e");
    expect(checkRateLimit("user-e").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit("user-e").allowed).toBe(true);
  });
});

describe("slot chat (anti request paralel)", () => {
  it("hanya mengizinkan satu request berjalan per user", () => {
    expect(acquireChatSlot("user-f")).toBe(true);
    expect(acquireChatSlot("user-f")).toBe(false);
    expect(acquireChatSlot("user-f")).toBe(false);
  });

  it("mengizinkan request berikutnya setelah slot dilepas", () => {
    acquireChatSlot("user-g");
    releaseChatSlot("user-g");
    expect(acquireChatSlot("user-g")).toBe(true);
  });

  it("tidak saling mengunci antar user", () => {
    expect(acquireChatSlot("user-h")).toBe(true);
    expect(acquireChatSlot("user-i")).toBe(true);
  });

  it("aman dipanggil release berulang kali", () => {
    acquireChatSlot("user-j");
    releaseChatSlot("user-j");
    releaseChatSlot("user-j");
    expect(acquireChatSlot("user-j")).toBe(true);
  });
});

describe("checkRegisterRateLimit", () => {
  it("mengizinkan 5 pendaftaran per IP lalu menolak", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRegisterRateLimit("203.0.113.7").allowed).toBe(true);
    }
    expect(checkRegisterRateLimit("203.0.113.7").allowed).toBe(false);
  });

  it("menghitung terpisah per IP", () => {
    for (let i = 0; i < 5; i++) checkRegisterRateLimit("198.51.100.1");
    expect(checkRegisterRateLimit("198.51.100.1").allowed).toBe(false);
    expect(checkRegisterRateLimit("198.51.100.2").allowed).toBe(true);
  });

  it("memakai jendela satu jam, bukan satu menit", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) checkRegisterRateLimit("192.0.2.9");
    expect(checkRegisterRateLimit("192.0.2.9").allowed).toBe(false);

    vi.advanceTimersByTime(60 * 60_000 - 1000); // 59 menit lewat
    expect(checkRegisterRateLimit("192.0.2.9").allowed).toBe(false);

    vi.advanceTimersByTime(2000); // lewat satu jam
    expect(checkRegisterRateLimit("192.0.2.9").allowed).toBe(true);
  });
});

describe("createLimiter", () => {
  it("menghormati batas dan jendela yang diberikan", () => {
    const limiter = createLimiter(2, 1000);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(false);
  });

  it("bisa dikosongkan lewat reset", () => {
    const limiter = createLimiter(1, 60_000);
    limiter.check("k");
    expect(limiter.check("k").allowed).toBe(false);
    limiter.reset();
    expect(limiter.check("k").allowed).toBe(true);
  });
});
