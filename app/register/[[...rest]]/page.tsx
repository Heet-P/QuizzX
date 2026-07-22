import { SignUp } from "@clerk/nextjs";

// Ported from client/src/pages/RegisterPage.jsx.
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-white p-4">
      <SignUp path="/register" routing="path" signInUrl="/login" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
