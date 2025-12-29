"use client";

import { useState, useEffect } from "react";

const FORTUNES = [
  "A generous tip is in your future (hopefully from someone else).",
  "You will find a missing dollar in your next laundry cycle.",
  "Beware of the friend who 'forgot their wallet'.",
  "Your Venmo balance will soon be replenished.",
  "The math of a split bill is the true test of friendship.",
  "May your receipts always be clear and your modifiers accurate.",
  "A shared meal is a shared joy, a shared bill is a shared headache.",
  "You will never have to chase anyone for money again (starting... soon).",
  "The person to your left will pay for the next round.",
  "Your credit score is watching... and it's impressed by your promptness.",
  "Fortune favors the one who pays within 24 hours.",
  "A small tax today, a great feast tomorrow.",
  "Your financial karma is peaking.",
  "The host appreciates your quick payment more than you know.",
  "May your modifiers always be worth the extra $2.",
  "You have escaped the 'I'll get you next time' trap.",
  "A clean split makes for a long friendship.",
  "Your contribution has been noted by the universe.",
  "May your Zelle always transfer instantly.",
  "You are the friend everyone wants at their table.",
];

interface FortuneCookieProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FortuneCookie({ isOpen, onClose }: FortuneCookieProps) {
  const [isCracked, setIsCracked] = useState(false);
  const [fortune, setFortune] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFortune(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
      setIsCracked(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleCrack = () => {
    if (!isCracked) {
      setIsCracked(true);
      // Vibrate if supported
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative w-full max-w-sm flex flex-col items-center justify-center p-8">
        {!isCracked && (
          <button
            onClick={handleClose}
            className="absolute top-0 right-4 text-[10px] font-bold uppercase opacity-50 hover:opacity-100 p-4"
          >
            [ SKIP ]
          </button>
        )}

        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Fortune Cookie SVG */}
          <div
            onClick={handleCrack}
            className={`relative cursor-pointer transition-transform duration-500 transform ${
              isCracked ? "scale-110" : "hover:scale-105 active:scale-95"
            }`}
          >
            {/* Left Half */}
            <svg
              width="150"
              height="150"
              viewBox="0 0 100 100"
              className={`absolute transition-all duration-700 ease-out ${
                isCracked
                  ? "-translate-x-16 -translate-y-8 -rotate-12 opacity-0 pointer-events-none"
                  : "translate-x-0"
              }`}
            >
              <path
                d="M50 20 C20 20, 10 50, 15 75 C20 85, 45 80, 50 70 L50 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-ink"
              />
              <path
                d="M50 35 C35 35, 25 50, 28 65"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="text-ink/30"
              />
            </svg>

            {/* Right Half */}
            <svg
              width="150"
              height="150"
              viewBox="0 0 100 100"
              className={`transition-all duration-700 ease-out ${
                isCracked
                  ? "translate-x-16 -translate-y-8 rotate-12 opacity-0 pointer-events-none"
                  : "translate-x-0"
              }`}
            >
              <path
                d="M50 20 C80 20, 90 50, 85 75 C80 85, 55 80, 50 70 L50 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-ink"
              />
              <path
                d="M50 35 C65 35, 75 50, 72 65"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="text-ink/30"
              />
            </svg>

            {/* Fortune Paper */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 transition-all duration-1000 delay-300 ${
                isCracked
                  ? "opacity-100 scale-100 rotate-0"
                  : "opacity-0 scale-0 rotate-12 pointer-events-none"
              }`}
            >
              <div className="receipt-paper jagged-top jagged-bottom p-4 shadow-xl border-t border-b border-ink/10">
                <div className="flex flex-col gap-2 items-center text-center">
                  <span className="text-[8px] font-black uppercase tracking-tighter opacity-30">
                    YOUR FORTUNE
                  </span>
                  <p className="text-[11px] font-bold uppercase leading-tight text-ink">
                    "{fortune}"
                  </p>
                  <div className="dotted-line my-1"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="text-[9px] font-black uppercase tracking-widest hover:underline pt-1"
                  >
                    [ DONE ]
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isCracked && (
          <div className="mt-8 text-center animate-bounce">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
              CLICK TO OPEN YOUR FORTUNE
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

