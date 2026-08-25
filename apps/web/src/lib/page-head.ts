export const SITE_TITLE = "Brnit" as const;

const SITE_DESCRIPTION =
	"Brnit — healthy life challenges, diet plans and body composition tracking.";

function pageTitle(page: string): string {
	return `${page} — ${SITE_TITLE}`;
}

interface PageHeadOptions {
	description?: string;
	robots?: string;
	title: string;
}

/**
 * Meta for a route's `head` callback, rendered by `<HeadContent/>` in
 * `__root.tsx`. There is no server render, so this is what keeps the tab title
 * and the description in step with the current route.
 */
export function createPageHead({ title, description, robots }: PageHeadOptions) {
	return {
		meta: [
			{ title },
			...(description
				? [{ name: "description" as const, content: description }]
				: []),
			...(robots ? [{ name: "robots" as const, content: robots }] : []),
		],
	};
}

/** `"Food items"` -> `"Food items — Brnit"`. The default for every page route. */
export function createStandardPageHead(page: string, description?: string) {
	return createPageHead({ description, title: pageTitle(page) });
}

/**
 * Root head. Signed-in surfaces must never be indexed, and since the SPA serves
 * one `index.html` for every path, `noindex` is applied here and relaxed by the
 * public routes that want to be found.
 */
export function createRootPageHead() {
	return createPageHead({
		description: SITE_DESCRIPTION,
		robots: "noindex, nofollow",
		title: SITE_TITLE,
	});
}
