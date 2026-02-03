import type { PlanDoc } from "@/plan/types";

export type PlanNodeGridPlacement = {
	nodeId: string;
	columnIndex: number;
	rowStart: number;
	rowSpan: number;
	indexInParent: number;
	siblingsCount: number;
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
	const result: Record<string, boolean> = {};
	for (const nodeId of Object.keys(planDoc.nodesById)) {
		const node = planDoc.nodesById[nodeId];
		result[nodeId] = !!node.leafDone;
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

		let doneLeaves = node.leafMetrics && node.leafDone ? 1 : 0;
		let totalLeaves = node.leafMetrics ? 1 : 0;
		let doneHours = node.leafMetrics && node.leafDone ? node.leafMetrics.timeHours : 0;
		let totalHours = node.leafMetrics ? node.leafMetrics.timeHours : 0;

		for (const childId of node.childIds) {
			const child = compute(childId);
			doneLeaves += child.doneLeaves;
			totalLeaves += child.totalLeaves;
			doneHours += child.doneHours;
			totalHours += child.totalHours;
		}

		const pct = totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : 0;
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

const computeLeafCount = (
	planDoc: PlanDoc,
	nodeId: string,
	cache: Map<string, number>,
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

	let sum = 0;
	for (const childId of node.childIds) {
		sum += computeLeafCount(planDoc, childId, cache);
	}

	const finalSum = sum > 0 ? sum : 1;
	cache.set(nodeId, finalSum);
	return finalSum;
};

export const getPlanGridLayout = (planDoc: PlanDoc): { placements: PlanNodeGridPlacement[]; rowCount: number } => {
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

		const rowSpan = computeLeafCount(planDoc, nodeId, leafCountCache);

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
		for (let i = 0; i < node.childIds.length; i += 1) {
			const childId = node.childIds[i];
			const childSpan = computeLeafCount(planDoc, childId, leafCountCache);
			walk(childId, childRow, i, node.childIds.length);
			childRow += childSpan;
		}
	};

	for (let i = 0; i < planDoc.rootIds.length; i += 1) {
		const rootId = planDoc.rootIds[i];
		const rootSpan = computeLeafCount(planDoc, rootId, leafCountCache);
		walk(rootId, currentRow, i, planDoc.rootIds.length);
		currentRow += rootSpan;
	}

	const rowCount = currentRow - 1;
	return { placements, rowCount: rowCount > 0 ? rowCount : 1 };
};

export const getPlanRollupsByNodeId = (planDoc: PlanDoc): Record<string, PlanNodeRollup> => {
	const cache = new Map<string, { importanceSum: number; easeSum: number; timeHours: number; leafCount: number }>();

	const compute = (nodeId: string): { importanceSum: number; easeSum: number; timeHours: number; leafCount: number } => {
		const cached = cache.get(nodeId);
		if (cached) {
			return cached;
		}

		const node = planDoc.nodesById[nodeId];
		if (!node) {
			const empty = { importanceSum: 0, easeSum: 0, timeHours: 0, leafCount: 1 };
			cache.set(nodeId, empty);
			return empty;
		}

		let importanceSum = node.leafMetrics ? node.leafMetrics.importance : 0;
		let easeSum = node.leafMetrics ? node.leafMetrics.ease : 0;
		let timeHours = node.leafMetrics ? node.leafMetrics.timeHours : 0;
		let leafCount = node.leafMetrics ? 1 : 0;

		for (const childId of node.childIds) {
			const childRollup = compute(childId);
			importanceSum += childRollup.importanceSum;
			easeSum += childRollup.easeSum;
			timeHours += childRollup.timeHours;
			leafCount += childRollup.leafCount;
		}

		const rollup = { importanceSum, easeSum, timeHours, leafCount: leafCount > 0 ? leafCount : 1 };
		cache.set(nodeId, rollup);
		return rollup;
	};

	for (const nodeId of Object.keys(planDoc.nodesById)) {
		compute(nodeId);
	}

	const result: Record<string, PlanNodeRollup> = {};
	for (const [key, value] of cache.entries()) {
		const leafCount = value.leafCount > 0 ? value.leafCount : 1;
		const importanceAvg = value.importanceSum / leafCount;
		const easeAvg = value.easeSum / leafCount;
		result[key] = {
			importance: Math.round(importanceAvg * 10) / 10,
			ease: Math.round(easeAvg * 10) / 10,
			timeHours: value.timeHours,
		};
	}

	return result;
};
