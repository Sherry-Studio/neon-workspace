"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { segment } from "@/hooks/useScrollProgress";
import { T } from "./timeline";
import CRTScreen from "./CRTScreen";

export { SCREEN_WORLD } from "./cameraPath";

function makeMarquee() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 104px 'Space Grotesk', 'Arial Narrow', sans-serif";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#eafdff";
  ctx.fillText("NEON ARCADE", c.width / 2, c.height / 2 + 4);
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(34,211,238,0.65)";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, c.width - 40, c.height - 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BODY = "#101116";
const TRIM = "#08090c";

export default function ArcadeCabinet({
  progressRef,
  reduced = false,
}: {
  progressRef: MutableRefObject<number>;
  reduced?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const marqueeMat = useRef<THREE.MeshStandardMaterial>(null);
  const tubes = useRef<THREE.Group>(null);
  const btns = useRef<THREE.Group>(null);
  const marquee = useMemo(() => makeMarquee(), []);
  const t = useRef(0);

  useFrame((state, dt) => {
    t.current += dt;
    const p = reduced ? 0.45 : progressRef.current;
    const g = group.current;
    if (!g) return;

    // the room opens and the cabinet rises out of the floor
    const reveal = segment(p, T.cabinetStart, T.cabinetStart + 0.11);
    // 3/4 hero orbit, then square up for the push into the glass
    const orbit = segment(p, T.cabinetStart + 0.05, T.crtStart);
    const square = segment(p, T.crtStart, T.enterCrtStart + 0.03);

    g.visible = reduced || (p > T.cabinetStart - 0.03 && p < T.enterCrtEnd + 0.08);
    g.position.y = -2.1 - (1 - reveal) * 4.2;

    const yaw = -0.62 + orbit * 1.05 - square * 0.43;
    g.rotation.y = yaw + state.pointer.x * 0.045 * (1 - square);

    if (marqueeMat.current) marqueeMat.current.emissiveIntensity = reveal * 1.15;

    // neon tubes breathe
    if (tubes.current) {
      const b = 0.75 + Math.sin(t.current * 1.4) * 0.12;
      tubes.current.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = reveal * b;
      });
    }
    // buttons pulse gently in sequence
    if (btns.current) {
      btns.current.children.forEach((c, i) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = reveal * (0.45 + Math.max(0, Math.sin(t.current * 2.2 - i * 0.9)) * 0.85);
      });
    }
  });

  return (
    <group ref={group} position={[0, -2.1, 0]} rotation={[0, -0.62, 0]}>
      {/* ── body ── */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[2.2, 4, 1.5]} />
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.35} />
      </mesh>
      {/* angled top */}
      <mesh position={[0, 4.12, -0.12]}>
        <boxGeometry args={[2.2, 0.46, 1.26]} />
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.35} />
      </mesh>

      {/* ── marquee ── */}
      <mesh position={[0, 4.44, 0.36]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[2.06, 0.6, 0.1]} />
        <meshStandardMaterial
          ref={marqueeMat}
          map={marquee}
          emissiveMap={marquee}
          emissive="#ffffff"
          emissiveIntensity={0}
          roughness={0.35}
        />
      </mesh>

      {/* ── screen bezel + CRT ── */}
      <mesh position={[0, 2.95, 0.6]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[2.02, 1.86, 0.24]} />
        <meshStandardMaterial color={TRIM} roughness={0.42} metalness={0.4} />
      </mesh>
      <group position={[0, 2.95, 0.735]} rotation={[-0.1, 0, 0]}>
        <CRTScreen progressRef={progressRef} reduced={reduced} width={1.6} height={1.22} />
      </group>

      {/* ── control panel ── */}
      <mesh position={[0, 1.6, 0.94]} rotation={[-0.95, 0, 0]}>
        <boxGeometry args={[2.12, 0.92, 0.12]} />
        <meshStandardMaterial color="#16171d" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* joystick */}
      <group position={[-0.56, 1.5, 1.04]}>
        <mesh>
          <cylinderGeometry args={[0.115, 0.135, 0.1, 20]} />
          <meshStandardMaterial color="#202128" metalness={0.65} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.21, 0.02]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.042, 0.34, 12]} />
          <meshStandardMaterial color="#41434e" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.41, 0.06]}>
          <sphereGeometry args={[0.088, 24, 24]} />
          <meshStandardMaterial color="#e11d48" roughness={0.18} metalness={0.15} />
        </mesh>
      </group>

      {/* buttons */}
      <group ref={btns}>
        {([
          [0.06, "#22d3ee"],
          [0.33, "#a855f7"],
          [0.6, "#f0369c"],
        ] as [number, string][]).map(([x, c], i) => (
          <mesh key={i} position={[x, 1.52, 1.02]} rotation={[-0.95, 0, 0]}>
            <cylinderGeometry args={[0.088, 0.088, 0.055, 20]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* coin door */}
      <mesh position={[0, 0.6, 0.78]}>
        <boxGeometry args={[0.72, 0.5, 0.06]} />
        <meshStandardMaterial color="#08090c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.66, 0.83]}>
        <boxGeometry args={[0.055, 0.15, 0.03]} />
        <meshStandardMaterial color="#c8b06a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* ── neon tubes down both flanks ── */}
      <group ref={tubes}>
        {([
          [-1.055, "#22d3ee"],
          [1.055, "#a855f7"],
        ] as [number, string][]).map(([x, c], i) => (
          <mesh key={i} position={[x, 2.45, 0.45]}>
            <boxGeometry args={[0.028, 3.5, 0.028]} />
            <meshBasicMaterial color={c} transparent opacity={0} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.22, 0.76]}>
          <boxGeometry args={[1.9, 0.026, 0.026]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0} toneMapped={false} />
        </mesh>
      </group>

      {/* plinth */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[2.32, 0.18, 1.72]} />
        <meshStandardMaterial color="#050608" roughness={0.85} metalness={0.1} />
      </mesh>
    </group>
  );
}
