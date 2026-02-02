"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
import { usePlan } from "@/plan/PlanContext";
import { useMemo, useState } from "react";

export const ExportPlanUtility = () => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const jsonText = useMemo(() => {
		return JSON.stringify(plan.planDoc, null, "\t");
	}, [plan.planDoc]);

	return (
		<div>
			<button
				type="button"
				role="menuitem"
				onClick={() => setIsOpen(true)}
				className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50"
			>
				Export JSON
			</button>

			<ModalWrapper isOpen={isOpen} title="Export JSON" onClose={() => setIsOpen(false)}>
				<div className="text-xs text-zinc-600">
					Copy this JSON to save/share the document.
				</div>

				<div className="mt-2">
					<TextInput
						value={jsonText}
						onChange={() => {}}
						isReadOnly={true}
						isMultiline={true}
						rows={10}
						isAutoHeight={false}
						className="h-56 font-mono"
					/>
				</div>

				<div className="mt-3 flex items-center justify-end">
					<SecondaryButton onPress={() => setIsOpen(false)}>Close</SecondaryButton>
				</div>
			</ModalWrapper>
		</div>
	);
};

