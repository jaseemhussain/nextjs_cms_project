import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Learning CMS",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
