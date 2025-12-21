"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const imageId = params.id as Id<"images">;

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const data = useQuery(api.receipt.getImageWithReceipt, { imageId });
  const parseReceipt = useAction(api.receiptActions.triggerParseReceipt);

  const handleParseReceipt = async () => {
    setIsParsing(true);
    setParseError(null);
    try {
      await parseReceipt({ imageId });
    } catch (error) {
      console.error("Failed to parse receipt:", error);
      setParseError(
        error instanceof Error ? error.message : "Failed to parse receipt"
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Format cents to dollars
  const formatCurrency = (cents: number | undefined) => {
    if (cents === undefined) return "—";
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Loading state
  if (data === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <p className="ml-2 text-slate-600 dark:text-slate-400">
                Loading receipt...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (data === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Receipt Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The receipt you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to home
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

          <button
            onClick={handleParseReceipt}
            disabled={isParsing}
            className="w-full border-2 border-ink py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-ink hover:text-paper transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isParsing ? (
              <>
                <span className="animate-spin text-lg">⚙</span>
                {isParsed ? "Reparsing..." : "Parsing..."}
              </>
            ) : (
              <>
                {isParsed ? ">> Reparse Receipt <<" : ">> Parse Receipt <<"}
              </>
            )}
          </button>
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
                <div className="receipt-item-dots"></div>
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
                <div className="receipt-item-dots"></div>
                <span>{formatCurrency(receipt.taxCents)}</span>
              </div>
              <div className="receipt-item-row text-xs uppercase opacity-70">
                <span>Tip</span>
                <div className="receipt-item-dots"></div>
                <span>{formatCurrency(receipt.tipCents)}</span>
              </div>
              <div className="receipt-item-row text-lg font-bold uppercase mt-2">
                <span>Total</span>
                <div className="receipt-item-dots border-ink/50 border-b-4"></div>
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

                    return (
                      <div key={item._id} className="flex flex-col gap-1">
                        <div className="receipt-item-row text-xs uppercase">
                          <span className="flex-shrink-0 mr-2 opacity-60">
                            {item.quantity}X
                          </span>
                          <span className="font-bold">{item.name}</span>
                          <div className="receipt-item-dots"></div>
                          <span>{formatCurrency(totalItemPriceCents)}</span>
                        </div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="flex flex-col gap-0.5 ml-6 italic opacity-60 text-[10px] uppercase">
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

