"use client";

import { useWallet } from "@/hooks/contract";

export default function Navbar() {
  const { address, connected, loading, connect } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 text-lg font-bold text-white shadow-lg shadow-violet-500/25">
            N
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Nomadly
            </h1>
            <p className="-mt-0.5 text-[10px] font-medium uppercase tracking-widest text-violet-500 dark:text-violet-400">
              Travel Marketplace
            </p>
          </div>
        </a>

        <div className="flex items-center gap-4">
          {connected ? (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </div>
              <span className="max-w-[140px] truncate rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
