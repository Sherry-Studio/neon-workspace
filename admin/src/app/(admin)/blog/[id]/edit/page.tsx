"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { blogApi } from "@/lib/api/blog";
import { ApiRequestError } from "@/lib/api";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";
import { ErrorState, LoadingRow } from "@/components/ui/states";
import { BlogForm } from "@/components/forms/blog-form";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["blog", id],
    queryFn: () => blogApi.get(id),
  });

  return (
    <>
      <button
        onClick={() => router.push("/blog")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to The Vault
      </button>
      <PageHeader title={data ? `Edit — ${data.title}` : "Edit post"} />
      {isLoading ? (
        <LoadingRow label="Loading post…" />
      ) : isError || !data ? (
        <Card>
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Post not found."}
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <BlogForm post={data} />
      )}
    </>
  );
}
