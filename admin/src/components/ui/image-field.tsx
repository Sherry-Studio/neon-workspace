"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { uploadsApi } from "@/lib/api";
import { Field, Input } from "./primitives";
import { useToast } from "./toast";

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadsApi.image(file);
      onChange(res.url);
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-3">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-850">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute right-1 top-1 rounded bg-ink-950/80 p-0.5 text-slate-300 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="grid h-full place-items-center text-slate-700">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            placeholder="https://…  (paste a URL)"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-cyan-soft hover:underline"
          >
            or upload a file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Field>
  );
}
