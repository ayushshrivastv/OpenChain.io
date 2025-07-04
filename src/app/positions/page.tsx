"use client";

import { AppShell } from "@/components/AppShell";
import { ClientOnly } from "@/components/ClientOnly";
import { SolanaWalletProvider } from "@/components/SolanaWalletProvider";
import { Toaster } from "@/components/ui/sonner";
import ClientBody from "../ClientBody";
import { WalletButton } from "@/components/WalletButton";
import Positions from "@/components/Positions";

export default function PositionsPage() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-black" />}>
      <ClientBody>
        <SolanaWalletProvider>
          <AppShell>
          {/* Floating Wallet Button */}
          <div className="fixed top-6 right-6 z-50">
            <WalletButton />
          </div>
            <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
              <Positions />
            </div>
          </AppShell>
          <Toaster />
        </SolanaWalletProvider>
      </ClientBody>
    </ClientOnly>
  );
}
