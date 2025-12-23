"use client";

import { useState, useRef, useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImageUpload } from "@/components/ImageUpload";
import { VenmoModal } from "@/components/VenmoModal";

export default function Home() {
  return (
    <main className="min-h-screen py-6 sm:py-12 px-2 sm:px-4 flex justify-center bg-background">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 grayscale contrast-200">
            <Image src="/convex.svg" alt="Convex Logo" width={32} height={32} />
            <div className="w-px h-8 bg-ink"></div>
            <Image
              src="/nextjs-icon-light-background.svg"
              alt="Next.js Logo"
              width={32}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/nextjs-icon-dark-background.svg"
              alt="Next.js Logo"
              width={32}
              height={32}
              className="hidden dark:block"
            />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-center">
            Divvy Bill Splitter
          </h1>
          <div className="dotted-line"></div>
        </div>

        <Content />

        <div className="dotted-line mt-auto"></div>
        <div className="flex justify-between items-center px-2">
          <p className="text-xs uppercase tracking-tighter opacity-70">
            {new Date().toLocaleString()}
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
          className="uppercase text-xs font-bold underline hover:opacity-70 transition-opacity cursor-pointer"
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
          hasVenmo={!!user?.venmoUsername}
        />
      )}

      <div className="dotted-line"></div>

      <ReceiptList />
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
        <h3 className="text-xs font-bold uppercase tracking-widest">
          --- Join a Split ---
        </h3>
        <button
          onClick={onBack}
          className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 transition-opacity"
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

function StartSplitSection({ onBack, hasVenmo }: { onBack: () => void; hasVenmo: boolean }) {
  const [isVenmoModalOpen, setIsVenmoModalOpen] = useState(!hasVenmo);

  // If hasVenmo becomes true (from a background refetch), close the modal
  if (hasVenmo && isVenmoModalOpen) {
    setIsVenmoModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-widest">
          --- Start a New Split ---
        </h3>
        <button
          onClick={onBack}
          className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 transition-opacity"
        >
          [ BACK ]
        </button>
      </div>
      
      {!hasVenmo ? (
        <div className="flex flex-col gap-6 items-center py-10 border-2 border-dashed border-ink/10">
          <div className="text-center space-y-2 px-4">
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">
              Setup Required
            </p>
            <p className="text-[10px] uppercase opacity-50 leading-relaxed italic">
              "You'll need to set your Venmo handle before you can start receiving payments from this split."
            </p>
          </div>
          <button
            onClick={() => setIsVenmoModalOpen(true)}
            className="bg-ink text-paper px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-md"
          >
            [ ADD VENMO USERNAME ]
          </button>
        </div>
      ) : (
        <ImageUpload />
      )}

      <VenmoModal 
        isOpen={isVenmoModalOpen} 
        onClose={() => {
          setIsVenmoModalOpen(false);
          if (!hasVenmo) onBack(); // Go back if they cancel without setting it
        }}
        onSuccess={() => setIsVenmoModalOpen(false)}
      />
    </div>
  );
}


function ReceiptList() {
  const receipts = useQuery(api.receipt.listUserReceipts);

  if (receipts === undefined) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-pulse">
        <p className="text-[10px] uppercase font-bold opacity-50">Retrieving Receipts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-xs font-bold uppercase tracking-widest text-center">
        --- Recent Transactions ---
      </h3>
      {receipts.length === 0 ? (
        <p className="text-[10px] uppercase opacity-40 text-center italic py-4">
          No transactions detected
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {receipts.map((receipt) => (
            <Link
              key={receipt._id}
              href={`/receipts/${receipt._id}`}
              className="flex flex-col gap-1 group overflow-hidden"
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-xs font-bold uppercase group-hover:underline truncate flex-1">
                  {receipt.merchantName}
                </span>
                <span className="text-xs opacity-70 flex-shrink-0">
                  ${((receipt.totalCents || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px] uppercase tracking-tighter opacity-50">
                <div className="flex gap-2">
                  <span>{receipt.date || new Date(receipt.createdAt).toLocaleDateString()}</span>
                  <span className={`font-bold ${
                    receipt.isUploadedByMe 
                      ? 'text-ink' 
                      : 'text-ink/60'
                  }`}>
                    {receipt.isUploadedByMe && receipt.isClaimedByMe
                      ? "[ HOST + CLAIMED ]"
                      : receipt.isUploadedByMe
                      ? "[ HOST ]"
                      : receipt.isParticipantByMe
                      ? "[ PARTICIPANT ]"
                      : receipt.isClaimedByMe
                      ? "[ CLAIMED ]"
                      : "[ JOINED ]"}
                  </span>
                </div>
                <span className="group-hover:translate-x-1 transition-transform">
                  VIEW RECEIPT {">>"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
