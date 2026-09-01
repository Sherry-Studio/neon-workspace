"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, ShieldAlert, Trash2 } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { ApiRequestError } from "@/lib/api";
import type { Role } from "@/lib/types";
import { useSession } from "@/hooks/useSession";
import { PERMISSIONS } from "@/lib/permissions";
import {
  Avatar,
  PageHeader,
  RoleBadge,
  UserStatusBadge,
} from "@/components/ui/misc";
import { Button, Card, CardHeader, Select } from "@/components/ui/primitives";
import { ErrorState, LoadingRow, EmptyState } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatNumber, formatDate } from "@/lib/utils";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { can, isSuperAdmin } = useSession();

  const userQ = useQuery({ queryKey: ["user", id], queryFn: () => usersApi.get(id) });
  const scoresQ = useQuery({
    queryKey: ["user-scores", id],
    queryFn: () => usersApi.scores(id),
  });
  const notifsQ = useQuery({
    queryKey: ["user-notifications", id],
    queryFn: () => usersApi.notifications(id),
  });

  const [confirm, setConfirm] = useState<"suspend" | "activate" | "delete" | null>(null);
  const [role, setRole] = useState<Role | "">("");

  const action = useMutation({
    mutationFn: async () => {
      if (confirm === "delete") return usersApi.remove(id);
      return usersApi.setStatus(id, confirm === "suspend" ? "SUSPENDED" : "ACTIVE");
    },
    onSuccess: () => {
      if (confirm === "delete") {
        toast.success("User deleted successfully.");
        router.replace("/users");
        return;
      }
      toast.success(`User ${confirm === "suspend" ? "suspended" : "activated"} successfully.`);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["user", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed."),
  });

  const roleMutation = useMutation({
    mutationFn: () => usersApi.setRole(id, role as Role),
    onSuccess: () => {
      toast.success("Role updated successfully.");
      qc.invalidateQueries({ queryKey: ["user", id] });
      setRole("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not change role."),
  });

  if (userQ.isLoading) return <LoadingRow label="Loading user…" />;
  if (userQ.isError || !userQ.data) {
    return (
      <Card>
        <ErrorState
          message={
            userQ.error instanceof ApiRequestError ? userQ.error.message : "User not found."
          }
          onRetry={() => userQ.refetch()}
        />
      </Card>
    );
  }

  const u = userQ.data;

  return (
    <>
      <button
        onClick={() => router.push("/users")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to users
      </button>

      <PageHeader
        title={u.username}
        description={u.email}
        actions={
          <div className="flex flex-wrap gap-2">
            {can(PERMISSIONS.USERS_MANAGE) &&
              (u.status === "SUSPENDED" ? (
                <Button size="sm" variant="primary" onClick={() => setConfirm("activate")}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setConfirm("suspend")}>
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </Button>
              ))}
            {can(PERMISSIONS.USERS_DELETE) && u.role !== "SUPER_ADMIN" && (
              <Button size="sm" variant="danger" onClick={() => setConfirm("delete")}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={u.username} src={u.avatar} size={72} />
            <div>
              <p className="text-base font-semibold text-white">{u.username}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
            </div>
            <div className="flex gap-2">
              <RoleBadge role={u.role} />
              <UserStatusBadge status={u.status} />
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
            <Stat label="Played" value={formatNumber(u.gamesPlayed)} />
            <Stat label="Total" value={formatNumber(u.totalScore)} />
            <Stat label="Best" value={formatNumber(u.highestScore)} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Account information" />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Row label="User ID" value={<code className="text-xs">{u.id}</code>} />
            <Row label="Registered" value={formatDateTime(u.createdAt)} />
            <Row label="Last login" value={formatDateTime(u.lastLoginAt)} />
            <Row label="Role" value={<RoleBadge role={u.role} />} />
            <Row
              label="Achievements"
              value={
                u.achievements.length ? u.achievements.join(", ") : "None yet"
              }
            />
          </dl>

          {isSuperAdmin && u.role !== "SUPER_ADMIN" && (
            <div className="border-t border-line p-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fuchsia-300">
                <ShieldAlert className="h-3.5 w-3.5" /> SUPER_ADMIN — change role
              </p>
              <div className="flex gap-2">
                <Select
                  value={role || u.role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="max-w-[12rem]"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </Select>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!role || role === u.role}
                  loading={roleMutation.isPending}
                  onClick={() => roleMutation.mutate()}
                >
                  Update role
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent scores" />
          {scoresQ.isLoading ? (
            <LoadingRow />
          ) : scoresQ.data && scoresQ.data.length ? (
            <ul className="divide-y divide-line/60">
              {scoresQ.data.map((s) => (
                <li key={s.id} className="flex justify-between px-5 py-2.5 text-sm">
                  <span className="text-slate-300">{s.gameTitle}</span>
                  <span className="tabular-nums text-cyan-soft">
                    {formatNumber(s.score)}
                    <span className="ml-2 text-xs text-slate-600">
                      {formatDate(s.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scores recorded" />
          )}
        </Card>

        <Card>
          <CardHeader title="Notifications" />
          {notifsQ.isLoading ? (
            <LoadingRow />
          ) : notifsQ.data && notifsQ.data.length ? (
            <ul className="divide-y divide-line/60">
              {notifsQ.data.map((n) => (
                <li key={n.id} className="px-5 py-2.5 text-sm">
                  <p className="text-slate-200">{n.title}</p>
                  <p className="text-xs text-slate-500">
                    {n.type} · {formatDate(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No notifications" />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => action.mutate()}
        loading={action.isPending}
        tone={confirm === "activate" ? "primary" : "danger"}
        confirmLabel={
          confirm === "delete" ? "Delete user" : confirm === "suspend" ? "Suspend" : "Activate"
        }
        title={
          confirm === "delete"
            ? `Delete ${u.username}?`
            : confirm === "suspend"
              ? `Suspend ${u.username}?`
              : `Activate ${u.username}?`
        }
        description={
          confirm === "delete"
            ? "This removes the account permanently. Their scores may be orphaned."
            : confirm === "suspend"
              ? "The user will be blocked from the platform until reactivated."
              : "Restores full access for this user."
        }
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <p className="text-sm font-semibold tabular-nums text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-slate-300">{value}</dd>
    </div>
  );
}
