"use client";

import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

export const TextInput = (props: {
	value: string;
	onChange: (nextValue: string) => void;
	placeholder?: string;
	isMultiline?: boolean;
	rows?: number;
	variant?: "default" | "ghost";
	isReadOnly?: boolean;
	isDisabled?: boolean;
	type?: "text" | "number";
	min?: number;
	max?: number;
	step?: number;
	isAutoHeight?: boolean;
	className?: string;
}) => {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const isMultiline = props.isMultiline === true;
	const isAutoHeight = props.isAutoHeight !== false;
	const baseInputClasses =
		props.variant === "ghost"
			? "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-zinc-950 placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-zinc-300 focus:bg-white focus:outline-none"
			: "w-full rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none";
	const inputClasses = twMerge(baseInputClasses, props.className ?? "");

	useEffect(() => {
		if (!isMultiline) {
			return;
		}

		if (!isAutoHeight) {
			return;
		}

		const el = textareaRef.current;
		if (!el) {
			return;
		}

		el.style.height = "0px";
		el.style.height = `${el.scrollHeight}px`;
	}, [isAutoHeight, isMultiline, props.value]);

	if (isMultiline) {
		return (
			<textarea
				ref={textareaRef}
				value={props.value}
				onChange={(e) => props.onChange(e.target.value)}
				placeholder={props.placeholder}
				rows={props.rows ?? 3}
				readOnly={props.isReadOnly === true}
				disabled={props.isDisabled === true}
				className={twMerge(
					isAutoHeight ? "resize-none overflow-hidden" : "resize-y",
					inputClasses,
				)}
			/>
		);
	}

	return (
		<input
			type={props.type ?? "text"}
			value={props.value}
			onChange={(e) => props.onChange(e.target.value)}
			placeholder={props.placeholder}
			readOnly={props.isReadOnly === true}
			disabled={props.isDisabled === true}
			min={props.min}
			max={props.max}
			step={props.step}
			className={inputClasses}
		/>
	);
};

