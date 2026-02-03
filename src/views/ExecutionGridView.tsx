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

const getLimitedChildIds = (props: {
	columnIndex: number;
	childIds: string[];
	focusColumnIndex: number | null;
	focusLimit: number;
}) => {
	if (props.focusColumnIndex === null) {
		return props.childIds;
	}

	if (props.columnIndex !== props.focusColumnIndex) {
		return props.childIds;
	}

	const limit = Math.max(0, Math.trunc(props.focusLimit));
	return props.childIds.slice(0, limit);
};

const getVisibleNodeIds = (props: {
	rootIds: string[];
	nodesById: Record<string, { id: string; columnIndex: number; childIds: string[] }>;
	focusColumnIndex: number | null;
	focusLimit: number;
}) => {
	if (props.focusColumnIndex === null) {
		return null;
	}

	const visited = new Set<string>();
	const stack = [...props.rootIds];

	while (stack.length > 0) {
		const nodeId = stack.pop();
		if (!nodeId) {
			continue;
		}

		if (visited.has(nodeId)) {
			continue;
		}
		visited.add(nodeId);

		const node = props.nodesById[nodeId];
		if (!node) {
			continue;
		}

		const childIds = getLimitedChildIds({
			columnIndex: node.columnIndex,
			childIds: node.childIds,
			focusColumnIndex: props.focusColumnIndex,
			focusLimit: props.focusLimit,
		});

		for (const childId of childIds) {
			stack.push(childId);
		}
	}

	return visited;
};

export const ExecutionGridView = () => {
	const plan = usePlan();
	const [selectedColumnId, setSelectedColumnId] = useState<string>("");
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [childFocusColumnIndex, setChildFocusColumnIndex] = useState<number | null>(null);
	const [childFocusLimit, setChildFocusLimit] = useState<number>(2);

	const visibleNodeIds = useMemo(() => {
		return getVisibleNodeIds({
			rootIds: plan.planDoc.rootIds,
			nodesById: plan.planDoc.nodesById,
			focusColumnIndex: childFocusColumnIndex,
			focusLimit: childFocusLimit,
		});
	}, [childFocusColumnIndex, childFocusLimit, plan.planDoc.nodesById, plan.planDoc.rootIds]);

	const rollupsByNodeId = useMemo(() => {
		if (childFocusColumnIndex === null) {
			return getPlanRollupsByNodeId(plan.planDoc);
		}

		const cache = new Map<string, { importance: number; ease: number; timeHours: number }>();

		const compute = (nodeId: string) => {
			const cached = cache.get(nodeId);
			if (cached) {
				return cached;
			}

			const node = plan.planDoc.nodesById[nodeId];
			if (!node) {
				const empty = { importance: 0, ease: 0, timeHours: 0 };
				cache.set(nodeId, empty);
				return empty;
			}

			if (node.childIds.length === 0) {
				const metrics = node.leafMetrics;
				const rollup = {
					importance: metrics ? metrics.importance : 0,
					ease: metrics ? metrics.ease : 0,
					timeHours: metrics ? metrics.timeHours : 0,
				};
				cache.set(nodeId, rollup);
				return rollup;
			}

			const childIds = getLimitedChildIds({
				columnIndex: node.columnIndex,
				childIds: node.childIds,
				focusColumnIndex: childFocusColumnIndex,
				focusLimit: childFocusLimit,
			}).filter((childId) => {
				return visibleNodeIds ? visibleNodeIds.has(childId) : true;
			});

			let importance = 0;
			let ease = 0;
			let timeHours = 0;

			for (const childId of childIds) {
				const childRollup = compute(childId);
				importance += childRollup.importance;
				ease += childRollup.ease;
				timeHours += childRollup.timeHours;
			}

			const rollup = { importance, ease, timeHours };
			cache.set(nodeId, rollup);
			return rollup;
		};

		const result: Record<string, { importance: number; ease: number; timeHours: number }> = {};
		if (visibleNodeIds) {
			for (const nodeId of visibleNodeIds) {
				result[nodeId] = compute(nodeId);
			}
		}

		return result;
	}, [childFocusColumnIndex, childFocusLimit, plan.planDoc, visibleNodeIds]);

	const completionByNodeId = useMemo(() => {
		if (childFocusColumnIndex === null) {
			return getPlanCompletionByNodeId(plan.planDoc);
		}

		const cache = new Map<
			string,
			{ doneLeaves: number; totalLeaves: number; doneHours: number; totalHours: number; pct: number }
		>();

		const compute = (nodeId: string) => {
			const cached = cache.get(nodeId);
			if (cached) {
				return cached;
			}

			const node = plan.planDoc.nodesById[nodeId];
			if (!node) {
				const empty = { doneLeaves: 0, totalLeaves: 0, doneHours: 0, totalHours: 0, pct: 0 };
				cache.set(nodeId, empty);
				return empty;
			}

			if (node.childIds.length === 0) {
				const doneLeaves = node.leafDone ? 1 : 0;
				const totalLeaves = 1;
				const totalHours = node.leafMetrics ? node.leafMetrics.timeHours : 0;
				const doneHours = node.leafDone ? totalHours : 0;
				const pct = totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : doneLeaves === 1 ? 100 : 0;
				const completion = { doneLeaves, totalLeaves, doneHours, totalHours, pct };
				cache.set(nodeId, completion);
				return completion;
			}

			const childIds = getLimitedChildIds({
				columnIndex: node.columnIndex,
				childIds: node.childIds,
				focusColumnIndex: childFocusColumnIndex,
				focusLimit: childFocusLimit,
			}).filter((childId) => {
				return visibleNodeIds ? visibleNodeIds.has(childId) : true;
			});

			let doneLeaves = 0;
			let totalLeaves = 0;
			let doneHours = 0;
			let totalHours = 0;

			for (const childId of childIds) {
				const child = compute(childId);
				doneLeaves += child.doneLeaves;
				totalLeaves += child.totalLeaves;
				doneHours += child.doneHours;
				totalHours += child.totalHours;
			}

			const pct =
				totalHours > 0
					? Math.round((doneHours / totalHours) * 100)
					: totalLeaves > 0 && doneLeaves === totalLeaves
						? 100
						: 0;
			const completion = { doneLeaves, totalLeaves, doneHours, totalHours, pct };
			cache.set(nodeId, completion);
			return completion;
		};

		const result: Record<
			string,
			{ doneLeaves: number; totalLeaves: number; doneHours: number; totalHours: number; pct: number }
		> = {};
		if (visibleNodeIds) {
			for (const nodeId of visibleNodeIds) {
				result[nodeId] = compute(nodeId);
			}
		}

		return result;
	}, [childFocusColumnIndex, childFocusLimit, plan.planDoc, visibleNodeIds]);

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
			if (visibleNodeIds && !visibleNodeIds.has(nodeId)) {
				continue;
			}

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
	}, [completionByNodeId, plan.planDoc.nodesById, rollupsByNodeId, selectedColumnIndex, visibleNodeIds]);

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

					<select
						value={childFocusColumnIndex === null ? "" : String(childFocusColumnIndex)}
						onChange={(e) => {
							const raw = e.target.value;
							if (raw === "") {
								setChildFocusColumnIndex(null);
								return;
							}

							const parsed = Number.parseInt(raw, 10);
							const nextValue = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
							setChildFocusColumnIndex(nextValue);
						}}
						className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900"
					>
						<option value="">Child focus: off</option>
						{plan.planDoc.columns.map((col, idx) => {
							return (
								<option key={col.id} value={idx}>
									Limit children at {col.label || `Level ${idx + 1}`}
								</option>
							);
						})}
					</select>

					<select
						value={String(childFocusLimit)}
						disabled={childFocusColumnIndex === null}
						onChange={(e) => {
							const raw = e.target.value;
							const parsed = Number.parseInt(raw, 10);
							const nextValue = Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1;
							setChildFocusLimit(nextValue);
						}}
						className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 disabled:opacity-50"
					>
						<option value="1">Show 1 child</option>
						<option value="2">Show 2 children</option>
						<option value="3">Show 3 children</option>
						<option value="4">Show 4 children</option>
						<option value="5">Show 5 children</option>
						<option value="10">Show 10 children</option>
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

