"use client";

import { MutableRefObject, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { range } from "@/hooks/useScrollProgress";
import { T } from "./timeline";
import { DIGITAL_ORIGIN as DIGITAL_ORIGIN_ARR, Z } from "./cameraPath";

/**
 * Everything past the CRT lives here, parked far from the physical set so the
 * two never light or occlude each other. The camera is cut here under the
 * screen-flash, then flies one continuous shot:
 *
 *   tunnel  →  NEON RUNNER city  →  SPACE SHOOTER  →  DRIFT RACER track
 *
 * Local z runs 0 → -210. See CameraController for the matching path.
 */
export const DIGITAL_ORIGIN = new THREE.Vector3(...DIGITAL_ORIGIN_ARR);
export { Z };

const CYAN = new THREE.Color("#22d3ee");
const VIOLET = new THREE.Color("#a855f7");

/* ─────────────────────────────── TUNNEL ─────────────────────────────── */
function Tunnel() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 46;

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const z = Z.tunnelIn - (i / COUNT) * (Z.tunnelIn - Z.tunnelOut);
      o.position.set(Math.sin(i * 0.34) * 0.5, Math.cos(i * 0.29) * 0.4, z);
      o.rotation.z = i * 0.22;
      const s = 1 + Math.sin(i * 0.5) * 0.09;
      o.scale.set(s, s, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, i % 3 === 0 ? VIOLET : CYAN);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <torusGeometry args={[3.1, 0.032, 6, 44]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.85} />
    </instancedMesh>
  );
}

/* ──────────────────────── WORLD 01 · NEON RUNNER ─────────────────────── */
function RunnerCity() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 120;

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const z = Z.cityIn - (row / (COUNT / 2)) * (Z.cityIn - Z.cityOut);
      const h = 6 + ((i * 37) % 11) * 3.1;
      const w = 2.6 + ((i * 13) % 5) * 0.7;
      o.position.set(side * (6.5 + ((i * 7) % 4) * 1.9), h / 2 - 3, z);
      o.scale.set(w, h, w);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, i % 5 === 0 ? CYAN : new THREE.Color("#0a1024"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  const zMid = (Z.cityIn + Z.cityOut) / 2;

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial emissive="#0b1230" emissiveIntensity={0.5} roughness={0.6} metalness={0.4} />
      </instancedMesh>

      {/* road + glowing lane edges */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, zMid]}>
        <planeGeometry args={[11, 60]} />
        <meshStandardMaterial color="#05060e" roughness={0.5} metalness={0.5} />
      </mesh>
      {[-4.4, 4.4].map((x, i) => (
        <mesh key={i} position={[x, -2.94, zMid]}>
          <boxGeometry args={[0.11, 0.02, 58]} />
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 3, zMid]} color="#22d3ee" intensity={140} distance={70} decay={2} />
      <pointLight position={[0, 1, Z.cityIn]} color="#f0369c" intensity={80} distance={44} decay={2} />
    </group>
  );
}

/* ─────────────────── WORLD 02 · NEON SPACE SHOOTER ──────────────────── */
function SpaceShooter() {
  const stars = useRef<THREE.Points>(null);
  const zMid = (Z.spaceIn + Z.spaceOut) / 2;

  const geo = useMemo(() => {
    const N = 900;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 90;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 2] = Z.spaceIn - Math.random() * (Z.spaceIn - Z.spaceOut);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame((s) => {
    if (stars.current) stars.current.rotation.z = s.clock.elapsedTime * 0.014;
  });

  return (
    <group>
      <points ref={stars} geometry={geo}>
        <pointsMaterial size={0.16} color="#cfe8ff" sizeAttenuation transparent opacity={0.9} depthWrite={false} />
      </points>

      {/* planet */}
      <mesh position={[16, 7, zMid - 12]}>
        <sphereGeometry args={[9, 40, 40]} />
        <meshStandardMaterial color="#2a1055" emissive="#5b21b6" emissiveIntensity={0.55} roughness={0.85} />
      </mesh>
      <mesh position={[16, 7, zMid - 12]} rotation={[1.35, 0.4, 0]}>
        <torusGeometry args={[13.5, 0.16, 8, 90]} />
        <meshBasicMaterial color="#a855f7" toneMapped={false} transparent opacity={0.65} />
      </mesh>

      {/* enemy silhouettes */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 1.9) * 13,
            Math.cos(i * 2.3) * 7,
            Z.spaceIn - 8 - i * 4.6,
          ]}
          rotation={[0, 0, Math.PI]}
        >
          <coneGeometry args={[0.85, 2.1, 4]} />
          <meshBasicMaterial color="#f0369c" wireframe toneMapped={false} />
        </mesh>
      ))}

      {/* laser trails */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 3.1) * 5, Math.cos(i * 1.4) * 3, zMid + 6 - i * 5]}>
          <boxGeometry args={[0.05, 0.05, 3.4]} />
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
      ))}

      <pointLight position={[0, 0, zMid]} color="#a855f7" intensity={160} distance={80} decay={2} />
    </group>
  );
}

/* ──────────────────── WORLD 03 · NEON DRIFT RACER ───────────────────── */
function DriftRacer() {
  const car = useRef<THREE.Group>(null);
  const zMid = (Z.trackIn + Z.trackOut) / 2;

  // a curving ribbon of track
  const { railL, railR } = useMemo(() => {
    const L: THREE.Vector3[] = [];
    const R: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const k = i / 60;
      const z = Z.trackIn - k * (Z.trackIn - Z.trackOut);
      const x = Math.sin(k * Math.PI * 1.6) * 9;
      L.push(new THREE.Vector3(x - 5, -3, z));
      R.push(new THREE.Vector3(x + 5, -3, z));
    }
    return {
      railL: new THREE.BufferGeometry().setFromPoints(L),
      railR: new THREE.BufferGeometry().setFromPoints(R),
    };
  }, []);

  useFrame((s) => {
    if (!car.current) return;
    const tt = s.clock.elapsedTime;
    // the car slides and counter-steers through the corner
    car.current.position.x = Math.sin(tt * 0.5) * 3.2;
    car.current.rotation.y = -Math.sin(tt * 0.5) * 0.5;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.02, zMid]}>
        <planeGeometry args={[40, 60]} />
        <meshStandardMaterial color="#07060f" roughness={0.4} metalness={0.6} />
      </mesh>

      <line>
        <primitive object={railL} attach="geometry" />
        <lineBasicMaterial color="#f0369c" toneMapped={false} />
      </line>
      <line>
        <primitive object={railR} attach="geometry" />
        <lineBasicMaterial color="#22d3ee" toneMapped={false} />
      </line>

      {/* light gates over the track */}
      {Array.from({ length: 11 }, (_, i) => {
        const k = i / 10;
        const z = Z.trackIn - k * (Z.trackIn - Z.trackOut);
        const x = Math.sin(k * Math.PI * 1.6) * 9;
        return (
          <mesh key={i} position={[x, 0.4, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[5.4, 0.05, 6, 40, Math.PI]} />
            <meshBasicMaterial
              color={i % 2 ? "#f0369c" : "#22d3ee"}
              toneMapped={false}
              transparent
              opacity={0.75}
            />
          </mesh>
        );
      })}

      {/* the car + its light trail */}
      <group ref={car} position={[0, -2.5, zMid - 6]}>
        <mesh>
          <boxGeometry args={[1.9, 0.5, 3.9]} />
          <meshStandardMaterial color="#e8ecff" emissive="#f0369c" emissiveIntensity={0.6} metalness={0.75} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.36, -0.3]}>
          <boxGeometry args={[1.5, 0.34, 1.9]} />
          <meshStandardMaterial color="#0b1020" emissive="#22d3ee" emissiveIntensity={0.55} metalness={0.6} roughness={0.2} />
        </mesh>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <mesh key={i} position={[0, -0.12, 2.4 + i * 1.5]}>
            <boxGeometry args={[1.7, 0.03, 1.2]} />
            <meshBasicMaterial color="#f0369c" transparent opacity={0.4 / i} toneMapped={false} />
          </mesh>
        ))}
        <pointLight color="#f0369c" intensity={40} distance={26} decay={2} />
      </group>

      <pointLight position={[0, 6, zMid]} color="#22d3ee" intensity={120} distance={70} decay={2} />
    </group>
  );
}

/* ─────────────────────────────── ROOT ───────────────────────────────── */
export default function DigitalWorlds({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  const root = useRef<THREE.Group>(null);
  const streaks = useRef<THREE.Points>(null);

  const streakGeo = useMemo(() => {
    const N = 500;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 3.1;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(a) * r;
      arr[i * 3 + 2] = Z.tunnelIn - Math.random() * (Z.tunnelIn - Z.tunnelOut);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    const p = progressRef.current;
    // only pay for this half of the journey once we're actually in it
    const active = p > T.enterCrtStart - 0.02;
    if (root.current) root.current.visible = active;
    if (!active) return;

    // particles rush past the camera through the tunnel
    const pos = streaks.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (pos) {
      const speed = 26 * (0.3 + range(p, T.enterCrtStart, T.tunnelEnd));
      for (let i = 0; i < pos.count; i++) {
        let z = pos.getZ(i) + speed * dt;
        if (z > Z.tunnelIn) z = Z.tunnelOut;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={root} position={DIGITAL_ORIGIN} visible={false}>
      <ambientLight intensity={0.16} />
      <Tunnel />
      <points ref={streaks} geometry={streakGeo}>
        <pointsMaterial
          size={0.07}
          color="#9beaff"
          sizeAttenuation
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <RunnerCity />
      <SpaceShooter />
      <DriftRacer />
    </group>
  );
}
