"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getBaseUrl } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "@/components/ShareModal";
import { ClaimedProgressBar } from "@/components/ClaimedProgressBar";

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as Id<"receipts">;

  const [isReparsing, setIsReparsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showImageOverride, setShowImageOverride] = useState(false);

  const user = useQuery(api.receipt.currentUser);
  const data = useQuery(api.receipt.getReceiptWithItems, { receiptId });
  const parseReceipt = useAction(api.receiptActions.triggerParseReceiptByReceiptId);
  const deleteReceipt = useMutation(api.receipt.deleteReceipt);
  const toggleClaim = useMutation(api.receipt.toggleClaimItem);
  const toggleParticipantClaim = useMutation(api.receipt.toggleParticipantClaim);
  const joinSplit = useMutation(api.receipt.joinReceipt);
  const getOrCreateShareCode = useMutation(api.share.getOrCreateShareCode);
  const confirmTip = useMutation(api.receipt.confirmTip);

  const [isJoining, setIsJoining] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [splittingItemId, setSplittingItemId] = useState<Id<"receiptItems"> | null>(null);
  const [isAddingTip, setIsAddingTip] = useState(false);
  const [customTipValue, setCustomTipValue] = useState("");
  const [isConfirmingTip, setIsConfirmingTip] = useState(false);

  const tipSectionRef = useRef<HTMLDivElement>(null);

  const isParsed = data?.receipt.status === "parsed";
  const isCurrentlyParsing = data?.receipt.status === "parsing" || isReparsing;
  
  // Derived state to prevent flash: 
  // Image is visible if we're not parsed yet OR if the user explicitly clicked to show it.
  const isImageVisible = !isParsed || showImageOverride;

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

  // Check if receipt is currently parsing (either from server status or local reparse)
  const isParsing = data?.receipt.status === "parsing" || isReparsing;

  // Track elapsed time when parsing
  useEffect(() => {
    if (!isParsing) {
      setElapsedTime(0);
      return;
    }

    // If we have a server-side parsingStartedAt, use that as the start time
    const startTime = data?.receipt.parsingStartedAt || Date.now();
    
    // Update elapsed time immediately
    setElapsedTime((Date.now() - startTime) / 1000);
    
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [isParsing, data?.receipt.parsingStartedAt]);

  const handleReparse = async () => {
    setIsReparsing(true);
    setParseError(null);

    try {
      await parseReceipt({ receiptId });
    } catch (error) {
      console.error("Failed to parse receipt:", error);
      setParseError(
        error instanceof Error ? error.message : "Failed to parse receipt"
      );
    } finally {
      setIsReparsing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteReceipt({ receiptId });
      toast.success("Receipt deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Failed to delete receipt:", error);
      toast.error("Failed to delete receipt");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
      <div className="min-h-screen bg-background py-6 sm:py-12 px-2 sm:px-4 flex justify-center">
        <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col items-center justify-center min-h-[400px]">
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
      <div className="min-h-screen bg-background py-6 sm:py-12 px-2 sm:px-4 flex justify-center">
        <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col items-center gap-6">
          <Link
            href="/"
            className="self-start text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 mb-4 whitespace-nowrap"
          >
            [ {"<<"} BACK ]
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

  const subtotalCents =
    receipt.totalCents !== undefined && receipt.taxCents !== undefined
      ? receipt.totalCents - receipt.taxCents - (receipt.tipCents || 0)
      : 0;

  // Calculate claimed amount
  const calculateClaimedAmount = (items: typeof data.items): number => {
    return items.reduce((sum, item) => {
      const itemTotal = (item.priceCents || 0) + 
        (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
      const numClaimants = item.claimedBy?.length || 0;
      if (numClaimants > 0) {
        // Each claimant pays their share, so total claimed is the full item price
        return sum + itemTotal;
      }
      return sum;
    }, 0);
  };

  const claimedAmountCents = isParsed ? calculateClaimedAmount(items) : 0;
  
  // Calculate total subtotal (sum of all items including modifiers)
  const totalSubtotalCents = items.reduce((sum, item) => {
    return sum + (item.priceCents || 0) + 
      (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
  }, 0);

  const tipPresets = [
    { label: "18%", value: Math.round(subtotalCents * 0.18) },
    { label: "20%", value: Math.round(subtotalCents * 0.2) },
    { label: "22%", value: Math.round(subtotalCents * 0.22) },
  ];

  const handleConfirmTip = async (cents?: number) => {
    setIsConfirmingTip(true);
    try {
      await confirmTip({
        receiptId: receipt._id,
        tipCents: cents,
      });
      toast.success("Tip confirmed!");
      setIsAddingTip(false);
    } catch (error) {
      console.error("Failed to confirm tip:", error);
      toast.error("Failed to confirm tip");
    } finally {
      setIsConfirmingTip(false);
    }
  };

  const handleAdjustTip = () => {
    setIsAddingTip(true);
    setTimeout(() => {
      tipSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

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
    <div className="min-h-screen bg-background py-6 sm:py-12 px-2 sm:px-4 flex justify-center">
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={`${getBaseUrl()}/join/${shareCode || ""}`}
        shareCode={shareCode || "...."}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-bold uppercase tracking-widest text-red-600">
                Delete Receipt?
              </h2>
              <p className="text-xs uppercase opacity-60 leading-relaxed">
                This action is permanent. All items, claims, and the receipt image will be destroyed.
              </p>
            </div>
            <div className="dotted-line"></div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="border-2 border-ink py-3 text-xs font-bold uppercase tracking-widest hover:bg-ink/5 transition-all whitespace-nowrap"
              >
                [ CANCEL ]
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? "DELETING..." : ">> DELETE <<"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {needsToJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
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
                className="border-2 border-ink py-3 text-xs font-bold uppercase tracking-widest hover:bg-ink/5 transition-all whitespace-nowrap"
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

      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-full flex justify-between items-center mb-4">
            <Link
              href="/"
              className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 whitespace-nowrap"
            >
              [ {"<<"} BACK ]
            </Link>
            <div className="flex items-center gap-4">
              {isParsed && (
                <button
                  onClick={() => setShowImageOverride(!showImageOverride)}
                  className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 cursor-pointer whitespace-nowrap"
                >
                  [ {isImageVisible ? "HIDE IMAGE" : "VIEW IMAGE"} ]
                </button>
              )}
              <button
                onClick={handleShareClick}
                disabled={isGeneratingCode}
                className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 cursor-pointer disabled:opacity-30 whitespace-nowrap"
              >
                {isGeneratingCode ? "[ ... ]" : "[ SHARE ]"}
              </button>
            </div>
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
                  className={`text-[9px] font-black tracking-tighter px-2 py-0.5 border-2 whitespace-nowrap ${
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
        </div>

        {/* Image Section */}
        {isImageVisible && (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-ink/20 border-dashed"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 whitespace-nowrap">
                  Receipt Image
                </span>
                <div className="flex-1 border-t border-ink/20 border-dashed"></div>
              </div>
              
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

              {parseError && (
                <p className="text-red-600 text-[10px] uppercase font-bold text-center">
                  Error: {parseError}
                </p>
              )}
            </div>
          </>
        )}

        {/* Content Section */}
        {isCurrentlyParsing ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-spin opacity-60"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold uppercase tracking-[0.2em]">
                  Parsing Receipt
                </p>
                <p className="text-2xl font-mono font-bold tabular-nums">
                  {elapsedTime.toFixed(1)}s
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 max-w-[280px]">
              <div className="w-full bg-ink/10 h-1 overflow-hidden">
                <div className="h-full bg-ink/40 animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-[10px] uppercase opacity-50 text-center leading-relaxed">
                AI is extracting items, prices, and totals from your receipt image...
              </p>
            </div>
          </div>
        ) : isParsed ? (
          <div className="flex flex-col gap-6">
            {/* Host Tip Confirmation Banner */}
            {isHost && !receipt.tipConfirmed && !isAddingTip && (
              <div className="bg-yellow-50 border-2 border-dashed border-yellow-400 p-4 flex flex-col items-center gap-3 text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
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
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Action Required: Verify Tip
                  </span>
                </div>
                <p className="text-[10px] uppercase leading-relaxed text-yellow-700 font-medium">
                  AI parsed a tip of **{formatCurrency(receipt.tipCents)}** 
                  {subtotalCents > 0 ? (
                    <> ({((receipt.tipCents || 0) / subtotalCents * 100).toFixed(1)}% of **{formatCurrency(subtotalCents)}** subtotal)</>
                  ) : (
                    <> (Subtotal: **{formatCurrency(subtotalCents)}**)</>
                  )}. 
                  Is this correct?
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => handleConfirmTip()}
                    disabled={isConfirmingTip}
                    className="bg-yellow-600 text-white px-4 py-2 text-[10px] font-bold uppercase hover:bg-yellow-700 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {isConfirmingTip ? "CONFIRMING..." : "[ YES, CONFIRM ]"}
                  </button>
                  <button
                    onClick={handleAdjustTip}
                    disabled={isConfirmingTip}
                    className="border-2 border-yellow-600 text-yellow-700 px-4 py-2 text-[10px] font-bold uppercase hover:bg-yellow-50 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    [ NO, ADJUST ]
                  </button>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex flex-col gap-6">
              {/* Claimed Progress Bar */}
              {isParsed && totalSubtotalCents > 0 && (
              <div className="flex flex-col gap-3 w-full">
                <ClaimedProgressBar
                  claimedAmountCents={claimedAmountCents}
                  totalAmountCents={totalSubtotalCents}
                  label="PROGRESS"
                  showAmounts={true}
                  minBarWidth={20}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap opacity-70">
                Items
              </h3>
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
            </div>
              
              {items.length > 0 ? (
                <div className="flex flex-col gap-6">
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
                      <div key={item._id} className="flex flex-col gap-3">
                        {/* Mobile: Stacked with indentation | Desktop: Grid */}
                        <div className="flex flex-col sm:grid sm:grid-cols-[1.5rem_1fr_auto_4.5rem] sm:gap-2 sm:items-center text-xs uppercase">
                          
                          {/* Main Row: Qty, Name, Price (Mobile) / Grid Columns (Desktop) */}
                          <div className="flex justify-between items-start sm:contents">
                            <div className="flex gap-3 min-w-0 sm:contents">
                              <span className="flex-shrink-0 opacity-60 w-6 sm:order-1">
                                {item.quantity}X
                              </span>
                              <span className="font-bold truncate sm:order-2">{item.name}</span>
                            </div>
                            <span className="text-right font-bold sm:order-4 sm:font-normal">
                              {formatCurrency(totalItemPriceCents)}
                            </span>
                          </div>

                          {/* Sub-section: Modifiers, Actions, Claimants (Indented on Mobile) */}
                          <div className="ml-9 flex flex-col gap-2.5 mt-1.5 sm:mt-0 sm:ml-0 sm:pl-0 sm:border-l-0 sm:contents">
                            
                            {/* Actions (Indented on Mobile | Column 3 on Desktop) */}
                            <div className="flex items-center gap-1 sm:order-3">
                              <button
                                onClick={() => toggleClaim({ itemId: item._id })}
                                className={`text-[10px] font-black tracking-tighter px-2 py-0.5 border-2 transition-all ${
                                  isClaimedByUser
                                    ? "border-ink bg-ink text-paper hover:opacity-90"
                                    : "border-dotted border-ink/40 text-ink/60 hover:border-solid hover:border-ink hover:text-ink"
                                }`}
                              >
                                {isClaimedByUser ? "UNCLAIM" : "CLAIM"}
                              </button>
                              <button
                                onClick={() => setSplittingItemId(splittingItemId === item._id ? null : item._id)}
                                className={`text-[10px] font-black tracking-tighter px-2 py-0.5 border-2 transition-all ${
                                  splittingItemId === item._id
                                    ? "border-ink bg-ink text-paper"
                                    : "border-ink/40 text-ink/60 hover:border-ink hover:text-ink"
                                }`}
                              >
                                SPLIT
                              </button>
                            </div>

                            {/* Modifiers (Indented on Mobile | Beneath Name on Desktop) */}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="flex flex-col gap-0.5 italic opacity-60 text-[10px] uppercase sm:col-start-2 sm:order-5">
                                {item.modifiers.map((mod, idx) => (
                                  <div key={idx}>+ {mod.name}</div>
                                ))}
                              </div>
                            )}

                            {/* Claimants (Indented on Mobile | Beneath Modifiers on Desktop) */}
                            {item.claimedBy && item.claimedBy.length > 0 && (
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 sm:col-start-2 sm:order-6">
                                <span className="text-[9px] uppercase font-bold opacity-30">Claimed by:</span>
                                {item.claimedBy.map((claim, idx) => (
                                  <span key={idx} className="text-[9px] uppercase font-bold opacity-60">
                                    {claim.userName}{idx < (item.claimedBy?.length || 0) - 1 ? "," : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Split Selector UI (Always indented) */}
                        {splittingItemId === item._id && (
                          <div className="mt-4 ml-9 p-3 border-2 border-dashed border-ink/20 flex flex-col gap-3 bg-paper">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Split With Participants:</p>
                              <button 
                                onClick={() => setSplittingItemId(null)}
                                className="text-[11px] font-black uppercase underline hover:opacity-70"
                              >
                                DONE
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {receipt.participants?.map((p) => (
                                <button
                                  key={p.userId}
                                  onClick={() => toggleParticipantClaim({ itemId: item._id, userId: p.userId })}
                                  className={`text-[11px] font-black tracking-tighter px-2 py-1 border-2 transition-all ${
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

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap opacity-70">
                Summary
              </h3>
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
            </div>

            {/* Summary */}
            <div className="flex flex-col gap-2">
                <div className="receipt-item-row text-xs uppercase opacity-70">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalCents)}</span>
              </div>
              <div className="receipt-item-row text-xs uppercase opacity-70">
                <span>Tax</span>
                <span>{formatCurrency(receipt.taxCents)}</span>
              </div>
              <div className="receipt-item-row text-xs uppercase opacity-70" ref={tipSectionRef}>
                <span>
                  Tip
                  {receipt.tipConfirmed && (
                    <span className="ml-1 text-green-600 font-black" title="Confirmed by Host">
                      ✓
                    </span>
                  )}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <span>{formatCurrency(receipt.tipCents)}</span>
                  {isParsed && isHost && !isAddingTip && (
                    <button
                      onClick={() => setIsAddingTip(true)}
                      className="text-[9px] font-bold uppercase underline opacity-50 hover:opacity-100 whitespace-nowrap"
                    >
                      [ {receipt.tipConfirmed ? "EDIT TIP" : "EDIT"} ]
                    </button>
                  )}
                </div>
              </div>

              {isParsed && isHost && isAddingTip && (
                <div className="mt-2 p-3 border-2 border-dashed border-ink/20 flex flex-col gap-3 bg-paper">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      Select Tip Amount:
                    </p>
                    <button
                      onClick={() => setIsAddingTip(false)}
                      className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 whitespace-nowrap"
                    >
                      [ CANCEL ]
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {tipPresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleConfirmTip(preset.value)}
                        disabled={isConfirmingTip}
                        className="border-2 border-ink/20 py-2 text-[10px] font-bold uppercase hover:bg-ink hover:text-paper transition-all"
                      >
                        {preset.label}
                        <br />
                        {formatCurrency(preset.value)}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 pt-2 border-t border-ink/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      Custom Tip ($):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={customTipValue}
                        onChange={(e) => setCustomTipValue(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 min-w-0 bg-transparent border-b-2 border-ink/20 focus:border-ink outline-none text-base font-mono py-1 px-2"
                      />
                      <button
                        onClick={() => {
                          const cents = Math.round(
                            parseFloat(customTipValue) * 100
                          );
                          if (isNaN(cents)) {
                            toast.error("Please enter a valid amount");
                            return;
                          }
                          handleConfirmTip(cents);
                        }}
                        disabled={isConfirmingTip || !customTipValue}
                        className="bg-ink text-paper px-4 py-1 text-[10px] font-bold uppercase hover:opacity-90 transition-all disabled:opacity-30 whitespace-nowrap"
                      >
                        SET
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="receipt-item-row text-lg font-bold uppercase mt-2 border-t-4 border-ink/10 pt-2">
                <span>Total</span>
                <span>{formatCurrency(receipt.totalCents)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-xs uppercase font-bold tracking-widest opacity-40">
              Status: {receipt.status === "error" ? "Error" : "Waiting"}
            </p>
            {receipt.status === "error" ? (
              <p className="text-[10px] uppercase leading-relaxed max-w-[200px] text-red-600">
                Failed to parse receipt. Please try uploading again.
              </p>
            ) : (
              <p className="text-[10px] uppercase leading-relaxed max-w-[200px] opacity-40">
                Preparing to parse...
              </p>
            )}
          </div>
        )}

        {isParsed && user && (
          <div className="flex flex-col gap-4 mt-4">
            <Link
              href={`/receipts/${receiptId}/${user._id}`}
              className="w-full border-2 border-ink py-3 text-xs font-bold uppercase tracking-[0.2em] text-center hover:bg-ink hover:text-paper transition-all"
            >
              VIEW YOUR PERSONAL RECEIPT
            </Link>
          </div>
        )}

        <div className="dotted-line mt-auto"></div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 text-[10px] uppercase tracking-widest opacity-50 italic text-center">
          <p>*** Thank You for Splitting ***</p>
          
          {isHost && (
            <div className="flex items-center gap-4 not-italic">
              <button
                onClick={handleReparse}
                disabled={isCurrentlyParsing}
                title="Reparse Receipt"
                className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 cursor-pointer disabled:opacity-30 flex items-center gap-1 whitespace-nowrap"
              >
                [ REPARSE ]
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-[10px] font-bold uppercase underline text-red-600/50 hover:text-red-600 cursor-pointer whitespace-nowrap"
              >
                [ DELETE ]
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p>Created: {new Date(receipt.createdAt).toLocaleString()}</p>
            <p>Receipt ID: {receipt._id.slice(0, 12)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
