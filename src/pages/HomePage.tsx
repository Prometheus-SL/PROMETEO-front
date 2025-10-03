import { useAuthContext } from "@/components/AuthProvider";

export default function HomePage() {
  const { user, logout } = useAuthContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-svh">
      <h1 className="text-3xl font-bold mb-4">Bienvenido a PROMETEO</h1>
      {user && (
        <div className="text-zinc-700">
          Hola, <b>{user.username}</b> ({user.email})
          <button
            onClick={logout}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
