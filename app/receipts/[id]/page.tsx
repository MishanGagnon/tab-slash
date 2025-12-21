"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const imageId = params.id as Id<"images">;

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const user = useQuery(api.receipt.currentUser);
  const data = useQuery(api.receipt.getImageWithReceipt, { imageId });
  const parseReceipt = useAction(api.receiptActions.triggerParseReceipt);
  const toggleClaim = useMutation(api.receipt.toggleClaimItem);

  const handleParseReceipt = async () => {
    setIsParsing(true);
    setParseError(null);
    setTimer(0);

    const startTime = performance.now();
    const interval = setInterval(() => {
      setTimer((performance.now() - startTime) / 1000);
    }, 100);

    try {
      await parseReceipt({ imageId });
    } catch (error) {
      console.error("Failed to parse receipt:", error);
      setParseError(
        error instanceof Error ? error.message : "Failed to parse receipt"
      );
    } finally {
      clearInterval(interval);
      setIsParsing(false);
    }
  };

  // Format cents to dollars
  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined) return "—";
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Helper to get initials
  const getInitials = (name: string | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Loading state
  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 flex justify-center">
        <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin opacity-50"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-xs uppercase font-bold tracking-widest opacity-50">
              Loading Transaction...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (data === null) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 flex justify-center">
        <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col items-center gap-6">
          <Link
            href="/"
            className="self-start text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 mb-4"
          >
            [ &lt;&lt; BACK ]
          </Link>
          <div className="text-center space-y-4 py-12">
            <h1 className="text-xl font-bold uppercase tracking-widest">
              Receipt Not Found
            </h1>
            <p className="text-xs uppercase opacity-60 leading-relaxed">
              The requested document could not be located in our records.
            </p>
          </div>
          <div className="dotted-line"></div>
          <Link
            href="/"
            className="border-2 border-ink px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-paper transition-all"
          >
            Return to Terminal
          </Link>
        </div>
      </div>
    );
  }

  const { image, imageUrl, receipt, items } = data;
  const isParsed = receipt !== null;

  return (
    <div className="min-h-screen bg-background py-12 px-4 flex justify-center">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/"
            className="self-start text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 mb-4"
          >
            [ &lt;&lt; BACK ]
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-center">
            {receipt?.merchantName || "Transaction Details"}
          </h1>
          {receipt?.date && (
            <p className="text-xs uppercase tracking-widest opacity-70">
              {receipt.date}
            </p>
          )}
          <div className="dotted-line"></div>
        </div>

        {/* Image Section */}
        <div className="flex flex-col gap-4">
          <div className="border border-ink/20 p-1 bg-paper">
            <div className="relative aspect-[3/4] w-full">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt="Receipt"
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] uppercase opacity-30">
                  No Image Found
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleParseReceipt}
              disabled={isParsing}
              className="w-full border-2 border-ink py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-ink hover:text-paper transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isParsing ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-spin"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {isParsed ? "Reparsing..." : "Parsing..."} ({timer.toFixed(1)}s)
                </>
              ) : (
                <>
                  {isParsed ? ">> Reparse Receipt <<" : ">> Parse Receipt <<"}
                </>
              )}
            </button>
            <p className="text-[10px] uppercase opacity-40 text-center italic">
              Note: This usually takes about 30 seconds
            </p>
          </div>
          {parseError && (
            <p className="text-red-600 text-[10px] uppercase font-bold text-center">
              Error: {parseError}
            </p>
          )}
        </div>

        <div className="dotted-line"></div>

        {/* Content Section */}
        {isParsed ? (
          <div className="flex flex-col gap-6">
            {/* Summary */}
            <div className="flex flex-col gap-2">
              <div className="receipt-item-row text-xs uppercase opacity-70">
                <span>Subtotal</span>
                <span>
                  {formatCurrency(
                    receipt.totalCents !== undefined &&
                      receipt.taxCents !== undefined
                      ? receipt.totalCents -
                          receipt.taxCents -
                          (receipt.tipCents || 0)
                      : undefined
                  )}
                </span>
              </div>
              <div className="receipt-item-row text-xs uppercase opacity-70">
                <span>Tax</span>
                <span>{formatCurrency(receipt.taxCents)}</span>
              </div>
              <div className="receipt-item-row text-xs uppercase opacity-70">
                <span>Tip</span>
                <span>{formatCurrency(receipt.tipCents)}</span>
              </div>
              <div className="receipt-item-row text-lg font-bold uppercase mt-2 border-t-4 border-ink/10 pt-2">
                <span>Total</span>
                <span>{formatCurrency(receipt.totalCents)}</span>
              </div>
            </div>

            <div className="dotted-line"></div>

            {/* Items */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-center">
                --- Items ---
              </h3>
              {items.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {items.map((item) => {
                    const totalItemPriceCents =
                      (item.priceCents || 0) +
                      (item.modifiers?.reduce(
                        (sum, mod) => sum + (mod.priceCents || 0),
                        0
                      ) || 0);

                    const isClaimedByUser = item.claimedBy?.some(
                      (c) => c.userId === user?._id
                    );

                    return (
                      <div key={item._id} className="flex flex-col gap-1">
                        <div className="grid grid-cols-[1.5rem_1fr_auto_4.5rem] gap-2 items-center text-xs uppercase">
                          <span className="flex-shrink-0 opacity-60">
                            {item.quantity}X
                          </span>
                          <span className="font-bold truncate">{item.name}</span>
                          <div className="flex items-center gap-1">
                            {item.claimedBy?.map((claim, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  claim.userId === user?._id &&
                                  toggleClaim({ itemId: item._id })
                                }
                                title={claim.userName}
                                className={`text-[9px] font-black tracking-tighter px-1.5 py-0.5 border-2 ${
                                  claim.userId === user?._id
                                    ? "border-ink bg-ink text-paper cursor-pointer"
                                    : "border-ink/20 text-ink/40 cursor-default"
                                }`}
                              >
                                [ {getInitials(claim.userName)} ]
                              </button>
                            ))}
                            {!isClaimedByUser && (
                              <button
                                onClick={() =>
                                  toggleClaim({ itemId: item._id })
                                }
                                className="text-[9px] font-black tracking-tighter px-1.5 py-0.5 border-2 border-dotted border-ink/40 text-ink/60 hover:border-solid hover:border-ink hover:text-ink transition-all"
                              >
                                [ CLAIM ]
                              </button>
                            )}
                          </div>
                          <span className="text-right">{formatCurrency(totalItemPriceCents)}</span>
                        </div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="flex flex-col gap-0.5 ml-8 italic opacity-60 text-[10px] uppercase">
                            {item.modifiers.map((mod, idx) => (
                              <div key={idx}>+ {mod.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] uppercase opacity-40 text-center italic">
                  No line items detected
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8 text-center opacity-40">
            <p className="text-xs uppercase font-bold tracking-widest">
              Status: Unparsed
            </p>
            <p className="text-[10px] uppercase leading-relaxed max-w-[200px]">
              Click the button above to begin AI transcription
            </p>
          </div>
        )}

        {isParsed && user && (
          <div className="flex flex-col gap-4 mt-4">
            <Link
              href={`/receipts/${imageId}/${user._id}`}
              className="w-full border-2 border-ink py-3 text-xs font-bold uppercase tracking-[0.2em] text-center hover:bg-ink hover:text-paper transition-all"
            >
              {">> View Your Personal Receipt <<"}
            </Link>
          </div>
        )}

        <div className="dotted-line mt-auto"></div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 text-[10px] uppercase tracking-widest opacity-50 italic text-center">
          <p>*** Thank You for Splitting ***</p>
          <div className="flex flex-col gap-1">
            <p>Uploaded: {new Date(image.uploadedAt).toLocaleString()}</p>
            <p>Receipt ID: {image._id.slice(0, 12)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

