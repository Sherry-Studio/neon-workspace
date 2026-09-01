"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { gamesApi } from "@/lib/api/games";
import { ApiRequestError } from "@/lib/api";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";
import { ErrorState, LoadingRow } from "@/components/ui/states";
import { GameForm } from "@/components/forms/game-form";

export default function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["game", id],
    queryFn: () => gamesApi.get(id),
  });

  return (
    <>
      <button
        onClick={() => router.push("/games")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to games
      </button>
      <PageHeader title={data ? `Edit — ${data.title}` : "Edit game"} />
      {isLoading ? (
        <LoadingRow label="Loading game…" />
      ) : isError || !data ? (
        <Card>
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Game not found."}
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <GameForm game={data} />
      )}
    </>
  );
}
