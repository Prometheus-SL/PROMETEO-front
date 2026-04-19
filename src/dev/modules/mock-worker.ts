import { useEffect, useRef, useState } from "react";

import type { ModuleDevMockAdapter } from "./types";

export type MockLayerState = {
    ready: boolean;
    error: string | null;
};

const INITIAL_NO_ADAPTER: MockLayerState = { ready: true, error: null };
const INITIAL_LOADING: MockLayerState = { ready: false, error: null };

function toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export function useModuleDevMocks(
    adapter: ModuleDevMockAdapter | null,
    adapterState: Record<string, unknown>,
): MockLayerState {
    const [layer, setLayer] = useState<MockLayerState>(() =>
        adapter ? INITIAL_LOADING : INITIAL_NO_ADAPTER,
    );

    const activeAdapterRef = useRef<ModuleDevMockAdapter | null>(null);
    const requestIdRef = useRef(0);
    const readyRef = useRef(false);
    const mountedRef = useRef(true);
    const queueRef = useRef(Promise.resolve());

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            const adapterToCleanup = activeAdapterRef.current;
            queueRef.current = queueRef.current
                .then(async () => {
                    await adapterToCleanup?.cleanup?.();
                })
                .catch(() => undefined);
        };
    }, []);

    useEffect(() => {
        const previousAdapter = activeAdapterRef.current;
        const adapterChanged = previousAdapter !== adapter;
        const requestId = ++requestIdRef.current;

        if (!adapter) {
            readyRef.current = false;
            activeAdapterRef.current = null;
            setLayer(INITIAL_NO_ADAPTER);

            queueRef.current = queueRef.current
                .then(async () => {
                    await previousAdapter?.cleanup?.();
                })
                .catch(() => undefined);
            return;
        }

        const shouldShowLoading = adapterChanged || !readyRef.current;
        activeAdapterRef.current = adapter;

        if (shouldShowLoading) {
            setLayer(INITIAL_LOADING);
        }

        queueRef.current = queueRef.current
            .then(async () => {
                try {
                    if (adapterChanged) {
                        await previousAdapter?.cleanup?.();
                    } else {
                        await adapter.cleanup?.();
                    }

                    if (!mountedRef.current) {
                        return;
                    }

                    await adapter.apply(adapterState);

                    if (!mountedRef.current) {
                        return;
                    }

                    if (requestId !== requestIdRef.current) {
                        await adapter.cleanup?.();
                        return;
                    }

                    readyRef.current = true;
                    setLayer({ ready: true, error: null });
                } catch (error) {
                    if (!mountedRef.current || requestId !== requestIdRef.current) {
                        return;
                    }

                    readyRef.current = false;
                    setLayer({
                        ready: false,
                        error: toErrorMessage(error),
                    });
                }
            })
            .catch(() => undefined);
    }, [adapter, adapterState]);

    return layer;
}
