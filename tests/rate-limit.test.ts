import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetRateLimitState,
  acquireChatSlot,
  checkRateLimit,
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
