// Clerk publishable keys are `pk_{test|live}_<base64(frontendApiHost + "$")>`.
// Decoding it (rather than hardcoding a domain) means this stays correct if
// the key ever changes (e.g. test -> production instance).
export function getClerkFrontendApiHost(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  const encoded = key.split("_").slice(2).join("_");
  if (!encoded) return null;
  try {
    return atob(encoded).replace(/\$$/, "");
  } catch {
    return null;
  }
}
