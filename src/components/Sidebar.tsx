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

function DraftIcon() {
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
			<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
			<line x1="3" y1="9" x2="21" y2="9" />
			<line x1="9" y1="21" x2="9" y2="9" />
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

function StatsIcon() {
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
			<line x1="18" y1="20" x2="18" y2="10" />
			<line x1="12" y1="20" x2="12" y2="4" />
			<line x1="6" y1="20" x2="6" y2="14" />
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
		label: "統計",
		path: "/stats",
		icon: <StatsIcon />,
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
	const { logout } = useAuth();

	const handleNavigation = (path: string) => {
		navigate(path);
		onNavigate?.();
	};

	const handleLogout = () => {
		logout();
		onNavigate?.();
	};

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
					UNITEMATE
				</h1>
			</div>

			{/* ナビゲーション */}
			<nav className="flex-1 px-4 space-y-1">
				{navItems.map((item) => {
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

			{/* ログアウト */}
			<div className="px-4 pb-6 pt-4 border-t border-slate-700/50">
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
			</div>
		</aside>
	);
}
