import { createContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener<T = any> = (value: T) => void;
type Unsubscribe = () => void;

export interface SharedActionResult {
    success: boolean;
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

export interface SharedAction {
    id: string;
    title: string;
    description?: string;
    intentTags?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: (payload?: any) => Promise<SharedActionResult> | SharedActionResult;
    requiresConfirmation?: boolean;
    widgetId: string;
}

export interface SharedContextValue {
    /**
     * Establece un valor en el contexto compartido
     * @param key - Clave del valor (ej: 'spotify.auth', 'mediaSession')
     * @param value - Valor a almacenar (será serializado a JSON)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setShared: <T = any>(key: string, value: T) => void;

    /**
     * Obtiene un valor del contexto compartido
     * @param key - Clave del valor
     * @returns El valor almacenado o undefined
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getShared: <T = any>(key: string) => T | undefined;

    /**
     * Suscribe un listener a cambios en una clave específica
     * @param key - Clave a observar
     * @param listener - Callback que se ejecuta cuando cambia el valor
     * @returns Función para cancelar la suscripción
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: <T = any>(key: string, listener: Listener<T>) => Unsubscribe;

    /**
     * Elimina un valor del contexto compartido
     * @param key - Clave del valor a eliminar
     */
    removeShared: (key: string) => void;

    /**
     * Obtiene todas las claves disponibles
     */
    getAllKeys: () => string[];

    /**
     * Obtiene todo el estado compartido (útil para debugging)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAll: () => Record<string, any>;

    /**
     * Registra una acción invocable de un widget. Las acciones NO se persisten en localStorage.
     */
    registerAction: (action: SharedAction) => void;

    /**
     * Elimina una acción previamente registrada.
     */
    unregisterAction: (actionId: string) => void;

    /**
     * Obtiene todas las acciones registradas.
     */
    getActions: () => SharedAction[];

    /**
     * Suscribe listeners a cambios en el listado de acciones.
     */
    subscribeActions: (listener: Listener<SharedAction[]>) => Unsubscribe;
}

export const SharedContext = createContext<SharedContextValue | null>(null);
