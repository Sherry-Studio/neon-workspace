import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { articles } from "@/lib/articles";

export const metadata = {
  title: "The Vault — NeonArcade Editorial",
  description:
    "Premium stories exploring gaming culture, history, and the art of play.",
};

export default function VaultPage() {
  const [heroArticle, ...moreArticles] = articles;
  const [featured, ...sideArticles] = moreArticles;

  return (
    <div className="relative z-10 bg-surface/[0.95]">
      {/* ── Hero Article ── */}
      <section className="relative h-[82vh] min-h-[560px] overflow-hidden">
        {/* Gradient background (fallback) */}
        <div
          className="absolute inset-0"
          style={{ background: heroArticle.heroGradient }}
        />

        {/* Photo */}
        <Image
          src={heroArticle.heroImage}
          alt={heroArticle.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* Dark overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-end p-12 lg:p-20">
          <ScrollReveal>
            <span className="mb-4 inline-block text-xs font-medium tracking-[0.25em] text-accent-blue">
              {heroArticle.category}
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1 className="max-w-3xl font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.05] tracking-tight text-white lg:text-6xl">
              {heroArticle.title}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary lg:text-lg">
              {heroArticle.excerpt}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="mt-8 flex items-center gap-6">
              <Link
                href={`/vault/${heroArticle.slug}`}
                className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-white"
              >
                Read Story
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <span className="text-xs tracking-widest text-text-muted">
                {heroArticle.readTime}
                <span className="mx-2 text-border">·</span>
                {heroArticle.publishDate}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── More Stories ── */}
      <section className="px-12 py-24 lg:px-20 lg:py-32">
        <ScrollReveal>
          <span className="text-xs font-medium tracking-[0.25em] text-text-muted">
            MORE STORIES
          </span>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Featured large article */}
          <ScrollReveal delay={0.1} className="lg:col-span-2">
            <Link
              href={`/vault/${featured.slug}`}
              className="group relative block overflow-hidden border border-border transition-colors duration-300 hover:border-white/10"
            >
              <div
                className="aspect-[21/9] w-full"
                style={{ background: featured.heroGradient }}
              />
              <Image
                src={featured.heroImage}
                alt={featured.title}
                fill
                sizes="100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12">
                <span className="mb-3 inline-block text-[10px] font-medium tracking-[0.25em] text-accent-blue">
                  {featured.category}
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-white lg:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-secondary">
                  {featured.excerpt}
                </p>
                <span className="mt-4 inline-block text-xs tracking-widest text-text-muted">
                  {featured.readTime}
                </span>
              </div>
            </Link>
          </ScrollReveal>

          {/* Side-by-side smaller cards */}
          {sideArticles.map((article, i) => (
            <ScrollReveal key={article.slug} delay={0.15 + i * 0.1}>
              <Link
                href={`/vault/${article.slug}`}
                className="group relative block h-full overflow-hidden border border-border transition-colors duration-300 hover:border-white/10"
              >
                <div
                  className="aspect-[4/3] w-full"
                  style={{ background: article.heroGradient }}
                />
                <Image
                  src={article.heroImage}
                  alt={article.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
                  <span className="mb-2 inline-block text-[10px] font-medium tracking-[0.25em] text-accent-blue">
                    {article.category}
                  </span>
                  <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-white lg:text-2xl">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-2">
                    {article.excerpt}
                  </p>
                  <span className="mt-3 inline-block text-xs tracking-widest text-text-muted">
                    {article.readTime}
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <ScrollReveal className="border-t border-border px-12 py-20 text-center lg:px-20">
        <Link
          href="/games"
          className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary transition-colors duration-300 hover:text-white"
        >
          Explore all stories
        </Link>
      </ScrollReveal>
    </div>
  );
}
