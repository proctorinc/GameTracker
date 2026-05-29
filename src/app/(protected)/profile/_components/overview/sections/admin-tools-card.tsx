"use client";

import Link from "next/link";
import { ExternalLink, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminToolsCard() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Admin</CardTitle>
        <Link
          href="/admin"
          className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 px-4 py-3 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
              <Shield className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Admin tools</p>
              <p className="text-xs text-muted-foreground">
                App management tools
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            <ExternalLink className="size-4" />
          </span>
        </Link>
      </CardHeader>
    </Card>
  );
}
