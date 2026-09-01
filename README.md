# Claudeck

SaaS chat berbasis **Claude API resmi Anthropic** dengan sistem kredit pay-as-you-go
dan pembayaran Rupiah via **Midtrans**. Ini **bukan** account-sharing — semua request
diproses server-side memakai API key resmi milik Claudeck.

## Stack

- **Next.js 14** (App Router) + TypeScript + TailwindCSS
- **Prisma** (SQLite untuk dev, PostgreSQL/Supabase/Neon untuk production)
- **NextAuth** (Credentials provider, session JWT, bcrypt)
- **@anthropic-ai/sdk** — proxy streaming ke Claude, model bisa dipilih user
- **Midtrans Snap** — top-up saldo (paket 50rb / 100rb / 250rb)
- **Vitest** — 62 unit test untuk logika pricing, billing, rate limit, dan signature

## Menjalankan Lokal

```bash
cp .env.example .env       # isi ANTHROPIC_API_KEY, NEXTAUTH_SECRET, MIDTRANS_*
npm install
npx prisma migrate dev     # membuat SQLite dev.db
npm run dev                # http://localhost:3000
```

Perintah lain:

```bash
npm test                   # unit test
npm run build              # build produksi
npx prisma studio          # ubah creditBalance user secara manual
```

> Tanpa `ANTHROPIC_API_KEY`, aplikasi tetap jalan tetapi endpoint chat mengembalikan 503.
> Tanpa `MIDTRANS_SERVER_KEY`, endpoint top-up mengembalikan error yang ramah.
> `GET /api/health` melaporkan status database dan kelengkapan konfigurasi.

## Model & Harga

Tarif jual dihitung dari harga resmi Anthropic (USD per 1 juta token) dikali kurs
dan markup, dengan **input dan output dihitung terpisah** — lihat `lib/pricing.ts`.
Ini penting: harga output Anthropic 5x lipat harga input, jadi tarif flat per total
token akan menagih di bawah modal untuk percakapan berjawaban panjang.

| Model | Modal input | Modal output | Konteks |
| --- | --- | --- | --- |
| Haiku 4.5 | $1 / MTok | $5 / MTok | 200K |
| Sonnet 5 (default) | $2 / MTok | $10 / MTok | 1M |
| Opus 5 | $5 / MTok | $25 / MTok | 1M |

Atur `USD_TO_IDR` dan `MARKUP_MULTIPLIER` di `lib/pricing.ts`. Test
`tests/pricing.test.ts` menjaga agar tarif jual selalu di atas harga modal untuk
setiap model dan setiap bentuk pemakaian.

## Pengaman Biaya & Abuse

| Mekanisme | Berkas | Fungsi |
| --- | --- | --- |
| Jatah output sesuai saldo | `lib/billing.ts` | `max_tokens` dihitung dari sisa saldo, jadi biaya kasus terburuk tidak pernah melebihi saldo user |
| Satu request per user | `lib/rate-limit.ts` | Mencegah request paralel menyalip pengecekan saldo |
| Rate limit chat | `lib/rate-limit.ts` | 20 request/menit per user |
| Rate limit pendaftaran | `lib/rate-limit.ts` | 5 akun/jam per IP |
| Pemangkasan riwayat | `lib/history.ts` | Riwayat dibatasi 24K token supaya biaya tidak tumbuh kuadratik |
| Prompt caching | `app/api/chat/route.ts` | Aktif setelah percakapan punya riwayat (baca cache 0.1x tarif input) |
| Deteksi lonjakan | `lib/usage.ts` | Menandai pemakaian harian >5x rata-rata yang juga di atas Rp 25.000 |
| Validasi input | `app/api/chat/route.ts` | zod, maksimal 4.000 karakter per pesan |

## Struktur Penting

| Path | Fungsi |
| --- | --- |
| `app/api/chat/route.ts` | Proxy streaming: auth → rate limit → slot → validasi → pangkas riwayat → jatah saldo → stream → potong kredit → simpan |
| `lib/pricing.ts` | Katalog model, `calculateCost`, `ratePer1kTokens`, `estimateMessages` |
| `lib/billing.ts` | `affordableOutputTokens`, `minimumBalanceFor`, `estimateTokens` |
| `lib/history.ts` | `trimHistory` — anggaran token untuk riwayat percakapan |
| `lib/usage.ts` | Agregasi pemakaian harian + deteksi anomali |
| `app/api/topup/route.ts` | Generate Snap token per paket |
| `app/api/webhook/midtrans/route.ts` | Verifikasi signature SHA-512 + tambah saldo saat `settlement`/`capture` |
| `app/dashboard/chat/[conversationId]` | UI chat: sidebar, streaming, markdown, tombol stop, pilih model |
| `app/dashboard/usage` | Rincian token dan biaya 30 hari terakhir |
| `app/dashboard/billing` | Sisa saldo + riwayat transaksi |
| `middleware.ts` | Proteksi `/dashboard/*` via NextAuth |

## Deploy ke Production (Vercel + Supabase/Neon)

1. **Database** — buat Postgres di [Supabase](https://supabase.com) atau [Neon](https://neon.tech).
   Ubah `prisma/schema.prisma` → `provider = "postgresql"`, hapus folder
   `prisma/migrations` (migrasi bawaan berformat SQLite), lalu:
   ```bash
   npx prisma migrate dev --name init-postgres
   ```
2. **Vercel** — import repo GitHub ini, set environment variables:
   - `DATABASE_URL` — connection string Postgres (pakai pooled connection untuk serverless)
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://claudeck.com`
   - `ANTHROPIC_API_KEY` — dari [console.anthropic.com](https://console.anthropic.com)
   - `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=true`
3. **Midtrans** — di dashboard Midtrans, set Payment Notification URL ke
   `https://claudeck.com/api/webhook/midtrans`.
4. **Rate limiting** — `lib/rate-limit.ts` menyimpan state di memori, jadi hanya
   akurat pada satu instance. Untuk multi-instance, ganti `createLimiter` dengan
   Upstash Redis. Hal yang sama berlaku untuk slot chat per user.

### Alternatif: Docker

```bash
docker build -t claudeck .
docker run -p 3000:3000 --env-file .env claudeck
```

## Catatan Sebelum Production

- Kredit API di [console.anthropic.com](https://console.anthropic.com) harus terisi;
  tanpa saldo, semua request chat gagal walau API key valid.
- Cek harga terbaru Anthropic sebelum mengubah `MARKUP_MULTIPLIER` supaya tidak rugi.
- Baca [Usage Policy Anthropic](https://www.anthropic.com/legal/aup) — kamu bertanggung
  jawab atas konten yang diproses melalui API key-mu.
