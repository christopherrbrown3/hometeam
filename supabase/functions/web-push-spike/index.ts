import { runCompatibilityProbe } from "./probe.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "method_not_allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  try {
    const report = await runCompatibilityProbe();
    return Response.json(report, { status: report.passed ? 200 : 500 });
  } catch (error) {
    return Response.json(
      {
        error: "compatibility_probe_failed",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
});
