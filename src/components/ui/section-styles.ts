import { cn } from "@/lib/utils";

import { buttonVariants } from "./button";

export const sectionActionClassName = cn(
  buttonVariants({ variant: "ghost", size: "sm" }),
  "text-muted-foreground hover:text-foreground",
);

export const sectionActionToneClassName =
  "text-muted-foreground hover:text-foreground";

export const sectionItemClassName =
  "rounded-2xl border border-border bg-muted/60 px-4 py-3";

export const sectionItemTitleClassName = "text-sm font-medium";

export const sectionItemMetaClassName = "text-xs text-muted-foreground";
