import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blindtest",
  description: "Blindtest musical en temps réel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
