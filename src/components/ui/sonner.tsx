"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      closeButton
      duration={3000}
      expand
      mobileOffset={{ bottom: 20, left: 16, right: 16 }}
      position="top-center"
      richColors
      toastOptions={{
        className:
          "!rounded-xl !border !border-border !bg-card/95 !px-4 !py-3 !text-base !text-card-foreground !shadow-[0_18px_48px_rgba(15,23,42,0.24)] backdrop-blur-xl",
        descriptionClassName: "!text-sm !text-muted-foreground",
      }}
      visibleToasts={3}
      {...props}
    />
  );
}
