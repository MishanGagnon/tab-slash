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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Receipt Details
          </h1>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
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
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* Parse / Reparse Button */}
            <div className="space-y-3">
              <button
                onClick={handleParseReceipt}
                disabled={isParsing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none flex items-center justify-center gap-3"
              >
                {isParsing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isParsed ? "Reparsing with AI..." : "Parsing with AI..."}
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      {isParsed ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                        />
                      )}
                    </svg>
                    {isParsed ? "Reparse Receipt with AI" : "Parse Receipt with AI"}
                  </>
                )}
              </button>
              {parseError && (
                <p className="text-red-500 text-sm text-center">
                  {parseError}
                </p>
              )}
            </div>

            {/* Upload info */}
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Uploaded {new Date(image.uploadedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Right Column - Parsed Data */}
          <div className="space-y-6">
            {isParsed ? (
              <>
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Parsed
                    </span>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <div className="flex flex-col mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {receipt.merchantName || "Receipt Summary"}
                    </h2>
                    {receipt.date && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {receipt.date}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">
                        Subtotal
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
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
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">
                        Tax
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(receipt.taxCents)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">
                        Tip
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(receipt.tipCents)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 -mx-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Total
                      </span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(receipt.totalCents)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    Items ({items.length})
                  </h2>
                  {items.length > 0 ? (
                    <div className="space-y-3">
                        {items.map((item) => {
                          const totalItemPriceCents = (item.priceCents || 0) + 
                            (item.modifiers?.reduce((sum, mod) => sum + (mod.priceCents || 0), 0) || 0);
                          
                          return (
                            <div
                              key={item._id}
                              className="flex justify-between items-start py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                                    {item.quantity}x
                                  </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {item.name}
                                  </span>
                                </div>
                                {/* Modifiers */}
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <div className="mt-1 ml-10 space-y-1">
                                    {item.modifiers.map((mod, idx) => (
                                      <div
                                        key={idx}
                                        className="text-sm text-slate-500 dark:text-slate-400"
                                      >
                                        <span>+ {mod.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-slate-800 dark:text-slate-200 ml-4">
                                {formatCurrency(totalItemPriceCents)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                      No items parsed
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Not parsed yet */
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-slate-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Receipt Not Parsed Yet
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Click the &quot;Parse Receipt with AI&quot; button to extract
                  items and totals from this receipt.
                </p>
                <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Extracts line items with quantities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Identifies tax, tip, and total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Detects item modifiers</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

