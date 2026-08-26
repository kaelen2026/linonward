export type HealthReport = {
  status: "ok";
  version: string;
  uptimeSeconds: number;
  startedAt: string;
};

export type HealthServiceDependencies = {
  version: string;
  startedAt: Date;
  clock: () => Date;
};

export type HealthService = {
  check(): HealthReport;
};

export function createHealthService({
  version,
  startedAt,
  clock,
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
  };
}
