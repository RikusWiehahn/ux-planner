"use client";

import { usePlan } from "@/plan/PlanContext";
import { twMerge } from "tailwind-merge";

export const MoveChildItemUtility = (props: {
	nodeId: string;
	direction: "up" | "down";
	isDisabled: boolean;
}) => {
	const plan = usePlan();

	return (
		<button
			type="button"
			role="menuitem"
			disabled={props.isDisabled}
			onClick={() =>
				plan.dispatch({
					type: "plan/nodeMoveWithinParent",
					nodeId: props.nodeId,
					direction: props.direction,
				})
			}
			className={twMerge(
				"w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
				props.isDisabled ? "cursor-not-allowed text-zinc-400" : "text-zinc-900 hover:bg-zinc-50",
			)}
		>
			Move {props.direction === "up" ? "up" : "down"}
		</button>
	);
};

