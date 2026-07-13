import { scrypt, timingSafeEqual } from "node:crypto";

/**
 * The PIN check. NODE-ONLY, and deliberately kept out of ./auth.ts.
 *
 * scrypt does not exist on the Edge runtime, and middleware imports auth.ts. If this
 * lived there, the Edge bundle would fail to build and every route behind the
 * middleware matcher would 404 — with no error message pointing at crypto. Keeping it
 * in a separate module that only the (nodejs-runtime) login route imports is what
 * keeps that boundary honest.
 *
 * scrypt is the point, not an implementation detail: at ~100ms a guess it drops the
 * throughput of an online attack on a 4-digit PIN by three orders of magnitude. The
 * timing-safe compare is belt and braces.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const salt = process.env.EDIT_PIN_SALT;
  const expected = process.env.EDIT_PIN_HASH;
  if (!salt || !expected) throw new Error("EDIT_PIN_SALT / EDIT_PIN_HASH are not set");

  const derived: Buffer = await new Promise((resolve, reject) => {
    scrypt(pin, salt, 64, (err, key) => (err ? reject(err) : resolve(key as Buffer)));
  });

  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, expectedBuf);
}
