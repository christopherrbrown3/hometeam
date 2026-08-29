const MINIMUM_SECRET_BYTES = 32;

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export function isAuthorizedProcessorRequest(
  request: Request,
  configuredSecret: string | undefined,
): boolean {
  if (
    !configuredSecret ||
    new TextEncoder().encode(configuredSecret).length < MINIMUM_SECRET_BYTES
  ) {
    return false;
  }
  const suppliedSecret = request.headers.get("x-hometeam-processor-secret") ??
    "";
  return constantTimeEqual(suppliedSecret, configuredSecret);
}

function findSecretKey(value: unknown): string | undefined {
  if (typeof value === "string" && value.startsWith("sb_secret_")) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSecretKey(item);
      if (found) return found;
    }
  } else if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      const found = findSecretKey(item);
      if (found) return found;
    }
  }
  return undefined;
}

export function resolveSupabaseServerKey(
  secretKeysJson: string | undefined,
  legacyServiceRoleKey: string | undefined,
): string | undefined {
  if (secretKeysJson) {
    try {
      const currentSecretKey = findSecretKey(JSON.parse(secretKeysJson));
      if (currentSecretKey) return currentSecretKey;
    } catch {
      // Fall through to the legacy hosted/local runtime value.
    }
  }
  return legacyServiceRoleKey?.trim() || undefined;
}
