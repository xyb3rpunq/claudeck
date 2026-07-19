import Link from "next/link";
import { RATE_PER_1K_TOKENS, TOPUP_PACKAGES, formatRupiah } from "@/lib/pricing";

const FAQS = [
  {
    q: "Apakah ini akun sharing Claude?",
    a: "Bukan. Claudeck adalah layanan berbasis Claude API resmi dari Anthropic dengan billing sendiri. Setiap request diproses melalui API key resmi milik Claudeck di sisi server.",
  },
  {
    q: "Bagaimana cara bayarnya?",
    a: "Top-up saldo kredit via Midtrans (QRIS, VA bank, e-wallet, kartu). Saldo dipotong sesuai jumlah token yang benar-benar kamu pakai — tanpa langganan bulanan.",
  },
  {
    q: "Berapa biayanya?",
    a: `Rp ${RATE_PER_1K_TOKENS}/1.000 token (input + output). 1 kredit = Rp 1. Riwayat pemakaian dan sisa saldo bisa dicek kapan saja di halaman Billing.`,
  },
  {
    q: "Apakah percakapan saya aman?",
    a: "Percakapan disimpan untuk menampilkan riwayat chat milikmu sendiri dan tidak dibagikan ke pengguna lain. Lihat halaman Privacy untuk detail.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight">
          Claude<span className="text-orange-400">ck</span>
        </span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-zinc-300 hover:text-white">
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-400"
          >
            Daftar Gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Chat AI Claude, <span className="text-orange-400">bayar sesuai pakai</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          Akses model Claude dari Anthropic tanpa langganan bulanan dan tanpa kartu
          kredit internasional. Top-up kredit dalam Rupiah, saldo hanya terpotong
          untuk token yang benar-benar kamu gunakan.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-400"
          >
            Mulai Sekarang
          </Link>
          <a
            href="#pricing"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 hover:bg-zinc-900"
          >
            Lihat Harga
          </a>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Harga Sederhana</h2>
        <p className="mt-3 text-center text-zinc-400">
          Rp {RATE_PER_1K_TOKENS} per 1.000 token. Tanpa biaya bulanan. Kredit tidak hangus.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TOPUP_PACKAGES.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center"
            >
              <div className="text-2xl font-bold">{p.label}</div>
              <div className="mt-2 text-sm text-zinc-400">
                = {formatRupiah(p.amountRp)} kredit
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                ± {Math.floor((p.amountRp / RATE_PER_1K_TOKENS) * 1000).toLocaleString("id-ID")} token
              </div>
              <Link
                href="/register"
                className="mt-6 inline-block w-full rounded-lg bg-zinc-800 px-4 py-2 font-medium hover:bg-zinc-700"
              >
                Pilih Paket
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">FAQ</h2>
        <div className="mt-10 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Claudeck. Berbasis Claude API resmi Anthropic.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
