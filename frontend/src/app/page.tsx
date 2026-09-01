import Link from "next/link";
import Image from "next/image";
import CinematicHero from "@/components/site/CinematicHero";
import StudioSection from "@/components/site/StudioSection";
import GameCoverCard from "@/components/site/GameCoverCard";
import Reveal from "@/components/motion/Reveal";
import MagneticButton from "@/components/ui/MagneticButton";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import LiveCounter from "@/components/ui/LiveCounter";
import Timeline from "@/components/Timeline";
import { articles } from "@/lib/articles";

const discoverGames = [
  { index: "01", genre: "ACTION", title: "Cyber Runner", tagline: "Dash through neon-lit skylines.", gradient: "linear-gradient(135deg, #0f1027 0%, #16213e 55%, #0f3460 100%)", image: "/images/cyber-runner.jpg" },
  { index: "02", genre: "RACING", title: "Neon Drift", tagline: "Own every corner.", gradient: "linear-gradient(135deg, #241435 0%, #1a0a2e 55%, #16213e 100%)", image: "/images/neon-drift.jpg" },
  { index: "03", genre: "PUZZLE", title: "Grid Wars", tagline: "Outthink the grid.", gradient: "linear-gradient(135deg, #0b1b18 0%, #10241f 55%, #0a1a16 100%)", image: "/images/grid-wars.jpg" },
  { index: "04", genre: "STEALTH", title: "Shadow Protocol", tagline: "Move unseen.", gradient: "linear-gradient(135deg, #10182e 0%, #141428 55%, #0a0a14 100%)", image: "/images/shadow-protocol.jpg" },
  { index: "05", genre: "ARCADE", title: "Pixel Blaster", tagline: "Retro firepower, modern edge.", gradient: "linear-gradient(135deg, #221a0f 0%, #2a1c10 55%, #170f0a 100%)", image: "/images/pixel-blaster.jpg" },
];

export default function HomePage() {
  const vaultPreview = articles.slice(0, 2);

  return (
    <>
      <CinematicHero />

      <div className="relative z-10 bg-surface">
        {/* ── FEATURED ── */}
        <section className="px-[var(--gutter)] pb-24 pt-16 md:pb-32 md:pt-20">
          <Reveal className="mb-10 flex items-end justify-between">
            <span className="eyebrow">Featured Release</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">01 / 05</span>
          </Reveal>

          <Reveal delay={0.08}>
            <Link
              href="/games"
              className="group card-surface relative block aspect-[16/11] w-full overflow-hidden rounded-2xl md:aspect-[21/9]"
            >
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #0d0b1f 0%, #16213e 45%, #0f3460 100%)" }}
              />
              <Image
                src="/images/cyber-runner.jpg"
                alt="Cyber Runner"
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-95 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />

              <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
                <span className="mb-3 inline-flex w-fit items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-accent-cyan">
                  <span className="h-1 w-1 rounded-full bg-accent-cyan" />
                  Action · Endless Runner · Browser
                </span>
                <h2 className="display text-5xl text-white sm:text-7xl md:text-8xl">CYBER RUNNER</h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
                  Dash through neon-lit cityscapes in the endless runner that defined a
                  generation of browser play.
                </p>
                <span className="mt-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white">
                  Play now
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          </Reveal>
        </section>

        {/* ── DISCOVER RAIL ── */}
        <section className="py-24 md:py-36">
          <Reveal className="mb-12 px-[var(--gutter)]">
            <span className="eyebrow">The Showcase</span>
            <h2 className="display mt-4 text-4xl text-white md:text-6xl">DISCOVER</h2>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              Five worlds. One tab. Drag to explore the lineup.
            </p>
          </Reveal>

          <div className="px-[var(--gutter)]">
            <HorizontalScroll>
              {discoverGames.map((game) => (
                <div key={game.title} className="w-[78vw] shrink-0 snap-start sm:w-[340px]">
                  <GameCoverCard {...game} />
                </div>
              ))}
            </HorizontalScroll>
          </div>
        </section>

        {/* ── PLAYING NOW ── */}
        <section className="border-y border-border/60 px-[var(--gutter)] py-24 md:py-32">
          <Reveal className="mb-16 text-center">
            <span className="eyebrow">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent-green align-middle shadow-[0_0_10px_#a3e635]" />
              Playing Now
            </span>
          </Reveal>
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            <LiveCounter value={12842} label="Players Online" />
            <LiveCounter value={48920} label="Games Today" />
            <LiveCounter value={312} label="Live Matches" />
          </div>
        </section>

        {/* ── EVOLUTION / TIMELINE ── */}
        <section className="px-[var(--gutter)] py-24 md:py-36">
          <Reveal className="mb-16 text-center">
            <span className="eyebrow">Game History</span>
            <h2 className="display mx-auto mt-4 max-w-2xl text-4xl text-white md:text-6xl">
              THE EVOLUTION OF PLAY
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-text-secondary">
              Half a century of games, distilled into seven moments.
            </p>
          </Reveal>
          <Timeline />
        </section>
      </div>

      {/* ── STUDIO ── (own opaque backdrop) */}
      <StudioSection />

      {/* ── THE VAULT PREVIEW + CTA + FOOTER ── */}
      <div className="relative z-10 bg-surface">
        <section className="px-[var(--gutter)] py-24 md:py-36">
          <Reveal className="mb-12 flex items-end justify-between">
            <div>
              <span className="eyebrow">Editorial</span>
              <h2 className="display mt-4 text-4xl text-white md:text-6xl">THE VAULT</h2>
            </div>
            <Link
              href="/vault"
              className="group hidden items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-text-secondary transition-colors hover:text-white sm:inline-flex"
            >
              All stories
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            {vaultPreview.map((article, i) => (
              <Reveal key={article.slug} delay={0.08 + i * 0.08}>
                <Link
                  href={`/vault/${article.slug}`}
                  className="group card-surface relative block overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <div className="absolute inset-0" style={{ background: article.heroGradient }} />
                    <Image
                      src={article.heroImage}
                      alt={article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover opacity-85 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <span className="mb-2 inline-block text-[10px] font-medium tracking-[0.25em] text-accent-cyan">
                      {article.category}
                    </span>
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-white md:text-2xl">
                      {article.title}
                    </h3>
                    <span className="mt-3 inline-block text-xs tracking-widest text-text-muted">
                      {article.readTime}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden border-t border-border/60 px-[var(--gutter)] py-32 text-center md:py-44">
          <div className="grid-floor pointer-events-none absolute inset-0 opacity-30" />
          <Reveal className="relative mx-auto max-w-3xl">
            <h2 className="display text-5xl text-white sm:text-7xl">
              READY TO <span className="text-gradient-cyan text-glow-cyan">PLAY BEYOND?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-sm text-text-secondary md:text-base">
              No downloads. No launchers. Just a link and a world waiting on the other side.
            </p>
            <div className="mt-12 flex justify-center">
              <MagneticButton>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-3 bg-white px-12 py-5 text-xs font-medium uppercase tracking-[0.2em] text-black transition-colors duration-300 hover:bg-accent-cyan"
                >
                  Create your profile
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </MagneticButton>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        <footer className="relative border-t border-border">
          <div className="hairline-cyan absolute inset-x-0 top-0 h-px" />
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-[var(--gutter)] py-12 sm:flex-row">
            <span className="font-[family-name:var(--font-heading)] text-lg font-bold uppercase tracking-[0.15em] text-white">
              NEON<span className="text-accent-cyan">ARCADE</span>
            </span>
            <nav className="flex items-center gap-8 text-[11px] font-medium uppercase tracking-[0.2em] text-text-secondary">
              <Link href="/games" className="transition-colors hover:text-white">Games</Link>
              <Link href="/vault" className="transition-colors hover:text-white">The Vault</Link>
              <Link href="/#studio" className="transition-colors hover:text-white">Studio</Link>
              <Link href="/login" className="transition-colors hover:text-white">Sign In</Link>
            </nav>
            <p className="text-xs text-text-muted">&copy; 2026 NeonArcade</p>
          </div>
        </footer>
      </div>
    </>
  );
}
