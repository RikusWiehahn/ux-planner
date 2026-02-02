"use client";

import type { PlanColumn, PlanDoc, PlanLeafMetrics, PlanNode } from "@/plan/types";
import { createEmptyPlanDoc } from "@/plan/types";

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};

const isString = (value: unknown): value is string => {
	return typeof value === "string";
};

const isNumber = (value: unknown): value is number => {
	return typeof value === "number" && Number.isFinite(value);
};

const isStringArray = (value: unknown): value is string[] => {
	if (!Array.isArray(value)) {
		return false;
	}

	for (const item of value) {
		if (!isString(item)) {
			return false;
		}
	}

	return true;
};

const isRating = (value: unknown): value is 0 | 1 | 2 | 3 | 4 | 5 => {
	return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
};

const parsePlanColumn = (value: unknown): PlanColumn | null => {
	if (!isObjectRecord(value)) {
		return null;
	}

	const id = value["id"];
	const label = value["label"];

	if (!isString(id) || !isString(label)) {
		return null;
	}

	return { id, label };
};

const parsePlanLeafMetrics = (value: unknown): PlanLeafMetrics | null => {
	if (!isObjectRecord(value)) {
		return null;
	}

	const importance = value["importance"];
	const ease = value["ease"];
	const timeHours = value["timeHours"];

	if (!isRating(importance) || !isRating(ease) || !isNumber(timeHours) || timeHours < 0) {
		return null;
	}

	return { importance, ease, timeHours };
};

const parsePlanNodeFromKey = (key: string, value: unknown): PlanNode | null => {
	if (!isObjectRecord(value)) {
		return null;
	}

	const idRaw = value["id"];
	const columnIndexRaw = value["columnIndex"];
	const parentIdRaw = value["parentId"];
	const titleRaw = value["title"];
	const labelRaw = value["label"];
	const childIdsRaw = value["childIds"];
	const leafMetricsRaw = value["leafMetrics"];
	const leafDoneRaw = value["leafDone"];
	const isCollapsedRaw = value["isCollapsed"];

	const id = isString(idRaw) ? idRaw : key;

	const columnIndex =
		isNumber(columnIndexRaw) && Number.isInteger(columnIndexRaw) && columnIndexRaw >= 0
			? columnIndexRaw
			: 0;

	const parentId = parentIdRaw === null || isString(parentIdRaw) ? parentIdRaw : null;

	const label = isString(labelRaw) ? labelRaw : "";
	const title = isString(titleRaw) ? titleRaw : label;

	const childIds = isStringArray(childIdsRaw) ? childIdsRaw : [];

	const leafMetrics = leafMetricsRaw === null ? null : parsePlanLeafMetrics(leafMetricsRaw);
	const leafDone = typeof leafDoneRaw === "boolean" ? leafDoneRaw : false;
	const isCollapsed = typeof isCollapsedRaw === "boolean" ? isCollapsedRaw : false;

	return {
		id,
		columnIndex,
		parentId,
		title,
		label,
		childIds,
		leafMetrics,
		leafDone,
		isCollapsed,
	};
};

export const parsePlanDoc = (value: unknown): PlanDoc | null => {
	if (!isObjectRecord(value)) {
		return null;
	}

	const base = createEmptyPlanDoc();

	const columnsRaw = value["columns"];
	const rootIdsRaw = value["rootIds"];
	const nodesByIdRaw = value["nodesById"];

	let columns: PlanColumn[] = base.columns;
	if (Array.isArray(columnsRaw)) {
		const parsedColumns: PlanColumn[] = [];

		for (const item of columnsRaw) {
			const col = parsePlanColumn(item);
			if (col) {
				parsedColumns.push(col);
			}
		}

		if (parsedColumns.length > 0) {
			columns = parsedColumns;
		}
	}

	const nodesById: Record<string, PlanNode> = {};
	if (isObjectRecord(nodesByIdRaw)) {
		for (const key of Object.keys(nodesByIdRaw)) {
			const node = parsePlanNodeFromKey(key, nodesByIdRaw[key]);
			if (node) {
				nodesById[key] = node;
			}
		}
	}

	for (const key of Object.keys(nodesById)) {
		const node = nodesById[key];

		if (node.parentId !== null && !nodesById[node.parentId]) {
			nodesById[key] = { ...node, parentId: null };
		}
	}

	for (const key of Object.keys(nodesById)) {
		const node = nodesById[key];

		const nextChildIds: string[] = [];
		for (const childId of node.childIds) {
			const child = nodesById[childId];
			if (!child) {
				continue;
			}

			if (child.parentId !== node.id) {
				continue;
			}

			if (child.columnIndex !== node.columnIndex + 1) {
				continue;
			}

			nextChildIds.push(childId);
		}

		if (nextChildIds.length !== node.childIds.length) {
			nodesById[key] = { ...node, childIds: nextChildIds };
		}
	}

	let rootIds: string[] = [];
	if (isStringArray(rootIdsRaw)) {
		for (const id of rootIdsRaw) {
			const node = nodesById[id];
			if (!node) {
				continue;
			}

			if (node.parentId !== null) {
				continue;
			}

			if (node.columnIndex !== 0) {
				continue;
			}

			rootIds.push(id);
		}
	}

	if (rootIds.length === 0) {
		for (const key of Object.keys(nodesById)) {
			const node = nodesById[key];
			if (node.parentId === null && node.columnIndex === 0) {
				rootIds.push(node.id);
			}
		}
	}

	return {
		...base,
		columns,
		rootIds,
		nodesById,
	};
};

