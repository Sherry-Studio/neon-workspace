import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl font-black text-cyan-soft">404</p>
      <p className="text-sm text-slate-500">This screen doesn&apos;t exist.</p>
      <Link
        href="/dashboard"
        className="rounded-lg border border-line px-4 py-2 text-sm text-slate-300 hover:border-line-strong"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
