"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import Avatar from "@/components/ui/Avatar";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { href: "/games", label: "GAMES" },
  { href: "/leaderboard", label: "LEADERBOARD" },
  { href: "/vault", label: "THE VAULT" },
  { href: "/#studio", label: "STUDIO" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    if (base === "/") return pathname === "/";
    return pathname === base || pathname.startsWith(base + "/");
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-[var(--gutter)]">
        <nav
          className={`pointer-events-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-full px-5 py-2.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-6 ${
            scrolled
              ? "glass-strong shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)]"
              : "border border-transparent bg-transparent"
          }`}
        >
          <Link
            href="/"
            className="font-[family-name:var(--font-heading)] text-sm font-bold uppercase tracking-[0.24em] text-text-primary"
          >
            NEON<span className="text-accent-cyan">ARCADE</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative text-[11px] font-medium uppercase tracking-[0.22em]"
                >
                  <span
                    className={`transition-colors duration-300 ${
                      active ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </span>
                  <span
                    className={`absolute -bottom-1.5 left-1/2 h-px -translate-x-1/2 bg-accent-cyan transition-all duration-300 ${
                      active ? "w-4" : "w-0 group-hover:w-4"
                    }`}
                  />
                </Link>
              );
            })}

            <ThemeToggle />

            {session ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-secondary transition-colors hover:text-text-primary"
                >
                  <Avatar avatarId={session.user?.avatar} size={24} />
                  {session.user?.name}
                </Link>
                <button
                  onClick={() => {
                    toast.success("Signed out.");
                    signOut({ callbackUrl: "/" });
                  }}
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-text-primary"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-text-primary transition-colors hover:border-accent-cyan/60 hover:bg-accent-cyan/[0.06]"
              >
                <LogIn size={13} />
                Login
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-strong fixed inset-0 z-40 flex flex-col items-center justify-center md:hidden"
          >
            <div className="flex flex-col items-center gap-9">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="font-[family-name:var(--font-heading)] text-3xl font-bold uppercase tracking-[0.12em] text-text-primary"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                {session ? (
                  <div className="flex flex-col items-center gap-5">
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-text-secondary"
                    >
                      <Avatar avatarId={session.user?.avatar} size={28} />
                      {session.user?.name}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="text-sm uppercase tracking-[0.2em] text-text-muted"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-text-primary"
                  >
                    <LogIn size={16} />
                    Login
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
