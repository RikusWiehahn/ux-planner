"use client";

import { twMerge } from "tailwind-merge";
import type { ReactNode } from "react";

export const PrimaryButton = (props: {
	children: ReactNode;
	onPress: () => void;
	isDisabled?: boolean;
	className?: string;
}) => {
	return (
		<button
			type="button"
			onClick={props.onPress}
			disabled={props.isDisabled === true}
			className={twMerge(
				"rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800",
				props.isDisabled === true ? "cursor-not-allowed opacity-50 hover:bg-zinc-900" : "",
				props.className ?? "",
			)}
		>
			{props.children}
		</button>
	);
};

