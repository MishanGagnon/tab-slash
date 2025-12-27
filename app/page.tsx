"use client";

import { useState, useRef, useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImageUpload } from "@/components/ImageUpload";
import { PaymentSetupModal } from "@/components/PaymentSetupModal";
import { PaginatedReceiptList } from "@/components/PaginatedReceiptList";

export default function Home() {
  return (
    <main className="min-h-screen py-6 sm:py-12 px-2 sm:px-4 flex justify-center bg-background">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col gap-8 relative">
        <Link
          href="/profile"
          className="absolute top-3 right-3 text-[8px] font-bold uppercase border-2 border-ink px-2 py-1 hover:bg-ink/5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_var(--ink)] transition-all whitespace-nowrap bg-paper z-10"
        >
          Profile
        </Link>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-center">
            Tab Slash
          </h1>
          <div className="dotted-line"></div>
        </div>

        <Content />

        <div className="dotted-line mt-auto"></div>
        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] uppercase tracking-widest opacity-30 font-bold">
            v1.0.0
          </p>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <button
          className="uppercase text-xs font-bold underline hover:opacity-70 transition-opacity cursor-pointer whitespace-nowrap"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          [ Sign Out ]
        </button>
      )}
    </>
  );
}

function Content() {
  const user = useQuery(api.receipt.currentUser);
  const [selectedAction, setSelectedAction] = useState<"join" | "start" | null>(null);

  if (user === undefined) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex items-center gap-2">
          <p className="animate-pulse text-sm uppercase font-bold">Processing...</p>
        </div>
      </div>
    );
  }

  const viewerName = user?.name || user?.email || "Anonymous";

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="font-bold text-sm uppercase tracking-wide">
          Welcome, {viewerName}
        </h2>
        <p className="text-xs opacity-60 leading-relaxed italic">
          Join a friend's split or start a new one below
        </p>
      </div>

      {/* <div className="dotted-line"></div> */}

      {selectedAction === null ? (
        <ActionChoice onSelect={setSelectedAction} />
      ) : selectedAction === "join" ? (
        <JoinSection onBack={() => setSelectedAction(null)} />
      ) : (
        <StartSplitSection 
          onBack={() => setSelectedAction(null)} 
          hasPaymentMethod={!!(user?.venmoUsername || user?.cashAppUsername || user?.zellePhone)}
        />
      )}

      <PaginatedReceiptList />
    </div>
  );
}

function ActionChoice({ onSelect }: { onSelect: (action: "join" | "start") => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onSelect("join")}
          className="border-2 border-ink py-3 px-2 sm:px-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest sm:tracking-[0.2em] hover:bg-ink/10 active:bg-ink/20 transition-all min-h-[44px] touch-manipulation"
        >
          JOIN SPLIT
        </button>
        <button
          onClick={() => onSelect("start")}
          className="border-2 border-ink py-3 px-2 sm:px-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest sm:tracking-[0.2em] hover:bg-ink/10 active:bg-ink/20 transition-all min-h-[44px] touch-manipulation"
        >
          START SPLIT
        </button>
      </div>
    </div>
  );
}

function JoinSection({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState(["", "", "", ""]);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const router = useRouter();

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length === 4) {
      router.push(`/join/${fullCode.toUpperCase()}`);
    }
  };

  const handleChange = (index: number, value: string) => {
    // Only allow letters and numbers
    const char = value.toUpperCase().slice(-1);
    if (char && !/^[A-Z]$/.test(char)) return;

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    // Auto-focus next input
    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === "Enter" && code.join("").length === 4) {
      handleJoin();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").toUpperCase().slice(0, 4);
    if (!/^[A-Z]+$/.test(pastedData)) return;

    const newCode = [...code];
    const chars = pastedData.split("");
    chars.forEach((char, i) => {
      if (i < 4) newCode[i] = char;
    });
    setCode(newCode);

    // Focus appropriate input
    const nextIndex = Math.min(chars.length, 3);
    inputRefs[nextIndex].current?.focus();
  };

  const isComplete = code.every((char) => char !== "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1 mr-4">
          <div className="flex-1 border-t border-ink/20 border-dashed"></div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-70">
            Join a Split
          </h3>
          <div className="flex-1 border-t border-ink/20 border-dashed"></div>
        </div>
        <button
          onClick={onBack}
          className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap"
        >
          [ BACK ]
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {code.map((char, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              value={char}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              placeholder={"FOOD"[index]}
              className="w-full aspect-square bg-paper border-2 border-ink text-center text-xl sm:text-2xl font-bold uppercase placeholder:opacity-20 focus:outline-none focus:ring-2 focus:ring-ink/20 focus:bg-ink/5 transition-all"
              maxLength={1}
              inputMode="text"
              autoComplete="off"
            />
          ))}
        </div>

        <button
          onClick={() => handleJoin()}
          disabled={!isComplete}
          className="w-full bg-ink text-paper py-4 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
        >
          JOIN SPLIT
        </button>
      </div>
    </div>
  );
}

function StartSplitSection({ onBack, hasPaymentMethod }: { onBack: () => void; hasPaymentMethod: boolean }) {
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(!hasPaymentMethod);

  // If hasPaymentMethod becomes true (from a background refetch), close the modal
  if (hasPaymentMethod && isSetupModalOpen) {
    setIsSetupModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1 mr-4">
          <div className="flex-1 border-t border-ink/20 border-dashed"></div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-70">
            Start a New Split
          </h3>
          <div className="flex-1 border-t border-ink/20 border-dashed"></div>
        </div>
        <button
          onClick={onBack}
          className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap"
        >
          [ BACK ]
        </button>
      </div>
      
      {!hasPaymentMethod ? (
        <div className="flex flex-col gap-6 items-center py-10 border-2 border-dashed border-ink/10">
          <div className="text-center space-y-2 px-4">
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">
              Setup Required
            </p>
            <p className="text-[10px] uppercase opacity-50 leading-relaxed italic">
              "You'll need to set your preferred payment method before you can start receiving payments from this split."
            </p>
          </div>
          <button
            onClick={() => setIsSetupModalOpen(true)}
            className="bg-ink text-paper px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-md whitespace-nowrap"
          >
            [ GO TO SETUP ]
          </button>
        </div>
      ) : (
        <ImageUpload />
      )}

      <PaymentSetupModal 
        isOpen={isSetupModalOpen} 
        onClose={() => {
          setIsSetupModalOpen(false);
          if (!hasPaymentMethod) onBack(); // Go back if they cancel without setting it
        }}
      />
    </div>
  );
}

