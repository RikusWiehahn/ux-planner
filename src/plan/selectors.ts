"use client";

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

const computeLeafCount = (planDoc: PlanDoc, nodeId: string, cache: Map<string, number>): number => {
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
