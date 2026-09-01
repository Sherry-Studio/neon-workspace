"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Eye, Save } from "lucide-react";
import { gamesApi, type GameInput } from "@/lib/api/games";
import { GAME_CATEGORIES, type Game } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { GameStatusBadge } from "@/components/ui/misc";
import { ImageField } from "@/components/ui/image-field";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase, digits and dashes only"),
  shortDescription: z.string().min(4, "Add a short description").max(160),
  fullDescription: z.string().min(4, "Add a full description"),
  category: z.string().min(1),
  gameUrl: z.string().url("Must be a valid URL"),
  version: z.string().min(1),
  instructions: z.string().min(1, "Add instructions"),
  controls: z.string().min(1, "Add controls"),
});

const EMPTY: GameInput = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  category: GAME_CATEGORIES[0],
  thumbnail: null,
  banner: null,
  gameUrl: "",
  version: "1.0.0",
  instructions: "",
  controls: "",
  featured: false,
  status: "DRAFT",
};

export function GameForm({ game }: { game?: Game }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState<GameInput>(
    game
      ? {
          title: game.title,
          slug: game.slug,
          shortDescription: game.shortDescription,
          fullDescription: game.fullDescription,
          category: game.category,
          thumbnail: game.thumbnail ?? null,
          banner: game.banner ?? null,
          gameUrl: game.gameUrl,
          version: game.version,
          instructions: game.instructions,
          controls: game.controls,
          featured: game.featured,
          status: game.status,
        }
      : EMPTY,
  );
  const [slugTouched, setSlugTouched] = useState(!!game);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);

  const set = <K extends keyof GameInput>(key: K, val: GameInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (payload: GameInput) =>
      game ? gamesApi.update(game.id, payload) : gamesApi.create(payload),
    onSuccess: (saved) => {
      toast.success(game ? "Game saved." : "Game created.");
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", saved.id] });
      router.push("/games");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    mutation.mutate(form);
  };

  const previewData = useMemo(() => form, [form]);

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title="Basics" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Title" error={errors.title} className="sm:col-span-2">
              <Input
                value={form.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Slug" error={errors.slug}>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
              />
            </Field>
            <Field label="Category" error={errors.category}>
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {GAME_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Short description" error={errors.shortDescription} className="sm:col-span-2">
              <Input
                value={form.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label="Full description" error={errors.fullDescription} className="sm:col-span-2">
              <Textarea
                value={form.fullDescription}
                onChange={(e) => set("fullDescription", e.target.value)}
                className="min-h-32"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Play & media" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Game URL" error={errors.gameUrl} className="sm:col-span-2">
              <Input value={form.gameUrl} onChange={(e) => set("gameUrl", e.target.value)} placeholder="https://play.neonarcade.dev/…" />
            </Field>
            <Field label="Version" error={errors.version}>
              <Input value={form.version} onChange={(e) => set("version", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <ImageField label="Thumbnail" value={form.thumbnail ?? null} onChange={(v) => set("thumbnail", v)} />
            </div>
            <div className="sm:col-span-2">
              <ImageField label="Banner" value={form.banner ?? null} onChange={(v) => set("banner", v)} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Instructions" />
          <div className="grid gap-4 p-5">
            <Field label="How to play" error={errors.instructions}>
              <Textarea value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />
            </Field>
            <Field label="Controls" error={errors.controls}>
              <Textarea value={form.controls} onChange={(e) => set("controls", e.target.value)} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Publishing" />
          <div className="space-y-4 p-5">
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value as GameInput["status"])}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="h-4 w-4 accent-cyan-glow"
              />
              Featured on homepage
            </label>
            {form.featured && form.status !== "PUBLISHED" && (
              <p className="text-xs text-amber-400">
                Only published games are actually featured publicly.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button type="submit" variant="primary" loading={mutation.isPending}>
                <Save className="h-4 w-4" /> {game ? "Save changes" : "Create game"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreview((v) => !v)}>
                <Eye className="h-4 w-4" /> {preview ? "Hide preview" : "Show preview"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/games")}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>

        {preview && (
          <Card>
            <CardHeader title="Public preview" />
            <div className="p-5">
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="aspect-video bg-ink-850">
                  {previewData.banner || previewData.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewData.banner || previewData.thumbnail || ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-slate-600">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      {previewData.title || "Untitled game"}
                    </p>
                    <GameStatusBadge status={previewData.status} />
                  </div>
                  <p className="text-xs text-slate-500">{previewData.category}</p>
                  <p className="text-xs text-slate-400">{previewData.shortDescription}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </form>
  );
}
