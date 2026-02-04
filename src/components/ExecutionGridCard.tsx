"use client";

export const ExecutionGridCard = (props: {
	parentLabel: string;
	labelFirstLine: string;
	labelFull: string;
	importance: number;
	ease: number;
	timeHours: number;
	completionPct: number;
	getCompletionBadgeClassName: (pct: number) => string;
	onPress?: () => void;
}) => {
	const title = props.parentLabel ? `${props.parentLabel} — ${props.labelFirstLine}` : props.labelFirstLine;
	const timeText = props.timeHours ? `${props.timeHours} hrs` : "—";

	const isClickable = typeof props.onPress === "function";

	return (
		<div
			className={
				isClickable
					? "flex h-full cursor-pointer flex-col rounded-md border border-zinc-200 bg-white p-2 transition-colors hover:bg-zinc-50"
					: "flex h-full flex-col rounded-md border border-zinc-200 bg-white p-2"
			}
			onClick={isClickable ? props.onPress : undefined}
			role={isClickable ? "button" : undefined}
			tabIndex={isClickable ? 0 : undefined}
			aria-label={isClickable ? title : undefined}
			onKeyDown={
				isClickable
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								if (props.onPress) {
									props.onPress();
								}
							}
						}
					: undefined
			}
		>
			<div className="min-w-0">
				<div className="text-xs font-medium text-zinc-950">{title}</div>
			</div>

			{props.labelFull ? (
				<div className="mt-1 whitespace-pre-wrap text-[11px] text-zinc-600">{props.labelFull}</div>
			) : null}

			<div className="mt-auto border-t border-zinc-200 pt-1">
				<div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-zinc-700">
					<div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0">
						<span className="font-mono text-zinc-500">I</span>
						<span className="tabular-nums">{props.importance}</span>
					</div>
					<div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0">
						<span className="font-mono text-zinc-500">E</span>
						<span className="tabular-nums">{props.ease}</span>
					</div>
					<div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0">
						<span className="tabular-nums">{props.timeHours ? props.timeHours : "—"}</span>
						<span className="font-mono text-zinc-500">hrs</span>
					</div>
					<span
						className={`${props.getCompletionBadgeClassName(props.completionPct)} border border-zinc-200 px-1.5 py-0 h-auto min-w-0 text-[10px] font-semibold`}
					>
						{props.completionPct}%
					</span>
				</div>
			</div>
		</div>
	);
};

