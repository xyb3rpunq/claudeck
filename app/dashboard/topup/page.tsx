// STEP 5.3 — Halaman top-up dengan pilihan paket + Snap popup.
import TopupClient from "@/components/TopupClient";
import { SNAP_JS_URL } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

export default function TopupPage() {
  // Client key Midtrans memang aman untuk browser (bukan server key).
  const clientKey = process.env.MIDTRANS_CLIENT_KEY ?? "";
  return <TopupClient snapJsUrl={SNAP_JS_URL} clientKey={clientKey} />;
}
