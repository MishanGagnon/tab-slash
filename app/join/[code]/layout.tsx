import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Split",
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

