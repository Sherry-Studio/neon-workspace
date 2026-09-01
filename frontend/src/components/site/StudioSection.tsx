import Reveal from "@/components/motion/Reveal";

const pillars = [
  { k: "01", t: "Browser-native", d: "Every title ships as a URL. WebGL, WebGPU and WebAssembly do the work a launcher used to." },
  { k: "02", t: "Cinematic by default", d: "We treat a loading screen like an opening shot. Lighting, pacing and sound are not afterthoughts." },
  { k: "03", t: "Built to be shared", d: "Drop a link in a chat and your friend is playing in three seconds. That is the whole pitch." },
];

export default function StudioSection() {
  return (
    <section
      id="studio"
      className="relative scroll-mt-24 border-y border-border/60 bg-surface/[0.94] px-[var(--gutter)] py-28 md:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="eyebrow">The Studio</span>
        </Reveal>

        <Reveal delay={0.05}>
          <p className="mt-8 max-w-4xl font-[family-name:var(--font-heading)] text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-6xl">
            We are a small team building the games we wish the web already had —{" "}
            <span className="text-gradient-cyan">fast, strange, and beautiful.</span>
          </p>
        </Reveal>

        <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {pillars.map((p, i) => (
            <Reveal key={p.k} delay={i * 0.08}>
              <div className="h-full bg-surface-card p-8 md:p-10">
                <span className="font-[family-name:var(--font-heading)] text-sm text-accent-cyan">
                  {p.k}
                </span>
                <h3 className="mt-4 font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-white">
                  {p.t}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-wrap items-baseline gap-x-14 gap-y-6">
            {[
              ["7", "titles shipped"],
              ["4.2M", "browser sessions"],
              ["0", "downloads required"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-white md:text-5xl">
                  {n}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-text-muted">{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
