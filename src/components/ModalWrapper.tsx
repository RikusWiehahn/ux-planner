"use client";

export const ModalWrapper = (props: {
	isOpen: boolean;
	title?: string;
	children: React.ReactNode;
	onClose: () => void;
}) => {
	if (!props.isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				onClick={props.onClose}
				className="absolute inset-0 bg-black/40"
				aria-label="Close modal"
			/>

			<div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
				{props.title ? (
					<div className="text-base font-semibold text-zinc-950">
						{props.title}
					</div>
				) : null}

				<div className={props.title ? "mt-3" : ""}>{props.children}</div>
			</div>
		</div>
	);
};

