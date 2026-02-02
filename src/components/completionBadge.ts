export const getCompletionBadgeClassName = (pct: number) => {
	if (pct <= 0) {
		return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-red-50 px-2 text-xs font-bold text-red-700";
	}
	if (pct < 25) {
		return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-orange-50 px-2 text-xs font-bold text-orange-700";
	}
	if (pct < 50) {
		return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-amber-50 px-2 text-xs font-bold text-amber-700";
	}
	if (pct < 75) {
		return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-yellow-50 px-2 text-xs font-bold text-yellow-700";
	}
	if (pct < 100) {
		return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-lime-50 px-2 text-xs font-bold text-lime-700";
	}
	return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs font-bold text-emerald-700";
};

