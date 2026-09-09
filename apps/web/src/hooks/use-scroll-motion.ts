import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * Scroll-driven motion primitives for the public site.
 *
 * Every effect on this page shares ONE `scroll` listener and ONE rAF tick — a
 * listener per parallax layer is what makes marketing pages stutter on a mid
 * range Android. Subscribers write CSS custom properties instead of React
 * state, so a scroll never re-renders the tree; only the handful of hooks that
 * genuinely need a value in JS (`useInView`, `useCountUp`) set state, and each
 * of those settles after one update.
 *
 * All of it is opt-out: `prefers-reduced-motion: reduce` short-circuits the
 * subscriptions and leaves the elements at their resting CSS values.
 */

type Subscriber = () => void;

const subscribers = new Set<Subscriber>();
let frameId = 0;
let listening = false;

function flush() {
	frameId = 0;
	for (const subscriber of subscribers) {
		subscriber();
	}
}

function schedule() {
	if (frameId === 0) {
		frameId = window.requestAnimationFrame(flush);
	}
}

function subscribeToScroll(subscriber: Subscriber): () => void {
	subscribers.add(subscriber);

	if (!listening) {
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule, { passive: true });
		listening = true;
	}

	// Position the element correctly on mount, before the first scroll.
	subscriber();

	return () => {
		subscribers.delete(subscriber);

		if (subscribers.size === 0 && listening) {
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			listening = false;

			if (frameId !== 0) {
				window.cancelAnimationFrame(frameId);
				frameId = 0;
			}
		}
	};
}

export function prefersReducedMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Writes `--parallax` (in px) onto the element as it crosses the viewport:
 * `-strength` when it is entering from the bottom, `+strength` on its way out.
 * The element itself decides what to do with it — usually
 * `translate3d(0, var(--parallax), 0)`.
 */
export function useParallax<T extends HTMLElement>(
	strength = 60
): RefObject<T | null> {
	const ref = useRef<T>(null);

	useEffect(() => {
		const node = ref.current;

		if (!node || prefersReducedMotion()) {
			return;
		}

		return subscribeToScroll(() => {
			const rect = node.getBoundingClientRect();
			const viewport = window.innerHeight;
			const centre = rect.top + rect.height / 2;
			// 1 below the fold → -1 above it.
			const offset = clamp((centre - viewport / 2) / viewport, -1.5, 1.5);
			node.style.setProperty(
				"--parallax",
				`${(offset * strength).toFixed(2)}px`
			);
		});
	}, [strength]);

	return ref;
}

/**
 * Writes `--progress` (0 → 1) for how far the element has travelled through the
 * viewport. Drives the hero's fade-on-scroll and the sticky step rail.
 */
export function useScrollProgress<
	T extends HTMLElement,
>(): RefObject<T | null> {
	const ref = useRef<T>(null);

	useEffect(() => {
		const node = ref.current;

		if (!node || prefersReducedMotion()) {
			return;
		}

		return subscribeToScroll(() => {
			const rect = node.getBoundingClientRect();
			// The travel distance is how far the element can scroll *through* the
			// viewport, floored at 60% of a screen. Without the floor, a section
			// only a little taller than the viewport — the hero — would run 0 to 1
			// in a dozen pixels and read as a flicker rather than a fade.
			const distance = Math.max(
				rect.height - window.innerHeight,
				window.innerHeight * 0.6
			);
			node.style.setProperty(
				"--progress",
				clamp(-rect.top / distance, 0, 1).toFixed(4)
			);
		});
	}, []);

	return ref;
}

interface InViewOptions {
	/** Keep `true` once seen — reveals should not replay on the way back up. */
	once?: boolean;
	rootMargin?: string;
	threshold?: number;
}

/*
 * The defaults deliberately trigger the moment an element touches the viewport
 * rather than once it is comfortably inside it. A negative bottom margin looks
 * marginally better mid-page and quietly strands anything in the last screenful
 * of a page that cannot scroll far enough to satisfy it — a footer that never
 * fades in is a far worse bug than a reveal that starts 40px early.
 */

export function useInView<T extends Element>({
	once = true,
	rootMargin = "0px",
	threshold = 0.01,
}: InViewOptions = {}): [RefObject<T | null>, boolean] {
	const ref = useRef<T>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const node = ref.current;

		if (!node) {
			return;
		}

		if (typeof IntersectionObserver === "undefined") {
			setInView(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry) {
					return;
				}

				if (entry.isIntersecting) {
					setInView(true);

					if (once) {
						observer.disconnect();
					}
				} else if (!once) {
					setInView(false);
				}
			},
			{ rootMargin, threshold }
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [once, rootMargin, threshold]);

	return [ref, inView];
}

/**
 * Counts from 0 to `target` once `active` flips, easing out so the last digits
 * land softly. Reduced motion gets the final value immediately.
 */
export function useCountUp(target: number, active: boolean, duration = 1400) {
	const [value, setValue] = useState(0);

	useEffect(() => {
		if (!active) {
			return;
		}

		if (prefersReducedMotion()) {
			setValue(target);
			return;
		}

		let frame = 0;
		const started = performance.now();

		const tick = (now: number) => {
			const elapsed = clamp((now - started) / duration, 0, 1);
			const eased = 1 - (1 - elapsed) ** 3;
			setValue(Math.round(target * eased));

			if (elapsed < 1) {
				frame = window.requestAnimationFrame(tick);
			}
		};

		frame = window.requestAnimationFrame(tick);

		return () => window.cancelAnimationFrame(frame);
	}, [active, duration, target]);

	return value;
}

/**
 * `true` once the page has scrolled past `offset`. Flips state twice per
 * crossing rather than on every frame, so the sticky header can restyle itself
 * without turning the scroll into a render loop.
 */
export function useScrolledPast(offset = 24): boolean {
	const [scrolled, setScrolled] = useState(false);

	useEffect(
		() =>
			subscribeToScroll(() => {
				setScrolled((current) => {
					const next = window.scrollY > offset;
					return next === current ? current : next;
				});
			}),
		[offset]
	);

	return scrolled;
}
