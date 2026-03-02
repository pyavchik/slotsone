export const APP_NAME = "SlotsOne Admin";

export const ITEMS_PER_PAGE = 25;

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  SUSPENDED: "bg-amber-100 text-amber-800",
  BANNED: "bg-red-100 text-red-800",
  SELF_EXCLUDED: "bg-purple-100 text-purple-800",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-800",
  PENDING: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  REVERSED: "bg-orange-100 text-orange-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  FORFEITED: "bg-red-100 text-red-800",
};

export const RISK_COLORS: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "text-emerald-600",
  WITHDRAWAL: "text-red-600",
  BET: "text-orange-600",
  WIN: "text-blue-600",
  BONUS_CREDIT: "text-purple-600",
  ADJUSTMENT: "text-gray-600",
  REFUND: "text-cyan-600",
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { label: "Players", href: "/admin/players", icon: "Users" },
  { label: "Transactions", href: "/admin/transactions", icon: "ArrowLeftRight" },
  { label: "Games", href: "/admin/games", icon: "Gamepad2" },
  { label: "Bonuses", href: "/admin/bonuses", icon: "Gift" },
  { label: "KYC", href: "/admin/kyc", icon: "ShieldCheck" },
  { label: "Risk", href: "/admin/risk", icon: "AlertTriangle" },
  { label: "Reports", href: "/admin/reports", icon: "BarChart3" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
] as const;
