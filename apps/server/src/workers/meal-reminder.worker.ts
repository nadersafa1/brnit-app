import { getTodayUtcDateString } from "@brnit/datetime";
import { env } from "@brnit/env/server";
import type { Worker } from "bullmq";
import { Worker as BullWorker } from "bullmq";

import { mealReminderPushJobId } from "../jobs/job-ids.js";
import type { MealReminderJobPayload } from "../jobs/meal-reminder-contract.js";
import {
	MEAL_REMINDER_PLAN_CRON,
	MEAL_REMINDER_PLAN_JOB_NAME,
	MEAL_REMINDER_QUEUE_NAME,
	MEAL_REMINDER_SCHEDULER_ID,
	MEAL_REMINDER_SEND_JOB_NAME,
	MEAL_REMINDER_TITLE,
	mealReminderBody,
	parseMealReminderJobPayload,
} from "../jobs/meal-reminder-contract.js";
import {
	isSlotAlreadyLogged,
	planMealRemindersForDate,
} from "../jobs/meal-reminder-planner.js";
import {
	getMealReminderQueue,
	scheduleMealRemindersForDate,
} from "../jobs/meal-reminder-queue.js";
import { enqueuePushNotificationBestEffort } from "../jobs/push-notification-queue.js";
import {
	attachWorkerLifecycleLogs,
	createWorkerLogger,
} from "../jobs/worker-logger.js";

const workerLog = createWorkerLogger(
	"worker-meal-reminder",
	MEAL_REMINDER_QUEUE_NAME
);

/**
 * Is this delayed job still the truth?
 *
 * A reminder can be queued days before it fires, and in between the assignment
 * can be deleted, its dates narrowed, or the slot's time moved. Re-planning the
 * same `(assignment, date)` and looking for an identical slot+time answers all
 * three at once: a moved time produces a *different* job id, so the newer job
 * exists and this stale one must stay quiet.
 */
async function isReminderStillCurrent(
	payload: MealReminderJobPayload
): Promise<boolean> {
	const current = await planMealRemindersForDate(payload.dateYmd, {
		dietPlanAssignmentId: payload.dietPlanAssignmentId,
	});
	return current.some(
		(reminder) =>
			reminder.dietPlanMealId === payload.dietPlanMealId &&
			reminder.scheduledTime === payload.scheduledTime
	);
}

async function runSendJob(
	jobId: string | undefined,
	payload: MealReminderJobPayload
): Promise<void> {
	const logFields = {
		jobId,
		userId: payload.userId,
		dietPlanAssignmentId: payload.dietPlanAssignmentId,
		dietPlanMealId: payload.dietPlanMealId,
		dateYmd: payload.dateYmd,
	};

	if (!(await isReminderStillCurrent(payload))) {
		workerLog.info(logFields, "skipping reminder; slot no longer scheduled");
		return;
	}

	if (
		await isSlotAlreadyLogged({
			dateYmd: payload.dateYmd,
			dietPlanAssignmentId: payload.dietPlanAssignmentId,
			dietPlanMealId: payload.dietPlanMealId,
		})
	) {
		workerLog.info(logFields, "skipping reminder; meal already logged");
		return;
	}

	await enqueuePushNotificationBestEffort({
		jobId: mealReminderPushJobId(payload),
		payload: {
			userId: payload.userId,
			title: MEAL_REMINDER_TITLE,
			body: mealReminderBody(payload.mealType, payload.scheduledTime),
			category: "meal_reminder",
			data: {
				type: "meal_reminder",
				dietPlanAssignmentId: payload.dietPlanAssignmentId,
				dietPlanMealId: payload.dietPlanMealId,
				dateYmd: payload.dateYmd,
			},
		},
	});

	workerLog.info(logFields, "meal reminder dispatched");
}

async function runPlanJob(jobId: string | undefined): Promise<void> {
	const dateYmd = getTodayUtcDateString();
	const result = await scheduleMealRemindersForDate(dateYmd);
	workerLog.info(
		{ jobId, dateYmd, planned: result.planned, queued: result.queued },
		"meal reminders planned for the day"
	);
}

/**
 * Registers the daily planner (worker process only). Idempotent across
 * restarts — `upsertJobScheduler` replaces the schedule under the same id
 * rather than stacking another one.
 */
export async function registerMealReminderScheduler(): Promise<void> {
	const queue = getMealReminderQueue();
	if (!queue) {
		throw new Error("REDIS_URL is required for the meal reminder scheduler");
	}

	await queue.upsertJobScheduler(
		MEAL_REMINDER_SCHEDULER_ID,
		{ pattern: MEAL_REMINDER_PLAN_CRON },
		{ name: MEAL_REMINDER_PLAN_JOB_NAME, data: {} }
	);

	workerLog.info(
		{
			pattern: MEAL_REMINDER_PLAN_CRON,
			schedulerId: MEAL_REMINDER_SCHEDULER_ID,
		},
		"scheduler registered"
	);
}

export function startMealReminderWorker(): Worker {
	if (!env.REDIS_URL) {
		throw new Error("REDIS_URL is required for the meal reminder worker");
	}

	const worker = new BullWorker(
		MEAL_REMINDER_QUEUE_NAME,
		async (job) => {
			if (job.name === MEAL_REMINDER_PLAN_JOB_NAME) {
				await runPlanJob(job.id);
				return;
			}

			if (job.name !== MEAL_REMINDER_SEND_JOB_NAME) {
				workerLog.warn(
					{ jobId: job.id, jobName: job.name },
					"skipping unknown job type"
				);
				return;
			}

			const parsed = parseMealReminderJobPayload(job.data);
			if (!parsed.success) {
				workerLog.error(
					{ jobId: job.id, err: parsed.error },
					"invalid meal reminder job payload"
				);
				throw new Error("Invalid meal reminder job payload");
			}

			await runSendJob(job.id, parsed.data);
		},
		{ connection: { url: env.REDIS_URL } }
	);

	attachWorkerLifecycleLogs(worker, workerLog, MEAL_REMINDER_QUEUE_NAME);
	workerLog.info("listening on queue");

	return worker;
}
