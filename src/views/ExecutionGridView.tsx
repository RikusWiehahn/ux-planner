"use client";

import { ExecutionGridCard } from "@/components/ExecutionGridCard";
import { ExecutionGridCardDetailsModal } from "@/components/ExecutionGridCardDetailsModal";
import { getCompletionBadgeClassName } from "@/components/completionBadge";
import { usePlan } from "@/plan/PlanContext";
import { getPlanCompletionByNodeId, getPlanRollupsByNodeId } from "@/plan/selectors";
import { useMemo, useState } from "react";

type RankedItem = {
	nodeId: string;
	importance: number;
	ease: number;
	timeHours: number;
	labelFirstLine: string;
	labelFull: string;
	parentLabel: string;
	completionPct: number;
};

type PathNode = {
	parentId: string | null;
	label: string;
	columnIndex: number;
};

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

const getImmediateParentLabel = (props: { nodeId: string; nodesById: Record<string, PathNode> }) => {
	const node = props.nodesById[props.nodeId];
	if (!node || !node.parentId) {
		return "";
	}

	const parent = props.nodesById[node.parentId];
	if (!parent) {
		return "";
	}

	return clampText(getFirstLine(parent.label), 100);
};

const getAncestorPathLabel = (props: {
	nodeId: string;
	nodesById: Record<string, PathNode>;
	includeColumnIndexes: number[];
}) => {
	const visited = new Set<string>();
	const labels: string[] = [];
	const included = new Set<number>(props.includeColumnIndexes);

	let currentId: string | null = props.nodeId;
	while (currentId !== null) {
		const currentNode: PathNode | undefined = props.nodesById[currentId];
		if (!currentNode) {
			break;
		}

		const parentId: string | null = currentNode.parentId;
		if (!parentId) {
			break;
		}

		if (visited.has(parentId)) {
			break;
		}
		visited.add(parentId);

		const parent = props.nodesById[parentId];
		if (!parent) {
			break;
		}

		if (included.has(parent.columnIndex)) {
			const label = clampText(getFirstLine(parent.label), 60);
			if (label) {
				labels.push(label);
			}
		}

		currentId = parentId;
	}

	labels.reverse();
	return clampText(labels.join(" / "), 160);
};

export const ExecutionGridView = () => {
	const plan = usePlan();
	const [selectedColumnId, setSelectedColumnId] = useState<string>("");
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [isHidingPlaceholders, setIsHidingPlaceholders] = useState<boolean>(false);
	const [isHidingDone, setIsHidingDone] = useState<boolean>(false);
	const rollupsByNodeId = useMemo(() => getPlanRollupsByNodeId(plan.planDoc), [plan.planDoc]);
	const completionByNodeId = useMemo(() => getPlanCompletionByNodeId(plan.planDoc), [plan.planDoc]);

	const selectedColumnIndex = useMemo(() => {
		if (!plan.planDoc.columns.length) {
			return 0;
		}

		const fallbackId = plan.planDoc.columns[plan.planDoc.columns.length - 1]?.id ?? "";
		const effectiveId = selectedColumnId || fallbackId;
		const idx = plan.planDoc.columns.findIndex((col) => col.id === effectiveId);
		return idx >= 0 ? idx : 0;
	}, [plan.planDoc.columns, selectedColumnId]);

	const ranked = useMemo(() => {
		const items: RankedItem[] = [];

		for (const nodeId of Object.keys(plan.planDoc.nodesById)) {
			const node = plan.planDoc.nodesById[nodeId];
			if (!node) {
				continue;
			}

			if (node.columnIndex !== selectedColumnIndex) {
				continue;
			}

			const isLeaf = node.childIds.length === 0;
			const leafMetrics = node.leafMetrics;

			if (isHidingPlaceholders) {
				if (node.label.trim() === "") {
					continue;
				}
				if (!leafMetrics) {
					continue;
				}
			}

			const rollup = rollupsByNodeId[nodeId] ?? { importance: 0, ease: 0, timeHours: 0 };
			const importance = leafMetrics ? leafMetrics.importance : rollup.importance;
			const ease = leafMetrics ? leafMetrics.ease : rollup.ease;
			const timeHours = leafMetrics ? leafMetrics.timeHours : rollup.timeHours;
			const completion =
				completionByNodeId[nodeId] ?? { doneLeaves: 0, totalLeaves: 0, doneHours: 0, totalHours: 0, pct: 0 };
			const completionPct = completion.pct;

			if (isHidingDone && completionPct === 100) {
				continue;
			}

			if (importance === 0 || ease === 0) {
				continue;
			}

			const labelFull = node.label.trim();
			const labelFirstLine = clampText(getFirstLine(node.label) || "(empty)", 100);

			let displayLabelFirstLine = labelFirstLine;
			let displayLabelFull = labelFull;
			let parentLabel =
				selectedColumnIndex >= 3
					? getAncestorPathLabel({ nodeId, nodesById: plan.planDoc.nodesById, includeColumnIndexes: [1, 2] })
					: getImmediateParentLabel({ nodeId, nodesById: plan.planDoc.nodesById });

			// Depth 1 (column index 0): only show the label (avoid repeating it in the card body).
			if (selectedColumnIndex === 0) {
				displayLabelFull = "";
			}

			// Depth 2 (column index 1): show the depth-1 label as the title, and the depth-2 label as the body.
			if (selectedColumnIndex === 1) {
				const depth1Label = getAncestorPathLabel({
					nodeId,
					nodesById: plan.planDoc.nodesById,
					includeColumnIndexes: [0],
				});
				if (depth1Label) {
					displayLabelFirstLine = depth1Label;
					parentLabel = "";
				}
				displayLabelFull = labelFirstLine;
			}

			items.push({
				nodeId,
				importance,
				ease,
				timeHours,
				labelFirstLine: displayLabelFirstLine,
				labelFull: displayLabelFull,
				parentLabel,
				completionPct,
			});
		}

		items.sort((a, b) => {
			const aScore = a.importance + a.ease;
			const bScore = b.importance + b.ease;

			if (aScore !== bScore) {
				return bScore - aScore;
			}

			if (a.importance !== b.importance) {
				return b.importance - a.importance;
			}

			if (a.ease !== b.ease) {
				return b.ease - a.ease;
			}

			if (a.timeHours !== b.timeHours) {
				return a.timeHours - b.timeHours;
			}
			return a.labelFirstLine.localeCompare(b.labelFirstLine);
		});

		return items;
	}, [
		completionByNodeId,
		isHidingDone,
		isHidingPlaceholders,
		plan.planDoc.nodesById,
		rollupsByNodeId,
		selectedColumnIndex,
	]);

	const columns = 5;

	const renderStickyOptionsBar = () => {
		return (
			<div className="sticky top-0 z-20 mb-2 flex items-center justify-between gap-2 bg-zinc-50 py-2">
				<div className="text-xs text-zinc-600">
					Grid: ranked by score (importance + ease), filled left→right then top→bottom
				</div>

				<div className="flex items-center gap-2">
					<label className="flex select-none items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900">
						<input
							type="checkbox"
							checked={isHidingPlaceholders}
							onChange={(e) => setIsHidingPlaceholders(e.target.checked)}
							className="h-3.5 w-3.5"
						/>
						Hide placeholders
					</label>

					<label className="flex select-none items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900">
						<input
							type="checkbox"
							checked={isHidingDone}
							onChange={(e) => setIsHidingDone(e.target.checked)}
							className="h-3.5 w-3.5"
						/>
						Hide done
					</label>

					<select
						value={selectedColumnId || (plan.planDoc.columns[plan.planDoc.columns.length - 1]?.id ?? "")}
						onChange={(e) => setSelectedColumnId(e.target.value)}
						className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900"
					>
						{plan.planDoc.columns.map((col, idx) => {
							return (
								<option key={col.id} value={col.id}>
									{idx + 1}: {col.label}
								</option>
							);
						})}
					</select>
				</div>
			</div>
		);
	};

	const renderEmptyState = () => {
		return (
			<div className="rounded-md border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-600">
				No scored items yet. Set importance and ease on leaf nodes (right-most cells) to rank them.
			</div>
		);
	};

	const renderGrid = () => {
		return (
			<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(240px, 1fr))` }}>
				{ranked.map((item) => {
					return (
						<ExecutionGridCard
							key={item.nodeId}
							parentLabel={item.parentLabel}
							labelFirstLine={item.labelFirstLine}
							labelFull={item.labelFull}
							importance={item.importance}
							ease={item.ease}
							timeHours={item.timeHours}
							completionPct={item.completionPct}
							getCompletionBadgeClassName={getCompletionBadgeClassName}
							onPress={() => setSelectedNodeId(item.nodeId)}
						/>
					);
				})}
			</div>
		);
	};

	return (
		<div>
			{renderStickyOptionsBar()}

			{ranked.length === 0 ? renderEmptyState() : renderGrid()}

			<ExecutionGridCardDetailsModal
				isOpen={selectedNodeId !== null}
				onClose={() => setSelectedNodeId(null)}
				planDoc={plan.planDoc}
				nodeId={selectedNodeId ?? ""}
			/>
		</div>
	);
};

