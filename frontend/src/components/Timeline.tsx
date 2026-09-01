"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";

interface Era {
  year: string;
  title: string;
  desc: string;
  accent: string;
}

const ERAS: Era[] = [
  { year: "1970", title: "ARCADE DAWN", desc: "Coin-op cabinets turn quarters into culture. Pong and Space Invaders define play.", accent: "#2563eb" },
  { year: "1983", title: "THE CONSOLE ERA", desc: "Gaming moves home. Cartridges, controllers, and living-room legends are born.", accent: "#7c3aed" },
  { year: "1995", title: "THE 3D LEAP", desc: "Polygons replace pixels. Worlds gain depth, speed, and cinematic scale.", accent: "#84cc16" },
  { year: "2000", title: "ONLINE WORLDS", desc: "Broadband links players across continents into shared, living arenas.", accent: "#2563eb" },
  { year: "2010", title: "MOBILE EVERYWHERE", desc: "A console in every pocket. Play becomes ambient, instant, universal.", accent: "#7c3aed" },
  { year: "2020", title: "THE CLOUD", desc: "Hardware dissolves into the network. Stream anything, anywhere.", accent: "#84cc16" },
  { year: "2026", title: "BROWSER + AI", desc: "No downloads. No limits. Intelligent worlds that render in a single tab.", accent: "#2563eb" },
];

export default function Timeline() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Vertical spine */}
      <div className="absolute bottom-0 left-[7px] top-0 w-px bg-border md:left-1/2 md:-translate-x-1/2" />

      <div className="space-y-10 md:space-y-0">
        {ERAS.map((era, i) => {
          const rightSide = i % 2 === 1;
          return (
            <ScrollReveal key={era.year} delay={i * 0.04}>
              <div className="relative md:grid md:grid-cols-2 md:gap-16">
                {/* Node dot */}
                <span
                  className="absolute left-0 top-1.5 z-10 block h-4 w-4 -translate-x-1/2 translate-x-[7px] rounded-full border-2 md:left-1/2 md:-translate-x-1/2"
                  style={{ borderColor: era.accent, background: "#09090b", boxShadow: `0 0 0 4px #09090b` }}
                />

                {/* Content */}
                <div
                  className={`pl-8 md:pl-0 ${
                    rightSide
                      ? "md:col-start-2 md:pl-16 md:text-left"
                      : "md:col-start-1 md:pr-16 md:text-right"
                  } ${i > 0 ? "pt-2 md:pt-0 md:pb-16" : "md:pb-16"}`}
                >
                  <span
                    className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight md:text-5xl"
                    style={{ color: era.accent }}
                  >
                    {era.year}
                  </span>
                  <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-bold uppercase tracking-[0.15em] text-white">
                    {era.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary md:ml-auto md:max-w-sm">
                    {era.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
