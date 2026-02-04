"use client";

import { InputLabel } from "@/components/InputLabel";
import { ModalWrapper } from "@/components/ModalWrapper";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
import { usePlan } from "@/plan/PlanContext";
import { parsePlanDoc } from "@/plan/parsePlanDoc";
import { useEffect, useMemo, useState } from "react";

const localStorageDeploymentIdKey = "ux-planner:spreadsheetDeploymentId";

const getAppsScriptSetupText = () => {
	return `## Google Sheets setup (Apps Script)

1) Open your Google Sheet
2) Extensions → Apps Script
3) Paste this script and save:

function doGet(e) {
\tvar sheet = SpreadsheetApp.getActiveSheet();
\tvar params = e && e.parameter ? e.parameter : {};
\tvar action = params.action ? String(params.action) : "read";
\tvar callback = params.callback ? String(params.callback) : null;

\tvar writeJsonp = function(payloadString) {
\t\tif (callback) {
\t\t\t// Return as STRING argument to avoid code-injection.
\t\t\treturn ContentService
\t\t\t\t.createTextOutput(String(callback) + "(" + JSON.stringify(String(payloadString)) + ")")
\t\t\t\t.setMimeType(ContentService.MimeType.JAVASCRIPT);
\t\t}
\t\treturn ContentService.createTextOutput(String(payloadString)).setMimeType(ContentService.MimeType.JSON);
\t};

\tif (action === "read") {
\t\t// Prefer chunked storage (A2..A(n+1)) to avoid the Google Sheets single-cell character limit.
\t\tvar totalChunks = sheet.getRange(1, 3).getValue(); // C1
\t\tvar totalInt = totalChunks ? parseInt(String(totalChunks), 10) : 0;
\t\tif (totalInt && totalInt > 0) {
\t\t\tvar values = sheet.getRange(2, 1, totalInt, 1).getValues(); // A2..A(n+1)
\t\t\tvar joined = values.map(function(row) { return row[0] ? String(row[0]) : ""; }).join("");
\t\t\tif (!joined) {
\t\t\t\tjoined = "null";
\t\t\t}
\t\t\treturn writeJsonp(joined);
\t\t}
\t\t// Fallback to A1 (only safe for small payloads)
\t\tvar jsonText = sheet.getRange(1, 1).getValue();
\t\tif (!jsonText) {
\t\t\tjsonText = "null";
\t\t}
\t\treturn writeJsonp(String(jsonText));
\t}

\tif (action === "writeChunk") {
\t\tvar index = params.index ? parseInt(String(params.index), 10) : -1;
\t\tvar total = params.total ? parseInt(String(params.total), 10) : -1;
\t\tvar chunk = params.chunk ? String(params.chunk) : "";
\t\tif (index < 0 || total <= 0) {
\t\t\treturn writeJsonp(JSON.stringify({ ok: false, error: "Missing index/total" }));
\t\t}
\t\t// Store chunks in A2..A(n+1)
\t\tsheet.getRange(2 + index, 1).setValue(chunk);
\t\t// Markers for debugging / verification
\t\tsheet.getRange(1, 2).setValue(new Date().toISOString()); // B1: last write time
\t\tsheet.getRange(1, 3).setValue(total); // C1: total chunks
\t\treturn writeJsonp(JSON.stringify({ ok: true, index: index, total: total }));
\t}

\tif (action === "commit") {
\t\tvar total2 = params.total ? parseInt(String(params.total), 10) : -1;
\t\tif (total2 <= 0) {
\t\t\treturn writeJsonp(JSON.stringify({ ok: false, error: "Missing total" }));
\t\t}
\t\tvar values = sheet.getRange(2, 1, total2, 1).getValues();
\t\tvar joined = values.map(function(row) { return row[0] ? String(row[0]) : ""; }).join("");
\t\tif (!joined) {
\t\t\tjoined = "null";
\t\t}
\t\t// Keep chunked storage as the source of truth.
\t\t// A1 is optional and will be truncated for large payloads, so we store a marker.
\t\tsheet.getRange(1, 1).setValue("[stored in chunks]"); // A1
\t\tsheet.getRange(1, 4).setValue(String(joined).length); // D1: payload length
\t\treturn writeJsonp(JSON.stringify({ ok: true, total: total2, length: String(joined).length }));
\t}

\treturn writeJsonp(JSON.stringify({ ok: false, error: "Unknown action" }));
}

4) Deploy → New deployment
- Type: Web app
- Execute as: Me
- Who has access: Anyone (or restrict as needed)
5) Copy the Deployment ID from the URL (between /s/ and /exec)

Important notes
- After changing the script, redeploy (create a new version) or your live URL won't update.
- Client-side apps can't use normal fetch() against Apps Script due to CORS. This utility uses:
\t- JSONP for Fetch (GET)
- Verification: after saving, check cells:
\t- A1: marker ("[stored in chunks]") for large payloads
\t- B1: last write timestamp
\t- C1: total chunks
\t- D1: payload length`;
};

export const SpreadsheetSyncUtility = () => {
	const plan = usePlan();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [deploymentId, setDeploymentId] = useState<string>("");
	const [payloadText, setPayloadText] = useState<string>("");
	const [statusText, setStatusText] = useState<string>("");
	const [errorText, setErrorText] = useState<string>("");
	const [isBusy, setIsBusy] = useState<boolean>(false);

	const defaultPayloadText = useMemo(() => {
		return JSON.stringify(plan.planDoc, null, "\t");
	}, [plan.planDoc]);

	useEffect(() => {
		const stored = window.localStorage.getItem(localStorageDeploymentIdKey);
		if (!stored) {
			return;
		}

		setDeploymentId(stored);
	}, []);

	useEffect(() => {
		const next = deploymentId.trim();
		if (!next) {
			window.localStorage.removeItem(localStorageDeploymentIdKey);
			return;
		}

		window.localStorage.setItem(localStorageDeploymentIdKey, next);
	}, [deploymentId]);

	const url = deploymentId.trim().length
		? `https://script.google.com/macros/s/${deploymentId.trim()}/exec`
		: "";

	const openModal = () => {
		setIsOpen(true);
		setErrorText("");
		setStatusText("");
		setPayloadText(defaultPayloadText);
	};

	const loadJsonp = async (inputUrl: string) => {
		const callbackName = `__uxPlannerSpreadsheetJsonpCallback_${Date.now()}_${Math.trunc(Math.random() * 1_000_000)}`;
		const withCallbackUrl = `${inputUrl}${inputUrl.includes("?") ? "&" : "?"}callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;

		return await new Promise<string>((resolve, reject) => {
			const w = window as unknown as Record<string, unknown>;
			let isDone = false;
			let timeoutId: number | null = null;

			const cleanup = () => {
				if (timeoutId !== null) {
					window.clearTimeout(timeoutId);
				}
				try {
					delete w[callbackName];
				} catch {
					// ignore
				}
				el.remove();
			};

			w[callbackName] = (payload: unknown) => {
				if (isDone) {
					return;
				}
				isDone = true;
				cleanup();
				resolve(typeof payload === "string" ? payload : JSON.stringify(payload));
			};

			const el = document.createElement("script");
			el.src = withCallbackUrl;
			el.async = true;

			timeoutId = window.setTimeout(() => {
				if (isDone) {
					return;
				}
				isDone = true;
				cleanup();
				reject(new Error("Timeout"));
			}, 15_000);

			el.onerror = () => {
				if (isDone) {
					return;
				}
				isDone = true;
				cleanup();
				reject(new Error("Script load failed"));
			};

			document.body.appendChild(el);
		});
	};

	const uploadJsonToSpreadsheet = async (json: string, actionLabel: string) => {
		if (!url) {
			setErrorText("Enter a Deployment ID first.");
			return;
		}

		const chunkSize = 3000;
		const maxConcurrency = 4;

		const chunks: string[] = [];
		for (let i = 0; i < json.length; i += chunkSize) {
			chunks.push(json.slice(i, i + chunkSize));
		}

		if (chunks.length === 0) {
			setErrorText("Nothing to upload.");
			return;
		}

		setIsBusy(true);
		setErrorText("");
		setStatusText(`${actionLabel}...`);

		let nextIndex = 0;
		let doneCount = 0;

		const worker = async () => {
			while (true) {
				const index = nextIndex;
				if (index >= chunks.length) {
					return;
				}
				nextIndex += 1;

				const chunk = chunks[index] ?? "";
				await loadJsonp(
					`${url}?action=writeChunk&index=${encodeURIComponent(String(index))}&total=${encodeURIComponent(
						String(chunks.length),
					)}&chunk=${encodeURIComponent(chunk)}`,
				);

				doneCount += 1;
				if (doneCount === chunks.length || doneCount % 5 === 0) {
					setStatusText(`${actionLabel}: uploaded ${doneCount}/${chunks.length} chunks...`);
				}
			}
		};

		try {
			const concurrency = Math.min(maxConcurrency, chunks.length);
			await Promise.all(Array.from({ length: concurrency }, () => worker()));

			setStatusText(`${actionLabel}: committing...`);
			await loadJsonp(`${url}?action=commit&total=${encodeURIComponent(String(chunks.length))}`);
		} finally {
			setIsBusy(false);
		}
	};

	const fetchFromSpreadsheet = async () => {
		if (!url) {
			setErrorText("Enter a Deployment ID first.");
			return;
		}

		setIsBusy(true);
		setErrorText("");
		setStatusText("");

		try {
			const data = await loadJsonp(`${url}?action=read`);
			const trimmed = data.trim();
			const nextText = trimmed.length ? trimmed : "null";
			try {
				const parsed: unknown = JSON.parse(nextText);
				setPayloadText(JSON.stringify(parsed, null, "\t"));
				setStatusText("Fetched from spreadsheet.");
			} catch {
				setPayloadText(nextText);
				setErrorText(
					"Fetched, but the JSON is invalid (possibly truncated). If your plan is large, update Apps Script to store/read in chunks (not a single cell) and redeploy.",
				);
			}
		} catch {
			setErrorText(
				"Fetch failed. Ensure your Apps Script doGet supports JSONP (callback parameter), then redeploy.",
			);
		} finally {
			setIsBusy(false);
		}
	};

	const applyToApp = () => {
		setErrorText("");
		setStatusText("");

		try {
			const parsed: unknown = JSON.parse(payloadText);
			const doc = parsePlanDoc(parsed);
			if (!doc) {
				setErrorText("Invalid JSON shape (could not parse a plan document).");
				return;
			}

			plan.dispatch({ type: "plan/replaceDoc", doc });
			setStatusText("Loaded into app.");
		} catch {
			setErrorText("Invalid JSON (could not parse).");
		}
	};

	const saveToSpreadsheet = async () => {
		try {
			const json = payloadText;
			JSON.parse(json);

			await uploadJsonToSpreadsheet(json, "Saving");
			setStatusText("Saved. Click Fetch to verify.");
		} catch {
			setErrorText("Save failed (invalid JSON or network error).");
		}
	};

	const renderMenuItem = () => {
		return (
			<button
				type="button"
				role="menuitem"
				onClick={openModal}
				className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50"
			>
				Spreadsheet sync
			</button>
		);
	};

	const renderDeploymentIdSection = () => {
		return (
			<div>
				<InputLabel>Deployment ID</InputLabel>
				<div className="mt-1">
					<TextInput
						value={deploymentId}
						onChange={(v) => setDeploymentId(v)}
						placeholder="AKfycbx..."
						className="font-mono"
					/>
				</div>
				<div className="mt-1 text-xs text-zinc-600">
					This is the part between <span className="font-mono">/s/</span> and <span className="font-mono">/exec</span>.
				</div>
			</div>
		);
	};

	const renderPullFromSheetSection = () => {
		return (
			<div>
				<InputLabel>When pulling changes from the spreadsheet</InputLabel>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<PrimaryButton onPress={fetchFromSpreadsheet} isDisabled={isBusy || !url}>
						Fetch
					</PrimaryButton>

					<SecondaryButton onPress={applyToApp} isDisabled={isBusy || payloadText.trim().length === 0}>
						Apply to app
					</SecondaryButton>
				</div>
			</div>
		);
	};

	const renderSaveToSheetSection = () => {
		return (
			<div>
				<InputLabel>Grab the current plan and save it to the sheet</InputLabel>
				<div className="mt-1 text-xs text-zinc-600">First time: click “Use current plan”, then “Save”.</div>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<SecondaryButton
						onPress={() => {
							setPayloadText(defaultPayloadText);
							setErrorText("");
							setStatusText("Loaded current plan into editor.");
						}}
						isDisabled={isBusy}
					>
						Use current plan
					</SecondaryButton>

					<PrimaryButton onPress={saveToSpreadsheet} isDisabled={isBusy || !url || payloadText.trim().length === 0}>
						Save
					</PrimaryButton>
				</div>
			</div>
		);
	};

	const renderStatusMessages = () => {
		return (
			<>
				{errorText ? <div className="text-xs text-red-700">{errorText}</div> : null}
				{statusText ? <div className="text-xs text-emerald-700">{statusText}</div> : null}
			</>
		);
	};

	const renderPayloadEditor = () => {
		return (
			<div>
				<InputLabel>Payload (JSON)</InputLabel>
				<div className="mt-1">
					<TextInput
						value={payloadText}
						onChange={(v) => setPayloadText(v)}
						isMultiline={true}
						rows={12}
						isAutoHeight={false}
						className="h-72 font-mono"
					/>
				</div>
			</div>
		);
	};

	const renderSetupInstructions = () => {
		return (
			<details className="rounded-md border border-zinc-200 bg-white p-3">
				<summary className="cursor-pointer text-sm font-medium text-zinc-900">Google Sheets setup instructions</summary>
				<div className="mt-2">
					<TextInput
						value={getAppsScriptSetupText()}
						onChange={() => {}}
						isReadOnly={true}
						isMultiline={true}
						rows={14}
						isAutoHeight={false}
						className="h-72 font-mono"
					/>
				</div>
			</details>
		);
	};

	const renderFooter = () => {
		return (
			<div className="flex items-center justify-end">
				<SecondaryButton onPress={() => setIsOpen(false)} isDisabled={isBusy}>
					Close
				</SecondaryButton>
			</div>
		);
	};

	const renderModal = () => {
		return (
			<ModalWrapper
				isOpen={isOpen}
				title="Spreadsheet sync"
				onClose={() => {
					setIsOpen(false);
					setErrorText("");
					setStatusText("");
				}}
			>
				<div className="space-y-3">
					{renderDeploymentIdSection()}

					<div className="space-y-3">
						{renderPullFromSheetSection()}
						{renderSaveToSheetSection()}
					</div>

					{renderStatusMessages()}
					{renderPayloadEditor()}
					{renderSetupInstructions()}
					{renderFooter()}
				</div>
			</ModalWrapper>
		);
	};

	return (
		<div>
			{renderMenuItem()}
			{renderModal()}
		</div>
	);
};

