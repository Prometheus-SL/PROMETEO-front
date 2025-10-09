import { useAuthContext } from "@/providers/AuthProvider";

export default function HomePage() {
  const { user } = useAuthContext();
  return (
    <div className="">
      <h1 className="text-3xl font-bold mb-4">Welcome to PROMETEO</h1>
      {user && (
        <div className="text-zinc-700">
          Hello, <b>{user.username}</b>.
        </div>
      )}
    </div>
  );
}
