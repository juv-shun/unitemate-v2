import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ensureUserExists } from "../lib/user";

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // ログイン後にFirestoreにユーザーが存在することを確認する
      ensureUserExists(user).then(() => {
        navigate("/");
      });
    }
  }, [user, navigate]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          UniteMate Login
        </h1>
        <button
          onClick={login}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
