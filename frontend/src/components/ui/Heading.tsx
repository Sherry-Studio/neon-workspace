import { ReactNode, createElement } from "react";

interface HeadingProps {
  level?: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}

const sizeStyles = {
  1: "text-6xl md:text-8xl lg:text-9xl",
  2: "text-4xl md:text-6xl",
  3: "text-2xl md:text-3xl",
  4: "text-xl",
};

export default function Heading({ level = 1, children, className = "" }: HeadingProps) {
  const tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  
  return createElement(
    tag,
    {
      className: `font-[family-name:var(--font-heading)] font-bold tracking-tight text-white ${sizeStyles[level]} ${className}`,
    },
    children
  );
}
