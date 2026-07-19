import Link from "next/link";

export const metadata = { title: "Syarat & Ketentuan — Claudeck" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-orange-400 hover:underline">
        ← Kembali
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Syarat &amp; Ketentuan</h1>
      <div className="prose prose-invert mt-8 space-y-6 text-zinc-300">
        <section>
          <h2 className="text-xl font-semibold">1. Tentang Layanan</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Claudeck adalah layanan chat AI berbasis <strong>Claude API resmi dari
            Anthropic</strong> dengan billing mandiri. Claudeck <strong>bukan</strong> reseller
            akun, bukan akun sharing, dan tidak menjual kembali akses akun Claude.ai.
            Semua request diproses server-side melalui API key resmi milik Claudeck.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Penggunaan Wajar</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Kamu setuju untuk tidak menggunakan layanan untuk aktivitas yang melanggar
            hukum, menghasilkan konten berbahaya, spam, penyalahgunaan otomatis
            (scraping/bot abuse), atau aktivitas yang melanggar Usage Policy Anthropic.
            Kami menerapkan rate limiting dan monitoring pemakaian; akun yang terdeteksi
            menyalahgunakan layanan dapat dibatasi atau ditangguhkan.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. Kredit &amp; Pembayaran</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Saldo kredit dibeli melalui payment gateway Midtrans. Saldo dipotong sesuai
            jumlah token (input + output) yang digunakan pada setiap request. Harga per
            token dapat berubah sewaktu-waktu mengikuti harga resmi Anthropic; perubahan
            akan diumumkan di halaman pricing.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">4. Kebijakan Refund</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Kredit yang belum terpakai dapat di-refund secara prorata dalam 30 hari
            sejak pembelian dengan menghubungi support, dikurangi biaya payment gateway.
            Kredit yang sudah terpakai untuk pemrosesan token tidak dapat di-refund.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">5. Batasan Tanggung Jawab</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Layanan disediakan &quot;sebagaimana adanya&quot;. Output AI dapat tidak akurat —
            verifikasi sebelum digunakan untuk keputusan penting. Kami tidak bertanggung
            jawab atas kerugian tidak langsung akibat penggunaan layanan.
          </p>
        </section>
      </div>
    </main>
  );
}
