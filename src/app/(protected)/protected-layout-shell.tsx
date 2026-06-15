"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

const HIDE_NAV_EXACT_PATHS = ["/card/pull", "/profile/complete"];
const HIDE_NAV_PATHS = ["/game/create/settings", "/play"];

function shouldHideNav(pathname: string) {
  return (
    HIDE_NAV_EXACT_PATHS.includes(pathname) ||
    HIDE_NAV_PATHS.some(
      (prefix) =>
        pathname === prefix ||
        pathname.startsWith(`${prefix}/`) ||
        pathname.endsWith(`${prefix}`),
    )
  );
}

type ProtectedLayoutShellProps = {
  children: React.ReactNode;
  hasPendingFriendInvitations: boolean;
};

export function ProtectedLayoutShell({
  children,
  hasPendingFriendInvitations,
}: ProtectedLayoutShellProps) {
  const pathname = usePathname();
  const hideNav = shouldHideNav(pathname);

  return (
    <>
      {children}
      {!hideNav ? (
        <NavBar hasPendingFriendInvitations={hasPendingFriendInvitations} />
      ) : null}
    </>
  );
}
