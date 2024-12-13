import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Orbitron } from "next/font/google";

export const metadata: Metadata = {
  title: "FrameForge",
  description: "Made with ❤️ by Metaschool",
};

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable}`}>
      <body className={orbitron.className}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
