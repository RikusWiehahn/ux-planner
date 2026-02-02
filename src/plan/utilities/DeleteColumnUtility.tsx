"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { usePlan } from "@/plan/PlanContext";
import { useMemo, useState } from "react";

export const DeleteColumnUtility = (props: { columnIndex: number }) => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const label = useMemo(() => {
		const col = plan.planDoc.columns[props.columnIndex];
		return col ? col.label : "";
	}, [plan.planDoc.columns, props.columnIndex]);

	return (
		<div>
			<button
				type="button"
				role="menuitem"
				onClick={() => setIsOpen(true)}
				className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50"
			>
				Delete column
			</button>

			<ModalWrapper
				isOpen={isOpen}
				title="Delete column?"
				onClose={() => setIsOpen(false)}
			>
				<div className="text-sm text-zinc-700">
					This will delete <span className="font-medium">{label}</span> and all columns to
					the right, including all cells contained in those columns.
				</div>

				<div className="mt-4 flex items-center justify-end gap-2">
					<SecondaryButton onPress={() => setIsOpen(false)}>Cancel</SecondaryButton>

					<PrimaryButton
						onPress={() => {
							plan.dispatch({
								type: "plan/columnDeleteFromIndex",
								columnIndex: props.columnIndex,
							});
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

