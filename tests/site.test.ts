import { afterEach, describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site";

const original = process.env.NEXTAUTH_URL;

afterEach(() => {
  if (original === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = original;
});

describe("siteUrl", () => {
  it("memakai NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://claudeck.com";
    expect(siteUrl()).toBe("https://claudeck.com");
  });

  it("membuang garis miring di ujung supaya URL sitemap tidak dobel", () => {
    process.env.NEXTAUTH_URL = "https://claudeck.com/";
    expect(siteUrl()).toBe("https://claudeck.com");
    expect(`${siteUrl()}/sitemap.xml`).toBe("https://claudeck.com/sitemap.xml");
  });

  it("jatuh ke localhost saat belum di-set", () => {
    delete process.env.NEXTAUTH_URL;
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});
