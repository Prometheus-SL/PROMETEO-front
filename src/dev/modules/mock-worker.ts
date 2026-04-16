import { useEffect, useRef, useState } from "react";

import type { ModuleDevMockAdapter } from "./types";

export type MockLayerState = {
    ready: boolean;
    error: string | null;
};

const INITIAL_NO_ADAPTER: MockLayerState = { ready: true, error: null };
const INITIAL_LOADING: MockLayerState = { ready: false, error: null };

export function useModuleDevMocks(
    adapter: ModuleDevMockAdapter | null,
    adapterState: Record<string, unknown>,
): MockLayerState {
    const [layer, setLayer] = useState<MockLayerState>(() =>
        adapter ? INITIAL_LOADING : INITIAL_NO_ADAPTER,
    );

    const adapterRef = useRef(adapter);
    const stateRef = useRef(adapterState);

    useEffect(() => {
        adapterRef.current = adapter;
    }, [adapter]);

    useEffect(() => {
        stateRef.current = adapterState;
    }, [adapterState]);

    useEffect(() => {
        if (!adapter) {
            setLayer(INITIAL_NO_ADAPTER);
            return;
        }

        let cancelled = false;

        setLayer(INITIAL_LOADING);

        void (async () => {
            try {
                await adapter.apply(adapterState);
                if (!cancelled) {
                    setLayer({ ready: true, error: null });
                }
            } catch (error) {
                if (!cancelled) {
                    setLayer({
                        ready: false,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        })();

        return () => {
            cancelled = true;
            void adapter.cleanup?.();
        };
    }, [adapter, adapterState]);

    return layer;
}
