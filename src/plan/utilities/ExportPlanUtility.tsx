"use client";

import { usePlan } from "@/plan/PlanContext";

const downloadTextFile = (props: { filename: string; contents: string }) => {
	const blob = new Blob([props.contents], { type: "application/json;charset=utf-8" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = props.filename;
	document.body.appendChild(a);
	a.click();
	a.remove();

	URL.revokeObjectURL(url);
};

export const ExportPlanUtility = () => {
	const plan = usePlan();

	return (
		<button
			type="button"
			role="menuitem"
			onClick={() => {
				const contents = JSON.stringify(plan.planDoc, null, "\t");
				downloadTextFile({ filename: "sixb-plan.json", contents });
			}}
			className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50"
		>
			Export JSON
		</button>
	);
};

