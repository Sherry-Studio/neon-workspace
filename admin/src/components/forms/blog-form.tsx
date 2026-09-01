"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Eye, Save } from "lucide-react";
import { blogApi, type BlogInput } from "@/lib/api/blog";
import { BLOG_CATEGORIES, type BlogPost } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { BlogStatusBadge } from "@/components/ui/misc";
import { ImageField } from "@/components/ui/image-field";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

const schema = z.object({
  title: z.string().min(3, "Title is required"),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Lowercase, digits and dashes only"),
  excerpt: z.string().min(10, "Add a short excerpt").max(280),
  content: z.string().min(20, "Content is too short"),
  category: z.string().min(1),
});

export function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState<BlogInput>(
    post
      ? {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage ?? null,
          category: post.category,
          tags: post.tags,
          status: post.status,
        }
      : {
          title: "",
          slug: "",
          excerpt: "",
          content: "",
          coverImage: null,
          category: BLOG_CATEGORIES[0],
          tags: [],
          status: "DRAFT",
        },
  );
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);

  const set = <K extends keyof BlogInput>(k: K, v: BlogInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (payload: BlogInput) =>
      post ? blogApi.update(post.id, payload) : blogApi.create(payload),
    onSuccess: () => {
      toast.success("Blog post saved.");
      qc.invalidateQueries({ queryKey: ["blog"] });
      router.push("/blog");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    mutation.mutate(form);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="grid gap-4 p-5">
            <Field label="Title" error={errors.title}>
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
            <Field label="Excerpt" hint="Shown in article cards and previews" error={errors.excerpt}>
              <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={280} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Content"
            subtitle="Markdown supported"
            action={
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-cyan-soft hover:underline"
              >
                <Eye className="h-3.5 w-3.5" /> {preview ? "Edit" : "Preview"}
              </button>
            }
          />
          <div className="p-5">
            {preview ? (
              <div
                className="prose-invert min-h-64 max-w-none space-y-3 text-sm leading-relaxed text-slate-300 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_a]:text-cyan-soft"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
              />
            ) : (
              <Textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                className="min-h-64 font-mono text-xs"
                placeholder={"## Heading\n\nWrite your article here…"}
              />
            )}
            {errors.content && (
              <p className="mt-1 text-xs text-rose-400">{errors.content}</p>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Publishing" />
          <div className="space-y-4 p-5">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => set("status", e.target.value as BlogInput["status"])}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </Field>
            <Field label="Category" error={errors.category}>
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tags">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag + Enter"
                />
                <Button type="button" size="sm" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("tags", form.tags.filter((x) => x !== t))}
                      className="rounded-md border border-line bg-ink-800 px-2 py-0.5 text-xs text-slate-400 hover:text-rose-300"
                    >
                      {t} ✕
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <ImageField
              label="Cover image"
              value={form.coverImage ?? null}
              onChange={(v) => set("coverImage", v)}
            />
            <div className="flex flex-col gap-2">
              <Button type="submit" variant="primary" loading={mutation.isPending}>
                <Save className="h-4 w-4" /> Save post
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/blog")}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>

        {post && (
          <Card>
            <div className="flex items-center justify-between p-5 text-xs text-slate-500">
              <span>Current status</span>
              <BlogStatusBadge status={post.status} />
            </div>
          </Card>
        )}
      </div>
    </form>
  );
}
