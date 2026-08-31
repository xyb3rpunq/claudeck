import Link from "next/link";
import {
  DEFAULT_MODEL,
  MODELS,
  MODEL_IDS,
  TOPUP_PACKAGES,
  estimateMessages,
  formatContextWindow,
  formatRupiah,
  ratePer1kTokens,
} from "@/lib/pricing";

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
    q: "Kenapa harga masuk dan keluar beda?",
    a: "Karena tarif resmi Anthropic memang begitu: token jawaban (keluar) lima kali lebih mahal dari token pertanyaan (masuk). Kami meneruskan struktur yang sama supaya kamu tidak membayar lebih untuk pertanyaan pendek.",
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
        <h2 className="text-center text-3xl font-bold">Harga Transparan</h2>
        <p className="mt-3 text-center text-zinc-400">
          Bayar per token, tanpa biaya bulanan. Kredit tidak hangus.
        </p>

        {/* Tarif per model */}
        <div className="mt-10 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Token masuk /1K</th>
                <th className="px-4 py-3 font-medium">Token keluar /1K</th>
                <th className="px-4 py-3 font-medium">Konteks</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_IDS.map((id) => (
                <tr key={id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{MODELS[id].label}</div>
                    <div className="text-xs text-zinc-500">{MODELS[id].tagline}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatRupiah(ratePer1kTokens(id, "input"))}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatRupiah(ratePer1kTokens(id, "output"))}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatContextWindow(MODELS[id].contextTokens)} token
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paket top-up */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
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
                ± {estimateMessages(p.amountRp).toLocaleString("id-ID")} pesan di{" "}
                {MODELS[DEFAULT_MODEL].label}
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
