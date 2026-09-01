import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GamePlayer from "@/components/site/GamePlayer";
import GameLeaderboard from "@/components/site/GameLeaderboard";
import { gamesService } from "@/services";
import { ApiError } from "@/lib/api/client";
import type { Game } from "@/types/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadGame(slug: string): Promise<Game | null> {
  try {
    return await gamesService.bySlug(slug, { server: true });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await loadGame(slug).catch(() => null);
  if (!game) return { title: "Game not found — NeonArcade" };
  return {
    title: `${game.title} — NeonArcade`,
    description: game.shortDescription || game.description?.slice(0, 150),
  };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const game = await loadGame(slug);
  if (!game) notFound();

  const controls = Array.isArray(game.controls) ? game.controls : [];

  return (
    <div className="relative z-10 bg-surface/[0.96]">
      <div className="mx-auto max-w-5xl px-[var(--gutter)] pb-28 pt-32 md:pt-40">
        <Link
          href="/games"
          className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-text-muted transition-colors duration-300 hover:text-white"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          All games
        </Link>

        <div className="mt-8 flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent-cyan">
            {game.genre || game.category} · {game.platform || "Browser"}
          </span>
          <h1 className="display text-5xl text-white md:text-7xl">{game.title}</h1>
          {game.tagline && (
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
              {game.tagline}
            </p>
          )}
        </div>

        {(game.banner || game.thumbnail) && (
          <div className="relative mt-8 aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border">
            <div className="absolute inset-0" style={{ background: game.gradient }} />
            <Image
              src={game.banner || game.thumbnail}
              alt={game.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

        {game.gameUrl ? (
          <GamePlayer game={game} />
        ) : (
          <p className="mt-10 border border-border px-4 py-3 text-sm text-text-muted">
            This game isn&apos;t playable yet — check back soon.
          </p>
        )}

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-text-muted">
              About
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text-secondary md:text-base">
              {game.description || game.shortDescription || "No description yet."}
            </p>

            {game.instructions && (
              <>
                <h2 className="mt-10 text-xs font-medium uppercase tracking-[0.25em] text-text-muted">
                  How to play
                </h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                  {game.instructions}
                </p>
              </>
            )}
          </div>

          <aside>
            {controls.length > 0 && (
              <>
                <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-text-muted">
                  Controls
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  {controls.map((c) => (
                    <li key={c} className="border-l border-border pl-3">
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <dl className="mt-8 space-y-3 text-xs uppercase tracking-wide text-text-muted">
              <div className="flex justify-between">
                <dt>Version</dt>
                <dd className="text-text-secondary">{game.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Plays</dt>
                <dd className="text-text-secondary">{game.plays.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Category</dt>
                <dd className="text-text-secondary">{game.category}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <div className="mt-16">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-text-muted">
            Leaderboard
          </h2>
          <GameLeaderboard gameId={game.id} />
        </div>
      </div>
    </div>
  );
}
