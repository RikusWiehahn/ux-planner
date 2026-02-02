"use client";

export const InputLabel = (props: { children: React.ReactNode }) => {
	return (
		<div className="text-xs font-medium text-zinc-500">
			{props.children}
		</div>
	);
};

