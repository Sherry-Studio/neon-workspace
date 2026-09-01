"use client";

import { PageHeader } from "@/components/ui/misc";
import { GameForm } from "@/components/forms/game-form";

export default function NewGamePage() {
  return (
    <>
      <PageHeader title="Add new game" description="Create a catalogue entry. Publish it when it's ready to go live." />
      <GameForm />
    </>
  );
}
