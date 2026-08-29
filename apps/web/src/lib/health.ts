import { healthReportSchema } from "@linonward/contracts/health";

import { ApiRequestError, apiUrl, requestJson } from "@/lib/api";

/**
 * What `GET /health` on `apps/api` answered, narrowed to what this app shows.
 * Unreachable is a result, not an exception: the page's whole job is to say so.
 */
export type ApiHealth =
  | { reachable: true; status: string; version: string; uptimeSeconds: number }
  | { reachable: false; reason: string };

export async function fetchApiHealth(): Promise<ApiHealth> {
  try {
    // Liveness is a point-in-time fact; a cached one is worse than none.
    const payload = await requestJson<unknown>(apiUrl("/health"), { cache: "no-store" });
    const parsed = healthReportSchema.safeParse(payload);
    if (!parsed.success) {
      return { reachable: false, reason: "API returned an invalid health report" };
    }
    const report = parsed.data;

    return {
      reachable: true,
      status: report.status,
      version: report.version,
      uptimeSeconds: report.uptimeSeconds,
    };
  } catch (error) {
    return {
      reachable: false,
      reason:
        error instanceof ApiRequestError
          ? `HTTP ${error.status}`
          : error instanceof Error
            ? error.message
            : "unknown error",
    };
  }
}
