/**
 * Contract half of the streak-nudge triplet. **No BullMQ import.**
 *
 * ## What "at risk" means
 *
 * `GET /api/v1/member/me/consumption-streak` counts back from today over the
 * distinct `consumed_date` values across all of a member's assignments, and
 * **returns 0 the moment today is missing** — there is no grace day. So every
 * member with an active assignment who has logged nothing yet today is one
 * midnight away from losing their whole streak, and that is exactly the
 * population this queue nudges.
 *
 * ## The timezone limitation
 *
 * brnit stores no timezone for a member, an organization or a plan, and the
 * server runs on UTC, so "today" here is the UTC calendar day — the same day
 * the streak endpoint counts. {@link STREAK_NUDGE_CRON} therefore has to be one
 * fixed UTC hour for everybody, and 18:00 UTC is the compromise: it is still
 * the same UTC day for every member up to UTC+5:59, and it leaves brnit's
 * Cairo-centred user base (UTC+2/+3) three to four hours of evening to log
 * something.
 *
 * It is genuinely wrong for anyone west of UTC-6, where 18:00 UTC is midday and
 * the nudge arrives long before the day is at risk. Fixing it properly needs a
 * timezone column and a per-zone schedule; inventing a zone from an IP or a
 * device locale would be worse, because a member who travels would silently
 * change which calendar day their streak is counted in.
 */

export const STREAK_NUDGE_QUEUE_NAME = "streak.nudges";

export const STREAK_NUDGE_JOB_NAME = "streak_nudge";

export const STREAK_NUDGE_SCHEDULER_ID = "streak-nudge-daily";

/** 18:00 UTC daily — see the timezone note above before changing this. */
export const STREAK_NUDGE_CRON = "0 18 * * *";

export const STREAK_NUDGE_TITLE = "Keep your streak";

/**
 * Deliberately vague about the deadline. The cut-off is UTC midnight, which is
 * a different wall-clock time for every member, so promising one would be a
 * lie for most of them.
 */
export const STREAK_NUDGE_BODY =
	"You have not logged a meal today. Log one to keep your streak going.";
