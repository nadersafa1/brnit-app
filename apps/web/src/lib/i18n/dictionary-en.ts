/**
 * English copy for the public site — the source dictionary.
 *
 * `Dictionary` is inferred from this object, so every other locale is
 * type-checked against it: a missing or misspelt key is a compile error, not a
 * blank on the page. Copy lives here rather than inline in the components so a
 * translator never has to open a `.tsx` file.
 */
export const en = {
	nav: {
		close: "Close menu",
		demo: "Book a demo",
		faq: "FAQ",
		features: "Platform",
		how: "How it works",
		login: "Log in",
		menu: "Open menu",
		roles: "For teams",
		skip: "Skip to content",
	},
	heroCard: {
		logged: "Logged",
		macros: [
			{ label: "Protein", value: "132g" },
			{ label: "Carbs", value: "214g" },
			{ label: "Fat", value: "58g" },
		],
		meals: [
			{ detail: "420 kcal", name: "Breakfast · Oat bowl" },
			{ detail: "610 kcal", name: "Lunch · Grilled chicken" },
			{ detail: "180 kcal", name: "Snack · Greek yoghurt" },
		],
		streak: "18-day streak",
		subtitle: "Assigned by your nutritionist",
		swap: "Swap",
		title: "Today’s plan",
		trendCaption: "Last 8 weeks",
		trendLabel: "Body fat",
		trendValue: "-2.4%",
	},
	hero: {
		badge: "Workplace wellbeing, run by real nutritionists",
		chips: [
			"Nutritionist-led",
			"English & Arabic",
			"iOS · Android · Web",
			"Role-scoped by design",
		],
		primaryCta: "Book a demo",
		scrollHint: "Scroll",
		secondaryCta: "See how it works",
		subtitle:
			"Brnit gives every employee a plan a nutritionist actually wrote, a daily habit loop they can keep, and progress they can see. Your people team gets adoption and outcomes instead of a spreadsheet and a hope.",
		titleAccent: "measured, not guessed",
		titleLead: "Healthier teams,",
	},
	marquee: {
		items: [
			"Diet plans",
			"Macro-equivalent swaps",
			"Body composition",
			"Daily logging",
			"Streaks",
			"Team leaderboards",
			"Organisation roles",
			"Bulk invitations",
		],
		label: "What your programme runs on",
	},
	shift: {
		cards: [
			{
				body: "Gym cards and lunch-and-learns start strong and quietly fade. Nothing in the stack tells you whether a single habit actually changed.",
				title: "Perks get bought, not used",
			},
			{
				body: "A PDF meal plan ignores allergies, budgets, shift patterns, travel and Ramadan. People follow it for a week, then go back to what they know.",
				title: "Generic advice fits nobody",
			},
			{
				body: "When budget season arrives, wellbeing is the line item with the least evidence behind it — because nobody was measuring the right thing.",
				title: "People teams fly blind",
			},
		],
		eyebrow: "Why food first",
		subtitle:
			"Nutrition is the habit your team repeats three times a day. It is also the one most wellbeing programmes never touch, because it is genuinely hard to run at scale.",
		title: "Wellbeing budgets rarely survive contact with reality",
	},
	features: {
		cards: [
			{
				body: "Your nutritionists build a food catalogue, compose meals from it, and assemble day-by-day plans. Every macro rolls up automatically, so a plan is right before anyone follows it.",
				tag: "Plan builder",
				title: "Plans your nutritionists actually design",
			},
			{
				body: "Hate the salmon? Swap it for something that matches the macros it replaced. The plan holds its shape while the person keeps their appetite.",
				tag: "Adherence",
				title: "Macro-equivalent swaps",
			},
			{
				body: "Weight, body fat, muscle mass and the rest, captured as dated assessments so a quarter of effort shows up as a line, not a feeling.",
				tag: "Evidence",
				title: "Body composition over time",
			},
			{
				body: "A logged day keeps the streak alive, and an opt-in organisation leaderboard turns it into something the team does together.",
				tag: "Momentum",
				title: "Streaks and team leaderboards",
			},
			{
				body: "Owners, client admins, nutritionists, coaches and members each see exactly their slice. Invite the whole company in one pass.",
				tag: "Administration",
				title: "Organisations, roles and invitations",
			},
			{
				body: "Native apps for iOS and Android, plus a web app that keeps working when the connection does not. No new laptop, no new login for anyone.",
				tag: "Reach",
				title: "Where your people already are",
			},
		],
		eyebrow: "The platform",
		subtitle:
			"Not another content library. Brnit is the operating system for a nutrition programme: the catalogue, the plans, the assignments and the evidence, in one place.",
		title: "Everything the programme needs, nothing it doesn’t",
	},
	how: {
		eyebrow: "How it works",
		steps: [
			{
				body: "Create your organisation and invite people in bulk. Roles decide what each person sees from the first login — no IT project, no seat-by-seat setup.",
				caption: "Owners, admins, nutritionists, coaches, members",
				title: "Bring your organisation in",
			},
			{
				body: "Food items become meals, meals become plans. Macros total as your nutritionist works, so nothing ships that quietly misses its targets.",
				caption: "Catalogue → meals → day-by-day plans",
				title: "Build the library once",
			},
			{
				body: "Each employee gets the plan that fits them, with meal-time overrides for shift workers, travellers and fasting periods.",
				caption: "One plan per person, not one plan for everyone",
				title: "Assign plans person by person",
			},
			{
				body: "Daily logs feed streaks, assessments feed the trend line, and your people team finally has an answer for what the programme changed.",
				caption: "Adoption, adherence, body composition",
				title: "Watch what actually changes",
			},
		],
		subtitle:
			"Four steps from a signed contract to a team that is actually using it. Most programmes are live in a week.",
		title: "From kickoff to a team that shows up",
	},
	roles: {
		cards: [
			{
				body: "See adoption, adherence and progress across the organisation without ever reading a single person’s food diary.",
				bullets: [
					"Invite and manage the whole organisation",
					"Role-scoped views, nothing more",
					"Evidence you can take to budget season",
				],
				title: "People & HR leads",
			},
			{
				body: "One place for the catalogue, the plan builder and every assignment — instead of a folder of spreadsheets and a WhatsApp thread.",
				bullets: [
					"Reusable food and meal catalogue",
					"Macros totalled as you build",
					"Assign, adjust and reassign in seconds",
				],
				title: "Nutritionists",
			},
			{
				body: "One plan, written for them. A log that takes seconds, swaps when life happens, and a streak worth protecting.",
				bullets: [
					"Today’s plan, on any device",
					"Swap items without breaking the plan",
					"Progress they can actually see",
				],
				title: "Employees",
			},
		],
		eyebrow: "For teams",
		subtitle:
			"A wellbeing programme has three audiences and they want completely different things. Brnit ships a surface for each.",
		title: "Built for every seat at the table",
	},
	preview: {
		caption: "Illustrative dashboard — your organisation, your numbers.",
		eyebrow: "Evidence, not vibes",
		metrics: [
			{
				label: "Surfaces your team already owns — web, iOS, Android",
				suffix: "",
				value: 3,
			},
			{
				label: "Languages, with full right-to-left support",
				suffix: "",
				value: 2,
			},
			{
				label: "Roles, so everyone sees only their slice",
				suffix: "",
				value: 5,
			},
		],
		panel: {
			adherence: "Adherence this week",
			assessments: "Assessments logged",
			chart: "Body composition trend",
			members: "Active members",
			streak: "Longest team streak",
			title: "Programme overview",
			weeks: ["W1", "W2", "W3", "W4", "W5", "W6"],
		},
		subtitle:
			"Every plan, log and assessment rolls up into a view your people team can read in a minute and defend in a board meeting.",
		title: "The number your CFO asks for",
	},
	faq: {
		eyebrow: "Questions",
		items: [
			{
				answer:
					"English and Arabic, right-to-left included, and every employee picks their own. Switching language never changes anyone’s plan or history.",
				question: "Which languages does Brnit ship in?",
			},
			{
				answer:
					"No. There are native apps for iOS and Android and a web app that runs in any modern browser, so people use whatever is already in their pocket.",
				question: "Do employees need a new device or a new laptop?",
			},
			{
				answer:
					"Your nutritionists do — or ones you bring in. Brnit is the tooling and the evidence layer, not the advice. Nothing is auto-generated and handed to an employee as fact.",
				question: "Who writes the plans?",
			},
			{
				answer:
					"Food logs and assessments belong to the employee. Organisation views are role-scoped, so a people lead sees adoption and progress, not a diary.",
				question: "What does the company get to see?",
			},
			{
				answer:
					"Invite the organisation, build the catalogue, assign the plans. Teams that arrive with their meals ready are usually live the same week.",
				question: "How long does rollout take?",
			},
		],
		title: "The things procurement asks on the second call",
	},
	cta: {
		note: "A 30-minute walkthrough with a real person. No slide deck.",
		primary: "Book a demo",
		secondary: "Create an account",
		subtitle:
			"Bring one team, one nutritionist and one month. Keep the programme if the numbers move.",
		title: "Give your people a programme they will actually finish",
	},
	footer: {
		columns: {
			company: "Get started",
			product: "Product",
		},
		language: "Language",
		links: {
			demo: "Book a demo",
			faq: "FAQ",
			features: "Platform",
			how: "How it works",
			login: "Log in",
			roles: "For teams",
			signup: "Create an account",
		},
		rights: "All rights reserved.",
		tagline:
			"Nutrition programmes for companies that would rather measure wellbeing than talk about it.",
		theme: "Theme",
	},
};

/** The shape every locale must provide. */
export type Dictionary = typeof en;
