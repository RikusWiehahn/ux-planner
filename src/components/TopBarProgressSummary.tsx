"use client";

import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ModalWrapper } from "@/components/ModalWrapper";
import { SecondaryButton } from "@/components/SecondaryButton";
import { getCompletionBadgeClassName } from "@/components/completionBadge";
import { usePlan } from "@/plan/PlanContext";
import type { PlanNode } from "@/plan/types";

export const TopBarProgressSummary = () => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState(false);

	const summary = useMemo(() => {
		const nodesById: Record<string, PlanNode> = plan.planDoc.nodesById;
		const columns = plan.planDoc.columns;

		const columnCount = Math.max(1, columns.length);

		let totalHoursEstimated = 0;
		let totalHoursComplete = 0;
		let totalLeaves = 0;
		let doneLeaves = 0;

		for (const nodeId of Object.keys(nodesById)) {
			const node = nodesById[nodeId];
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

		const columnSummaries = Array.from({ length: columnCount }, (_, columnIndex) => {
			let totalHours = 0;
			let doneHours = 0;
			let totalLeavesInColumn = 0;
			let doneLeavesInColumn = 0;

			for (const nodeId of Object.keys(nodesById)) {
				const node = nodesById[nodeId];
				if (!node) {
					continue;
				}
				if (node.columnIndex !== columnIndex) {
					continue;
				}
				if (node.childIds.length > 0) {
					continue;
				}

				totalLeavesInColumn += 1;
				const timeHours = node.leafMetrics ? node.leafMetrics.timeHours : 0;
				totalHours += timeHours;
				if (node.leafDone) {
					doneLeavesInColumn += 1;
					doneHours += timeHours;
				}
			}

			const completionPct =
				totalHours > 0
					? Math.round((doneHours / totalHours) * 100)
					: totalLeavesInColumn > 0 && doneLeavesInColumn === totalLeavesInColumn
						? 100
						: 0;
			const label = columns[columnIndex] ? columns[columnIndex].label : `Depth ${columnIndex}`;

			return {
				columnIndex,
				label,
				totalHours,
				doneHours,
				completionPct,
			};
		});

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
			columnSummaries,
		};
	}, [plan.planDoc]);

	const formatHours = (hours: number) => {
		if (!Number.isFinite(hours)) {
			return "0";
		}

		const rounded = Math.round(hours * 10) / 10;
		const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
		return isWhole ? String(Math.round(rounded)) : rounded.toFixed(1);
	};

	const renderByDepthSection = () => {
		if (summary.columnSummaries.length === 0) {
			return null;
		}

		const shown = summary.columnSummaries.filter((column) => column.columnIndex >= 3);
		if (shown.length === 0) {
			return null;
		}

		return (
			<div className="mt-4">
				<div className="text-xs font-semibold text-zinc-950">By depth</div>
				<div className="mt-2 flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-2">
					{shown.map((column) => {
						return (
							<div
								key={column.columnIndex}
								className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1 hover:bg-zinc-50"
							>
								<div className="text-zinc-500">{column.label}</div>
								<div className="flex items-center gap-2">
									<div className="text-[11px] text-zinc-500">
										{formatHours(column.doneHours)}/{formatHours(column.totalHours)} hrs
									</div>
									<div className={getCompletionBadgeClassName(column.completionPct)}>{column.completionPct}%</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	const renderModalBody = () => {
		return (
			<div className="text-xs text-zinc-700">
				<div className="flex items-center justify-between gap-3">
					<div className="text-zinc-500">Total hours estimated</div>
					<div className="font-semibold text-zinc-950">{formatHours(summary.totalHoursEstimated)} hrs</div>
				</div>

				<div className="mt-2 flex items-center justify-between gap-3">
					<div className="text-zinc-500">Total hours complete</div>
					<div className="font-semibold text-zinc-950">{formatHours(summary.totalHoursComplete)} hrs</div>
				</div>

				<div className="mt-2 flex items-center justify-between gap-3">
					<div className="text-zinc-500">Total hours to do</div>
					<div className="font-semibold text-zinc-950">{formatHours(summary.totalHoursToDo)} hrs</div>
				</div>

				{renderByDepthSection()}

				<div className="mt-4">
					<SecondaryButton className="w-full justify-center" onPress={() => setIsOpen(false)}>
						Close
					</SecondaryButton>
				</div>
			</div>
		);
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
				{renderModalBody()}
			</ModalWrapper>
		</div>
	);
};

