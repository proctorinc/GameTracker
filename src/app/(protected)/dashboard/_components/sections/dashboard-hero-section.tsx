"use client";

import { useDashboardPage } from "../dashboard-page-provider";

export function DashboardHeroSection() {
  const { user } = useDashboardPage();

  return (
    <div className="space-y-1 pl-2">
      <h1 className="text-4xl font-black">Hi, {user.firstName}!</h1>
    </div>
  );
}
