/**
 * Ordering for the dotted version strings the native app reports to the version
 * gate.
 *
 * Deliberately **not** semver. Store build numbers are plain `major.minor.patch`
 * triples, and a real semver parser would *reject* strings it cannot classify —
 * which, in a gate, means either crashing the public endpoint or failing closed
 * and locking every user out of the app. Instead every input maps to a triple,
 * so the comparison is total and the gate can only ever fail open.
 *
 * Parsing is lenient by the same reasoning:
 * - only the first three segments are read; a 4th is ignored (`1.2.3.4` → `1.2.3`)
 * - missing segments are `0` (`"1"` → `1.0.0`)
 * - a non-numeric segment is `0` (`"1.2.3-beta"` → `1.2.0`)
 * - `""` is `0.0.0`, below every published version
 *
 * The one thing to know at the call site: comparison is **strict**, so equal
 * versions are not "below". `isVersionBelow(v, v)` is `false`, which is what
 * makes a user already on `minVersion` pass the block check.
 */
function parseVersion(v: string): readonly [number, number, number] {
	const parts = v.split(".").map((s) => Number(s) || 0);
	return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0] as const;
}

/** True when `current` sorts strictly before `min`. Equal versions are not below. */
export function isVersionBelow(current: string, min: string): boolean {
	const [aMajor, aMinor, aPatch] = parseVersion(current);
	const [bMajor, bMinor, bPatch] = parseVersion(min);
	if (aMajor !== bMajor) {
		return aMajor < bMajor;
	}
	if (aMinor !== bMinor) {
		return aMinor < bMinor;
	}
	return aPatch < bPatch;
}
