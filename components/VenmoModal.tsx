"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface VenmoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VenmoModal({ isOpen, onClose, onSuccess }: VenmoModalProps) {
  const [venmoUsername, setVenmoUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateVenmoUsername = useMutation(api.receipt.updateVenmoUsername);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venmoUsername.trim()) {
      toast.error("Please enter your Venmo username");
      return;
    }

    setIsSubmitting(true);
    try {
      // Remove @ if user included it
      const cleanedUsername = venmoUsername.trim().replace(/^@/, "");
      await updateVenmoUsername({ venmoUsername: cleanedUsername });
      toast.success("Venmo username saved!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save Venmo username");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-6 shadow-2xl border-2 border-ink relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xs font-bold uppercase opacity-50 hover:opacity-100"
        >
          [ X ]
        </button>

        <div className="text-center space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-widest">
            Venmo Setup
          </h2>
          <p className="text-xs uppercase opacity-60 leading-relaxed">
            To receive payments from your friends, please enter your Venmo username.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold opacity-50 tracking-widest">
              Venmo Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 font-bold">@</span>
              <input
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-paper border-2 border-ink pl-8 pr-4 py-3 text-base font-bold uppercase tracking-widest placeholder:opacity-30 focus:outline-none"
                autoFocus
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="dotted-line"></div>

          <button
            type="submit"
            disabled={isSubmitting || !venmoUsername.trim()}
            className="w-full bg-ink text-paper py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "[ Save Username ]"}
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 py-2"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

