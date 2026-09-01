"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, CornerDownLeft } from "lucide-react";
import { searchApi } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Spinner } from "@/components/ui/states";

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(q, 300);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => searchApi.global(debounced),
    enabled: debounced.trim().length >= 2,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const groups: Array<{ label: string; items: { id: string; text: string; href: string }[] }> =
    data
      ? [
          {
            label: "Users",
            items: data.users.map((u) => ({
              id: u.id,
              text: `${u.username} · ${u.email}`,
              href: `/users/${u.id}`,
            })),
          },
          {
            label: "Games",
            items: data.games.map((g) => ({
              id: g.id,
              text: g.title,
              href: `/games/${g.id}/edit`,
            })),
          },
          {
            label: "The Vault",
            items: data.blog.map((b) => ({
              id: b.id,
              text: b.title,
              href: `/blog/${b.id}/edit`,
            })),
          },
          {
            label: "Scores",
            items: data.scores.map((s) => ({
              id: s.id,
              text: `${s.username} — ${s.gameTitle} (${s.score})`,
              href: `/leaderboard?player=${encodeURIComponent(s.username)}`,
            })),
          },
        ].filter((g) => g.items.length > 0)
      : [];

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3">
        <Search className="h-4 w-4 text-slate-600" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search users, games, posts, scores…"
          className="h-9 w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
        {isFetching && <Spinner className="h-3.5 w-3.5" />}
      </div>

      {open && debounced.trim().length >= 2 && (
        <div className="panel absolute z-50 mt-2 max-h-96 w-full overflow-y-auto p-2 shadow-2xl">
          {groups.length === 0 && !isFetching && (
            <p className="px-3 py-6 text-center text-xs text-slate-500">
              No matches for “{debounced}”.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.href)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5"
                >
                  <span className="truncate">{item.text}</span>
                  <CornerDownLeft className="h-3 w-3 shrink-0 text-slate-600" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
