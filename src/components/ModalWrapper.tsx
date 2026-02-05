"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export const ModalWrapper = (props: {
	isOpen: boolean;
	title?: string;
	children: ReactNode;
	onClose: () => void;
}) => {
	useEffect(() => {
		if (!props.isOpen) {
			return;
		}

		let originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	});

	if (!props.isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
			<button
				type="button"
				onClick={props.onClose}
				className="fixed inset-0 bg-black/40"
				aria-label="Close modal"
			/>

			<div className="relative flex min-h-full items-start justify-center p-4 py-10">
				<div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
					{props.title ? <div className="text-base font-semibold text-zinc-950">{props.title}</div> : null}

					<div className={props.title ? "mt-3" : ""}>{props.children}</div>
				</div>
			</div>
		</div>
	);
};

