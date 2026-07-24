import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encrypts the Teams Workflows webhook URL at rest. That URL is a bearer
// secret — Teams embeds a signature in its query string (`sig=...`), so
// anyone with the plaintext URL can post into the channel — and per the
// feature spec it must never reach the browser. AES-256-GCM, key from
// TEAMS_WEBHOOK_ENCRYPTION_KEY (32 raw bytes, base64-encoded — generate one
// with `openssl rand -base64 32`), decrypted only inside server-only route
// handlers at the moment we actually call out to Teams.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended nonce length for GCM

function getKey(): Buffer {
  const raw = process.env.TEAMS_WEBHOOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TEAMS_WEBHOOK_ENCRYPTION_KEY is not set — required to store/read Teams webhook URLs.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TEAMS_WEBHOOK_ENCRYPTION_KEY must decode to exactly 32 bytes (generate with `openssl rand -base64 32`).");
  }
  return key;
}

/** Encrypts a plaintext webhook URL into a single storable string: "iv:authTag:ciphertext" (all base64). */
export function encryptWebhookUrl(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/** Reverses {@link encryptWebhookUrl}. Throws if the ciphertext or auth tag doesn't match (tampered/corrupt/wrong key). */
export function decryptWebhookUrl(stored: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Stored Teams webhook value is malformed.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
