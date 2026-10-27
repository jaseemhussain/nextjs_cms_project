import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Source_Serif_4({
  variable: "--font-display-app",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  // Turns relative URLs like /uploads/x.jpg into full URLs for OG/canonical tags.
  metadataBase: new URL(getSiteUrl()),
  title: "NovaCMS",
  description: "Production-style CMS — Next.js, PostgreSQL, RBAC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
