"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { PlanDoc } from "@/plan/types";

const getFirstLine = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const lines = trimmed.split("\n");
	return (lines[0] ?? "").trim();
};

const clampText = (value: string, maxLen: number) => {
	const trimmed = value.trim();
	if (trimmed.length <= maxLen) {
		return trimmed;
	}

	return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
};

const formatHours = (hours: number) => {
	if (!Number.isFinite(hours)) {
		return "0";
	}

	const rounded = Math.round(hours * 10) / 10;
	const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
	return isWhole ? String(Math.round(rounded)) : rounded.toFixed(1);
};

const getDoneCircleClassName = (isDone: boolean) => {
	return isDone
		? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700"
		: "flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-700";
};

const getDescendantLeafIds = (props: { planDoc: PlanDoc; nodeId: string }) => {
	const visited = new Set<string>();
	const leafIds: string[] = [];

	const walk = (currentId: string) => {
		if (visited.has(currentId)) {
			return;
		}
		visited.add(currentId);

		const node = props.planDoc.nodesById[currentId];
		if (!node) {
			return;
		}

		if (node.childIds.length === 0) {
			leafIds.push(currentId);
			return;
		}

		for (const childId of node.childIds) {
			walk(childId);
		}
	};

	walk(props.nodeId);
	return leafIds;
};

export const ExecutionGridCardDetailsModal = (props: {
	isOpen: boolean;
	onClose: () => void;
	planDoc: PlanDoc;
	nodeId: string;
}) => {
	if (!props.isOpen) {
		return null;
	}

	const node = props.planDoc.nodesById[props.nodeId];
	const leafIds = node ? getDescendantLeafIds({ planDoc: props.planDoc, nodeId: props.nodeId }) : [];

	let totalLeaves = 0;
	let doneLeaves = 0;
	let totalHoursEstimated = 0;
	let totalHoursComplete = 0;

	for (const leafId of leafIds) {
		const leaf = props.planDoc.nodesById[leafId];
		if (!leaf) {
			continue;
		}

		totalLeaves += 1;
		const timeHours = leaf.leafMetrics ? leaf.leafMetrics.timeHours : 0;
		totalHoursEstimated += timeHours;
		if (leaf.leafDone) {
			doneLeaves += 1;
			totalHoursComplete += timeHours;
		}
	}

	const completionPct = totalLeaves <= 0 ? 0 : Math.round((doneLeaves / totalLeaves) * 100);
	const totalHoursToDo = Math.max(0, totalHoursEstimated - totalHoursComplete);

	const title = node ? clampText(getFirstLine(node.label) || "(empty)", 100) : "Details";

	return (
		<ModalWrapper isOpen={props.isOpen} title={title} onClose={props.onClose}>
			{node ? (
				<div className="text-xs text-zinc-700">
					<div className="flex items-center justify-between gap-3">
						<div className="text-zinc-500">Completion</div>
						<div className="font-semibold text-zinc-950">{completionPct}%</div>
					</div>

					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-zinc-500">Leaves done</div>
						<div className="font-semibold text-zinc-950">
							{doneLeaves}/{totalLeaves}
						</div>
					</div>

					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-zinc-500">Total hours estimated</div>
						<div className="font-semibold text-zinc-950">{formatHours(totalHoursEstimated)} hrs</div>
					</div>

					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-zinc-500">Total hours complete</div>
						<div className="font-semibold text-zinc-950">{formatHours(totalHoursComplete)} hrs</div>
					</div>

					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-zinc-500">Total hours to do</div>
						<div className="font-semibold text-zinc-950">{formatHours(totalHoursToDo)} hrs</div>
					</div>

					{leafIds.length > 0 ? (
						<div className="mt-4">
							<div className="text-xs font-semibold text-zinc-950">Descendant leaves</div>
							<div className="mt-2 flex max-h-80 flex-col gap-1 overflow-auto rounded-md border border-zinc-200 bg-white p-2">
								{leafIds.map((leafId) => {
									const leaf = props.planDoc.nodesById[leafId];
									if (!leaf) {
										return null;
									}

									const leafTitle = clampText(getFirstLine(leaf.label) || "(empty)", 100);
									const timeHours = leaf.leafMetrics ? leaf.leafMetrics.timeHours : 0;

									return (
										<div
											key={leafId}
											className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-zinc-50"
										>
											<div className="flex min-w-0 items-center gap-2">
												<div className={getDoneCircleClassName(leaf.leafDone)}>{leaf.leafDone ? "✓" : "✕"}</div>
												<div className="min-w-0 truncate text-[11px] text-zinc-700">{leafTitle}</div>
											</div>
											<div className="shrink-0 text-[11px] text-zinc-500">
												{timeHours ? `${formatHours(timeHours)} hrs` : "—"}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : null}

					<div className="mt-4">
						<SecondaryButton className="w-full justify-center" onPress={props.onClose}>
							Close
						</SecondaryButton>
					</div>
				</div>
			) : (
				<div className="text-xs text-zinc-700">
					Item not found.
					<div className="mt-4">
						<SecondaryButton className="w-full justify-center" onPress={props.onClose}>
							Close
						</SecondaryButton>
					</div>
				</div>
			)}
		</ModalWrapper>
	);
};

