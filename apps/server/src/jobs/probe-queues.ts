import type { Queue } from "bullmq";

const probeQueues: Queue[] = [];

/**
 * Registers a queue with the readiness probe.
 *
 * Each lazy queue singleton calls this the first time it builds its `Queue`,
 * so `/api/v1/health` reports job counts for whatever the process actually
 * uses instead of opening connections to queues it never touches.
 *
 * TODO: no queues exist yet — brnit's first background jobs (transactional
 * email, push notifications) register here when they land.
 */
export function registerProbeQueue(queue: Queue): void {
	if (!probeQueues.includes(queue)) {
		probeQueues.push(queue);
	}
}

/** Queues included in readiness probes when Redis is configured. */
export function getProbeQueues(): readonly Queue[] {
	return probeQueues;
}
