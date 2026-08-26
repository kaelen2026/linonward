import { apiUrl } from "@/lib/api";

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
    const response = await fetch(apiUrl("/health"), { cache: "no-store" });

    if (!response.ok) {
      return { reachable: false, reason: `HTTP ${response.status}` };
    }

    const report = (await response.json()) as Partial<{
      status: string;
      version: string;
      uptimeSeconds: number;
    }>;

    return {
      reachable: true,
      status: report.status ?? "unknown",
      version: report.version ?? "unknown",
      uptimeSeconds: report.uptimeSeconds ?? 0,
    };
  } catch (error) {
    return { reachable: false, reason: error instanceof Error ? error.message : "unknown error" };
  }
}
