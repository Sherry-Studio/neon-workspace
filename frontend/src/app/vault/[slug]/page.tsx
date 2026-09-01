import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { articles, getArticleBySlug } from "@/lib/articles";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} — The Vault`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const otherArticles = articles.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <div className="relative z-10 bg-surface/[0.97]">
      {/* ── Back link ── */}
      <div className="px-12 pt-28 lg:px-20">
        <Link
          href="/vault"
          className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-text-muted transition-colors duration-300 hover:text-white"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          The Vault
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: article.heroGradient }}
        />
        <Image
          src={article.heroImage}
          alt={article.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />

        <div className="relative z-10 w-full px-12 pb-16 pt-24 lg:px-20 lg:pb-20">
          <ScrollReveal>
            <span className="mb-4 inline-block text-xs font-medium tracking-[0.25em] text-accent-blue">
              {article.category}
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1 className="max-w-4xl font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.05] tracking-tight text-white lg:text-6xl">
              {article.title}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tracking-widest text-text-muted">
              <span>{article.author}</span>
              <span className="text-border">·</span>
              <span>{article.readTime}</span>
              <span className="text-border">·</span>
              <span>{article.publishDate}</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Article Body ── */}
      <article className="mx-auto max-w-3xl px-8 py-20 lg:px-12 lg:py-28">
        <div className="space-y-8">
          {article.content.map((paragraph, i) => (
            <ScrollReveal key={i} delay={Math.min(i * 0.05, 0.3)}>
              <p className="text-lg leading-relaxed text-text-secondary lg:text-xl">
                {paragraph}
              </p>

              {/* Insert pull quote after second paragraph */}
              {i === 1 && article.pullQuote && (
                <blockquote className="my-16 border-l-2 border-accent-blue pl-6">
                  <p className="font-[family-name:var(--font-heading)] text-2xl font-medium italic leading-snug tracking-tight text-white lg:text-3xl">
                    &ldquo;{article.pullQuote}&rdquo;
                  </p>
                </blockquote>
              )}
            </ScrollReveal>
          ))}
        </div>

        {/* ── Related Games ── */}
        <ScrollReveal className="mt-24 border-t border-border pt-16">
          <span className="text-xs font-medium tracking-[0.25em] text-text-muted">
            PLAY THE EVOLUTION
          </span>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {article.relatedGames.map((game) => (
              <Link
                key={game}
                href="/games"
                className="group flex items-center justify-between border border-border p-6 transition-colors duration-300 hover:border-white/10"
              >
                <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-white">
                  {game}
                </span>
                <span className="text-sm font-medium uppercase tracking-wide text-text-muted transition-colors duration-300 group-hover:text-white">
                  Play →
                </span>
              </Link>
            ))}
          </div>
        </ScrollReveal>
      </article>

      {/* ── More from The Vault ── */}
      <section className="border-t border-border px-12 py-24 lg:px-20">
        <ScrollReveal>
          <span className="text-xs font-medium tracking-[0.25em] text-text-muted">
            MORE FROM THE VAULT
          </span>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {otherArticles.map((other, i) => (
            <ScrollReveal key={other.slug} delay={0.1 + i * 0.1}>
              <Link
                href={`/vault/${other.slug}`}
                className="group relative block overflow-hidden border border-border transition-colors duration-300 hover:border-white/10"
              >
                <div
                  className="aspect-[3/2] w-full"
                  style={{ background: other.heroGradient }}
                />
                <Image
                  src={other.heroImage}
                  alt={other.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="mb-2 inline-block text-[10px] font-medium tracking-[0.25em] text-accent-blue">
                    {other.category}
                  </span>
                  <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-white">
                    {other.title}
                  </h3>
                  <span className="mt-2 inline-block text-xs tracking-widest text-text-muted">
                    {other.readTime}
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
