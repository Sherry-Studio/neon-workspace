"use client";

import { ReactNode } from "react";

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
}

export default function HorizontalScroll({ children, className = "" }: HorizontalScrollProps) {
  return (
    <div className="relative">
      <div
        className={`flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 ${className}`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>
      {/* Minimal scroll indicator */}
      <div className="flex justify-center mt-4">
        <div className="w-8 h-px bg-border" />
      </div>
    </div>
  );
}
