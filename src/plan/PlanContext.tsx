"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import { parsePlanDoc } from "@/plan/parsePlanDoc";
import { planReducer } from "@/plan/reducer";
import type { PlanAction, PlanDoc } from "@/plan/types";
import { createEmptyPlanDoc } from "@/plan/types";

const STORAGE_KEY = "uxPlanner.planDoc.v1";
const LEGACY_STORAGE_KEY = "sixbPlan.planDoc.v1";

const loadPlanDocFromStorage = (): PlanDoc => {
	if (typeof window === "undefined") {
		return createEmptyPlanDoc();
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
		if (!raw) {
			return createEmptyPlanDoc();
		}

		const parsed: unknown = JSON.parse(raw);
		const doc = parsePlanDoc(parsed);
		return doc ?? createEmptyPlanDoc();
	} catch {
		return createEmptyPlanDoc();
	}
};

const savePlanDocToStorage = (doc: PlanDoc) => {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
	} catch {
		// ignore
	}
};

const PlanContext = createContext<{
	planDoc: PlanDoc;
	dispatch: (action: PlanAction) => void;
	isHydrated: boolean;
} | null>(null);

export const PlanProvider = (props: { children: ReactNode }) => {
	const [isHydrated, setIsHydrated] = useState<boolean>(false);

	const [planDoc, dispatch] = useReducer(planReducer, undefined, () => {
		return createEmptyPlanDoc();
	});

	useEffect(() => {
		dispatch({ type: "plan/replaceDoc", doc: loadPlanDocFromStorage() });
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (!isHydrated) {
			return;
		}

		savePlanDocToStorage(planDoc);
	}, [planDoc, isHydrated]);

	const value = useMemo(() => {
		return { planDoc, dispatch, isHydrated };
	}, [planDoc, isHydrated]);

	return <PlanContext.Provider value={value}>{props.children}</PlanContext.Provider>;
};

export const usePlan = () => {
	const ctx = useContext(PlanContext);
	if (!ctx) {
		throw new Error("usePlan must be used within PlanProvider");
	}

	return ctx;
};

