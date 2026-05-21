"use client"

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

const HIDE_NAV_URLS = ["/card/pull", "/profile/complete"]

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showNav = HIDE_NAV_URLS.includes(pathname);

  return (
    <>
      {children}
      {!showNav && <NavBar />}
    </>
  );
}
