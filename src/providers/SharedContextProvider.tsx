import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  SharedContext,
  type SharedContextValue,
} from "@/contexts/SharedContext";

const STORAGE_KEY = "prometeo-shared-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener<T = any> = (value: T) => void;

interface SharedContextProviderProps {
  children: React.ReactNode;
}

export function SharedContextProvider({
  children,
}: SharedContextProviderProps) {
  // Estado interno del contexto compartido
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sharedData, setSharedData] = useState<Record<string, any>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading shared context from localStorage:", error);
      return {};
    }
  });

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

  // Sincronizar con localStorage cuando cambie el estado
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedData));
    } catch (error) {
      console.error("Error saving shared context to localStorage:", error);
    }
  }, [sharedData]);

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

  const value: SharedContextValue = useMemo(
    () => ({
      setShared,
      getShared,
      subscribe,
      removeShared,
      getAllKeys,
      getAll,
    }),
    [setShared, getShared, subscribe, removeShared, getAllKeys, getAll]
  );

  return (
    <SharedContext.Provider value={value}>{children}</SharedContext.Provider>
  );
}
