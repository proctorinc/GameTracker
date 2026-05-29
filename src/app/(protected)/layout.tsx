"use client"

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

const HIDE_NAV_EXACT_PATHS = ["/card/pull", "/profile/complete"];
const HIDE_NAV_PREFIX_PATHS = ["/game"];

function shouldHideNav(pathname: string) {
  return (
    HIDE_NAV_EXACT_PATHS.includes(pathname) ||
    HIDE_NAV_PREFIX_PATHS.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const hideNav = shouldHideNav(pathname);

  return (
    <>
      {children}
      {!hideNav && <NavBar />}
    </>
  );
}
