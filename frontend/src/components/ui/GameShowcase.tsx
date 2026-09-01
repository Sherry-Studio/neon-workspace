"use client";

import Image from "next/image";

interface GameShowcaseProps {
  title: string;
  genre: string;
  tagline: string;
  imageUrl?: string;
  index?: number;
}

const gradients = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #2d1b2e 50%, #1a0a2e 100%)",
  "linear-gradient(135deg, #0f1f0f 0%, #1a2e1a 50%, #0a1a0a 100%)",
  "linear-gradient(135deg, #1f1a0a 0%, #2e1f0f 50%, #1a0f0a 100%)",
];

export default function GameShowcase({
  title,
  genre,
  tagline,
  imageUrl,
  index = 0,
}: GameShowcaseProps) {
  const gradient = gradients[index % gradients.length];

  return (
    <div className="group relative w-full overflow-hidden cursor-pointer">
      {/* Image area */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {/* Gradient fallback (shows if the photo is missing) */}
        <div className="absolute inset-0" style={{ background: gradient }} />

        {/* Photo */}
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-300 group-hover:opacity-80" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          {/* Genre tag */}
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 mb-2">
            {genre}
          </span>

          {/* Title */}
          <h3 className="font-[family-name:var(--font-heading)] font-bold text-2xl md:text-4xl text-white tracking-tight transition-all duration-300">
            {title}
          </h3>

          {/* Tagline */}
          <p className="text-sm text-text-secondary mt-1 opacity-0 translate-y-2 transition-all duration-400 delay-75 group-hover:opacity-100 group-hover:translate-y-0">
            {tagline}
          </p>

          {/* Play CTA */}
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white mt-4 opacity-0 translate-y-2 transition-all duration-300 delay-100 group-hover:opacity-100 group-hover:translate-y-0">
            PLAY <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </span>
        </div>
      </div>
    </div>
  );
}
