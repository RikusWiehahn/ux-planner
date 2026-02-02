"use client";

import type { ReactNode } from "react";

export const InputLabel = (props: { children: ReactNode }) => {
	return (
		<div className="text-xs font-medium text-zinc-500">
			{props.children}
		</div>
	);
};

