"use client";

import { useState } from "react";
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
    <main className="min-h-screen py-12 px-4 flex justify-center bg-background">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-8">
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

// function Content() {
//   const { viewer } = useQuery(api.myFunctions.listNumbers, { count: 1 }) ?? {};

//   if (viewer === undefined) {
//     return (
//       <div className="flex flex-col items-center gap-4 py-12">
//         <div className="flex items-center gap-2">
//           <p className="animate-pulse text-sm uppercase font-bold">Processing...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-8 w-full">
//       <div className="flex flex-col gap-1 text-center">
//         <h2 className="font-bold text-sm uppercase tracking-wide">
//           Welcome, {viewer ?? "Anonymous"}
//         </h2>
//         <p className="text-xs opacity-60 leading-relaxed italic">
//           &quot;Join a friend's split or start a new one below.&quot;
//         </p>
//       </div>

//       <div className="dotted-line"></div>

//       <JoinCodeInput />

//       <div className="dotted-line"></div>

//       <div className="flex flex-col gap-4">
//         <h3 className="text-xs font-bold uppercase tracking-widest text-center">
//           --- Start a New Split ---
//         </h3>
//         <ImageUpload />
//       </div>

//       <div className="dotted-line"></div>

//       <ReceiptList />
//     </div>
//   );
// }

// function JoinCodeInput() {
//   const [code, setCode] = useState("");
//   const router = useRouter();

//   const handleJoin = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (code.length === 4) {
//       router.push(`/join/${code.toUpperCase()}`);
//     }
//   };

//   return (
//     <div className="flex flex-col gap-4">
//       <h3 className="text-xs font-bold uppercase tracking-widest text-center">
//         --- Join a Split ---
//       </h3>
//       <form onSubmit={handleJoin} className="flex gap-2">
//         <input
//           type="text"
//           value={code}
//           onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
//           placeholder="ENTER CODE (E.G. TACO)"
//           className="flex-1 bg-paper border-2 border-ink px-4 py-3 text-base font-bold uppercase tracking-widest placeholder:opacity-30 focus:outline-none"
//           maxLength={4}
//         />
//         <button
//           type="submit"
//           disabled={code.length !== 4}
//           className="bg-ink text-paper px-6 py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
//         >
//           JOIN
//         </button>
//       </form>
//     </div>
//   );
// }

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
      {/* <h3 className="text-xs font-bold uppercase tracking-widest text-center">
        --- Choose an Action ---
      </h3> */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect("join")}
          className="border-2 border-ink py-3 px-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-ink/10 active:bg-ink/20 transition-all min-h-[44px] touch-manipulation"
        >
          JOIN SPLIT
        </button>
        <button
          onClick={() => onSelect("start")}
          className="border-2 border-ink py-3 px-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-ink/10 active:bg-ink/20 transition-all min-h-[44px] touch-manipulation"
        >
          START SPLIT
        </button>
      </div>
    </div>
  );
}

function JoinSection({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) {
      router.push(`/join/${code.toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
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
      <form onSubmit={handleJoin} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="ENTER CODE (E.G. TACO)"
          className="flex-1 bg-paper border-2 border-ink px-4 py-3 text-base font-bold uppercase tracking-widest placeholder:opacity-30 focus:outline-none"
          maxLength={4}
        />
        <button
          type="submit"
          disabled={code.length !== 4}
          className="bg-ink text-paper px-6 py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
        >
          JOIN
        </button>
      </form>
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
              className="flex flex-col gap-1 group"
            >
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase group-hover:underline">
                  {receipt.merchantName}
                </span>
                <span className="text-xs opacity-70">
                  ${((receipt.totalCents || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px] uppercase tracking-tighter opacity-50">
                <div className="flex gap-2">
                  <span>{receipt.date || new Date(receipt.createdAt).toLocaleDateString()}</span>
                  <span className="text-ink font-bold">
                    {receipt.isUploadedByMe && receipt.isClaimedByMe
                      ? "[ HOST + CLAIMED ]"
                      : receipt.isUploadedByMe
                      ? "[ HOST ]"
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
