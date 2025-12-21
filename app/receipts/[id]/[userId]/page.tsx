"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function PersonalReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptImageId = params.id as Id<"images">;
  const targetUserId = params.userId as Id<"users">;

  const user = useQuery(api.receipt.currentUser);
  const data = useQuery(api.receipt.getImageWithReceipt, { imageId: receiptImageId });

  // Format cents to dollars
  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined) return "—";
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (data === undefined || user === undefined) {
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
              Loading Personal Receipt...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 flex justify-center">
        <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col items-center gap-6">
          <Link
            href={`/receipts/${receiptImageId}`}
            className="self-start text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 mb-4"
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
  
  // Filter items claimed by this user
  const personalItems = items.filter(item => 
    item.claimedBy?.some(claim => claim.userId === targetUserId)
  );

  const targetUserName = personalItems[0]?.claimedBy?.find(c => c.userId === targetUserId)?.userName || "User";

  // Calculate personal subtotal
  const personalSubtotalCents = personalItems.reduce((sum, item) => {
    const totalItemPriceCents = (item.priceCents || 0) + (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
    const numClaimants = item.claimedBy?.length || 1;
    return sum + Math.round(totalItemPriceCents / numClaimants);
  }, 0);

  // Calculate total receipt subtotal (to find proportion)
  const totalReceiptSubtotalCents = items.reduce((sum, item) => {
    return sum + (item.priceCents || 0) + (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
  }, 0);

  const personalProportion = totalReceiptSubtotalCents > 0 ? personalSubtotalCents / totalReceiptSubtotalCents : 0;
  
  // Apportion tax and tip
  const personalTaxCents = Math.round((receipt?.taxCents || 0) * personalProportion);
  const personalTipCents = Math.round((receipt?.tipCents || 0) * personalProportion);
  const personalTotalCents = personalSubtotalCents + personalTaxCents + personalTipCents;

  return (
    <div className="min-h-screen bg-background py-12 px-4 flex justify-center">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href={`/receipts/${receiptImageId}`}
            className="self-start text-[10px] font-bold uppercase underline opacity-50 hover:opacity-100 mb-4"
          >
            [ {"<<"} BACK TO FULL RECEIPT ]
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-center">
            Personal Statement
          </h1>
          <p className="text-xs uppercase tracking-widest font-bold">
            For: {targetUserName}
          </p>
          <div className="dotted-line"></div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            {receipt?.merchantName}
          </p>
          {receipt?.date && (
            <p className="text-[10px] uppercase tracking-widest opacity-50">
              {receipt.date}
            </p>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-6">
          {/* Items */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-center">
              --- Your Items ---
            </h3>
            {personalItems.length > 0 ? (
              <div className="flex flex-col gap-3">
                {personalItems.map((item) => {
                  const itemSubtotal = (item.priceCents || 0) + (item.modifiers?.reduce((s, m) => s + (m.priceCents || 0), 0) || 0);
                  const numClaimants = item.claimedBy?.length || 1;
                  const yourShare = Math.round(itemSubtotal / numClaimants);

                  return (
                    <div key={item._id} className="flex flex-col gap-1">
                      <div className="grid grid-cols-[1.5rem_1fr_4.5rem] gap-2 items-center text-xs uppercase">
                        <span className="flex-shrink-0 opacity-60">
                          {item.quantity}X
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">{item.name}</span>
                          {numClaimants > 1 && (
                            <span className="text-[9px] opacity-50 italic">
                              (1/{numClaimants} share of {formatCurrency(itemSubtotal)})
                            </span>
                          )}
                        </div>
                        <span className="text-right">{formatCurrency(yourShare)}</span>
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

          <div className="dotted-line"></div>

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

