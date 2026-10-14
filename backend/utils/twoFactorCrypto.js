const crypto = require("crypto");

function getEncryptionKey() {
  const value = process.env.TOTP_ENCRYPTION_KEY;

  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    const error = new Error(
      "Two-factor encryption is not configured correctly."
    );

    error.statusCode = 503;
    throw error;
  }

  return Buffer.from(value, "hex");
}

function encryptSecret(value) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);

  const authenticationTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authenticationTag.toString("hex"),
    encrypted.toString("hex")
  ].join(":");
}

function decryptSecret(value) {
  if (typeof value !== "string") {
    throw new Error("The encrypted authenticator secret is unavailable.");
  }

  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new Error("The encrypted authenticator secret is invalid.");
  }

  const [ivHex, tagHex, encryptedHex] = parts;

  if (
    !/^[a-f0-9]{24}$/i.test(ivHex) ||
    !/^[a-f0-9]{32}$/i.test(tagHex) ||
    !/^(?:[a-f0-9]{2})+$/i.test(encryptedHex)
  ) {
    throw new Error("The encrypted authenticator secret is invalid.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

function normalizeRecoveryCode(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[^a-f0-9]/gi, "").toUpperCase();
}

function hashRecoveryCode(value) {
  const normalized = normalizeRecoveryCode(value);

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}

function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const rawCode = crypto.randomBytes(10).toString("hex").toUpperCase();

    return rawCode.match(/.{1,4}/g).join("-");
  });
}

module.exports = {
  encryptSecret,
  decryptSecret,
  normalizeRecoveryCode,
  hashRecoveryCode,
  generateRecoveryCodes
};