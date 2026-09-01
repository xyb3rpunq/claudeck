/**
 * URL publik aplikasi, dipakai untuk sitemap dan robots.txt.
 *
 * NEXTAUTH_URL sudah wajib di-set saat deploy, jadi dipakai ulang di sini
 * daripada menambah satu variabel environment lagi yang bisa lupa diisi.
 */
export function siteUrl(): string {
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, ""); // buang garis miring di ujung
}
