import type { PlanDoc } from "@/plan/types";

export type PlanNodeGridPlacement = {
	nodeId: string;
	columnIndex: number;
	rowStart: number;
	rowSpan: number;
	indexInParent: number;
	siblingsCount: number;
};

export type PlanGridLayoutOptions = {
	childLimitByColumnIndex?: Partial<Record<number, number>>;
};

export type PlanNodeRollup = {
	importance: number;
	ease: number;
	timeHours: number;
};

export type PlanNodeCompletion = {
	doneLeaves: number;
	totalLeaves: number;
	doneHours: number;
	totalHours: number;
	pct: number;
};

export const getPlanDoneByNodeId = (planDoc: PlanDoc): Record<string, boolean> => {
	const cache = new Map<string, boolean>();

	const compute = (nodeId: string): boolean => {
		const cached = cache.get(nodeId);
		if (typeof cached === "boolean") {
			return cached;
		}

		const node = planDoc.nodesById[nodeId];
		if (!node) {
			cache.set(nodeId, false);
			return false;
		}

		if (node.childIds.length === 0) {
			const done = !!node.leafDone;
			cache.set(nodeId, done);
			return done;
		}

		for (const childId of node.childIds) {
			if (!compute(childId)) {
				cache.set(nodeId, false);
				return false;
			}
		}

		cache.set(nodeId, true);
		return true;
	};

	for (const nodeId of Object.keys(planDoc.nodesById)) {
		compute(nodeId);
	}

	const result: Record<string, boolean> = {};
	for (const [key, value] of cache.entries()) {
		result[key] = value;
	}

	return result;
};

export const getPlanCompletionByNodeId = (planDoc: PlanDoc): Record<string, PlanNodeCompletion> => {
	const cache = new Map<string, PlanNodeCompletion>();

	const compute = (nodeId: string): PlanNodeCompletion => {
		const cached = cache.get(nodeId);
		if (cached) {
			return cached;
		}

		const node = planDoc.nodesById[nodeId];
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

		let doneLeaves = 0;
		let totalLeaves = 0;
		let doneHours = 0;
		let totalHours = 0;

		for (const childId of node.childIds) {
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

	for (const nodeId of Object.keys(planDoc.nodesById)) {
		compute(nodeId);
	}

	const result: Record<string, PlanNodeCompletion> = {};
	for (const [key, value] of cache.entries()) {
		result[key] = value;
	}

	return result;
};

const getVisibleChildIds = (node: { columnIndex: number; childIds: string[] }, options: PlanGridLayoutOptions) => {
	const childLimitByColumnIndex = options.childLimitByColumnIndex;
	if (!childLimitByColumnIndex) {
		return node.childIds;
	}

	const rawLimit = childLimitByColumnIndex[node.columnIndex];
	if (typeof rawLimit !== "number" || !Number.isFinite(rawLimit)) {
		return node.childIds;
	}

	const limit = Math.max(0, Math.trunc(rawLimit));
	return node.childIds.slice(0, limit);
};

const computeLeafCount = (
	planDoc: PlanDoc,
	nodeId: string,
	cache: Map<string, number>,
	options: PlanGridLayoutOptions,
): number => {
	const cached = cache.get(nodeId);
	if (typeof cached === "number") {
		return cached;
	}

	const node = planDoc.nodesById[nodeId];
	if (!node) {
		cache.set(nodeId, 1);
		return 1;
	}

	if (node.isCollapsed) {
		cache.set(nodeId, 1);
		return 1;
	}

	if (node.childIds.length === 0) {
		cache.set(nodeId, 1);
		return 1;
	}

	const visibleChildIds = getVisibleChildIds(node, options);
	let sum = 0;
	for (const childId of visibleChildIds) {
		sum += computeLeafCount(planDoc, childId, cache, options);
	}

	const finalSum = sum > 0 ? sum : 1;
	cache.set(nodeId, finalSum);
	return finalSum;
};

export const getPlanGridLayoutWithOptions = (
	planDoc: PlanDoc,
	options: PlanGridLayoutOptions,
): { placements: PlanNodeGridPlacement[]; rowCount: number } => {
	const placements: PlanNodeGridPlacement[] = [];
	const leafCountCache = new Map<string, number>();

	let currentRow = 1;

	const walk = (nodeId: string, rowStart: number, indexInParent: number, siblingsCount: number) => {
		const node = planDoc.nodesById[nodeId];
		if (!node) {
			placements.push({
				nodeId,
				columnIndex: 0,
				rowStart,
				rowSpan: 1,
				indexInParent,
				siblingsCount,
			});
			return;
		}

		const rowSpan = computeLeafCount(planDoc, nodeId, leafCountCache, options);

		placements.push({
			nodeId,
			columnIndex: node.columnIndex,
			rowStart,
			rowSpan,
			indexInParent,
			siblingsCount,
		});

		if (node.isCollapsed) {
			return;
		}

		let childRow = rowStart;
		const visibleChildIds = getVisibleChildIds(node, options);
		for (let i = 0; i < visibleChildIds.length; i += 1) {
			const childId = visibleChildIds[i];
			const childSpan = computeLeafCount(planDoc, childId, leafCountCache, options);
			walk(childId, childRow, i, visibleChildIds.length);
			childRow += childSpan;
		}
	};

	for (let i = 0; i < planDoc.rootIds.length; i += 1) {
		const rootId = planDoc.rootIds[i];
		const rootSpan = computeLeafCount(planDoc, rootId, leafCountCache, options);
		walk(rootId, currentRow, i, planDoc.rootIds.length);
		currentRow += rootSpan;
	}

	const rowCount = currentRow - 1;
	return { placements, rowCount: rowCount > 0 ? rowCount : 1 };
};

export const getPlanGridLayout = (planDoc: PlanDoc): { placements: PlanNodeGridPlacement[]; rowCount: number } => {
	return getPlanGridLayoutWithOptions(planDoc, {});
};

export const getPlanRollupsByNodeId = (planDoc: PlanDoc): Record<string, PlanNodeRollup> => {
	const cache = new Map<string, PlanNodeRollup>();

	const compute = (nodeId: string): PlanNodeRollup => {
		const cached = cache.get(nodeId);
		if (cached) {
			return cached;
		}

		const node = planDoc.nodesById[nodeId];
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

		let importance = 0;
		let ease = 0;
		let timeHours = 0;

		for (const childId of node.childIds) {
			const childRollup = compute(childId);
			importance += childRollup.importance;
			ease += childRollup.ease;
			timeHours += childRollup.timeHours;
		}

		const rollup = { importance, ease, timeHours };
		cache.set(nodeId, rollup);
		return rollup;
	};

	for (const nodeId of Object.keys(planDoc.nodesById)) {
		compute(nodeId);
	}

	const result: Record<string, PlanNodeRollup> = {};
	for (const [key, value] of cache.entries()) {
		result[key] = value;
	}

	return result;
};
