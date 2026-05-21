import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hantara - API Client",
  description: "Fast, collaborative API client with collections and folders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
