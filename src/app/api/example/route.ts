/**
 * Protected route template - all API routes should use this pattern
 */
import { requireAuth, withAuth } from "@/lib/auth/require-auth";

export const GET = withAuth(async () => {
  return Response.json({ message: "You are authenticated!" });
});
