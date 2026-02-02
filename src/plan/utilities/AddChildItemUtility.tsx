"use client";

import { usePlan } from "@/plan/PlanContext";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

export const AddChildItemUtility = (props: { parentId: string }) => {
	const plan = usePlan();

	const isDisabled = useMemo(() => {
		const parent = plan.planDoc.nodesById[props.parentId];
		if (!parent) {
			return true;
		}

		return parent.columnIndex + 1 >= plan.planDoc.columns.length;
	}, [plan.planDoc.columns.length, plan.planDoc.nodesById, props.parentId]);

	return (
		<button
			type="button"
			role="menuitem"
			disabled={isDisabled}
			onClick={() => plan.dispatch({ type: "plan/nodeAddChild", parentId: props.parentId })}
			className={twMerge(
				"w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
				isDisabled ? "cursor-not-allowed text-zinc-400" : "text-zinc-900 hover:bg-zinc-50",
			)}
		>
			Add sub-item
		</button>
	);
};

