import { type Metadata } from "next";
import {
  Fredoka,
  Geist_Mono,
  Ranchers,
  Chicle,
  Dongle,
} from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
import Link from "next/link";
import { CheckSquare, CheckSquare2, Gamepad } from "lucide-react";

// const fontSans = Winky_Sans({
//   subsets: ["latin"],
//   variable: "--font-winky",
// });

const fontSkybo = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const fontRanchers = Ranchers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ranchers",
});

const fontChicle = Chicle({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-chicle",
});

const fontDongle = Dongle({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dongle",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        fontSkybo.variable,
        fontChicle.variable,
        fontRanchers.variable,
        fontMono.variable,
        fontDongle.variable,
      )}
    >
      <body className="min-h-full flex bg-slate-100 dark:bg-black">
        <ThemeProvider>
          <main className="relative flex-1 h-full overflow-auto">
            <div className="flex h-16 w-full items-center justify-center px-4 text-center backdrop-blur-sm">
              <Link
                href="/dashboard"
                aria-label={`${APP_NAME} home`}
                className="group inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-foreground transition-transform transition-colors hover:scale-[1.01] hover:border-border/40 dark:border-white/20 scale-75"
              >
                <CheckSquare2 className="size-4" />
                <span className="font-black font-title tracking-[0.18em] sm:text-[0.95rem]">
                  {APP_NAME}
                </span>
              </Link>
            </div>
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
