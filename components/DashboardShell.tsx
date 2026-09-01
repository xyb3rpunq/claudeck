"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

/**
 * Merangkai sidebar dan topbar. Komponen ini client-side karena memegang state
 * buka/tutup drawer di layar kecil; data user tetap diambil di server lalu
 * diturunkan sebagai props.
 */
export default function DashboardShell({
  email,
  creditBalance,
  children,
}: {
  email: string;
  creditBalance: number;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          email={email}
          creditBalance={creditBalance}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
