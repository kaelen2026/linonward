import type { HealthReport } from "@linonward/contracts/health";

export type ReadinessReport = {
  status: "ready" | "degraded";
  checks: Record<string, "ok" | "failed">;
};

/**
 * Each probe answers "can I reach this dependency?". They are injected, so the
 * module never learns that Postgres or Redis exist.
 */
export type DependencyProbes = Record<string, () => Promise<void>>;

export type HealthServiceDependencies = {
  version: string;
  startedAt: Date;
  clock: () => Date;
  probes?: DependencyProbes;
  /** Maximum time one dependency may hold the readiness response open. */
  probeTimeoutMs?: number;
};

export type HealthService = {
  check(): HealthReport;
  readiness(): Promise<ReadinessReport>;
};

export function createHealthService({
  version,
  startedAt,
  clock,
  probes = {},
  probeTimeoutMs = 2_000,
}: HealthServiceDependencies): HealthService {
  return {
    check() {
      return {
        status: "ok",
        version,
        uptimeSeconds: Math.max(0, Math.floor((clock().getTime() - startedAt.getTime()) / 1000)),
        startedAt: startedAt.toISOString(),
      };
    },

    async readiness() {
      const names = Object.keys(probes);
      // Probed in parallel: a readiness check that takes the sum of its
      // dependencies' timeouts is itself a source of failed deploys.
      const results = await Promise.all(
        names.map(async (name) => {
          try {
            await withinDeadline(probes[name]?.() ?? Promise.resolve(), probeTimeoutMs);
            return [name, "ok"] as const;
          } catch {
            return [name, "failed"] as const;
          }
        }),
      );

      return {
        status: results.every(([, outcome]) => outcome === "ok") ? "ready" : "degraded",
        checks: Object.fromEntries(results),
      };
    },
  };
}

async function withinDeadline(probe: Promise<void>, timeoutMs: number): Promise<void> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      probe,
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new Error("Readiness probe timed out")), timeoutMs);
        deadline.unref?.();
      }),
    ]);
  } finally {
    if (deadline) clearTimeout(deadline);
  }
}
