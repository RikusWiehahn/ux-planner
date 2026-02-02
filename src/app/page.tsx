"use client";

import { useState } from "react";
import { MoreMenu } from "@/components/MoreMenu";
import { TopBarProgressSummary } from "@/components/TopBarProgressSummary";
import { PlanProvider } from "@/plan/PlanContext";
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

	return (
		<PlanProvider>
			<div className="min-h-screen bg-zinc-50 text-zinc-950">
				<div className="border-b border-zinc-200 bg-white">
					<div className="flex w-full items-center justify-between gap-2 p-2">
						<TopBarProgressSummary />

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
