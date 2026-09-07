import { useEffect, useState } from "react";

/** Tailwind's `md` breakpoint — the point brnit switches to the mobile shell. */
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => {
			setIsMobile(query.matches);
		};

		onChange();
		query.addEventListener("change", onChange);
		return () => {
			query.removeEventListener("change", onChange);
		};
	}, []);

	return isMobile;
}
