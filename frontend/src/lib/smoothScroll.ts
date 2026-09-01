import type Lenis from "lenis";

let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

/**
 * Scroll to an absolute Y. Goes through Lenis when it's running so the motion
 * matches the rest of the site, and falls back to native scrolling when it
 * isn't (reduced motion, or before Lenis has started).
 */
export function scrollToY(
  y: number,
  opts: { duration?: number; immediate?: boolean } = {}
) {
  const { duration = 1, immediate = false } = opts;
  if (instance) {
    instance.scrollTo(y, { duration, immediate });
    return;
  }
  window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
}
