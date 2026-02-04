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

const getDescendantLeaves = (props: { planDoc: PlanDoc; nodeId: string }) => {
	const visited = new Set<string>();
	const leaves: { leafId: string; parentId: string | null }[] = [];

	const walk = (currentId: string, parentId: string | null) => {
		if (visited.has(currentId)) {
			return;
		}
		visited.add(currentId);

		const node = props.planDoc.nodesById[currentId];
		if (!node) {
			return;
		}

		if (node.childIds.length === 0) {
			leaves.push({ leafId: currentId, parentId });
			return;
		}

		for (const childId of node.childIds) {
			walk(childId, currentId);
		}
	};

	walk(props.nodeId, null);
	return leaves;
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
	const descendantLeaves = node ? getDescendantLeaves({ planDoc: props.planDoc, nodeId: props.nodeId }) : [];
	const leafIds = descendantLeaves.map((leaf) => leaf.leafId);
	const rootGroupKey = "__root__";
	const descendantLeafIdsByParentId: Record<string, string[]> = {};
	const descendantLeafParentGroupKeys: string[] = [];

	for (const descendantLeaf of descendantLeaves) {
		const groupKey = descendantLeaf.parentId ?? rootGroupKey;
		if (!descendantLeafIdsByParentId[groupKey]) {
			descendantLeafIdsByParentId[groupKey] = [];
			descendantLeafParentGroupKeys.push(groupKey);
		}
		descendantLeafIdsByParentId[groupKey].push(descendantLeaf.leafId);
	}

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

	const completionPct =
		totalHoursEstimated > 0
			? Math.round((totalHoursComplete / totalHoursEstimated) * 100)
			: totalLeaves > 0 && doneLeaves === totalLeaves
				? 100
				: 0;
	const totalHoursToDo = Math.max(0, totalHoursEstimated - totalHoursComplete);

	const title = node ? clampText(getFirstLine(node.label) || "(empty)", 100) : "Details";

	const renderCloseButton = () => {
		return (
			<div className="mt-4">
				<SecondaryButton className="w-full justify-center" onPress={props.onClose}>
					Close
				</SecondaryButton>
			</div>
		);
	};

	const renderLeafRow = (leafId: string) => {
		const leaf = props.planDoc.nodesById[leafId];
		if (!leaf) {
			return null;
		}

		const leafTitle = clampText(getFirstLine(leaf.label) || "(empty)", 100);
		const timeHours = leaf.leafMetrics ? leaf.leafMetrics.timeHours : 0;

		return (
			<div
				key={leafId}
				className="flex items-center justify-between gap-2 rounded-md py-1 pl-4 pr-1 hover:bg-zinc-50"
			>
				<div className="flex min-w-0 items-center gap-2">
					<div className={getDoneCircleClassName(leaf.leafDone)}>{leaf.leafDone ? "✓" : "✕"}</div>
					<div className="min-w-0 truncate text-[11px] text-zinc-700">{leafTitle}</div>
				</div>
				<div className="shrink-0 text-[11px] text-zinc-500">{timeHours ? `${formatHours(timeHours)} hrs` : "—"}</div>
			</div>
		);
	};

	const renderLeafGroup = (parentGroupKey: string) => {
		const parentNodeId = parentGroupKey === rootGroupKey ? null : parentGroupKey;
		const parentNode = parentNodeId ? props.planDoc.nodesById[parentNodeId] : null;
		const parentTitle =
			parentGroupKey === rootGroupKey
				? "(This item)"
				: clampText(getFirstLine(parentNode ? parentNode.label : "(missing)") || "(empty)", 100);

		const groupLeafIds = descendantLeafIdsByParentId[parentGroupKey] ?? [];

		return (
			<div key={parentGroupKey} className="rounded-md px-1.5 py-1">
				<div className="text-[11px] font-semibold text-zinc-500">{parentTitle}</div>
				<div className="mt-1 flex flex-col gap-1">{groupLeafIds.map((leafId) => renderLeafRow(leafId))}</div>
			</div>
		);
	};

	const renderDescendantLeavesSection = () => {
		if (leafIds.length === 0) {
			return null;
		}

		return (
			<div className="mt-4">
				<div className="text-xs font-semibold text-zinc-950">Descendant leaves</div>
				<div className="mt-2 flex max-h-80 flex-col gap-1 overflow-auto rounded-md border border-zinc-200 bg-white p-2">
					{descendantLeafParentGroupKeys.map((parentGroupKey) => renderLeafGroup(parentGroupKey))}
				</div>
			</div>
		);
	};

	const renderFoundBody = () => {
		return (
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

				{renderDescendantLeavesSection()}
				{renderCloseButton()}
			</div>
		);
	};

	const renderNotFoundBody = () => {
		return (
			<div className="text-xs text-zinc-700">
				Item not found.
				{renderCloseButton()}
			</div>
		);
	};

	return (
		<ModalWrapper isOpen={props.isOpen} title={title} onClose={props.onClose}>
			{node ? renderFoundBody() : renderNotFoundBody()}
		</ModalWrapper>
	);
};

