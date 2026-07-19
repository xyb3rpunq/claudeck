# Claudeck

SaaS chat berbasis **Claude API resmi Anthropic** dengan sistem kredit pay-as-you-go
dan pembayaran Rupiah via **Midtrans**. Ini **bukan** account-sharing — semua request
diproses server-side memakai API key resmi milik Claudeck.

## Stack

- **Next.js 14** (App Router) + TypeScript + TailwindCSS
- **Prisma** (SQLite untuk dev, PostgreSQL/Supabase/Neon untuk production)
- **NextAuth** (Credentials provider, session JWT, bcrypt)
- **@anthropic-ai/sdk** — streaming proxy ke Claude (`claude-sonnet-4-6`)
- **Midtrans Snap** — top-up saldo (paket 50rb / 100rb / 250rb)
- Rate limiting in-memory (20 req/menit/user) + validasi zod (max 4000 karakter)
- Logging JSON terstruktur (error Anthropic API + token usage harian per user)

## Menjalankan Lokal

```bash
cp .env.example .env       # isi ANTHROPIC_API_KEY, NEXTAUTH_SECRET, MIDTRANS_*
npm install
npx prisma migrate dev     # membuat SQLite dev.db
npm run dev                # http://localhost:3000
```

> Tanpa `ANTHROPIC_API_KEY`, aplikasi tetap jalan tetapi endpoint chat mengembalikan 503.
> Tanpa `MIDTRANS_SERVER_KEY`, endpoint top-up mengembalikan error yang ramah.

Untuk memberi saldo user secara manual (sebelum payment gateway aktif):

```bash
npx prisma studio   # edit kolom creditBalance user
```

## Struktur Penting

| Path | Fungsi |
| --- | --- |
| `app/api/chat/route.ts` | Proxy streaming ke Claude: auth → cek saldo → rate limit → validasi → stream → potong kredit → simpan pesan |
| `lib/pricing.ts` | `RATE_PER_1K_TOKENS`, `calculateCost`, `convertRupiahToCredit` |
| `app/api/topup/route.ts` | Generate Snap token per paket |
| `app/api/webhook/midtrans/route.ts` | Verifikasi signature + tambah saldo saat `settlement`/`capture` |
| `app/dashboard/chat/[conversationId]` | UI chat (sidebar, bubble, streaming, markdown, modal saldo habis) |
| `app/dashboard/billing` | Sisa saldo + riwayat transaksi |
| `middleware.ts` | Proteksi `/dashboard/*` via NextAuth |

## Deploy ke Production (Vercel + Supabase/Neon)

1. **Database** — buat Postgres di [Supabase](https://supabase.com) atau [Neon](https://neon.tech).
   Ubah `prisma/schema.prisma` → `provider = "postgresql"`, lalu:
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
4. **Rate limiting** — untuk multi-instance, ganti `lib/rate-limit.ts` dengan Upstash Redis.

### Alternatif: Docker

```bash
docker build -t claudeck .
docker run -p 3000:3000 --env-file .env claudeck
```

## Catatan Sebelum Production

- Cek harga terbaru Anthropic API per model sebelum menetapkan `RATE_PER_1K_TOKENS`
  supaya markup tidak rugi.
- Baca [Usage Policy Anthropic](https://www.anthropic.com/legal/aup) — kamu bertanggung
  jawab atas konten yang diproses melalui API key-mu.
- Mulai dari MVP kecil (auth + chat + potong kredit manual) untuk validasi ide sebelum
  mengaktifkan payment gateway penuh.
