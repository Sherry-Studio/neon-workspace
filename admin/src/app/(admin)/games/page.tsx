"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Pencil,
  Plus,
  Star,
  StarOff,
  Trash2,
  Upload,
  Undo2,
} from "lucide-react";
import { gamesApi, type GameListParams } from "@/lib/api/games";
import { ApiRequestError } from "@/lib/api";
import { GAME_CATEGORIES, type Game, type GameStatus } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useSession } from "@/hooks/useSession";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Toolbar, GameStatusBadge, Badge } from "@/components/ui/misc";
import { Button, Card, Input, Select } from "@/components/ui/primitives";
import { DataTable, Td, Th, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatNumber } from "@/lib/utils";

export default function GamesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useSession();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<GameStatus | "">("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const params: GameListParams = {
    page,
    pageSize: 10,
    search: debounced,
    status,
    category,
    sort: "createdAt:desc",
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["games", params],
    queryFn: () => gamesApi.list(params),
  });

  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["games"] });

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: GameStatus }) =>
      gamesApi.setStatus(id, next),
    onSuccess: (_d, v) => {
      toast.success(
        v.next === "PUBLISHED"
          ? "Game published — it is now live on the website."
          : v.next === "ARCHIVED"
            ? "Game archived."
            : "Game unpublished.",
      );
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const featureMut = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      gamesApi.setFeatured(id, featured),
    onSuccess: (_d, v) =>
      toast.success(v.featured ? "Game featured." : "Game unfeatured."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
    onSettled: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => gamesApi.remove(id),
    onSuccess: () => {
      toast.success("Game archived (soft delete) — scores and stats are preserved.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  return (
    <>
      <PageHeader
        title="Games"
        description="Everything in the NEON ARCADE catalogue. Published games appear on the public website."
        actions={
          can(PERMISSIONS.GAMES_MANAGE) && (
            <Button variant="primary" size="sm" onClick={() => router.push("/games/new")}>
              <Plus className="h-3.5 w-3.5" /> Add new game
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
            placeholder="Search games…"
            className="sm:max-w-xs"
          />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as GameStatus | ""); setPage(1); }} className="sm:max-w-[10rem]">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="sm:max-w-[10rem]">
            <option value="">All categories</option>
            {GAME_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Toolbar>

        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : isError ? (
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Failed to load games."}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="No games found"
            description="Adjust filters, or add the first game."
            action={
              can(PERMISSIONS.GAMES_MANAGE) && (
                <Button size="sm" variant="primary" onClick={() => router.push("/games/new")}>
                  <Plus className="h-3.5 w-3.5" /> Add new game
                </Button>
              )
            }
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Game</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th>Featured</Th>
                  <Th>Plays</Th>
                  <Th>Version</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((g) => (
                  <Tr key={g.id} onClick={() => router.push(`/games/${g.id}/edit`)}>
                    <Td>
                      <span className="font-medium text-slate-200">{g.title}</span>
                      <span className="block text-xs text-slate-600">/{g.slug}</span>
                    </Td>
                    <Td className="text-slate-400">{g.category}</Td>
                    <Td><GameStatusBadge status={g.status} /></Td>
                    <Td>
                      {g.featured ? <Badge tone="magenta">Featured</Badge> : <span className="text-slate-700">—</span>}
                    </Td>
                    <Td className="tabular-nums">{formatNumber(g.plays)}</Td>
                    <Td className="text-slate-400">{g.version}</Td>
                    <Td className="text-slate-400">{formatDate(g.createdAt)}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center justify-end gap-1">
                        {can(PERMISSIONS.GAMES_MANAGE) && (
                          <>
                            <IconBtn title="Edit" onClick={() => router.push(`/games/${g.id}/edit`)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconBtn>
                            {g.status === "PUBLISHED" ? (
                              <IconBtn title="Unpublish" onClick={() => statusMut.mutate({ id: g.id, next: "DRAFT" })}>
                                <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                              </IconBtn>
                            ) : (
                              <IconBtn title="Publish" onClick={() => statusMut.mutate({ id: g.id, next: "PUBLISHED" })}>
                                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                              </IconBtn>
                            )}
                            {g.status === "PUBLISHED" &&
                              (g.featured ? (
                                <IconBtn title="Unfeature" onClick={() => featureMut.mutate({ id: g.id, featured: false })}>
                                  <StarOff className="h-3.5 w-3.5" />
                                </IconBtn>
                              ) : (
                                <IconBtn title="Feature" onClick={() => featureMut.mutate({ id: g.id, featured: true })}>
                                  <Star className="h-3.5 w-3.5 text-fuchsia-400" />
                                </IconBtn>
                              ))}
                            {g.status !== "ARCHIVED" && (
                              <IconBtn title="Archive" onClick={() => statusMut.mutate({ id: g.id, next: "ARCHIVED" })}>
                                <Archive className="h-3.5 w-3.5 text-slate-400" />
                              </IconBtn>
                            )}
                          </>
                        )}
                        {can(PERMISSIONS.GAMES_DELETE) && (
                          <IconBtn title="Delete" onClick={() => setDeleteTarget(g)}>
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
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        confirmLabel="Delete game"
        title={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        description="Deleting a game affects associated scores and leaderboard statistics. This admin performs a soft-delete: the game is archived and removed from the public website, but its data is retained. A permanent delete must be done from the backend."
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
