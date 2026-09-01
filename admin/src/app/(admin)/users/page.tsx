"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import { usersApi, type UserListParams } from "@/lib/api/users";
import { ApiRequestError } from "@/lib/api";
import type { Role, User, UserStatus } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useSession } from "@/hooks/useSession";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Toolbar, Avatar, UserStatusBadge, RoleBadge } from "@/components/ui/misc";
import { Button, Card, Input, Select } from "@/components/ui/primitives";
import { DataTable, Td, Th, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatNumber, relativeTime } from "@/lib/utils";

type SortKey = "createdAt" | "username" | "totalScore" | "lastLoginAt";

export default function UsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useSession();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebounce(search);
  const params: UserListParams = {
    page,
    pageSize: 10,
    search: debouncedSearch,
    status,
    role,
    sort: `${sortKey}:${sortDir}`,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.list(params),
  });

  const [confirm, setConfirm] = useState<
    | { kind: "suspend" | "activate" | "delete"; user: User }
    | null
  >(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      const { kind, user } = confirm;
      if (kind === "delete") return usersApi.remove(user.id);
      return usersApi.setStatus(user.id, kind === "suspend" ? "SUSPENDED" : "ACTIVE");
    },
    onSuccess: () => {
      const verb =
        confirm?.kind === "delete"
          ? "deleted"
          : confirm?.kind === "suspend"
            ? "suspended"
            : "activated";
      toast.success(`User ${verb} successfully.`);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed."),
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  const sortState = (key: SortKey) => (sortKey === key ? sortDir : null);

  return (
    <>
      <PageHeader
        title="Users"
        description="Search, filter and manage every NEON ARCADE account."
        actions={
          can(PERMISSIONS.USERS_MANAGE) && (
            <Button variant="primary" size="sm" disabled title="Handled via backend invites">
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </Button>
          )
        }
      />

      <Card>
        <Toolbar>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search username or email…"
            className="sm:max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as UserStatus | "");
              setPage(1);
            }}
            className="sm:max-w-[10rem]"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Pending</option>
          </Select>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role | "");
              setPage(1);
            }}
            className="sm:max-w-[10rem]"
          >
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </Select>
          {isFetching && <span className="text-xs text-slate-600">Updating…</span>}
        </Toolbar>

        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : isError ? (
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Failed to load users."}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try clearing filters or adjusting your search."
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th sortable sortState={sortState("totalScore")} onSort={() => toggleSort("totalScore")}>
                    Score
                  </Th>
                  <Th>Played</Th>
                  <Th sortable sortState={sortState("createdAt")} onSort={() => toggleSort("createdAt")}>
                    Joined
                  </Th>
                  <Th sortable sortState={sortState("lastLoginAt")} onSort={() => toggleSort("lastLoginAt")}>
                    Last login
                  </Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <Tr key={u.id} onClick={() => router.push(`/users/${u.id}`)}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={u.username} src={u.avatar} size={30} />
                        <span className="font-medium text-slate-200">{u.username}</span>
                      </span>
                    </Td>
                    <Td className="text-slate-400">{u.email}</Td>
                    <Td>
                      <RoleBadge role={u.role} />
                    </Td>
                    <Td>
                      <UserStatusBadge status={u.status} />
                    </Td>
                    <Td className="tabular-nums">{formatNumber(u.totalScore)}</Td>
                    <Td className="tabular-nums">{formatNumber(u.gamesPlayed)}</Td>
                    <Td className="text-slate-400">{formatDate(u.createdAt)}</Td>
                    <Td className="text-slate-400">{relativeTime(u.lastLoginAt)}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center justify-end gap-1">
                        <IconBtn title="View" onClick={() => router.push(`/users/${u.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </IconBtn>
                        {can(PERMISSIONS.USERS_MANAGE) && (
                          <>
                            <IconBtn
                              title="Edit"
                              onClick={() => router.push(`/users/${u.id}?edit=1`)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </IconBtn>
                            {u.status === "SUSPENDED" ? (
                              <IconBtn
                                title="Activate"
                                onClick={() => setConfirm({ kind: "activate", user: u })}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              </IconBtn>
                            ) : (
                              <IconBtn
                                title="Suspend"
                                onClick={() => setConfirm({ kind: "suspend", user: u })}
                              >
                                <Ban className="h-3.5 w-3.5 text-amber-400" />
                              </IconBtn>
                            )}
                          </>
                        )}
                        {can(PERMISSIONS.USERS_DELETE) && u.role !== "SUPER_ADMIN" && (
                          <IconBtn
                            title="Delete"
                            onClick={() => setConfirm({ kind: "delete", user: u })}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </IconBtn>
                        )}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => mutation.mutate()}
        loading={mutation.isPending}
        tone={confirm?.kind === "activate" ? "primary" : "danger"}
        confirmLabel={
          confirm?.kind === "delete"
            ? "Delete user"
            : confirm?.kind === "suspend"
              ? "Suspend"
              : "Activate"
        }
        title={
          confirm?.kind === "delete"
            ? `Delete ${confirm.user.username}?`
            : confirm?.kind === "suspend"
              ? `Suspend ${confirm?.user.username}?`
              : `Activate ${confirm?.user.username}?`
        }
        description={
          confirm?.kind === "delete"
            ? "This removes the account. Their scores may become orphaned — prefer suspension if you only need to block access."
            : confirm?.kind === "suspend"
              ? "The user will be signed out and blocked from playing until reactivated."
              : "The user will regain full access to the platform."
        }
      />
    </>
  );
}

function IconBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-md border border-line p-1.5 text-slate-400 transition hover:border-line-strong hover:text-slate-100"
    >
      {children}
    </button>
  );
}
