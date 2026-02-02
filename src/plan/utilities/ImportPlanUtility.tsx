"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
import { parsePlanDoc } from "@/plan/parsePlanDoc";
import { usePlan } from "@/plan/PlanContext";
import { useState } from "react";

export const ImportPlanUtility = () => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [jsonText, setJsonText] = useState<string>("");
	const [error, setError] = useState<string>("");

	const importFromText = (text: string) => {
		try {
			const parsed: unknown = JSON.parse(text);
			const doc = parsePlanDoc(parsed);
			if (!doc) {
				setError("Invalid JSON shape (could not parse a plan document).");
				return;
			}

			plan.dispatch({ type: "plan/replaceDoc", doc });
			setError("");
			setIsOpen(false);
			setJsonText("");
		} catch {
			setError("Invalid JSON (could not parse).");
		}
	};

	return (
		<div>
			<button
				type="button"
				role="menuitem"
				onClick={() => {
					setIsOpen(true);
					setError("");
				}}
				className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50"
			>
				Import JSON
			</button>

			<ModalWrapper
				isOpen={isOpen}
				title="Import JSON"
				onClose={() => {
					setIsOpen(false);
					setError("");
				}}
			>
				<div className="text-xs text-zinc-600">
					Paste a previously exported `sixb-plan.json` here. This will replace your current document.
				</div>

				<div className="mt-2">
					<TextInput
						value={jsonText}
						onChange={(v) => setJsonText(v)}
						placeholder="{ ... }"
						isMultiline={true}
						rows={10}
						isAutoHeight={false}
						className="h-56 font-mono"
					/>
				</div>

				{error ? <div className="mt-2 text-xs text-red-700">{error}</div> : null}

				<div className="mt-3 flex items-center justify-between gap-2">
					<input
						type="file"
						accept="application/json,.json"
						onChange={async (e) => {
							const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
							if (!file) {
								return;
							}

							const text = await file.text();
							setJsonText(text);
						}}
						className="text-xs text-zinc-700"
					/>

					<div className="flex items-center gap-2">
						<SecondaryButton
							onPress={() => {
								setIsOpen(false);
								setError("");
							}}
						>
							Cancel
						</SecondaryButton>

						<PrimaryButton
							onPress={() => {
								importFromText(jsonText);
							}}
							isDisabled={jsonText.trim().length === 0}
						>
							Import
						</PrimaryButton>
					</div>
				</div>
			</ModalWrapper>
		</div>
	);
};

