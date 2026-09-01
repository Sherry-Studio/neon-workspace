"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { hasPermission, type Permission } from "@/lib/permissions";

export function useSession() {
  const { data, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: authApi.me,
    staleTime: 60_000,
  });

  const user = data ?? null;
  return {
    user,
    isLoading,
    isSuperAdmin: user?.role === "SUPER_ADMIN",
    can: (perm: Permission) => hasPermission(user?.permissions, perm),
  };
}
