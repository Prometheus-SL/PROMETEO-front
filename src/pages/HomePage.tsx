import { useAuthContext } from "@/providers/AuthProvider";

export default function HomePage() {
  const { user } = useAuthContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-svh">
      <h1 className="text-3xl font-bold mb-4">Bienvenido a PROMETEO</h1>
      {user && (
        <div className="text-zinc-700">
          Hola, <b>{user.username}</b> ({user.email})
        </div>
      )}
    </div>
  );
}
