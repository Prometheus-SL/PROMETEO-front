import { useContext, useState, useEffect } from "react";
import { SharedContext } from "@/contexts/SharedContext";

/**
 * Hook para acceder al contexto compartido
 * @throws Error si se usa fuera de SharedContextProvider
 */
export function useSharedContext() {
    const context = useContext(SharedContext);
    if (!context) {
        throw new Error(
            "useSharedContext must be used within SharedContextProvider"
        );
    }
    return context;
}

/**
 * Hook para suscribirse a un valor específico del contexto compartido
 * Re-renderiza el componente cuando el valor cambia
 *
 * @param key - Clave a observar
 * @returns El valor actual de la clave
 *
 * @example
 * const mediaSession = useSharedValue<MediaSession>('mediaSession');
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSharedValue<T = any>(key: string): T | undefined {
    const { getShared, subscribe } = useSharedContext();
    const [value, setValue] = useState<T | undefined>(() => getShared<T>(key));

    useEffect(() => {
        // Actualizar valor inicial por si cambió antes del mount
        setValue(getShared<T>(key));

        // Suscribirse a cambios
        const unsubscribe = subscribe<T>(key, (newValue: T) => {
            setValue(newValue);
        });

        return unsubscribe;
    }, [key, getShared, subscribe]);

    return value;
}

/**
 * Hook para establecer valores en el contexto compartido sin suscribirse
 * Útil cuando solo necesitas escribir, no leer
 *
 * @returns Función setShared
 *
 * @example
 * const setShared = useSharedSetter();
 * setShared('mediaSession', { title: 'Song', artist: 'Artist' });
 */
export function useSharedSetter() {
    const { setShared } = useSharedContext();
    return setShared;
}
