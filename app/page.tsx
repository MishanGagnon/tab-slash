"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImageUpload } from "@/components/ImageUpload";

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
            Bill Splitting Terminal
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
  const { viewer } = useQuery(api.myFunctions.listNumbers, { count: 1 }) ?? {};

  if (viewer === undefined) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex items-center gap-2">
          <p className="animate-pulse text-sm uppercase font-bold">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-2 text-center">
        <h2 className="font-bold text-lg uppercase">
          Welcome, {viewer ?? "Anonymous"}
        </h2>
        <p className="text-sm opacity-80 leading-relaxed italic">
          &quot;Manage your split bills or upload a new receipt below.&quot;
        </p>
      </div>

      <div className="dotted-line"></div>

      <ReceiptList />

      <div className="dotted-line"></div>

      <ImageUpload />
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
              href={receipt.imageId ? `/receipts/${receipt.imageId}` : "#"}
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
                      : "[ CLAIMED ]"}
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
