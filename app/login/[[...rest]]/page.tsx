import { SignIn } from "@clerk/nextjs";

// Ported from client/src/pages/LoginPage.jsx. Optional catch-all segment
// ([[...rest]]) is required by Clerk so its internal multi-step flows
// (factor selection, etc.) can render at nested sub-paths of /login.
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-white p-4">
      <SignIn path="/login" routing="path" signUpUrl="/register" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
