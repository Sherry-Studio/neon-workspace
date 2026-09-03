"use client";

/** One hard key light (a distant star), a cold fill, almost no ambient.
 *  Lit side bright, unlit side deep — the ship reads as three-dimensional. */
export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.06} color="#2b3450" />
      <directionalLight position={[1400, 650, 1100]} intensity={3.1} color="#fff2df" />
      <directionalLight position={[-1200, -400, -800]} intensity={0.32} color="#3d5f9e" />
    </>
  );
}
