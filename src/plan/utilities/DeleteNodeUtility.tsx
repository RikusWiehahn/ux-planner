"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { usePlan } from "@/plan/PlanContext";
import { useMemo, useState } from "react";

export const DeleteNodeUtility = (props: { nodeId: string }) => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const label = useMemo(() => {
		const node = plan.planDoc.nodesById[props.nodeId];
		return node ? node.label : "";
	}, [plan.planDoc.nodesById, props.nodeId]);

	return (
		<div>
			<button
				type="button"
				role="menuitem"
				onClick={() => setIsOpen(true)}
				className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50"
			>
				Delete
			</button>

			<ModalWrapper isOpen={isOpen} title="Delete item?" onClose={() => setIsOpen(false)}>
				<div className="text-sm text-zinc-700">
					This will delete <span className="font-medium">{label || "this item"}</span> and
					all nested sub-items.
				</div>

				<div className="mt-4 flex items-center justify-end gap-2">
					<SecondaryButton onPress={() => setIsOpen(false)}>Cancel</SecondaryButton>

					<PrimaryButton
						onPress={() => {
							plan.dispatch({ type: "plan/nodeDeleteCascade", nodeId: props.nodeId });
							setIsOpen(false);
						}}
					>
						Delete
					</PrimaryButton>
				</div>
			</ModalWrapper>
		</div>
	);
};

