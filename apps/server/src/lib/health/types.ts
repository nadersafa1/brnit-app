export type HealthCheckStatus = "up" | "down" | "skipped";

export interface HealthCheckResult {
	error?: string;
	latencyMs?: number;
	reason?: string;
	status: HealthCheckStatus;
}

export interface HealthReport {
	checks: {
		bullmq: HealthCheckResult;
		database: HealthCheckResult;
		redis: HealthCheckResult;
	};
	ok: boolean;
	socket?: {
		clientsCount: number;
	};
}
