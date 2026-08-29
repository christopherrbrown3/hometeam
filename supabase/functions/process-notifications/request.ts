const DEFAULT_MAXIMUM_BODY_BYTES = 2_048;

export async function readBoundedJsonObject(
  request: Request,
  allowedKeys: ReadonlySet<string>,
  maximumBodyBytes = DEFAULT_MAXIMUM_BODY_BYTES,
): Promise<Readonly<Record<string, unknown>> | null> {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBodyBytes)
  ) return null;

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maximumBodyBytes) return null;
  if (text.trim() === "") return {};

  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    return Object.keys(record).every((key) => allowedKeys.has(key))
      ? record
      : null;
  } catch {
    return null;
  }
}
