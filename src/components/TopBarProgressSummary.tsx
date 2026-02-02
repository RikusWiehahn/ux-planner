"use client";

import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ModalWrapper } from "@/components/ModalWrapper";
import { SecondaryButton } from "@/components/SecondaryButton";
import { getCompletionBadgeClassName } from "@/components/completionBadge";
import { usePlan } from "@/plan/PlanContext";

export const TopBarProgressSummary = () => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState(false);

	const summary = useMemo(() => {
		let doneLeaves = 0;
		let totalLeaves = 0;
		let totalHoursEstimated = 0;
		let totalHoursComplete = 0;

		for (const nodeId of Object.keys(plan.planDoc.nodesById)) {
			const node = plan.planDoc.nodesById[nodeId];
			if (!node) {
				continue;
			}

			if (node.childIds.length > 0) {
				continue;
			}

			totalLeaves += 1;
			const timeHours = node.leafMetrics ? node.leafMetrics.timeHours : 0;
			totalHoursEstimated += timeHours;
			if (node.leafDone) {
				doneLeaves += 1;
				totalHoursComplete += timeHours;
			}
		}

		const overallCompletionPct =
			totalHoursEstimated > 0
				? Math.round((totalHoursComplete / totalHoursEstimated) * 100)
				: totalLeaves > 0 && doneLeaves === totalLeaves
					? 100
					: 0;
		const totalHoursToDo = Math.max(0, totalHoursEstimated - totalHoursComplete);

		return {
			overallCompletionPct,
			totalHoursEstimated,
			totalHoursComplete,
			totalHoursToDo,
		};
	}, [plan.planDoc.nodesById]);

	const formatHours = (hours: number) => {
		if (!Number.isFinite(hours)) {
			return "0";
		}

		const rounded = Math.round(hours * 10) / 10;
		const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
		return isWhole ? String(Math.round(rounded)) : rounded.toFixed(1);
	};

	return (
		<div className="flex w-40 items-center">
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className={twMerge(
					getCompletionBadgeClassName(summary.overallCompletionPct),
					"transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-zinc-500/20",
				)}
				aria-label="Open overall progress summary"
			>
				{summary.overallCompletionPct}%
			</button>

			<ModalWrapper
				isOpen={isOpen}
				title="Overall progress"
				onClose={() => setIsOpen(false)}
			>
				<div className="text-xs text-zinc-700">
					<div className="flex items-center justify-between gap-3">
						<div className="text-zinc-500">Total hours estimated</div>
						<div className="font-semibold text-zinc-950">
							{formatHours(summary.totalHoursEstimated)} hrs
						</div>
					</div>

					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-zinc-500">Total hours complete</div>
						<div className="font-semibold text-zinc-950">
							{formatHours(summary.totalHoursComplete)} hrs
						</div>
					</div>

					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-zinc-500">Total hours to do</div>
						<div className="font-semibold text-zinc-950">
							{formatHours(summary.totalHoursToDo)} hrs
						</div>
					</div>

					<div className="mt-4">
						<SecondaryButton
							className="w-full justify-center"
							onPress={() => setIsOpen(false)}
						>
							Close
						</SecondaryButton>
					</div>
				</div>
			</ModalWrapper>
		</div>
	);
};

