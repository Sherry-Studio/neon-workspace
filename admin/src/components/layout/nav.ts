import {
  BarChart3,
  BookText,
  Bell,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users, permission: PERMISSIONS.USERS_VIEW },
  { label: "Games", href: "/games", icon: Gamepad2, permission: PERMISSIONS.GAMES_VIEW },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
    permission: PERMISSIONS.SCORES_VIEW,
  },
  { label: "The Vault", href: "/blog", icon: BookText, permission: PERMISSIONS.BLOG_VIEW },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    permission: PERMISSIONS.NOTIFICATIONS_VIEW,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permission: PERMISSIONS.ANALYTICS_VIEW,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
];
