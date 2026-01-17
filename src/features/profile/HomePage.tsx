import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, updateDisplayName } from "../auth/user";
import { QueueSection } from "../queue/components/QueueSection";

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

  if (profileLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-base)" }}
      >
        <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "var(--color-base)",
        backgroundImage: `
          linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
    >
      {/* Header */}
      <header className="w-full max-w-md mb-8">
        <h1
          className="text-2xl font-bold tracking-widest text-center"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-cyan)",
          }}
        >
          UNITEMATE
        </h1>
      </header>

      {/* Main Card */}
      <main
        className="max-w-md w-full rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Profile Section */}
        <section className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                fontFamily: "var(--font-display)",
                color: "var(--color-accent-amber)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-1"
                    style={{
                      backgroundColor: "var(--color-surface-elevated)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-accent-cyan)",
                    }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{
                        color: "var(--color-text-secondary)",
                        border: "1px solid var(--color-text-secondary)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{
                        backgroundColor: "var(--color-accent-cyan)",
                        color: "var(--color-base)",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2
                    className="text-xl font-semibold truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {displayName}
                  </h2>
                  <p
                    className="text-sm truncate"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {user?.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="mt-1 text-xs font-medium transition-colors hover:underline"
                    style={{ color: "var(--color-accent-cyan)" }}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Queue Section */}
        <section className="p-6 border-b border-slate-700/50">
          <h3
            className="text-xs font-semibold tracking-wider mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-secondary)",
            }}
          >
            MATCHMAKING
          </h3>
          <QueueSection />
        </section>

        {/* Logout Section */}
        <section className="p-6">
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 text-sm font-medium rounded transition-all duration-200"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-secondary)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-surface-elevated)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-danger)";
              e.currentTarget.style.color = "var(--color-danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-surface-elevated)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            LOGOUT
          </button>
        </section>
      </main>
    </div>
  );
}
