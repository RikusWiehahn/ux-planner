"use client";

import { MoreMenu } from "@/components/MoreMenu";
import { TextInput } from "@/components/TextInput";
import { usePlan } from "@/plan/PlanContext";
import { AddChildItemUtility } from "@/plan/utilities/AddChildItemUtility";
import { DeleteColumnUtility } from "@/plan/utilities/DeleteColumnUtility";
import { AddRootItemUtility } from "@/plan/utilities/AddRootItemUtility";
import { DeleteNodeUtility } from "@/plan/utilities/DeleteNodeUtility";
import { MoveChildItemUtility } from "@/plan/utilities/MoveChildItemUtility";
import { MoveRootItemUtility } from "@/plan/utilities/MoveRootItemUtility";
import { getPlanDoneByNodeId, getPlanGridLayout, getPlanRollupsByNodeId } from "@/plan/selectors";
import { useMemo } from "react";

export const SpreadsheetView = () => {
	const plan = usePlan();
	const layout = useMemo(() => getPlanGridLayout(plan.planDoc), [plan.planDoc]);
	const rollupsByNodeId = useMemo(() => getPlanRollupsByNodeId(plan.planDoc), [plan.planDoc]);
	const doneByNodeId = useMemo(() => getPlanDoneByNodeId(plan.planDoc), [plan.planDoc]);
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
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 1fr))` }}
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
				className="mt-2 grid gap-0 overflow-hidden rounded-md border border-zinc-200 bg-white"
				style={{
					gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 1fr))`,
					gridAutoRows: "minmax(120px, auto)",
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
					const displayedImportance = isLeaf ? (node.leafMetrics ? node.leafMetrics.importance : 0) : rollup.importance;
					const displayedEase = isLeaf ? (node.leafMetrics ? node.leafMetrics.ease : 0) : rollup.ease;
					const displayedTimeHours = isLeaf ? (node.leafMetrics ? node.leafMetrics.timeHours : 0) : rollup.timeHours;
					const displayedDone = isLeaf ? !!node.leafDone : !!doneByNodeId[node.id];

					const importanceValue = displayedImportance === 0 ? "" : String(displayedImportance);
					const easeValue = displayedEase === 0 ? "" : String(displayedEase);
					const timeHoursValue = displayedTimeHours === 0 ? "" : String(displayedTimeHours);

					return (
						<div
							key={node.id}
							className="group border-b border-r border-zinc-200 p-1.5"
							style={{
								gridColumnStart: placement.columnIndex + 1,
								gridRow: `${placement.rowStart} / span ${placement.rowSpan}`,
							}}
						>
							<div className="flex h-full flex-col">
								<div className="flex items-start justify-between gap-1">
									<div className="flex min-w-0 flex-1 items-start gap-1">
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
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1">
										{isLeaf ? (
											<button
												type="button"
												onClick={() => {
													plan.dispatch({
														type: "plan/nodeSetLeafDone",
														nodeId: node.id,
														leafDone: !node.leafDone,
													});
												}}
												className={
													displayedDone
														? "rounded px-1 py-0.5 text-xs text-emerald-700 hover:bg-zinc-50"
														: "rounded px-1 py-0.5 text-xs text-red-700 hover:bg-zinc-50"
												}
											>
												{displayedDone ? "✓" : "✕"}
											</button>
										) : (
											<div className={displayedDone ? "px-1 py-0.5 text-xs text-emerald-700" : "px-1 py-0.5 text-xs text-red-700"}>
												{displayedDone ? "✓" : "✕"}
											</div>
										)}
									</div>

									<div className="flex items-center gap-1">
										<TextInput
											value={importanceValue}
											onChange={(nextValue) => {
											if (!isLeaf) {
												return;
											}

											const raw = nextValue.trim();
											const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
											const intValue = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
											const clamped = Math.max(0, Math.min(5, intValue));
											const nextImportance = normalizeRating(clamped);

											const prev = node.leafMetrics ?? { importance: 0, ease: 0, timeHours: 0 };
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
											isReadOnly={!isLeaf}
											type="number"
											min={0}
											max={5}
											step={1}
											className="w-12 px-0.5 text-right tabular-nums"
										/>
										<span className={importanceValue ? "text-[11px] text-zinc-500" : "text-[11px] text-zinc-400"}>
											I
										</span>
									</div>

									<div className="flex items-center gap-1">
										<TextInput
											value={easeValue}
											onChange={(nextValue) => {
											if (!isLeaf) {
												return;
											}

											const raw = nextValue.trim();
											const parsed = raw === "" ? 0 : Number.parseInt(raw, 10);
											const intValue = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
											const clamped = Math.max(0, Math.min(5, intValue));
											const nextEase = normalizeRating(clamped);

											const prev = node.leafMetrics ?? { importance: 0, ease: 0, timeHours: 0 };
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
											isReadOnly={!isLeaf}
											type="number"
											min={0}
											max={5}
											step={1}
											className="w-12 px-0.5 text-right tabular-nums"
										/>
										<span className={easeValue ? "text-[11px] text-zinc-500" : "text-[11px] text-zinc-400"}>
											E
										</span>
									</div>

									<div className="flex items-center gap-1">
										<TextInput
											value={timeHoursValue}
											onChange={(nextValue) => {
											if (!isLeaf) {
												return;
											}

											const raw = nextValue.trim();
											const parsed = raw === "" ? 0 : Number.parseFloat(raw);
											const nextTimeHours = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

											const prev = node.leafMetrics ?? { importance: 0, ease: 0, timeHours: 0 };
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
											isReadOnly={!isLeaf}
											type="number"
											min={0}
											step={0.5}
											className="w-12 px-0.5 text-right tabular-nums"
										/>
										<span className={timeHoursValue ? "text-[11px] text-zinc-500" : "text-[11px] text-zinc-400"}>
											hrs
										</span>
									</div>
								</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

