"use client";

import { useEffect, useRef, useState } from "react";

interface LiveCounterProps {
  value: number;
  label: string;
}

export default function LiveCounter({ value, label }: LiveCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1800;
          const startTime = performance.now();

          function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(eased * value));
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          }
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl font-bold text-white font-[family-name:var(--font-heading)] tracking-tight">
        {displayValue.toLocaleString()}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted mt-2">
        {label}
      </div>
    </div>
  );
}
