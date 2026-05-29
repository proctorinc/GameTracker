import { Home, User2, Users } from "lucide-react";
import Link from "next/link";

export default function NavBar() {
  return (
    <div className="flex justify-center fixed bottom-0 left-1/2 -translate-x-1/2 p-4 w-full z-50">
      <div className="flex w-full max-w-sm items-center justify-between rounded-full border border-border/70 bg-card/85 px-4 py-3 shadow-xl backdrop-blur-xs">
        <Link
          href="/friends"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90"
        >
          <Users className="size-6" />
        </Link>
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90"
        >
          <Home className="size-6" />
        </Link>
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90"
        >
          <User2 className="size-6" />
        </Link>
      </div>
    </div>
  );
}
