import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  SharedContext,
  type SharedAction,
  type SharedContextValue,
} from "@/contexts/SharedContext";

const STORAGE_KEY = "prometeo-shared-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener<T = any> = (value: T) => void;

interface SharedContextProviderProps {
  children: React.ReactNode;
  initialSharedData?: Record<string, unknown>;
  initialActions?: SharedAction[];
  persist?: boolean;
}

export function SharedContextProvider({
  children,
  initialSharedData,
  initialActions,
  persist = true,
}: SharedContextProviderProps) {
  const readStoredSharedData = useCallback(() => {
    if (initialSharedData) {
      return { ...initialSharedData };
    }

    if (!persist || typeof localStorage === "undefined") {
      return {};
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading shared context from localStorage:", error);
      return {};
    }
  }, [initialSharedData, persist]);

  // Estado interno del contexto compartido
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sharedData, setSharedData] = useState<Record<string, any>>(
    readStoredSharedData,
  );

  // Ref para acceder al estado actual sin crear dependencias
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedDataRef = useRef<Record<string, any>>(sharedData);

  // Mantener la ref sincronizada
  useEffect(() => {
    sharedDataRef.current = sharedData;
  }, [sharedData]);

  // Mapa de listeners por clave
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listenersRef = useRef<Map<string, Set<Listener<any>>>>(new Map());

  // Acciones (no persistentes)
  const actionsRef = useRef<Map<string, SharedAction>>(
    new Map(initialActions?.map((action) => [action.id, action])),
  );
  const actionListenersRef = useRef<Set<Listener<SharedAction[]>>>(new Set());

  // Sincronizar con localStorage cuando cambie el estado
  useEffect(() => {
    if (!persist || typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedData));
    } catch (error) {
      console.error("Error saving shared context to localStorage:", error);
    }
  }, [persist, sharedData]);

  useEffect(() => {
    setSharedData(readStoredSharedData());
  }, [readStoredSharedData]);

  // Establecer un valor y notificar a los listeners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setShared = useCallback(<T = any,>(key: string, value: T) => {
    setSharedData((prev) => {
      // Si el valor no ha cambiado, no actualizar
      if (prev[key] === value) return prev;

      const newData = { ...prev, [key]: value };

      // Notificar a los listeners de esta clave
      const listeners = listenersRef.current.get(key);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(value);
          } catch (error) {
            console.error(`Error in listener for key "${key}":`, error);
          }
        });
      }

      return newData;
    });
  }, []);

  // Obtener un valor
  const getShared = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T = any,>(key: string): T | undefined => {
      return sharedDataRef.current[key] as T | undefined;
    },
    []
  );

  // Suscribirse a cambios en una clave
  const subscribe = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T = any,>(key: string, listener: Listener<T>): (() => void) => {
      if (!listenersRef.current.has(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listenersRef.current.set(key, new Set<Listener<any>>());
      }

      const listeners = listenersRef.current.get(key)!;
      listeners.add(listener);

      // Retornar función de cleanup
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersRef.current.delete(key);
        }
      };
    },
    []
  );

  // Eliminar un valor
  const removeShared = useCallback((key: string) => {
    setSharedData((prev) => {
      const newData = { ...prev };
      delete newData[key];

      // Notificar a los listeners con undefined
      const listeners = listenersRef.current.get(key);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(undefined);
          } catch (error) {
            console.error(`Error in listener for key "${key}":`, error);
          }
        });
      }

      return newData;
    });
  }, []);

  // Obtener todas las claves
  const getAllKeys = useCallback(() => {
    return Object.keys(sharedDataRef.current);
  }, []);

  // Obtener todo el estado (útil para debugging)
  const getAll = useCallback(() => {
    return { ...sharedDataRef.current };
  }, []);

  const notifyActionListeners = useCallback(() => {
    const snapshot = Array.from(actionsRef.current.values());
    actionListenersRef.current.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Error in actions listener:", error);
      }
    });
  }, []);

  useEffect(() => {
    actionsRef.current = new Map(
      initialActions?.map((action) => [action.id, action]),
    );
    notifyActionListeners();
  }, [initialActions, notifyActionListeners]);

  const registerAction = useCallback(
    (action: SharedAction) => {
      actionsRef.current.set(action.id, action);
      notifyActionListeners();
    },
    [notifyActionListeners]
  );

  const unregisterAction = useCallback(
    (actionId: string) => {
      if (actionsRef.current.delete(actionId)) {
        notifyActionListeners();
      }
    },
    [notifyActionListeners]
  );

  const getActions = useCallback(() => {
    return Array.from(actionsRef.current.values());
  }, []);

  const subscribeActions = useCallback((listener: Listener<SharedAction[]>) => {
    actionListenersRef.current.add(listener);
    try {
      listener(Array.from(actionsRef.current.values()));
    } catch (error) {
      console.error("Error in initial actions listener call:", error);
    }
    return () => {
      actionListenersRef.current.delete(listener);
    };
  }, []);

  const value: SharedContextValue = useMemo(
    () => ({
      setShared,
      getShared,
      subscribe,
      removeShared,
      getAllKeys,
      getAll,
      registerAction,
      unregisterAction,
      getActions,
      subscribeActions,
    }),
    [
      setShared,
      getShared,
      subscribe,
      removeShared,
      getAllKeys,
      getAll,
      registerAction,
      unregisterAction,
      getActions,
      subscribeActions,
    ]
  );

  return (
    <SharedContext.Provider value={value}>{children}</SharedContext.Provider>
  );
}
