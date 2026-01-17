import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, updateDisplayName } from "../auth/user";

export function HomePage() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then((data) => {
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
        setProfileLoading(false);
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    if (user && displayName.trim()) {
      await updateDisplayName(user.uid, displayName);
      setIsEditing(false);
    }
  };

  if (profileLoading) return <div>Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 rounded-xl shadow">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome, {displayName}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{user?.email}</p>
        </div>

        <div className="space-y-4">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setIsEditing(true)}
                className="text-indigo-600 hover:text-indigo-900 font-medium"
              >
                Edit Display Name
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <button
            onClick={logout}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
