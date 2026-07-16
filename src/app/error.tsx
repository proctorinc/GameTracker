"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppErrorPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  function handleRefresh() {
    setIsRefreshing(true);
    window.location.reload();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border/80 bg-background/95 shadow-lg backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl">
            Looks like you stepped away for a bit
          </CardTitle>
          <CardDescription className="text-base">
            Refresh to jump back in where you left off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={isRefreshing}
            onClick={handleRefresh}
            type="button"
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            className="w-full"
            render={<Link href="/dashboard" />}
            type="button"
            variant="ghost"
          >
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
