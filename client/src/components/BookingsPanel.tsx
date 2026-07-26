"use client";

import { useState, useEffect } from "react";
import {
  Booking,
  Experience,
  getBooking,
  getExperience,
  cancelBooking,
  completeBooking,
  getTravelerBookings,
} from "@/hooks/contract";

interface Props {
  walletAddress: string;
  refreshTrigger: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Confirmed: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  Cancelled: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" },
  Completed: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
};

export default function BookingsPanel({ walletAddress, refreshTrigger }: Props) {
  const [bookings, setBookings] = useState<{ booking: Booking; experience: Experience }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<bigint | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const bookingIds = await getTravelerBookings(walletAddress);
      const items = await Promise.all(
        bookingIds.map(async (id) => {
          const booking = await getBooking(id);
          const experience = await getExperience(booking.experience_id);
          return { booking, experience };
        })
      );
      setBookings(items);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) loadBookings();
  }, [walletAddress, refreshTrigger]);

  const handleCancel = async (bookingId: bigint) => {
    setActionLoading(bookingId);
    try {
      await cancelBooking(walletAddress, bookingId);
      await loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (bookingId: bigint) => {
    setActionLoading(bookingId);
    try {
      await completeBooking(walletAddress, bookingId);
      await loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Complete failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const confirmed = bookings.filter((b) => b.booking.status === "Confirmed");
  const completed = bookings.filter((b) => b.booking.status === "Completed");
  const cancelled = bookings.filter((b) => b.booking.status === "Cancelled");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">My Bookings</h2>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {bookings.length} total
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">No bookings yet. Browse experiences above!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active bookings */}
          {confirmed.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Active ({confirmed.length})
              </h3>
              <div className="space-y-3">
                {confirmed.map(({ booking, experience }) => {
                  const style = STATUS_STYLES[booking.status];
                  return (
                    <div
                      key={booking.id.toString()}
                      className="flex flex-col gap-3 rounded-xl border border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-zinc-900 dark:text-white">
                            {experience.title}
                          </h4>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {booking.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-500">
                          📍 {experience.location} · {booking.num_participants} guest{booking.num_participants > 1 ? "s" : ""} ·{" "}
                          {Number(booking.total_paid) / 10_000_000} XLM
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          {actionLoading === booking.id ? "..." : "Cancel"}
                        </button>
                        <button
                          onClick={() => handleComplete(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? "..." : "Complete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past bookings */}
          {(completed.length > 0 || cancelled.length > 0) && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Past ({completed.length + cancelled.length})
              </h3>
              <div className="space-y-3">
                {[...completed, ...cancelled].map(({ booking, experience }) => {
                  const style = STATUS_STYLES[booking.status];
                  return (
                    <div
                      key={booking.id.toString()}
                      className="flex items-center gap-4 rounded-xl border border-zinc-100 p-4 opacity-70 dark:border-zinc-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-zinc-700 dark:text-zinc-300">
                            {experience.title}
                          </h4>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                            {booking.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          📍 {experience.location} · {Number(booking.total_paid) / 10_000_000} XLM
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
