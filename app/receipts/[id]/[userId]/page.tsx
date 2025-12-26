"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { getBaseUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { ClaimedProgressBar } from "@/components/ClaimedProgressBar";

export default function PersonalReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as Id<"receipts">;
  const targetUserId = params.userId as Id<"users">;

  const user = useQuery(api.receipt.currentUser);
  const data = useQuery(api.receipt.getReceiptWithItems, { receiptId });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      );
    };
    setIsMobile(checkMobile());
  }, []);

  // Format cents to dollars
  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined) return "—";
    const amount = (cents / 100).toFixed(2);
    const currency = receipt?.currency || "USD";

    if (currency === "USD") return `$${amount}`;
    if (currency === "EUR") return `€${amount}`;
    if (currency === "GBP") return `£${amount}`;
    if (currency === "CAD") return `C$${amount}`;
    if (currency === "AUD") return `A$${amount}`;

    return `${amount} ${currency}`;
  };

  if (data === undefined || user === undefined) {
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
              Loading Personal Receipt...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-background py-6 sm:py-12 px-2 sm:px-4 flex justify-center">
        <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col items-center gap-6">
          <Link
            href={`/receipts/${receiptId}`}
            className="self-start text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 mb-4 whitespace-nowrap"
          >
            [ {"<<"} BACK TO RECEIPT ]
          </Link>
          <div className="text-center space-y-4 py-12">
            <h1 className="text-xl font-bold uppercase tracking-widest">
              Not Found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const { receipt, items } = data;

  const targetParticipant = receipt.participants?.find(
    (p) => p.userId === targetUserId,
  );
  const targetUserName = targetParticipant?.userName || "User";

  const isParsed = receipt.status === "parsed";

  // Helper to determine if we should show tip warning
  const shouldShowTipConfirmation = () => {
    if (!receipt || receipt.tipConfirmed) return false;
    const type = receipt.merchantType?.toLowerCase();

    // These types typically expect a tip, so we warn even if it's 0
    const alwaysTippable = [
      "restaurant",
      "services",
      "travel",
      "entertainment",
    ];
    if (type && alwaysTippable.includes(type)) return true;

    // For other types (grocery, retail, etc.), only show if a tip was actually detected
    if (receipt.tipCents && receipt.tipCents > 0) return true;

    // Default to true for unknown types to be safe
    if (!type) return true;

    return false;
  };

  // Check if target user is the host
  const isHost = receipt.hostUserId === targetUserId;

  // Filter items claimed by this user
  const personalItems = items.filter((item) =>
    item.claimedBy?.some((claim) => claim.userId === targetUserId),
  );

  // Calculate personal subtotal
  const personalSubtotalCents = personalItems.reduce((sum, item) => {
    const totalItemPriceCents =
      (item.priceCents || 0) +
      (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
    const numClaimants = item.claimedBy?.length || 1;
    return sum + Math.round(totalItemPriceCents / numClaimants);
  }, 0);

  // Calculate total receipt subtotal (to find proportion)
  const totalReceiptSubtotalCents = items.reduce((sum, item) => {
    return (
      sum +
      (item.priceCents || 0) +
      (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0)
    );
  }, 0);

  const personalProportion =
    totalReceiptSubtotalCents > 0
      ? personalSubtotalCents / totalReceiptSubtotalCents
      : 0;

  // Apportion tax and tip
  const personalTaxCents = Math.round(
    (receipt?.taxCents || 0) * personalProportion,
  );
  const personalTipCents = Math.round(
    (receipt?.tipCents || 0) * personalProportion,
  );
  const personalTotalCents =
    personalSubtotalCents + personalTaxCents + personalTipCents;

  // Calculate total claimed amount for progress bar
  const calculateClaimedAmount = (items: typeof data.items): number => {
    return items.reduce((sum, item) => {
      const itemTotal =
        (item.priceCents || 0) +
        (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
      const numClaimants = item.claimedBy?.length || 0;
      if (numClaimants > 0) {
        // Each claimant pays their share, so total claimed is the full item price
        return sum + itemTotal;
      }
      return sum;
    }, 0);
  };

  const claimedAmountCents = calculateClaimedAmount(items);

  // Calculate total subtotal (sum of all items including modifiers) - same as totalReceiptSubtotalCents
  const totalSubtotalCents = totalReceiptSubtotalCents;

  const handleVenmoPay = () => {
    if (!receipt.hostVenmoUsername) {
      toast.error("Host hasn't set up their Venmo username yet.");
      return;
    }

    const amount = (personalTotalCents / 100).toFixed(2);
    const merchant = receipt.merchantName || "Receipt";
    const note = encodeURIComponent(`Split for ${merchant}`);
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=${receipt.hostVenmoUsername}&amount=${amount}&note=${note}`;

    window.location.href = venmoUrl;
  };

  return (
    <div className="min-h-screen bg-background py-6 sm:py-12 px-2 sm:px-4 flex justify-center">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full flex justify-between items-center">
            <Link
              href={`/receipts/${receiptId}`}
              className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 whitespace-nowrap"
            >
              [ {"<<"} FULL RECEIPT ]
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const url = `${getBaseUrl()}/receipts/${receiptId}/${targetUserId}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Personal statement link copied!");
                }}
                className="text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 cursor-pointer whitespace-nowrap"
              >
                [ SHARE STATEMENT ]
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-center pt-6">
              {receipt.merchantName || "Transaction Details"}
            </h1>
            <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase tracking-widest opacity-50">
              <span className="text-ink font-black">{targetUserName}</span>
              <span className="opacity-30">•</span>

              {receipt.merchantType && (
                <>
                  <span>{receipt.merchantType}</span>
                  <span className="opacity-30">•</span>
                </>
              )}

              {receipt.date && <span>{receipt.date}</span>}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-6">
          {/* Tip Confirmation Warning */}
          {receipt && shouldShowTipConfirmation() && (
            <div className="bg-yellow-50 border-2 border-yellow-200 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-yellow-700">
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
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Tip Not Confirmed
                </p>
              </div>
              <p className="text-[10px] uppercase leading-relaxed text-yellow-600 font-medium">
                The host has not yet confirmed the final tip amount. Please wait
                for confirmation before settling your payment to ensure the
                total is accurate.
              </p>
            </div>
          )}

          {/* Items */}
          <div className="flex flex-col gap-4">
            {/* Claimed Progress Bar */}
            {totalSubtotalCents > 0 && (
              <div className="flex flex-col gap-2 w-full">
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
                Your Items
              </h3>
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
            </div>

            {personalItems.length > 0 ? (
              <div className="flex flex-col gap-3">
                {personalItems.map((item) => {
                  const itemSubtotal =
                    (item.priceCents || 0) +
                    (item.modifiers?.reduce(
                      (s, m) => s + (m.priceCents || 0),
                      0,
                    ) || 0);
                  const numClaimants = item.claimedBy?.length || 1;
                  const yourShare = Math.round(itemSubtotal / numClaimants);

                  return (
                    <div key={item._id} className="flex flex-col gap-1">
                      <div className="grid grid-cols-[1.5rem_1fr_4.5rem] gap-2 items-center text-xs uppercase">
                        <span className="flex-shrink-0 opacity-60">
                          {item.quantity}X
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">
                            {item.name}
                          </span>
                          {numClaimants > 1 && (
                            <span className="text-[9px] opacity-50 italic">
                              (1/{numClaimants} share of{" "}
                              {formatCurrency(itemSubtotal)})
                            </span>
                          )}
                        </div>
                        <span className="text-right">
                          {formatCurrency(yourShare)}
                        </span>
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
              <p className="text-[10px] uppercase opacity-40 text-center italic py-4">
                No items claimed yet
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
              <span>Your Subtotal</span>
              <span>{formatCurrency(personalSubtotalCents)}</span>
            </div>
            <div className="receipt-item-row text-xs uppercase opacity-70">
              <span>Your Share of Tax</span>
              <span>{formatCurrency(personalTaxCents)}</span>
            </div>
            <div className="receipt-item-row text-xs uppercase opacity-70">
              <span>Your Share of Tip</span>
              <span>{formatCurrency(personalTipCents)}</span>
            </div>
            <div className="receipt-item-row text-lg font-bold uppercase mt-2 border-t-4 border-ink/10 pt-2">
              <span>Your Total</span>
              <span>{formatCurrency(personalTotalCents)}</span>
            </div>
          </div>

          {/* Venmo Payment Button - Mobile Only - Hide if user is host */}
          {isMobile && personalTotalCents > 0 && !isHost && (
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={handleVenmoPay}
                className="w-full bg-paper text-ink border-2 border-ink py-4 px-6 font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-ink hover:text-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[4px_4px_0px_var(--ink)] touch-manipulation"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  {/* <path d="M19.704 3C20.419 3 21 3.581 21 4.296v15.408C21 20.419 20.419 21 19.704 21H4.296C3.581 21 3 20.419 3 19.704V4.296C3 3.581 3.581 3 4.296 3h15.408zm-3.115 14.212l2.607-9.638h-2.18l-1.542 6.425h-.065L14.067 7.574h-2.312l2.427 8.802c.304 1.01 1.104 1.637 2.23 1.637.787 0 1.483-.309 1.877-.801z" /> */}
                </svg>
               PAY HOST VIA VENMO
              </button>
              {receipt.hostVenmoUsername && (
                <p className="text-[9px] uppercase text-center opacity-50 font-bold tracking-widest mt-1">
                  Paying to: @{receipt.hostVenmoUsername}
                </p>
              )}
            </div>
          )}
          {/* Alternative content for host */}
          {isHost && (
            <div className="flex flex-col gap-3 mt-4">
              {/* Option 1: Payment Summary */}
              <div className="border-2 border-ink/20 p-4 bg-paper/50 flex flex-col gap-2">
                <h4 className="text-[12px] font-bold uppercase tracking-wider opacity-70">
                  Payment Summary
                </h4>
                <div className="flex flex-col gap-1 text-[10px] uppercase opacity-60">
                  <div className="flex justify-between">
                    <span>Total Receipt:</span>
                    <span>{formatCurrency(receipt.totalCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Share:</span>
                    <span>{formatCurrency(personalTotalCents)}</span>
                  </div>
                  <div className="flex text-[11px] justify-between font-bold border-t border-ink/10 pt-1 mt-1">
                    <span>Expected from Others:</span>
                    <span>
                      {formatCurrency(
                        (receipt.totalCents || 0) - personalTotalCents,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 2: Share Receipt
              <button
                onClick={() => {
                  const url = `${getBaseUrl()}/receipts/${receiptId}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Receipt link copied!");
                }}
                className="w-full border-2 border-ink py-3 px-4 text-xs font-bold uppercase tracking-widest hover:bg-ink/10 transition-all active:scale-[0.98] touch-manipulation"
              >
                [ SHARE RECEIPT ]
              </button> */}
            </div>
          )}
        </div>

        <div className="dotted-line mt-auto"></div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 text-[10px] uppercase tracking-widest opacity-50 italic text-center">
          <p>*** Personal Breakdown ***</p>
          <p>Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
