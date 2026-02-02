"use client";

import { usePlan } from "@/plan/PlanContext";

export const AddRootItemUtility = () => {
	const plan = usePlan();

	return (
		<button
			type="button"
			role="menuitem"
			onClick={() => plan.dispatch({ type: "plan/rootAdd" })}
			className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50"
		>
			Add item
		</button>
	);
};

