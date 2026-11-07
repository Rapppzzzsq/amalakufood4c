import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
const KEY_LENGTH = 32;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await deriveKey(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, expectedEncoded, extra] = stored.split("$");
  if (scheme === "scrypt" && salt && expectedEncoded && !extra) {
    let expected: Buffer;
    try {
      expected = Buffer.from(expectedEncoded, "base64url");
    } catch {
      return false;
    }
    if (expected.length !== KEY_LENGTH) return false;
    const actual = (await deriveKey(password, salt, KEY_LENGTH)) as Buffer;
    return timingSafeEqual(actual, expected);
  }

  const provided = Buffer.from(password);
  const legacy = Buffer.from(stored);
  return provided.length === legacy.length && timingSafeEqual(provided, legacy);
}
