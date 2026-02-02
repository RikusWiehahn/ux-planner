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
					? "cursor-pointer rounded-md border border-zinc-200 bg-white p-2 transition-colors hover:bg-zinc-50"
					: "rounded-md border border-zinc-200 bg-white p-2"
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

			<div className="mt-2 border-t border-zinc-200 pt-1">
				<div className="grid grid-cols-4 gap-1 text-xs text-zinc-700">
					<div className="rounded-md bg-transparent px-1.5 py-1">{props.importance} I</div>
					<div className="rounded-md bg-transparent px-1.5 py-1">{props.ease} E</div>
					<div className="rounded-md bg-transparent px-1.5 py-1">{timeText}</div>
					<div className="rounded-md bg-transparent px-1.5 py-1">
						<span className={props.getCompletionBadgeClassName(props.completionPct)}>{props.completionPct}%</span>
					</div>
				</div>
			</div>
		</div>
	);
};

