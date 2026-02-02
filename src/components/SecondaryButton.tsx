"use client";

import { twMerge } from "tailwind-merge";

export const SecondaryButton = (props: {
	children: React.ReactNode;
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
				"rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200",
				props.isDisabled === true ? "cursor-not-allowed opacity-50 hover:bg-zinc-100" : "",
				props.className ?? "",
			)}
		>
			{props.children}
		</button>
	);
};

