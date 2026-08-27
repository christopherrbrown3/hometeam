import { runCompatibilityProbe } from "./probe.ts";

Deno.test("forms an encrypted standards-based Web Push request and rejects insecure endpoints", async () => {
  const report = await runCompatibilityProbe();
  if (!report.passed) {
    throw new Error(
      `compatibility probe failed: ${JSON.stringify(report.checks)}`,
    );
  }
});
