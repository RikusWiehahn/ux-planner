import type { PlanAction, PlanClipboardTree, PlanDoc, PlanNode } from "@/plan/types";
import { createEmptyPlanDoc } from "@/plan/types";

const createId = (prefix: string) => {
	if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
		const crypto = globalThis.crypto;
		if (typeof crypto.randomUUID === "function") {
			return `${prefix}-${crypto.randomUUID()}`;
		}
	}

	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

const getMaxColumnIndexInClipboardTree = (tree: PlanClipboardTree): number => {
	let max = tree.columnIndex;
	for (const child of tree.children) {
		const childMax = getMaxColumnIndexInClipboardTree(child);
		if (childMax > max) {
			max = childMax;
		}
	}
	return max;
};

const cloneClipboardSubtree = (props: {
	clipboardTree: PlanClipboardTree;
	parentId: string | null;
	nodesById: Record<string, PlanNode>;
}): string => {
	const nodeId = createId("node");
	const childIds: string[] = [];

	for (const child of props.clipboardTree.children) {
		const childId = cloneClipboardSubtree({
			clipboardTree: child,
			parentId: nodeId,
			nodesById: props.nodesById,
		});
		childIds.push(childId);
	}

	props.nodesById[nodeId] = {
		id: nodeId,
		columnIndex: props.clipboardTree.columnIndex,
		parentId: props.parentId,
		title: props.clipboardTree.title,
		label: props.clipboardTree.label,
		childIds,
		leafMetrics: props.clipboardTree.leafMetrics,
		leafDone: props.clipboardTree.leafDone,
		isCollapsed: props.clipboardTree.isCollapsed,
	};

	return nodeId;
};

export const planReducer = (state: PlanDoc, action: PlanAction): PlanDoc => {
	if (action.type === "plan/replaceDoc") {
		return action.doc;
	}

	if (action.type === "plan/columnAdd") {
		const nextIndex = state.columns.length + 1;

		return {
			...state,
			columns: [
				...state.columns,
				{
					id: createId("col"),
					label: `Level ${nextIndex}`,
				},
			],
		};
	}

	if (action.type === "plan/columnRename") {
		return {
			...state,
			columns: state.columns.map((col) => {
				if (col.id !== action.columnId) {
					return col;
				}

				return { ...col, label: action.label };
			}),
		};
	}

	if (action.type === "plan/columnDeleteFromIndex") {
		const nextColumns = state.columns.slice(0, action.columnIndex);

		const nextNodesById: PlanDoc["nodesById"] = {};
		for (const nodeId of Object.keys(state.nodesById)) {
			const node = state.nodesById[nodeId];
			if (node.columnIndex < action.columnIndex) {
				nextNodesById[nodeId] = { ...node };
			}
		}

		for (const nodeId of Object.keys(nextNodesById)) {
			const node = nextNodesById[nodeId];
			const nextChildIds: string[] = [];

			for (const childId of node.childIds) {
				if (nextNodesById[childId]) {
					nextChildIds.push(childId);
				}
			}

			nextNodesById[nodeId] = { ...node, childIds: nextChildIds };
		}

		const nextRootIds: string[] = [];
		for (const rootId of state.rootIds) {
			if (nextNodesById[rootId]) {
				nextRootIds.push(rootId);
			}
		}

		if (nextColumns.length === 0) {
			return createEmptyPlanDoc();
		}

		return {
			...state,
			columns: nextColumns,
			rootIds: nextRootIds,
			nodesById: nextNodesById,
		};
	}

	if (action.type === "plan/rootAdd") {
		const nodeId = createId("node");

		return {
			...state,
			rootIds: [...state.rootIds, nodeId],
			nodesById: {
				...state.nodesById,
				[nodeId]: {
					id: nodeId,
					columnIndex: 0,
					parentId: null,
					title: "",
					label: "",
					childIds: [],
					leafMetrics: null,
					leafDone: false,
					isCollapsed: false,
				},
			},
		};
	}

	if (action.type === "plan/rootMove") {
		const idx = state.rootIds.indexOf(action.nodeId);
		if (idx < 0) {
			return state;
		}

		const nextIndex = action.direction === "up" ? idx - 1 : idx + 1;
		if (nextIndex < 0 || nextIndex >= state.rootIds.length) {
			return state;
		}

		const nextRootIds = [...state.rootIds];
		const temp = nextRootIds[idx];
		nextRootIds[idx] = nextRootIds[nextIndex];
		nextRootIds[nextIndex] = temp;

		return { ...state, rootIds: nextRootIds };
	}

	if (action.type === "plan/nodePasteSubtree") {
		const maxColumnIndex = getMaxColumnIndexInClipboardTree(action.clipboardTree);
		if (maxColumnIndex >= state.columns.length) {
			return state;
		}

		if (action.parentId === null) {
			if (action.clipboardTree.columnIndex !== 0) {
				return state;
			}

			const nextNodesByIdAdditions: Record<string, PlanNode> = {};
			const nextRootId = cloneClipboardSubtree({
				clipboardTree: action.clipboardTree,
				parentId: null,
				nodesById: nextNodesByIdAdditions,
			});

			return {
				...state,
				rootIds: [...state.rootIds, nextRootId],
				nodesById: { ...state.nodesById, ...nextNodesByIdAdditions },
			};
		}

		const parent = state.nodesById[action.parentId];
		if (!parent) {
			return state;
		}

		if (parent.columnIndex !== action.clipboardTree.columnIndex - 1) {
			return state;
		}

		const nextNodesByIdAdditions: Record<string, PlanNode> = {};
		const nextRootId = cloneClipboardSubtree({
			clipboardTree: action.clipboardTree,
			parentId: parent.id,
			nodesById: nextNodesByIdAdditions,
		});

		return {
			...state,
			nodesById: {
				...state.nodesById,
				...nextNodesByIdAdditions,
				[parent.id]: { ...parent, childIds: [...parent.childIds, nextRootId] },
			},
		};
	}

	if (action.type === "plan/nodeSetTitle") {
		const node = state.nodesById[action.nodeId];
		if (!node) {
			return state;
		}

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[action.nodeId]: { ...node, title: action.title },
			},
		};
	}

	if (action.type === "plan/nodeSetLabel") {
		const node = state.nodesById[action.nodeId];
		if (!node) {
			return state;
		}

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[action.nodeId]: { ...node, label: action.label },
			},
		};
	}

	if (action.type === "plan/nodeSetLeafMetrics") {
		const node = state.nodesById[action.nodeId];
		if (!node) {
			return state;
		}

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[action.nodeId]: { ...node, leafMetrics: action.leafMetrics },
			},
		};
	}

	if (action.type === "plan/nodeSetLeafDone") {
		const node = state.nodesById[action.nodeId];
		if (!node) {
			return state;
		}

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[action.nodeId]: { ...node, leafDone: action.leafDone },
			},
		};
	}

	if (action.type === "plan/nodeDeleteCascade") {
		const rootNode = state.nodesById[action.nodeId];
		if (!rootNode) {
			return state;
		}

		const toDelete = new Set<string>();
		const stack: string[] = [action.nodeId];

		while (stack.length > 0) {
			const id = stack.pop();
			if (!id) {
				continue;
			}

			if (toDelete.has(id)) {
				continue;
			}

			toDelete.add(id);

			const node = state.nodesById[id];
			if (!node) {
				continue;
			}

			for (const childId of node.childIds) {
				stack.push(childId);
			}
		}

		const nextNodesById: PlanDoc["nodesById"] = {};
		for (const nodeId of Object.keys(state.nodesById)) {
			if (!toDelete.has(nodeId)) {
				nextNodesById[nodeId] = state.nodesById[nodeId];
			}
		}

		for (const nodeId of Object.keys(nextNodesById)) {
			const node = nextNodesById[nodeId];
			if (!node) {
				continue;
			}

			const nextChildIds: string[] = [];
			for (const childId of node.childIds) {
				if (nextNodesById[childId]) {
					nextChildIds.push(childId);
				}
			}

			if (nextChildIds.length !== node.childIds.length) {
				nextNodesById[nodeId] = { ...node, childIds: nextChildIds };
			}
		}

		const nextRootIds: string[] = [];
		for (const rootId of state.rootIds) {
			if (nextNodesById[rootId]) {
				nextRootIds.push(rootId);
			}
		}

		return {
			...state,
			rootIds: nextRootIds,
			nodesById: nextNodesById,
		};
	}

	if (action.type === "plan/nodeAddChild") {
		const parent = state.nodesById[action.parentId];
		if (!parent) {
			return state;
		}

		const nextColumnIndex = parent.columnIndex + 1;
		if (nextColumnIndex >= state.columns.length) {
			return state;
		}

		const nodeId = createId("node");

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[action.parentId]: {
					...parent,
					childIds: [...parent.childIds, nodeId],
				},
				[nodeId]: {
					id: nodeId,
					columnIndex: nextColumnIndex,
					parentId: action.parentId,
					title: "",
					label: "",
					childIds: [],
					leafMetrics: null,
					leafDone: false,
					isCollapsed: false,
				},
			},
		};
	}

	if (action.type === "plan/nodeToggleCollapsed") {
		const node = state.nodesById[action.nodeId];
		if (!node) {
			return state;
		}

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[action.nodeId]: { ...node, isCollapsed: !node.isCollapsed },
			},
		};
	}

	if (action.type === "plan/nodeMoveWithinParent") {
		const node = state.nodesById[action.nodeId];
		if (!node) {
			return state;
		}

		if (!node.parentId) {
			return state;
		}

		const parent = state.nodesById[node.parentId];
		if (!parent) {
			return state;
		}

		const idx = parent.childIds.indexOf(node.id);
		if (idx < 0) {
			return state;
		}

		const nextIndex = action.direction === "up" ? idx - 1 : idx + 1;
		if (nextIndex < 0 || nextIndex >= parent.childIds.length) {
			return state;
		}

		const nextChildIds = [...parent.childIds];
		const temp = nextChildIds[idx];
		nextChildIds[idx] = nextChildIds[nextIndex];
		nextChildIds[nextIndex] = temp;

		return {
			...state,
			nodesById: {
				...state.nodesById,
				[parent.id]: { ...parent, childIds: nextChildIds },
			},
		};
	}

	return state;
};

