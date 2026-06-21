import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-black">
      <Card className="w-full max-w-md border-border/80 bg-background/95 shadow-lg backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl">That page isn&apos;t here</CardTitle>
          <CardDescription className="text-base">
            It may have moved, or the link might be out of date.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            className="w-full"
            render={<Link href="/dashboard" />}
            type="button"
          >
            Go to dashboard
          </Button>
          <Button
            className="w-full"
            render={<Link href="/" />}
            type="button"
            variant="ghost"
          >
            Go home
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
