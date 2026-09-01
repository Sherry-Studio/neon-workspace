"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { GameEngine } from "../game/engine";
import { ARENA } from "../game/engine";
import { ENVIRONMENTS } from "../data/environments";
import type { Settings, EnvKey } from "../game/types";

/* -------------------------------------------------- simulation + camera */
function Simulation({
  engine,
  settings,
  running,
}: {
  engine: GameEngine;
  settings: Settings;
  running: () => boolean;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 6, 42));
  const camLook = useRef(new THREE.Vector3());
  const shakeSeed = useRef(Math.random() * 100);

  useFrame((_, deltaRaw) => {
    const delta = Math.min(0.05, deltaRaw);
    if (running()) engine.tick(delta, 1 / Math.max(0.0001, deltaRaw));

    const p = engine.world.player;
    const boost = p.boostRamp;
    // chase camera behind aim direction
    const behind = new THREE.Vector3(
      -Math.sin(p.aimYaw),
      0.32 - p.aimPitch * 0.3,
      -Math.cos(p.aimYaw),
    ).normalize();
    const dist = 13 + boost * 4;
    const target = p.pos.clone().addScaledVector(behind, dist).add(new THREE.Vector3(0, 3.4, 0));
    target.x += p.strafeTilt * -6;
    camPos.current.lerp(target, 1 - Math.pow(0.0009, delta));

    // shake
    const sh = engine.world.camShake * settings.cameraShake;
    const pn = engine.world.camPunch;
    const t = performance.now() / 1000 + shakeSeed.current;
    const off = new THREE.Vector3(
      (Math.sin(t * 47) + Math.sin(t * 13)) * 0.5,
      (Math.sin(t * 31) + Math.sin(t * 7)) * 0.5,
      0,
    ).multiplyScalar(sh * 1.6 + pn * 0.8);

    camera.position.copy(camPos.current).add(off);
    const lookTarget = p.pos.clone().addScaledVector(
      new THREE.Vector3(Math.sin(p.aimYaw), Math.sin(p.aimPitch), Math.cos(p.aimYaw)),
      10,
    );
    camLook.current.lerp(lookTarget, 1 - Math.pow(0.002, delta));
    camera.lookAt(camLook.current);

    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = 62 + boost * 16 + engine.world.camPunch * 4;
    cam.fov += (targetFov - cam.fov) * (1 - Math.pow(0.02, delta));
    cam.updateProjectionMatrix();
  });

  return null;
}

/* -------------------------------------------------- player ship */
function Phantom({ engine }: { engine: GameEngine }) {
  const g = useRef<THREE.Group>(null);
  const engGlow = useRef<THREE.PointLight>(null);
  const dmgMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const p = engine.world.player;
    if (!g.current) return;
    g.current.position.copy(p.pos);
    g.current.quaternion.copy(p.quat);
    g.current.visible = p.alive;
    const glow = 1.4 + p.boostRamp * 4 + (engine.keys.has("w") ? 1 : 0);
    if (engGlow.current) engGlow.current.intensity = glow;
    if (dmgMat.current) {
      dmgMat.current.emissiveIntensity = 0.4 + Math.max(0, p.damageT) * 4 + (p.hull < p.hullMax * 0.25 ? (Math.sin(performance.now() / 80) + 1) * 0.6 : 0);
    }
  });

  return (
    <group ref={g}>
      {/* hull */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.7, 2.6, 6]} />
        <meshStandardMaterial ref={dmgMat} color="#0b1220" metalness={0.7} roughness={0.3} emissive="#22d3ee" emissiveIntensity={0.4} />
      </mesh>
      {/* wings */}
      <mesh position={[0, -0.1, 0.2]}>
        <boxGeometry args={[3.2, 0.14, 1]} />
        <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.4} emissive="#0e7490" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 0.55]}>
        <boxGeometry args={[0.5, 0.5, 0.6]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>
      {/* engines */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0, 1.5]}>
          <sphereGeometry args={[0.34, 10, 10]} />
          <meshBasicMaterial color="#67e8f9" />
        </mesh>
      ))}
      <pointLight ref={engGlow} position={[0, 0, 2]} color="#22d3ee" intensity={2} distance={16} />
    </group>
  );
}

/* -------------------------------------------------- enemies (mesh pool) */
const ENEMY_POOL = 56;
function Enemies({ engine }: { engine: GameEngine }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame(() => {
    const list = engine.world.enemies;
    for (let i = 0; i < ENEMY_POOL; i++) {
      const gr = groups.current[i];
      if (!gr) continue;
      const e = list[i];
      if (!e || !e.alive) {
        gr.visible = false;
        continue;
      }
      gr.visible = true;
      gr.position.copy(e.pos);
      gr.lookAt(engine.world.player.pos);
      const s = e.radius * (0.4 + 0.6 * e.spawnT);
      gr.scale.setScalar(s);
      gr.rotation.z += 0.02;
      const m = mats.current[i];
      if (m) {
        m.color.set(e.colour);
        m.emissive.set(e.disabledT > 0 ? "#8b5cf6" : e.colour);
        m.emissiveIntensity = 0.6 + e.hitFlash * 3 + (e.charging ? (Math.sin(performance.now() / 40) + 1) * 1.5 : 0);
      }
    }
  });

  return (
    <>
      {Array.from({ length: ENEMY_POOL }).map((_, i) => (
        <group key={i} ref={(r) => { groups.current[i] = r; }} visible={false}>
          <mesh>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              ref={(r) => { mats.current[i] = r; }}
              color="#7dd3fc"
              emissive="#7dd3fc"
              emissiveIntensity={0.8}
              metalness={0.4}
              roughness={0.4}
            />
          </mesh>
          <mesh scale={1.25}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#000" wireframe transparent opacity={0.25} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------- instanced bullets */
function BulletLayer({
  get,
  colour,
  size,
  max,
}: {
  get: () => { active: boolean; pos: THREE.Vector3; vel: THREE.Vector3; radius: number; colour: string }[];
  colour: string;
  size: number;
  max: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colObj = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const list = get();
    let n = 0;
    for (let i = 0; i < list.length && n < max; i++) {
      const b = list[i];
      if (!b.active) continue;
      dummy.position.copy(b.pos);
      const len = 1 + b.vel.length() * 0.012;
      dummy.scale.set(b.radius * size, b.radius * size, b.radius * size * len);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.vel.clone().normalize());
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);
      im.setColorAt(n, colObj.set(b.colour || colour));
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, max]} frustumCulled={false}>
      <capsuleGeometry args={[0.5, 1.4, 3, 6]} />
      <meshBasicMaterial color={colour} toneMapped={false} />
    </instancedMesh>
  );
}

/* -------------------------------------------------- missiles */
function Missiles({ engine }: { engine: GameEngine }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    let n = 0;
    for (const m of engine.world.missiles) {
      if (!m.active) continue;
      dummy.position.copy(m.pos);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), m.vel.clone().normalize());
      dummy.scale.set(0.5, 0.5, 1.4);
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 24]} frustumCulled={false}>
      <coneGeometry args={[0.5, 1.6, 6]} />
      <meshBasicMaterial color="#f472b6" toneMapped={false} />
    </instancedMesh>
  );
}

/* -------------------------------------------------- FX (instanced additive) */
function FxLayer({ engine }: { engine: GameEngine }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    let n = 0;
    for (const f of engine.world.fx) {
      if (!f.active) continue;
      const k = 1 - f.life / f.maxLife;
      const grow = f.kind === "explosion" || f.kind === "big" || f.kind === "emp" ? 1 + k * 2 : 1 + k * 0.4;
      dummy.position.copy(f.pos);
      dummy.scale.setScalar(Math.max(0.001, f.scale * grow * (1 - k * 0.2)));
      dummy.rotation.set(k * 4, k * 3, 0);
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);
      col.set(f.colour);
      col.multiplyScalar(Math.max(0.05, 1 - k));
      im.setColorAt(n, col);
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 200]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

/* -------------------------------------------------- pickups */
function Pickups({ engine }: { engine: GameEngine }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const colours: Record<string, string> = {
    energy: "#22d3ee", shield: "#38bdf8", hull: "#a3e635", credits: "#fbbf24", combo: "#f472b6", missile: "#f472b6",
  };
  useFrame(() => {
    engine.world.pickups.forEach((pk, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.visible = pk.active;
      if (!pk.active) return;
      m.position.copy(pk.pos);
      m.rotation.y += 0.05;
      m.rotation.x += 0.03;
      (m.material as THREE.MeshBasicMaterial).color.set(colours[pk.kind] || "#fff");
    });
  });
  return (
    <>
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={i} ref={(r) => { refs.current[i] = r; }} visible={false}>
          <octahedronGeometry args={[0.7, 0]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/* -------------------------------------------------- asteroids */
function Asteroids({ engine }: { engine: GameEngine }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const max = 90;
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const list = engine.world.asteroids;
    let n = 0;
    for (let i = 0; i < list.length && n < max; i++) {
      const a = list[i];
      dummy.position.copy(a.pos);
      dummy.rotation.copy(a.rot);
      dummy.scale.setScalar(a.radius);
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, max]} frustumCulled={false} castShadow={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#2a2f3a" roughness={1} metalness={0.1} flatShading />
    </instancedMesh>
  );
}

/* -------------------------------------------------- boss */
function BossView({ engine }: { engine: GameEngine }) {
  const root = useRef<THREE.Group>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const gens = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const b = engine.world.boss;
    if (!root.current) return;
    if (!b || b.dead) {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;
    root.current.position.copy(b.pos);
    if (b.id !== "rift-core") root.current.quaternion.copy(b.quat);
    else root.current.rotation.y += 0.006;
    if (coreMat.current) {
      coreMat.current.emissiveIntensity =
        (b.invulnerable ? 0.4 : 1.6) + b.hitFlash * 3 + (b.phase === 3 ? 1 : 0);
      coreMat.current.color.set(
        b.id === "void-reaper" ? "#c084fc" : b.id === "rift-guardian" ? "#22d3ee" : "#e879f9",
      );
      coreMat.current.emissive.copy(coreMat.current.color);
    }
    const parts = [...b.generators, ...b.nodes];
    parts.forEach((g, i) => {
      const m = gens.current[i];
      if (!m) return;
      m.visible = g.alive;
      if (!g.alive) return;
      m.position.copy(g.pos).sub(b.id === "rift-core" ? new THREE.Vector3() : b.pos);
      m.rotation.y += 0.06;
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + (1 - g.hull / g.hullMax) * 2;
    });
  });
  const b = engine.world.boss;
  return (
    <group ref={root} visible={false}>
      <mesh>
        <icosahedronGeometry args={[b?.id === "rift-core" ? 9 : 6, 1]} />
        <meshStandardMaterial ref={coreMat} color="#c084fc" emissive="#c084fc" emissiveIntensity={1.4} metalness={0.4} roughness={0.3} flatShading />
      </mesh>
      <mesh scale={b?.id === "rift-core" ? 12 : 8}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#000" wireframe transparent opacity={0.2} />
      </mesh>
      <pointLight color="#c084fc" intensity={8} distance={40} />
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} ref={(r) => { gens.current[i] = r; }} visible={false}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#f0abfc" emissive="#f0abfc" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------- environment */
function Starfield({ env, quality }: { env: EnvKey; quality: Settings["quality"] }) {
  const def = ENVIRONMENTS[env];
  const count = quality === "low" ? 900 : quality === "medium" ? 1800 : 3200;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 260 + Math.random() * 340;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  return (
    <>
      <points geometry={geo}>
        <pointsMaterial size={1.4} color={def.starTint} sizeAttenuation transparent opacity={0.9} />
      </points>
      {/* nebula slabs */}
      <mesh position={[-120, 40, -220]} rotation={[0.3, 0.6, 0]}>
        <planeGeometry args={[420, 300]} />
        <meshBasicMaterial color={def.nebulaA} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[160, -30, -260]} rotation={[-0.2, -0.5, 0.3]}>
        <planeGeometry args={[520, 360]} />
        <meshBasicMaterial color={def.nebulaB} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

function ArenaBounds() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -16, 0]}>
      <ringGeometry args={[ARENA - 2, ARENA + 2, 64]} />
      <meshBasicMaterial color="#1e3a8a" transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* -------------------------------------------------- exported game world
   (rendered INSIDE the single persistent <Canvas> — no Canvas here) */
export function GameWorld({
  engine,
  settings,
  env,
  running,
}: {
  engine: GameEngine;
  settings: Settings;
  env: EnvKey;
  running: () => boolean;
}) {
  const def = ENVIRONMENTS[env];
  const q = settings.quality;
  const { scene } = useThree();
  // drive the environment colour/fog imperatively so it can differ from the menu
  const applied = useRef<EnvKey | null>(null);
  useFrame(() => {
    if (applied.current !== env) {
      applied.current = env;
      scene.background = new THREE.Color(def.fog);
      scene.fog = new THREE.Fog(def.fog, 90, 420);
    }
  });
  return (
    <>
      <ambientLight intensity={def.ambient} />
      <directionalLight position={[40, 60, 20]} intensity={0.6} color="#bcd4ff" />
      <pointLight position={[0, 30, 0]} intensity={0.5} color={def.nebulaB} distance={200} />

      <Simulation engine={engine} settings={settings} running={running} />
      <Starfield env={env} quality={q} />
      <ArenaBounds />
      <Asteroids engine={engine} />
      <Phantom engine={engine} />
      <Enemies engine={engine} />
      <BossView engine={engine} />
      <Pickups engine={engine} />
      <BulletLayer get={() => engine.world.pBullets} colour="#22d3ee" size={0.9} max={160} />
      <BulletLayer get={() => engine.world.eBullets} colour="#f87171" size={1} max={220} />
      <Missiles engine={engine} />
      <FxLayer engine={engine} />

      {q !== "low" && (
        <EffectComposer>
          <Bloom
            intensity={q === "high" ? 1.1 : 0.7}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.2} darkness={0.7} />
        </EffectComposer>
      )}
    </>
  );
}
