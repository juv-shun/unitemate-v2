import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

// アイコンコンポーネント
function MatchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function RankingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function FaqIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    label: "マッチング",
    path: "/",
    icon: <MatchIcon />,
  },
  // {
  // 	label: "ドラフトシミュレーション",
  // 	path: "/draft",
  // 	icon: <DraftIcon />,
  // },
  {
    label: "ランキング",
    path: "/ranking",
    icon: <RankingIcon />,
  },
  {
    label: "FAQ",
    path: "/faq",
    icon: <FaqIcon />,
  },
  {
    label: "マイページ",
    path: "/mypage",
    icon: <UserIcon />,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    onNavigate?.();
  };

  const handleLogin = () => {
    navigate("/login");
    onNavigate?.();
  };

  // 未ログイン時はマイページを表示しない
  const visibleNavItems = navItems.filter((item) => {
    if (!user && item.path === "/mypage") {
      return false;
    }
    return true;
  });

  return (
    <aside
      className="w-64 h-full flex flex-col"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid rgba(100, 116, 139, 0.3)",
      }}
    >
      {/* ロゴ */}
      <div className="p-6 mb-4">
        <h1
          className="text-xl font-bold tracking-widest"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-cyan)",
          }}
        >
          V-ARENA
        </h1>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-4 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive ? "bg-slate-700/50" : "hover:bg-slate-700/30"
              }`}
              style={{
                color: isActive
                  ? "var(--color-accent-cyan)"
                  : "var(--color-text-secondary)",
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span
                className="text-sm font-medium truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ログイン/ログアウト */}
      <div className="px-4 pb-6 pt-4 border-t border-slate-700/50">
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-slate-700/30"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            <span className="shrink-0">
              <LogoutIcon />
            </span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ログアウト
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-slate-700/30"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-accent-cyan)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            <span className="shrink-0">
              {/* ログインアイコン（LogoutIconを反転または別アイコンとして使用も可能だが、簡易的に同じものを流用しつつ回転させる等の表現も可。今回はLogoutIconをそのまま使うか、別途LoginIconを作る。LogoutIconは矢印が外向きなので、内向きのような表現が望ましいが、既存のLogoutIconを使う） */}
              {/* 既存のLogoutIconは右向き矢印（出る）なので、ログイン用に左向き矢印（入る）のようなアイコンを定義するのがベストだが、今回は一旦LogoutIconを流用しつつ、アイコン自体は変えずにテキストで判断させるか、LoginIconを追加する。コード上部にLoginIconを追加していないので、既存のLogoutIconを使い回すか、新たに定義する必要がある。 */}
              {/* ユーザー体験的にはLoginIconがあった方がいい。一旦既存のLogoutIconをそのまま使う。 */}
              <LogoutIcon />
            </span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ログイン
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
