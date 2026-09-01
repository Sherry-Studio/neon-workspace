import type { Metadata } from "next";
import NeonVoidClient from "./NeonVoidClient";

export const metadata: Metadata = {
  title: "Neon Void — Last Orbit | Neon Arcade",
  description:
    "A fast-paced 3D space combat arcade game. Pilot the Phantom, destroy the Rift fleet and defeat the Rift Core.",
  openGraph: {
    title: "Neon Void — Last Orbit | Neon Arcade",
    description:
      "A fast-paced 3D space combat arcade game. Pilot the Phantom, destroy the Rift fleet and defeat the Rift Core.",
  },
};

export const dynamic = "force-dynamic";

export default function NeonVoidPage() {
  return <NeonVoidClient />;
}
