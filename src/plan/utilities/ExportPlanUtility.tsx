"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { PrimaryButton } from "@/components/PrimaryButton";
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

	const downloadFile = () => {
		const blob = new Blob([jsonText], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = "ux-planner.json";
		document.body.appendChild(a);
		a.click();
		a.remove();

		URL.revokeObjectURL(url);
	};

	const renderMenuItem = () => {
		return (
			<button
				type="button"
				role="menuitem"
				onClick={() => setIsOpen(true)}
				className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50"
			>
				Export JSON
			</button>
		);
	};

	const renderModalBody = () => {
		return (
			<>
				<div className="text-xs text-zinc-600">Copy this JSON to save/share the document.</div>

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

				<div className="mt-3 flex items-center justify-end gap-2">
					<PrimaryButton onPress={downloadFile}>Download file</PrimaryButton>
					<SecondaryButton onPress={() => setIsOpen(false)}>Close</SecondaryButton>
				</div>
			</>
		);
	};

	const renderModal = () => {
		return (
			<ModalWrapper isOpen={isOpen} title="Export JSON" onClose={() => setIsOpen(false)}>
				{renderModalBody()}
			</ModalWrapper>
		);
	};

	return (
		<div>
			{renderMenuItem()}
			{renderModal()}
		</div>
	);
};

