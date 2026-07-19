import Link from "next/link";

export const metadata = { title: "Kebijakan Privasi — Claudeck" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-orange-400 hover:underline">
        ← Kembali
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Kebijakan Privasi</h1>
      <div className="mt-8 space-y-6 text-zinc-300">
        <section>
          <h2 className="text-xl font-semibold">1. Data yang Kami Simpan</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Email dan password (di-hash dengan bcrypt), riwayat percakapan untuk
            menampilkan chat milikmu sendiri, riwayat transaksi top-up, dan statistik
            pemakaian token untuk billing serta deteksi penyalahgunaan.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Pemrosesan oleh Pihak Ketiga</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Isi percakapan diteruskan ke <strong>Anthropic Claude API</strong> untuk
            menghasilkan respons, tunduk pada kebijakan privasi Anthropic. Pembayaran
            diproses oleh <strong>Midtrans</strong>; kami tidak pernah menyimpan data
            kartu/pembayaranmu di server kami.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. Keamanan</h2>
          <p className="mt-2 text-sm leading-relaxed">
            API key Anthropic hanya berada di server (environment variable) dan tidak
            pernah dikirim ke browser. Komunikasi dienkripsi via HTTPS.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">4. Hak Kamu</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Kamu dapat menghapus percakapan kapan saja dari dashboard, dan dapat
            meminta penghapusan akun beserta seluruh datanya melalui support.
          </p>
        </section>
      </div>
    </main>
  );
}
