import type { Metadata } from "next";
import HorseCityClient from "./HorseCityClient";

export const metadata: Metadata = {
  title: "HOOFBEAT | Neon Arcade",
  description:
    "A third-person horse-riding city exploration game. Explore a medieval city on foot, find your horse, mount up, and ride through the streets.",
  openGraph: {
    title: "HOOFBEAT | Neon Arcade",
    description:
      "Explore a medieval city on foot, find your horse, mount up, and ride through the streets.",
  },
};

export const dynamic = "force-dynamic";

export default function HorseCityPage() {
  return <HorseCityClient />;
}
