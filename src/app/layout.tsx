import Link from "next/link";
import {
  type Metadata,
} from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { House, Network, User2 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skybo",
  description: "A Next.js application with Drizzle ORM and TailwindCSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex">
        <main className="relative flex-1 h-full overflow-auto">
          <div className="fixed inset-0 w-full h-full bg-[#f7f6f2] overflow-hidden -z-50">
            <div 
              className={cn("absolute inset-0 opacity-20 pointer-events-none")}
              style={{
                // maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 80%)',
                // WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 80%)',
                backgroundImage: `
                  linear-gradient(30deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000),
                  linear-gradient(30deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)
                `,
                backgroundSize: '20px 35px',
                backgroundPosition: '0 0, 10px 17.5px',
                mixBlendMode: 'overlay',
              }}
            />
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}
