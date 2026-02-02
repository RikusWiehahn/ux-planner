"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export const MoreMenu = (props: {
	ariaLabel?: string;
	children: React.ReactNode;
	buttonClassName?: string;
	menuClassName?: string;
}) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const menuId = useMemo(() => `more-menu-${Math.random().toString(36).slice(2)}`, []);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		const onMouseDown = (e: MouseEvent) => {
			const root = rootRef.current;
			if (!root) {
				return;
			}

			const target = e.target;
			if (!(target instanceof Node)) {
				return;
			}

			if (!root.contains(target)) {
				setIsOpen(false);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("mousedown", onMouseDown);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("mousedown", onMouseDown);
		};
	}, [isOpen]);

	return (
		<div ref={rootRef} className="relative inline-block">
			<button
				type="button"
				aria-label={props.ariaLabel ?? "More actions"}
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-controls={isOpen ? menuId : undefined}
				onClick={() => setIsOpen(!isOpen)}
				className={twMerge(
					"flex items-center justify-center rounded-md border border-zinc-200 bg-white p-1 text-zinc-700",
					"transition-colors hover:bg-zinc-100 active:bg-zinc-200",
					"focus:outline-none focus:ring-2 focus:ring-zinc-500/20",
					props.buttonClassName ?? "",
				)}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<circle cx="3.5" cy="8" r="1.3" />
					<circle cx="8" cy="8" r="1.3" />
					<circle cx="12.5" cy="8" r="1.3" />
				</svg>
			</button>

			{isOpen ? (
				<div
					id={menuId}
					role="menu"
					className={twMerge(
						"absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg",
						props.menuClassName ?? "",
					)}
				>
					<div className="p-1">{props.children}</div>
				</div>
			) : null}
		</div>
	);
};

