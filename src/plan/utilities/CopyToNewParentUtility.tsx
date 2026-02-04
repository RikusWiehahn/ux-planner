"use client";

import { ModalWrapper } from "@/components/ModalWrapper";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
import { usePlan } from "@/plan/PlanContext";
import type { PlanClipboardTree, PlanDoc } from "@/plan/types";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";

const buildClipboardTree = (props: { planDoc: PlanDoc; nodeId: string }): PlanClipboardTree | null => {
	const node = props.planDoc.nodesById[props.nodeId];
	if (!node) {
		return null;
	}

	const children: PlanClipboardTree[] = [];
	for (const childId of node.childIds) {
		const childTree = buildClipboardTree({ planDoc: props.planDoc, nodeId: childId });
		if (childTree) {
			children.push(childTree);
		}
	}

	return {
		columnIndex: node.columnIndex,
		title: node.title,
		label: node.label,
		leafMetrics: node.leafMetrics,
		leafDone: node.leafDone,
		isCollapsed: node.isCollapsed,
		children,
	};
};

const getFirstLine = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const lines = trimmed.split("\n");
	return (lines[0] ?? "").trim();
};

const clampText = (value: string, maxLen: number) => {
	const trimmed = value.trim();
	if (trimmed.length <= maxLen) {
		return trimmed;
	}

	return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
};

const getEligibleParents = (props: { planDoc: PlanDoc; requiredColumnIndex: number }) => {
	const result: Array<{ nodeId: string; label: string }> = [];

	for (const nodeId of Object.keys(props.planDoc.nodesById)) {
		const node = props.planDoc.nodesById[nodeId];
		if (!node) {
			continue;
		}

		if (node.columnIndex !== props.requiredColumnIndex) {
			continue;
		}

		const label = clampText(getFirstLine(node.label) || "(empty)", 120);
		result.push({ nodeId, label });
	}

	result.sort((a, b) => a.label.localeCompare(b.label));
	return result;
};

export const CopyToNewParentUtility = (props: { nodeId: string }) => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [query, setQuery] = useState<string>("");
	const [selectedParentId, setSelectedParentId] = useState<string>("");

	const sourceNode = plan.planDoc.nodesById[props.nodeId];
	const isDisabled = !sourceNode || sourceNode.columnIndex === 0;

	const clipboardTree = useMemo(() => {
		if (!sourceNode) {
			return null;
		}
		return buildClipboardTree({ planDoc: plan.planDoc, nodeId: sourceNode.id });
	}, [plan.planDoc, sourceNode]);

	const requiredParentColumnIndex = sourceNode ? sourceNode.columnIndex - 1 : -1;

	const eligibleParents = useMemo(() => {
		if (!sourceNode) {
			return [];
		}
		if (sourceNode.columnIndex === 0) {
			return [];
		}
		return getEligibleParents({ planDoc: plan.planDoc, requiredColumnIndex: requiredParentColumnIndex });
	}, [plan.planDoc, requiredParentColumnIndex, sourceNode]);

	const filteredParents = useMemo(() => {
		if (!query.trim()) {
			return eligibleParents;
		}

		const q = query.trim().toLowerCase();
		return eligibleParents.filter((p) => p.label.toLowerCase().includes(q));
	}, [eligibleParents, query]);

	const canConfirm = !!selectedParentId && clipboardTree !== null;

	return (
		<>
			<button
				type="button"
				role="menuitem"
				disabled={isDisabled}
				onClick={() => {
					setIsOpen(true);
					setQuery("");
					setSelectedParentId("");
				}}
				className={twMerge(
					"w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
					isDisabled ? "cursor-not-allowed text-zinc-400" : "text-zinc-900 hover:bg-zinc-50",
				)}
			>
				Copy…
			</button>

			<ModalWrapper
				isOpen={isOpen}
				title="Copy to new parent"
				onClose={() => {
					setIsOpen(false);
					setQuery("");
					setSelectedParentId("");
				}}
			>
				{isDisabled ? (
					<div className="text-xs text-zinc-600">This item has no parent level to copy to.</div>
				) : (
					<div className="flex flex-col gap-3">
						<div className="text-xs text-zinc-600">Choose a new parent (must be one level up).</div>

						<TextInput value={query} onChange={setQuery} placeholder="Search…" />

						<div className="max-h-80 overflow-auto rounded-md border border-zinc-200 bg-white p-1">
							{filteredParents.length === 0 ? (
								<div className="px-3 py-2 text-xs text-zinc-500">No matching parents.</div>
							) : (
								filteredParents.map((parent) => {
									const isSelected = parent.nodeId === selectedParentId;
									return (
										<button
											key={parent.nodeId}
											type="button"
											onClick={() => setSelectedParentId(parent.nodeId)}
											className={twMerge(
												"w-full rounded-md px-3 py-2 text-left text-xs hover:bg-zinc-50",
												isSelected ? "bg-zinc-100 text-zinc-950" : "text-zinc-900",
											)}
										>
											{parent.label}
										</button>
									);
								})
							)}
						</div>

						<div className="flex items-center justify-end gap-2">
							<SecondaryButton
								onPress={() => {
									setIsOpen(false);
									setQuery("");
									setSelectedParentId("");
								}}
							>
								Cancel
							</SecondaryButton>

							<PrimaryButton
								isDisabled={!canConfirm}
								onPress={() => {
									if (!clipboardTree) {
										return;
									}
									if (!selectedParentId) {
										return;
									}

									plan.dispatch({
										type: "plan/nodePasteSubtree",
										parentId: selectedParentId,
										clipboardTree,
									});

									setIsOpen(false);
									setQuery("");
									setSelectedParentId("");
								}}
							>
								Copy to new parent cell
							</PrimaryButton>
						</div>
					</div>
				)}
			</ModalWrapper>
		</>
	);
};

