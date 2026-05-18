/**
 * Protected route template - all API routes should use this pattern
 */
import { requireAuth } from "@/lib/auth/require-auth";

export const GET = withAuth(async (req) => {
  return Response.json({ message: "You are authenticated!" });
});
