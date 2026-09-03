import type { Metadata } from "next";
import NeonVoidClient from "./NeonVoidClient";

export const metadata: Metadata = {
  title: "NEON ORBIT | Neon Arcade",
  description:
    "A cinematic 3D deep-space flight experience. Take the controls of a lone fighter and fly through an enormous sci-fi universe.",
  openGraph: {
    title: "NEON ORBIT | Neon Arcade",
    description:
      "A cinematic 3D deep-space flight experience. Take the controls and fly through an enormous sci-fi universe.",
  },
};

export const dynamic = "force-dynamic";

export default function NeonOrbitPage() {
  return <NeonVoidClient />;
}
