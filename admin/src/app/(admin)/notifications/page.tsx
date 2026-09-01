"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Check, Plus, X } from "lucide-react";
import { notificationsApi, type NotificationListParams } from "@/lib/api/notifications";
import { ApiRequestError } from "@/lib/api";
import type { NotificationType } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useSession } from "@/hooks/useSession";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Toolbar, Badge } from "@/components/ui/misc";
import { Button, Card, Input, Select } from "@/components/ui/primitives";
import { DataTable, Td, Th, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const { can } = useSession();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<NotificationType | "">("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const params: NotificationListParams = { page, pageSize: 12, search: debounced, type };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationsApi.list(params),
  });

  const pushQ = useQuery({
    queryKey: ["push-status"],
    queryFn: notificationsApi.pushStatus,
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Everything sent to players. Records persist even when push delivery is unavailable."
        actions={
          can(PERMISSIONS.NOTIFICATIONS_SEND) && (
            <Button variant="primary" size="sm" onClick={() => router.push("/notifications/new")}>
              <Plus className="h-3.5 w-3.5" /> New notification
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Card>
          <div className="flex items-center gap-3 p-4 text-sm">
            <BellRing className="h-4 w-4 text-cyan-glow" />
            <span className="text-slate-400">Push delivery</span>
            {pushQ.data ? (
              pushQ.data.available ? (
                <Badge tone="green">
                  <Check className="h-3 w-3" /> Available · {pushQ.data.provider}
                </Badge>
              ) : (
                <Badge tone="amber">
                  <X className="h-3 w-3" /> Unavailable — database records only
                </Badge>
              )
            ) : (
              <span className="text-xs text-slate-600">checking…</span>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <Toolbar>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search notifications…"
            className="sm:max-w-xs"
          />
          <Select value={type} onChange={(e) => { setType(e.target.value as NotificationType | ""); setPage(1); }} className="sm:max-w-[12rem]">
            <option value="">All types</option>
            <option value="SYSTEM">System</option>
            <option value="GAME">Game</option>
            <option value="BLOG">Blog</option>
            <option value="ACHIEVEMENT">Achievement</option>
            <option value="LEADERBOARD">Leaderboard</option>
          </Select>
        </Toolbar>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Failed to load notifications."}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="No notifications yet" />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Message</Th>
                  <Th>Type</Th>
                  <Th>Recipient</Th>
                  <Th>Push</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((n) => (
                  <Tr key={n.id}>
                    <Td className="font-medium text-slate-200">{n.title}</Td>
                    <Td className="max-w-[20rem] truncate text-slate-400">{n.message}</Td>
                    <Td><Badge tone="violet">{n.type}</Badge></Td>
                    <Td className="text-slate-400">
                      {n.recipientLabel}
                      <span className="ml-1 text-xs text-slate-600">({n.recipientCount})</span>
                    </Td>
                    <Td>
                      {n.pushDelivered ? (
                        <Badge tone="green">sent</Badge>
                      ) : (
                        <Badge tone="slate">db only</Badge>
                      )}
                    </Td>
                    <Td className="text-slate-400">{formatDateTime(n.createdAt)}</Td>
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
    </>
  );
}
