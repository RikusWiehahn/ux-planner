"use client";

import { usePlan } from "@/plan/PlanContext";
import { twMerge } from "tailwind-merge";

export const AddChildItemUtility = (props: { parentId: string }) => {
	const plan = usePlan();

	const parent = plan.planDoc.nodesById[props.parentId];
	const isDisabled = !parent || parent.columnIndex + 1 >= plan.planDoc.columns.length;

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

