import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  
  try {
    const receiptId = await fetchQuery(api.share.getReceiptByCode, { code });
    if (receiptId) {
      const data = await fetchQuery(api.receipt.getReceiptWithItems, { receiptId });
      if (data && data.receipt) {
        return {
          title: `Join ${data.receipt.merchantName || "Split"}`,
        };
      }
    }
  } catch (e) {
    // Fallback
  }

  return {
    title: "Join Split",
  };
}

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

