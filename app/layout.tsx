import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "@/lib/trpc/react";

export const metadata: Metadata = {
  title: "陣地トリゲーム",
  description: "自律移動するコマが領地を塗り、合体・繁殖・均等化を行う観察型シミュレーションゲーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

