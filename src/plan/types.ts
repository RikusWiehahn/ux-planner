export type PlanColumn = {
	id: string;
	label: string;
};

export type PlanLeafMetrics = {
	importance: 0 | 1 | 2 | 3 | 4 | 5;
	ease: 0 | 1 | 2 | 3 | 4 | 5;
	timeHours: number;
};

export type PlanNode = {
	id: string;
	columnIndex: number;
	parentId: string | null;
	title: string;
	label: string;
	childIds: string[];
	leafMetrics: PlanLeafMetrics | null;
	leafDone: boolean;
	isCollapsed: boolean;
};

export type PlanClipboardTree = {
	columnIndex: number;
	title: string;
	label: string;
	leafMetrics: PlanLeafMetrics | null;
	leafDone: boolean;
	isCollapsed: boolean;
	children: PlanClipboardTree[];
};

export type PlanDoc = {
	version: 1;
	columns: PlanColumn[];
	rootIds: string[];
	nodesById: Record<string, PlanNode>;
};

export type PlanAction =
	| { type: "plan/noop" }
	| { type: "plan/replaceDoc"; doc: PlanDoc }
	| { type: "plan/columnAdd" }
	| { type: "plan/columnRename"; columnId: string; label: string }
	| { type: "plan/columnDeleteFromIndex"; columnIndex: number }
	| { type: "plan/rootAdd" }
	| { type: "plan/rootMove"; nodeId: string; direction: "up" | "down" }
	| { type: "plan/nodeAddChild"; parentId: string }
	| { type: "plan/nodeMoveWithinParent"; nodeId: string; direction: "up" | "down" }
	| { type: "plan/nodePasteSubtree"; parentId: string | null; clipboardTree: PlanClipboardTree }
	| { type: "plan/nodeSetTitle"; nodeId: string; title: string }
	| { type: "plan/nodeSetLabel"; nodeId: string; label: string }
	| { type: "plan/nodeSetLeafMetrics"; nodeId: string; leafMetrics: PlanLeafMetrics | null }
	| { type: "plan/nodeSetLeafDone"; nodeId: string; leafDone: boolean }
	| { type: "plan/nodeToggleCollapsed"; nodeId: string }
	| { type: "plan/nodeDeleteCascade"; nodeId: string };

export const createEmptyPlanDoc = (): PlanDoc => {
	return {
		version: 1,
		columns: [{ id: "col-1", label: "Level 1" }],
		rootIds: [],
		nodesById: {},
	};
};

