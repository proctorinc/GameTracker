import * as React from "react";

import { cn } from "@/lib/utils";

const cardNoiseTexture =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' seed='17' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 .32'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.52'/%3E%3C/svg%3E\")";

const cardFiberTexture =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 320 320' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.025 .12' numOctaves='3' seed='31' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 .24'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='.48'/%3E%3Cg fill='%23000' opacity='.16'%3E%3Ccircle cx='27' cy='46' r='.7'/%3E%3Ccircle cx='112' cy='19' r='.45'/%3E%3Ccircle cx='191' cy='83' r='.65'/%3E%3Ccircle cx='288' cy='38' r='.5'/%3E%3Ccircle cx='67' cy='174' r='.55'/%3E%3Ccircle cx='238' cy='219' r='.7'/%3E%3Ccircle cx='143' cy='286' r='.5'/%3E%3C/g%3E%3C/svg%3E\")";

function Card({
  className,
  size = "default",
  children,
  style,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card py-4 text-sm text-card-foreground ring-1 ring-inset ring-foreground/10 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_-1px_0_rgba(0,0,0,0.1)_inset,0_12px_30px_-12px_rgba(15,23,42,0.32)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className,
      )}
      style={{
        backgroundImage: [
          "radial-gradient(circle at 12% 0%, rgba(255,255,255,0.13), transparent 38%)",
          "radial-gradient(circle at 88% 100%, rgba(15,23,42,0.1), transparent 44%)",
          cardFiberTexture,
          cardNoiseTexture,
        ].join(", "),
        backgroundBlendMode: "screen, multiply, soft-light, soft-light",
        backgroundSize: "auto, auto, 320px 320px, 160px 160px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "pl-2 font-heading leading-snug font-bold text-lg group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

function CardEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border border-dashed bg-muted/60 p-4 text-center text-muted-foreground",
        className,
      )}
      data-slot="card-empty"
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardEmpty,
};
