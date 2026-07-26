"use client";

import { useState } from "react";
import { Experience, bookExperience } from "@/hooks/contract";

const CATEGORY_META: Record<string, { icon: string; label: string; gradient: string }> = {
  food_tour: { icon: "🍜", label: "Food Tour", gradient: "from-orange-500 to-rose-500" },
  hike: { icon: "🥾", label: "Hiking", gradient: "from-emerald-500 to-teal-500" },
  photography: { icon: "📸", label: "Photography", gradient: "from-sky-500 to-blue-500" },
  workshop: { icon: "🎨", label: "Workshop", gradient: "from-amber-500 to-yellow-500" },
  cultural: { icon: "🏯", label: "Cultural", gradient: "from-violet-500 to-purple-500" },
};

interface Props {
  experience: Experience;
  walletAddress: string;
  onBooked: () => void;
}

export default function ExperienceCard({ experience, walletAddress, onBooked }: Props) {
  const [participants, setParticipants] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const meta = CATEGORY_META[experience.category] || { icon: "✨", label: experience.category, gradient: "from-violet-500 to-indigo-500" };
  const priceInXLM = Number(experience.price) / 10_000_000;
  const totalCost = priceInXLM * participants;

  const handleBook = async () => {
    setError("");
    setSuccess(false);
    setBooking(true);
    try {
      const TOKEN_ADDRESS = "CDLLVFKHEZ2RVB3NG4UQA4VPD3TSHV6XMHXMHP2BSGCJ2IIWVTOHGDSG";
      await bookExperience(walletAddress, experience.id, TOKEN_ADDRESS, participants);
      setSuccess(true);
      onBooked();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header gradient */}
      <div className={`relative h-48 bg-gradient-to-br ${meta.gradient} p-6`}>
        <div className="absolute inset-0 bg-black/10" />
        <span className="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
          {meta.icon} {meta.label}
        </span>
        <div className="relative z-10 flex h-full flex-col justify-end">
          <h3 className="text-2xl font-bold text-white drop-shadow-lg">{experience.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/90">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {experience.location}
          </p>
        </div>
      </div>

      <div className="p-5">
        <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {experience.description}
        </p>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{priceInXLM.toFixed(2)}</span>
            <span className="ml-1 text-sm text-zinc-500">XLM / person</span>
          </div>
          <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Max {experience.max_participants} guests
          </span>
        </div>

        {walletAddress ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Guests:</label>
              <input
                type="number"
                min={1}
                max={experience.max_participants}
                value={participants}
                onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                className="w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-center text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <span className="ml-auto text-sm font-semibold text-zinc-900 dark:text-white">
                Total: {totalCost.toFixed(2)} XLM
              </span>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                Booking confirmed! Check your bookings panel.
              </p>
            )}

            <button
              onClick={handleBook}
              disabled={booking || success}
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 disabled:opacity-50"
            >
              {booking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Booking...
                </span>
              ) : success ? (
                "Booked!"
              ) : (
                "Book Now"
              )}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-400">Connect wallet to book this experience</p>
        )}
      </div>
    </div>
  );
}
