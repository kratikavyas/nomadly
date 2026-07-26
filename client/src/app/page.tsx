"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ExperienceForm from "@/components/ExperienceForm";
import ExperienceCard from "@/components/ExperienceCard";
import BookingsPanel from "@/components/BookingsPanel";
import { useWallet, Experience, getExperience, getAllExperienceIds } from "@/hooks/contract";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "food_tour", label: "🍜 Food" },
  { value: "hike", label: "🥾 Hiking" },
  { value: "photography", label: "📸 Photography" },
  { value: "workshop", label: "🎨 Workshop" },
  { value: "cultural", label: "🏯 Cultural" },
];

export default function Home() {
  const { address, connected } = useWallet();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<"browse" | "host">("browse");
  const [filter, setFilter] = useState("all");

  const loadExperiences = async () => {
    setLoading(true);
    try {
      const ids = await getAllExperienceIds();
      const exps = await Promise.all(ids.map((id) => getExperience(id)));
      setExperiences(exps.filter((e) => e.active));
    } catch (err) {
      console.error("Failed to load experiences:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiences();
  }, [refreshTrigger]);

  const refresh = () => setRefreshTrigger((p) => p + 1);

  const filtered =
    filter === "all" ? experiences : experiences.filter((e) => e.category === filter);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Powered by Stellar &middot; Soroban Smart Contracts
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            Discover Authentic
            <br />
            <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Local Experiences
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
            Book food tours, hikes, photography walks, and cultural experiences
            from local hosts. Pay securely with Stellar blockchain escrow.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {(["browse", "host"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                {tab === "browse" ? "Browse Experiences" : "Host Experiences"}
              </button>
            ))}
          </div>
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <div className="space-y-8">
            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    filter === cat.value
                      ? "bg-violet-500 text-white shadow-md shadow-violet-500/25"
                      : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Experiences Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                  <p className="text-sm text-zinc-400">Loading experiences...</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                  {filter === "all" ? "No experiences listed yet" : `No ${CATEGORIES.find(c => c.value === filter)?.label} experiences found`}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {filter === "all" ? "Be the first host!" : "Try a different category."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((exp) => (
                  <ExperienceCard
                    key={exp.id.toString()}
                    experience={exp}
                    walletAddress={address}
                    onBooked={refresh}
                  />
                ))}
              </div>
            )}

            {/* Stats */}
            {!loading && experiences.length > 0 && (
              <div className="flex items-center justify-center gap-8 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{experiences.length}</p>
                  <p className="text-xs text-zinc-500">Experiences</p>
                </div>
                <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{new Set(experiences.map(e => e.location)).size}</p>
                  <p className="text-xs text-zinc-500">Destinations</p>
                </div>
                <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{new Set(experiences.map(e => e.host)).size}</p>
                  <p className="text-xs text-zinc-500">Hosts</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Host Tab */}
        {activeTab === "host" && (
          <div className="mx-auto max-w-2xl space-y-8">
            {connected ? (
              <>
                <ExperienceForm walletAddress={address} onCreated={refresh} />
                <BookingsPanel walletAddress={address} refreshTrigger={refreshTrigger} />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                  Connect your wallet to host experiences
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Share your local knowledge and earn XLM.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
              N
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nomadly
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Decentralized Travel Marketplace on Stellar
          </p>
          <p className="mt-1 text-xs text-zinc-300">
            Powered by Soroban Smart Contracts &middot; Payments via Freighter Wallet
          </p>
        </div>
      </footer>
    </div>
  );
}
