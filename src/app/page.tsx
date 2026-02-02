"use client";

import { useMemo, useState } from "react";
import { MoreMenu } from "@/components/MoreMenu";
import { PlanProvider, usePlan } from "@/plan/PlanContext";
import { AddColumnUtility } from "@/plan/utilities/AddColumnUtility";
import { ExportPlanUtility } from "@/plan/utilities/ExportPlanUtility";
import { ImportPlanUtility } from "@/plan/utilities/ImportPlanUtility";
import { ExecutionGridView } from "@/views/ExecutionGridView";
import { SpreadsheetView } from "@/views/SpreadsheetView";
import { twMerge } from "tailwind-merge";

type TabKey = "spreadsheet" | "executionGrid";

const tabs: Array<{ key: TabKey; label: string }> = [
	{ key: "spreadsheet", label: "Spreadsheet" },
	{ key: "executionGrid", label: "Execution Grid" },
];

const HomePage = () => {
	const [activeTab, setActiveTab] = useState<TabKey>("spreadsheet");

	const activeTabLabel = useMemo(() => {
		const tab = tabs.find((t) => t.key === activeTab);
		return tab ? tab.label : "";
	}, [activeTab]);

	const TopBarLeft = () => {
		const plan = usePlan();

		const overallCompletionPct = useMemo(() => {
			let doneLeaves = 0;
			let totalLeaves = 0;

			for (const nodeId of Object.keys(plan.planDoc.nodesById)) {
				const node = plan.planDoc.nodesById[nodeId];
				if (!node) {
					continue;
				}

				if (node.childIds.length > 0) {
					continue;
				}

				totalLeaves += 1;
				if (node.leafDone) {
					doneLeaves += 1;
				}
			}

			if (totalLeaves <= 0) {
				return 0;
			}

			return Math.round((doneLeaves / totalLeaves) * 100);
		}, [plan.planDoc.nodesById]);

		const getCompletionBadgeClassName = (pct: number) => {
			if (pct <= 0) {
				return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-red-50 px-2 text-xs font-bold text-red-700";
			}
			if (pct < 25) {
				return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-orange-50 px-2 text-xs font-bold text-orange-700";
			}
			if (pct < 50) {
				return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-amber-50 px-2 text-xs font-bold text-amber-700";
			}
			if (pct < 75) {
				return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-yellow-50 px-2 text-xs font-bold text-yellow-700";
			}
			if (pct < 100) {
				return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-lime-50 px-2 text-xs font-bold text-lime-700";
			}
			return "inline-flex h-6 min-w-10 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs font-bold text-emerald-700";
		};

		return (
			<div className="flex w-40 items-center">
				<span className={getCompletionBadgeClassName(overallCompletionPct)}>{overallCompletionPct}%</span>
			</div>
		);
	};

	return (
		<PlanProvider>
			<div className="min-h-screen bg-zinc-50 text-zinc-950">
				<div className="border-b border-zinc-200 bg-white">
					<div className="flex w-full items-center justify-between gap-2 p-2">
						<TopBarLeft />

						<div className="flex items-center justify-center gap-2">
							{tabs.map((tab) => {
								const isActive = tab.key === activeTab;

								return (
									<button
										key={tab.key}
										type="button"
										onClick={() => setActiveTab(tab.key)}
										className={twMerge(
											"rounded-md px-3 py-2 text-sm font-medium transition-colors",
											"focus:outline-none focus:ring-2 focus:ring-zinc-500/20",
											isActive
												? "bg-zinc-900 text-white"
												: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
										)}
									>
										{tab.label}
									</button>
								);
							})}
						</div>

						<div className="flex w-40 justify-end">
							<MoreMenu ariaLabel="Page actions">
								{activeTab === "spreadsheet" ? <AddColumnUtility /> : null}
								<ExportPlanUtility />
								<ImportPlanUtility />
							</MoreMenu>
						</div>
					</div>
				</div>

				<div className="w-full p-4">
					{activeTab === "spreadsheet" ? <SpreadsheetView /> : null}

					{activeTab === "executionGrid" ? (
						<ExecutionGridView />
					) : null}
				</div>
			</div>
		</PlanProvider>
	);
};

export default HomePage;
