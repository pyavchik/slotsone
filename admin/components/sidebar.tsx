"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Gamepad2,
  Gift,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const icons: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Gamepad2,
  Gift,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Settings,
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Players", href: "/players", icon: "Users" },
  { label: "Transactions", href: "/transactions", icon: "ArrowLeftRight" },
  { label: "Games", href: "/games", icon: "Gamepad2" },
  { label: "Bonuses", href: "/bonuses", icon: "Gift" },
  { label: "KYC", href: "/kyc", icon: "ShieldCheck" },
  { label: "Risk", href: "/risk", icon: "AlertTriangle" },
  { label: "Reports", href: "/reports", icon: "BarChart3" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          S1
        </div>
        <span className="text-lg font-semibold">SlotsOne Admin</span>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = icons[item.icon];
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
