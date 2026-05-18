// biome-ignore-all lint/style/noMagicNumbers: all numbers are constants

const MURMUR_MIX_A = 2_246_822_507;
const MURMUR_MIX_B = 3_266_489_909;

const hashString = (seed: string): number => {
	let hash = 0;

	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	// Murmur3 finalisation: two rounds of xor-shift-multiply avalanche
	hash = Math.imul(hash ^ (hash >>> 15), MURMUR_MIX_A);
	hash = Math.imul(hash ^ (hash >>> 13), MURMUR_MIX_B);
	return (hash ^ (hash >>> 16)) >>> 0;
};

const hslToHex = (hue: number, saturationPct: number, lightnessPct: number): string => {
	const s = saturationPct / 100;
	const l = lightnessPct / 100;
	const chroma = s * Math.min(l, 1 - l);

	/** Returns one 8-bit hex channel for the given CSS Color 4 coefficient `n`. */
	const channel = (n: number): string => {
		const k = (n + hue / 30) % 12;
		const value = l - chroma * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * value)
			.toString(16)
			.padStart(2, '0');
	};

	// n = 0 → red, n = 8 → green, n = 4 → blue (CSS Color 4 spec)
	return `#${channel(0)}${channel(8)}${channel(4)}`;
};

const SAT_BASE_PCT = 65;
const SAT_RANGE_PCT = 21;
const LIGHT_BASE_PCT = 40;
const LIGHT_RANGE_PCT = 21;

const selectPolygonColor = (seed: string): string => {
	const hash = hashString(seed);

	const h = hash % 360;
	const s = SAT_BASE_PCT + ((hash >>> 9) % SAT_RANGE_PCT);
	const l = LIGHT_BASE_PCT + ((hash >>> 14) % LIGHT_RANGE_PCT);

	return hslToHex(h, s, l);
};

export { selectPolygonColor };
