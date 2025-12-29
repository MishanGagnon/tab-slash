import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  params: Promise<{ id: string; userId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, userId } = await params;
  const receiptId = id as Id<"receipts">;
  const targetUserId = userId as Id<"users">;
  
  try {
    const data = await fetchQuery(api.receipt.getReceiptWithItems, { receiptId });
    
    if (data && data.receipt) {
      const participant = data.receipt.participants?.find(p => p.userId === targetUserId);
      const name = participant?.userName || "Guest";
      const merchant = data.receipt.merchantName || "Receipt";
      return {
        title: `${name}'s Split - ${merchant}`,
      };
    }
  } catch (e) {
    // Fallback
  }

  return {
    title: "Personal Receipt",
  };
}

export default function PersonalReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

