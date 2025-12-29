import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const receiptId = id as Id<"receipts">;
  
  try {
    const data = await fetchQuery(api.receipt.getReceiptWithItems, { receiptId });
    
    if (data && data.receipt) {
      return {
        title: data.receipt.merchantName || "Receipt Details",
      };
    }
  } catch (e) {
    // Fallback
  }

  return {
    title: "Receipt Details",
  };
}

export default function ReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

