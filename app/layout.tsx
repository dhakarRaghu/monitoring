import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Mentor — Developer Growth Tracker",
  description: "Track your growth as a developer across 18 areas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <body className="h-full overflow-hidden flex bg-background">
        <Sidebar />
        <main className="h-full flex-1 min-w-0 overflow-y-auto relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[520px] h-[320px] bg-white/[0.025] rounded-full blur-[130px]" />
          </div>
          <div className="relative p-8 max-w-[1240px] mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
