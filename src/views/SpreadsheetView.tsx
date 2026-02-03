"use client";

import { MoreMenu } from "@/components/MoreMenu";
import { TextInput } from "@/components/TextInput";
import { getCompletionBadgeClassName } from "@/components/completionBadge";
import { usePlan } from "@/plan/PlanContext";
import { AddChildItemUtility } from "@/plan/utilities/AddChildItemUtility";
import { DeleteColumnUtility } from "@/plan/utilities/DeleteColumnUtility";
import { AddRootItemUtility } from "@/plan/utilities/AddRootItemUtility";
import { DeleteNodeUtility } from "@/plan/utilities/DeleteNodeUtility";
import { MoveChildItemUtility } from "@/plan/utilities/MoveChildItemUtility";
import { MoveRootItemUtility } from "@/plan/utilities/MoveRootItemUtility";
import { getPlanCompletionByNodeId, getPlanDoneByNodeId, getPlanGridLayout, getPlanRollupsByNodeId } from "@/plan/selectors";
import { useMemo } from "react";

export const SpreadsheetView = () => {
	const plan = usePlan();
	const layout = useMemo(() => getPlanGridLayout(plan.planDoc), [plan.planDoc]);
	const rollupsByNodeId = useMemo(() => getPlanRollupsByNodeId(plan.planDoc), [plan.planDoc]);
	const doneByNodeId = useMemo(() => getPlanDoneByNodeId(plan.planDoc), [plan.planDoc]);
	const completionByNodeId = useMemo(() => getPlanCompletionByNodeId(plan.planDoc), [plan.planDoc]);
	const columnCount = plan.planDoc.columns.length;

	const normalizeRating = (value: number): 0 | 1 | 2 | 3 | 4 | 5 => {
		if (value <= 0) {
			return 0;
		}
		if (value === 1) {
			return 1;
		}
		if (value === 2) {
			return 2;
		}
		if (value === 3) {
			return 3;
		}
		if (value === 4) {
			return 4;
		}
		return 5;
	};

	return (
		<div>
			<div className="max-w-full overflow-x-auto">
				<div className="w-full min-w-0 px-4">
					<div
						className="grid gap-2"
						style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(100px, 1fr))` }}
					>
						{plan.planDoc.columns.map((col, idx) => {
							return (
								<div key={col.id} className="rounded-md bg-zinc-50 p-1.5">
									<div className="flex items-center justify-between gap-2">
										<TextInput
											value={col.label}
											onChange={(nextValue) => {
												plan.dispatch({
													type: "plan/columnRename",
													columnId: col.id,
													label: nextValue,
												});
											}}
											placeholder={`Level ${idx + 1}`}
										/>

										<MoreMenu ariaLabel="Column actions">
											{idx === 0 ? <AddRootItemUtility /> : null}
											<DeleteColumnUtility columnIndex={idx} />
										</MoreMenu>
									</div>
								</div>
							);
						})}
					</div>

					<div
						className="mt-2 grid gap-0 rounded-md border border-zinc-200 bg-white"
						style={{
							gridTemplateColumns: `repeat(${columnCount}, minmax(100px, 1fr))`,
							gridAutoRows: "minmax(100px, auto)",
						}}
					>
						{plan.planDoc.rootIds.length === 0 ? (
							<div
								className="rounded-md border border-dashed border-zinc-200 bg-white p-3 text-sm text-zinc-600"
								style={{ gridColumnStart: 1, gridRow: "1 / span 1" }}
							>
								No items yet. Use Column 1 `...` and select “Add item”.
							</div>
						) : null}

						{layout.placements.map((placement) => {
							const node = plan.planDoc.nodesById[placement.nodeId];
							if (!node) {
								return null;
							}

							const isRoot = node.parentId === null;
							const isLeaf = node.childIds.length === 0;
							const showCollapse = node.columnIndex === 0 && node.childIds.length > 0;
							const rollup = rollupsByNodeId[node.id] ?? { importance: 0, ease: 0, timeHours: 0 };
							const displayedImportance = node.leafMetrics ? node.leafMetrics.importance : rollup.importance;
							const displayedEase = node.leafMetrics ? node.leafMetrics.ease : rollup.ease;
							const displayedTimeHours = node.leafMetrics ? node.leafMetrics.timeHours : rollup.timeHours;
							const displayedDone = !!doneByNodeId[node.id];
							const completion =
								completionByNodeId[node.id] ?? { doneLeaves: 0, totalLeaves: 0, doneHours: 0, totalHours: 0, pct: 0 };

							const importanceValue = displayedImportance === 0 ? "" : String(displayedImportance);
							const easeValue = displayedEase === 0 ? "" : String(displayedEase);
							const timeHoursValue = displayedTimeHours === 0 ? "" : String(displayedTimeHours);

							const getMetricsBaseline = () => {
								if (node.leafMetrics) {
									return node.leafMetrics;
								}

								const clampRating = (value: number) => {
									const intValue = Number.isFinite(value) ? Math.trunc(value) : 0;
									return normalizeRating(Math.max(0, Math.min(5, intValue)));
								};

								return {
									importance: clampRating(Math.round(rollup.importance)),
									ease: clampRating(Math.round(rollup.ease)),
									timeHours: rollup.timeHours,
								};
							};

							return (
								<div
									key={node.id}
									className={
										placement.rowStart === 1
											? "group border-r border-zinc-200 p-1.5"
											: "group border-r border-t border-zinc-200 p-1.5"
									}
									style={{
										gridColumnStart: placement.columnIndex + 1,
										gridRow: `${placement.rowStart} / span ${placement.rowSpan}`,
									}}
								>
									<div className="flex h-full flex-col">
										<div className="flex items-start justify-between gap-1">
											<div className="flex min-w-0 flex-1 items-start gap-1 overflow-hidden">
												{showCollapse ? (
													<button
														type="button"
														onClick={() =>
															plan.dispatch({ type: "plan/nodeToggleCollapsed", nodeId: node.id })
														}
														aria-label={node.isCollapsed ? "Expand" : "Collapse"}
														className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-transparent text-zinc-600 hover:bg-zinc-50"
													>
														<svg
															width="10"
															height="10"
															viewBox="0 0 16 16"
															fill="currentColor"
															aria-hidden="true"
															className={node.isCollapsed ? "" : "rotate-90"}
														>
															<path d="M6 4l6 4-6 4V4z" />
														</svg>
													</button>
												) : (
													<div className="mt-1 h-4 w-0 shrink-0" />
												)}

												<div className="min-w-0 flex-1">
													<TextInput
														value={node.label}
														onChange={(nextValue) => {
															plan.dispatch({
																type: "plan/nodeSetLabel",
																nodeId: node.id,
																label: nextValue,
															});
														}}
														placeholder="Label"
														isMultiline={true}
														rows={2}
														variant="ghost"
													/>
												</div>
											</div>

											<div className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
												<MoreMenu ariaLabel="Cell actions">
													<AddChildItemUtility parentId={node.id} />
													{isRoot ? (
														<MoveRootItemUtility
															nodeId={node.id}
															direction="up"
															isDisabled={placement.indexInParent === 0}
														/>
													) : (
														<MoveChildItemUtility
															nodeId={node.id}
															direction="up"
															isDisabled={placement.indexInParent === 0}
														/>
													)}
													{isRoot ? (
														<MoveRootItemUtility
															nodeId={node.id}
															direction="down"
															isDisabled={placement.indexInParent === placement.siblingsCount - 1}
														/>
													) : (
														<MoveChildItemUtility
															nodeId={node.id}
															direction="down"
															isDisabled={placement.indexInParent === placement.siblingsCount - 1}
														/>
													)}
													<DeleteNodeUtility nodeId={node.id} />
												</MoreMenu>
											</div>
										</div>

										<div className="mt-auto">
											<div className="flex flex-wrap items-center gap-1 text-[11px] leading-none">
												<div className="flex items-center gap-1">
													<div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0">
														<button
															type="button"
															onClick={() => {
																plan.dispatch({
																	type: "plan/nodeSetLeafDone",
																	nodeId: node.id,
																	leafDone: !displayedDone,
																});
															}}
															className={
																displayedDone
																	? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
																	: "inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-50 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100"
															}
														>
															{displayedDone ? "✓" : "✕"}
														</button>
														{node.childIds.length > 0 && !displayedDone ? (
															<div
																className={`${getCompletionBadgeClassName(completion.pct)} px-1.5 py-0 h-auto min-w-0 text-[10px] font-semibold`}
															>
																{completion.pct}%
															</div>
														) : null}
													</div>
												</div>

												<div className="flex items-center gap-1">
													<div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0 text-[10px] font-semibold">
														<span
															className={
																`${importanceValue ? "text-zinc-600" : "text-zinc-400"} font-mono`
															}
														>
															I
														</span>
														<TextInput
															value={importanceValue}
															onChange={(nextValue) => {
																const raw = nextValue.trim();
																const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
																const intValue = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
																const clamped = Math.max(0, Math.min(5, intValue));
																const nextImportance = normalizeRating(clamped);

																const prev = getMetricsBaseline();
																const next = {
																	importance: nextImportance,
																	ease: prev.ease,
																	timeHours: prev.timeHours,
																};

																const nextOrNull =
																	next.importance === 0 && next.ease === 0 && next.timeHours === 0
																		? null
																		: next;

																plan.dispatch({
																	type: "plan/nodeSetLeafMetrics",
																	nodeId: node.id,
																	leafMetrics: nextOrNull,
																});
															}}
															placeholder=""
															variant="ghost"
															type="number"
															min={0}
															max={5}
															step={1}
															className="w-9 px-0 text-left text-[10px] font-semibold tabular-nums"
														/>
													</div>
												</div>

												<div className="flex items-center gap-1">
													<div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0 text-[10px] font-semibold">
														<span
															className={`${easeValue ? "text-zinc-600" : "text-zinc-400"} font-mono`}
														>
															E
														</span>
														<TextInput
															value={easeValue}
															onChange={(nextValue) => {
																const raw = nextValue.trim();
																const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
																const intValue = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
																const clamped = Math.max(0, Math.min(5, intValue));
																const nextEase = normalizeRating(clamped);

																const prev = getMetricsBaseline();
																const next = {
																	importance: prev.importance,
																	ease: nextEase,
																	timeHours: prev.timeHours,
																};

																const nextOrNull =
																	next.importance === 0 && next.ease === 0 && next.timeHours === 0
																		? null
																		: next;

																plan.dispatch({
																	type: "plan/nodeSetLeafMetrics",
																	nodeId: node.id,
																	leafMetrics: nextOrNull,
																});
															}}
															placeholder=""
															variant="ghost"
															type="number"
															min={0}
															max={5}
															step={1}
															className="w-9 px-0 text-left text-[10px] font-semibold tabular-nums"
														/>
													</div>
												</div>

												<div className="flex items-center gap-1">
													<div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0 text-[10px] font-semibold">
														<TextInput
															value={timeHoursValue}
															onChange={(nextValue) => {
																const raw = nextValue.trim();
																const parsed = raw === "" ? 0 : Number.parseFloat(raw);
																const nextTimeHours = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

																const prev = getMetricsBaseline();
																const next = {
																	importance: prev.importance,
																	ease: prev.ease,
																	timeHours: nextTimeHours,
																};

																const nextOrNull =
																	next.importance === 0 && next.ease === 0 && next.timeHours === 0
																		? null
																		: next;

																plan.dispatch({
																	type: "plan/nodeSetLeafMetrics",
																	nodeId: node.id,
																	leafMetrics: nextOrNull,
																});
															}}
															placeholder=""
															variant="ghost"
															type="number"
															min={0}
															step={0.5}
															className="w-9 px-0 text-right text-[10px] font-semibold tabular-nums"
														/>
														<span
															className={
																`${timeHoursValue ? "text-zinc-600" : "text-zinc-400"} font-mono`
															}
														>
															hrs
														</span>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

