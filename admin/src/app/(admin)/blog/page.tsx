"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Undo2, Upload } from "lucide-react";
import { blogApi, type BlogListParams } from "@/lib/api/blog";
import { ApiRequestError } from "@/lib/api";
import { BLOG_CATEGORIES, type BlogPost, type BlogStatus } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useSession } from "@/hooks/useSession";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Toolbar, BlogStatusBadge } from "@/components/ui/misc";
import { Button, Card, Input, Select } from "@/components/ui/primitives";
import { DataTable, Td, Th, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatNumber } from "@/lib/utils";

export default function BlogPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useSession();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogStatus | "">("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const params: BlogListParams = {
    page,
    pageSize: 10,
    search: debounced,
    status,
    category,
    sort: "createdAt:desc",
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["blog", params],
    queryFn: () => blogApi.list(params),
  });

  const [toDelete, setToDelete] = useState<BlogPost | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["blog"] });

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: BlogStatus }) =>
      blogApi.setStatus(id, next),
    onSuccess: (_d, v) =>
      toast.success(
        v.next === "PUBLISHED"
          ? "Post published — it is now in The Vault on the website."
          : "Post unpublished.",
      ),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
    onSettled: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => blogApi.remove(id),
    onSuccess: () => {
      toast.success("Blog post deleted.");
      setToDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  return (
    <>
      <PageHeader
        title="The Vault"
        description="Articles for ARCADE ARCHIVES on the public website."
        actions={
          can(PERMISSIONS.BLOG_MANAGE) && (
            <Button variant="primary" size="sm" onClick={() => router.push("/blog/new")}>
              <Plus className="h-3.5 w-3.5" /> New post
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
            placeholder="Search posts…"
            className="sm:max-w-xs"
          />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as BlogStatus | ""); setPage(1); }} className="sm:max-w-[10rem]">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="sm:max-w-[12rem]">
            <option value="">All categories</option>
            {BLOG_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Toolbar>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Failed to load posts."}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="No posts found"
            action={
              can(PERMISSIONS.BLOG_MANAGE) && (
                <Button size="sm" variant="primary" onClick={() => router.push("/blog/new")}>
                  <Plus className="h-3.5 w-3.5" /> New post
                </Button>
              )
            }
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Author</Th>
                  <Th>Status</Th>
                  <Th>Published</Th>
                  <Th>Views</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((b) => (
                  <Tr key={b.id} onClick={() => router.push(`/blog/${b.id}/edit`)}>
                    <Td className="max-w-[18rem] truncate font-medium text-slate-200">{b.title}</Td>
                    <Td className="text-slate-400">{b.category}</Td>
                    <Td className="text-slate-400">{b.author}</Td>
                    <Td><BlogStatusBadge status={b.status} /></Td>
                    <Td className="text-slate-400">{formatDate(b.publishedAt)}</Td>
                    <Td className="tabular-nums">{formatNumber(b.views)}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center justify-end gap-1">
                        <IconBtn title="Edit" onClick={() => router.push(`/blog/${b.id}/edit`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        {can(PERMISSIONS.BLOG_MANAGE) &&
                          (b.status === "PUBLISHED" ? (
                            <IconBtn title="Unpublish" onClick={() => statusMut.mutate({ id: b.id, next: "DRAFT" })}>
                              <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                            </IconBtn>
                          ) : (
                            <IconBtn title="Publish" onClick={() => statusMut.mutate({ id: b.id, next: "PUBLISHED" })}>
                              <Upload className="h-3.5 w-3.5 text-emerald-400" />
                            </IconBtn>
                          ))}
                        {can(PERMISSIONS.BLOG_DELETE) && (
                          <IconBtn title="Delete" onClick={() => setToDelete(b)}>
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
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
        confirmLabel="Delete post"
        title={`Delete "${toDelete?.title}"?`}
        description="This removes the post from the admin and the public Vault. Consider unpublishing instead if you might restore it later."
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
