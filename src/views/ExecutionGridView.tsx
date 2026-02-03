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

export const ExecutionGridView = () => {
	const plan = usePlan();
	const [selectedColumnId, setSelectedColumnId] = useState<string>("");
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

			const rollup = rollupsByNodeId[nodeId] ?? { importance: 0, ease: 0, timeHours: 0 };
			const leafMetrics = node.leafMetrics;

			const importance = isLeaf ? (leafMetrics ? leafMetrics.importance : 0) : rollup.importance;
			const ease = isLeaf ? (leafMetrics ? leafMetrics.ease : 0) : rollup.ease;
			const timeHours = isLeaf ? (leafMetrics ? leafMetrics.timeHours : 0) : rollup.timeHours;
			const completion =
				completionByNodeId[nodeId] ?? { doneLeaves: 0, totalLeaves: 0, doneHours: 0, totalHours: 0, pct: 0 };
			const completionPct = completion.pct;

			if (importance === 0 || ease === 0) {
				continue;
			}

			const labelFull = node.label.trim();
			const labelFirstLine = clampText(getFirstLine(node.label) || "(empty)", 100);
			const parentLabel = getImmediateParentLabel({
				nodeId,
				nodesById: plan.planDoc.nodesById,
			});

			items.push({
				nodeId,
				importance,
				ease,
				timeHours,
				labelFirstLine,
				labelFull,
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
	}, [completionByNodeId, plan.planDoc.nodesById, rollupsByNodeId, selectedColumnIndex]);

	const columns = 5;

	const buckets = useMemo(() => {
		const result: RankedItem[][] = Array.from({ length: columns }, () => []);

		for (const item of ranked) {
			const importanceBucket = Math.max(1, Math.min(5, Math.trunc(item.importance)));
			const columnIndex = Math.max(0, Math.min(columns - 1, 5 - importanceBucket));
			result[columnIndex].push(item);
		}

		for (const col of result) {
			col.sort((a, b) => {
				if (a.ease !== b.ease) {
					return b.ease - a.ease;
				}

				const aScore = a.importance + a.ease;
				const bScore = b.importance + b.ease;

				if (aScore !== bScore) {
					return bScore - aScore;
				}

				if (a.timeHours !== b.timeHours) {
					return a.timeHours - b.timeHours;
				}

				return a.labelFirstLine.localeCompare(b.labelFirstLine);
			});
		}

		return result;
	}, [ranked]);

	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-xs text-zinc-600">
					Grid: importance left→right (high→low), ease top→bottom (high→low)
				</div>

				<div className="flex items-center gap-2">
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

			{ranked.length === 0 ? (
				<div className="rounded-md border border-dashed border-zinc-200 bg-white p-3 text-xs text-zinc-600">
					No scored items yet. Set importance and ease on leaf nodes (right-most cells) to rank them.
				</div>
			) : (
				<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(240px, 1fr))` }}>
					{buckets.map((bucketItems, idx) => {
						return (
							<div key={idx} className="flex flex-col gap-2">
								{bucketItems.map((item) => {
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
					})}
				</div>
			)}

			<ExecutionGridCardDetailsModal
				isOpen={selectedNodeId !== null}
				onClose={() => setSelectedNodeId(null)}
				planDoc={plan.planDoc}
				nodeId={selectedNodeId ?? ""}
			/>
		</div>
	);
};

