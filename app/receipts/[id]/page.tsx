"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getBaseUrl } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "@/components/ShareModal";

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as Id<"receipts">;

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const user = useQuery(api.receipt.currentUser);
  const data = useQuery(api.receipt.getReceiptWithItems, { receiptId });
  const parseReceipt = useAction(api.receiptActions.triggerParseReceiptByReceiptId);
  const toggleClaim = useMutation(api.receipt.toggleClaimItem);
  const toggleParticipantClaim = useMutation(api.receipt.toggleParticipantClaim);
  const joinSplit = useMutation(api.receipt.joinReceipt);
  const getOrCreateShareCode = useMutation(api.share.getOrCreateShareCode);

  const [isJoining, setIsJoining] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [splittingItemId, setSplittingItemId] = useState<Id<"receiptItems"> | null>(null);

  const handleShareClick = async () => {
    setIsGeneratingCode(true);
    try {
      const code = await getOrCreateShareCode({ receiptId });
      setShareCode(code);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error("Failed to generate share code:", error);
      toast.error("Failed to generate share code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleParseReceipt = async () => {
    setIsParsing(true);
    setParseError(null);
    setTimer(0);

    const startTime = performance.now();
    const interval = setInterval(() => {
      setTimer((performance.now() - startTime) / 1000);
    }, 100);

    try {
      await parseReceipt({ receiptId });
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

  const { receipt, imageUrl, items } = data;
  const isParsed = receipt.status === "parsed";

  // Check if user needs to join
  const isHost = user && receipt.hostUserId === user._id;
  const isParticipant = user && receipt.authedParticipants?.includes(user._id);
  const needsToJoin = user && isParsed && !isHost && !isParticipant;

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await joinSplit({ receiptId: receipt._id });
    } catch (error) {
      console.error("Failed to join split:", error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 flex justify-center">
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={`${getBaseUrl()}/join/${shareCode || ""}`}
        shareCode={shareCode || "...."}
      />

      {/* Join Modal */}
      {needsToJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-6 shadow-2xl border-2 border-ink">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-bold uppercase tracking-widest">
                Join this Split?
              </h2>
              <p className="text-xs uppercase opacity-60 leading-relaxed">
                You are not currently a participant in this bill session. Would
                you like to join and start claiming items?
              </p>
            </div>
            <div className="dotted-line"></div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/")}
                className="border-2 border-ink py-3 text-xs font-bold uppercase tracking-widest hover:bg-ink/5 transition-all"
              >
                [ NO ]
              </button>
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="bg-ink text-paper py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isJoining ? "JOINING..." : ">> YES <<"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-6">
        {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-full flex justify-between items-center mb-4">
              <Link
                href="/"
                className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100"
              >
                [ {"<<"} BACK ]
              </Link>
              <button
                onClick={handleShareClick}
                disabled={isGeneratingCode}
                className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 cursor-pointer disabled:opacity-30"
              >
                {isGeneratingCode ? "[ ... ]" : "[ SHARE ]"}
              </button>
            </div>
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-center">
              {receipt.merchantName || "Transaction Details"}
            </h1>
          {receipt.date && (
            <p className="text-xs uppercase tracking-widest opacity-70">
              {receipt.date}
            </p>
          )}
          {receipt.participants && receipt.participants.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {receipt.participants.map((p, idx) => (
                <div
                  key={idx}
                  title={p.userName}
                  className={`text-[9px] font-black tracking-tighter px-2 py-0.5 border-2 ${
                    p.userId === user?._id
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 text-ink/40"
                  }`}
                >
                  [ {getInitials(p.userName)} ]
                </div>
              ))}
            </div>
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
                            <button
                              onClick={() => toggleClaim({ itemId: item._id })}
                              className={`text-[9px] font-black tracking-tighter px-1.5 py-0.5 border-2 transition-all ${
                                isClaimedByUser
                                  ? "border-ink bg-ink text-paper hover:opacity-90"
                                  : "border-dotted border-ink/40 text-ink/60 hover:border-solid hover:border-ink hover:text-ink"
                              }`}
                            >
                              {isClaimedByUser ? "[ UNCLAIM ]" : "[ CLAIM ]"}
                            </button>
                            <button
                              onClick={() => setSplittingItemId(splittingItemId === item._id ? null : item._id)}
                              className={`text-[9px] font-black tracking-tighter px-1.5 py-0.5 border-2 transition-all ${
                                splittingItemId === item._id
                                  ? "border-ink bg-ink text-paper"
                                  : "border-ink/40 text-ink/60 hover:border-ink hover:text-ink"
                              }`}
                            >
                              [ SPLIT ]
                            </button>
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

                        {/* Claimed Names Display */}
                        {item.claimedBy && item.claimedBy.length > 0 && (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 ml-8 mt-0.5">
                            <span className="text-[9px] uppercase font-bold opacity-30">Claimed by:</span>
                            {item.claimedBy.map((claim, idx) => (
                              <span key={idx} className="text-[9px] uppercase font-bold opacity-60">
                                {claim.userName}{idx < (item.claimedBy?.length || 0) - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Split Selector UI */}
                        {splittingItemId === item._id && (
                          <div className="mt-2 ml-8 p-3 border-2 border-dashed border-ink/20 flex flex-col gap-3 bg-paper">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Split With Participants:</p>
                              <button 
                                onClick={() => setSplittingItemId(null)}
                                className="text-[9px] font-black uppercase underline hover:opacity-70"
                              >
                                [ DONE ]
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {receipt.participants?.map((p) => (
                                <button
                                  key={p.userId}
                                  onClick={() => toggleParticipantClaim({ itemId: item._id, userId: p.userId })}
                                  className={`text-[9px] font-black tracking-tighter px-2 py-1 border-2 transition-all ${
                                    item.claimedBy?.some(c => c.userId === p.userId)
                                      ? "border-ink bg-ink text-paper"
                                      : "border-ink/20 text-ink/40 hover:border-ink/40 hover:text-ink/60"
                                  }`}
                                >
                                  {p.userName}
                                </button>
                              ))}
                            </div>
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
              href={`/receipts/${receiptId}/${user._id}`}
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
            <p>Created: {new Date(receipt.createdAt).toLocaleString()}</p>
            <p>Receipt ID: {receipt._id.slice(0, 12)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
