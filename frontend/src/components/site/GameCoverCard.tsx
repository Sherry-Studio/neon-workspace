"use client";

import Link from "next/link";
import Image from "next/image";
import TiltCard from "@/components/ui/TiltCard";

export interface GameCover {
  title: string;
  genre: string;
  tagline: string;
  platform?: string;
  image: string;
  gradient: string;
  index?: string;
  href?: string;
}

export default function GameCoverCard({
  title,
  genre,
  tagline,
  platform = "Browser",
  image,
  gradient,
  index,
  href = "/games",
  className = "",
}: GameCover & { className?: string }) {
  return (
    <TiltCard className={className}>
      <Link
        href={href}
        className="card-surface group relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-xl p-6"
      >
        <div className="absolute inset-0" style={{ background: gradient }} />
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 78vw, 360px"
          className="object-cover opacity-80 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />

        <div className="relative flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/75">
            {index ? `${index} · ` : ""}
            {genre}
          </span>
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm">
            {platform}
          </span>
        </div>

        <div className="relative">
          <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-1 max-w-[24ch] text-sm text-text-secondary opacity-0 transition-all duration-400 group-hover:opacity-100">
            {tagline}
          </p>
          <span className="mt-4 inline-flex translate-y-1 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-accent-cyan opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
            Play now
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}
