"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const ModalWrapper = (props: {
	isOpen: boolean;
	title?: string;
	children: ReactNode;
	onClose: () => void;
}) => {
	const [isMounted, setIsMounted] = useState<boolean>(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!props.isOpen) {
		return null;
	}

	if (!isMounted) {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
			<button
				type="button"
				onClick={props.onClose}
				className="absolute inset-0 bg-black/40"
				aria-label="Close modal"
			/>

			<div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
				{props.title ? <div className="text-base font-semibold text-zinc-950">{props.title}</div> : null}

				<div className={props.title ? "mt-3" : ""}>{props.children}</div>
			</div>
		</div>,
		document.body,
	);
};

