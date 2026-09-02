"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { GameEngine } from "../game/engine";
import { ENVIRONMENTS } from "../data/environments";
import type { Settings, EnvKey, EnemyKind } from "../game/types";

/* ============================================================
   NEON VOID — scene
   Cinematic / industrial rebuild:
   - military player ship + 6 distinct enemy silhouettes
   - chase camera that FOLLOWS the ship (lag + roll bleed + recoil)
   - enormous background battlefield (planet / carrier / station)
   - dark gunmetal palette, one hard key light, restrained cyan
   ============================================================ */

const HULL = "#39404a";
const HULL_DARK = "#20242b";
const PANEL = "#2b313a";
const CYAN = "#63d3e8";
const WARN_RED = "#ff5a4d";

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
  const camPos = useRef(new THREE.Vector3(0, 8, 120));
  const camLook = useRef(new THREE.Vector3(0, 0, 0));
  const followQ = useRef(new THREE.Quaternion());
  const camUp = useRef(new THREE.Vector3(0, 1, 0));
  const shakeSeed = useRef(Math.random() * 100);
  const scratch = useRef({
    off: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    look: new THREE.Vector3(),
    up: new THREE.Vector3(),
    shake: new THREE.Vector3(),
  });

  useFrame((_, deltaRaw) => {
    const delta = Math.min(0.05, deltaRaw);
    if (running()) engine.tick(delta, 1 / Math.max(0.0001, deltaRaw));

    const p = engine.world.player;
    const s = scratch.current;
    const boost = p.boostRamp;
    const intro = THREE.MathUtils.clamp(engine.world.intro / 3, 0, 1);

    // rotation lag — the camera chases the ship's orientation, a beat behind
    followQ.current.slerp(p.quat, 1 - Math.pow(0.0016, delta));

    // seat behind + above the ship, in the (lagged) ship frame
    const back = 15 + boost * 3.5 + (1 - intro) * 44;
    const high = 2 + (1 - intro) * 9;
    s.off.set(0, high, back).applyQuaternion(followQ.current);
    s.desired.copy(p.pos).add(s.off);

    // positional lag
    camPos.current.lerp(s.desired, 1 - Math.pow(0.0009, delta));

    // recoil — shove the camera back along its own forward on weapon punch
    s.fwd.set(0, 0, -1).applyQuaternion(followQ.current);
    const punch = engine.world.camPunch;

    // shake
    const sh = engine.world.camShake * settings.cameraShake;
    const t = performance.now() / 1000 + shakeSeed.current;
    s.shake.set(
      (Math.sin(t * 46) + Math.sin(t * 12.7)) * 0.5,
      (Math.sin(t * 33) + Math.sin(t * 7.1)) * 0.5,
      (Math.sin(t * 19)) * 0.4,
    ).multiplyScalar(sh * 1.5 + punch * 0.7);

    camera.position
      .copy(camPos.current)
      .addScaledVector(s.fwd, -punch * 1.6)
      .add(s.shake);

    // look ahead of the nose, biased up so the ship sits low in frame
    s.look.copy(p.pos).addScaledVector(p.fwd, 20).addScaledVector(p.up, 4.4);
    camLook.current.lerp(s.look, 1 - Math.pow(0.0022, delta));

    // bleed ~35% of the ship roll into the camera — enough to feel the bank,
    // not enough to make anyone sick
    s.up.set(0, 1, 0).lerp(p.up, 0.35 * (0.4 + 0.6 * intro)).normalize();
    camUp.current.lerp(s.up, 1 - Math.pow(0.02, delta));
    camera.up.copy(camUp.current);
    camera.lookAt(camLook.current);

    const cam = camera as THREE.PerspectiveCamera;
    const speedFov = THREE.MathUtils.clamp(p.speed * 0.04 - 2, 0, 6);
    const targetFov = 56 + boost * 13 + punch * 2.5 + speedFov - (1 - intro) * 6;
    cam.fov += (targetFov - cam.fov) * (1 - Math.pow(0.02, delta));
    cam.updateProjectionMatrix();
  });

  return null;
}

/* -------------------------------------------------- ship model (shared) */
export function ShipModel({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {/* central spine */}
      <mesh castShadow>
        <boxGeometry args={[0.95, 0.68, 4.1]} />
        <meshStandardMaterial color={HULL} metalness={0.86} roughness={0.44} />
      </mesh>
      {/* armoured nose */}
      <mesh position={[0, 0.02, -2.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 1.7, 4]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.8} roughness={0.5} />
      </mesh>
      {/* dorsal spine plate */}
      <mesh position={[0, 0.42, 0.1]}>
        <boxGeometry args={[0.5, 0.16, 3]} />
        <meshStandardMaterial color={PANEL} metalness={0.7} roughness={0.6} />
      </mesh>
      {/* cockpit glass */}
      <mesh position={[0, 0.3, -1.05]}>
        <boxGeometry args={[0.52, 0.34, 1.05]} />
        <meshStandardMaterial color="#0c1a20" metalness={0.3} roughness={0.15} emissive={CYAN} emissiveIntensity={0.28} />
      </mesh>
      {/* swept wings */}
      {[-1, 1].map((sgn) => (
        <group key={sgn} position={[sgn * 1.35, -0.05, 0.5]} rotation={[0, sgn * -0.34, sgn * -0.16]}>
          <mesh castShadow>
            <boxGeometry args={[2.7, 0.12, 1.5]} />
            <meshStandardMaterial color={HULL} metalness={0.85} roughness={0.46} />
          </mesh>
          {/* wing root panel */}
          <mesh position={[sgn * -1, 0, 0]}>
            <boxGeometry args={[0.7, 0.2, 1.1]} />
            <meshStandardMaterial color={PANEL} metalness={0.7} roughness={0.6} />
          </mesh>
          {/* hardpoint / cannon */}
          <mesh position={[sgn * 0.7, -0.12, -0.6]}>
            <boxGeometry args={[0.16, 0.16, 1.5]} />
            <meshStandardMaterial color={HULL_DARK} metalness={0.8} roughness={0.4} />
          </mesh>
          {/* wingtip nav light */}
          <mesh position={[sgn * 1.25, 0.02, 0.2]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={sgn < 0 ? "#ff3b3b" : "#39ff88"} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* tail fins */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * 0.42, 0.35, 1.9]} rotation={[0, 0, sgn * 0.5]}>
          <boxGeometry args={[0.1, 1, 0.9]} />
          <meshStandardMaterial color={PANEL} metalness={0.7} roughness={0.55} />
        </mesh>
      ))}
      {/* engine nacelles */}
      {[-1, 1].map((sgn) => (
        <group key={sgn} position={[sgn * 0.66, -0.04, 1.95]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.36, 1.7, 12]} />
            <meshStandardMaterial color={HULL_DARK} metalness={0.9} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.95]}>
            <circleGeometry args={[0.26, 16]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------- player ship in-flight */
function Phantom({ engine }: { engine: GameEngine }) {
  const g = useRef<THREE.Group>(null);
  const kick = useRef<THREE.Group>(null);
  const engL = useRef<THREE.PointLight>(null);
  const trail = useRef<THREE.Mesh>(null);
  const trailMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const p = engine.world.player;
    if (!g.current) return;
    g.current.position.copy(p.pos);
    g.current.quaternion.copy(p.quat);
    g.current.visible = p.alive;

    const spd = p.speed;
    const boost = p.boostRamp;
    if (engL.current) engL.current.intensity = 2 + boost * 8 + p.throttle * 1.5;

    if (trail.current && trailMat.current) {
      const len = 1.1 + spd * 0.03 + boost * 3.4;
      trail.current.scale.set(0.7 + boost * 0.3, 0.7 + boost * 0.3, len);
      trail.current.position.z = 2.4 + len / 2;
      trailMat.current.opacity = 0.3 + boost * 0.4;
    }

    // recoil kick — nudge the whole model back briefly when guns fire
    if (kick.current) kick.current.position.z = p.fireKick * 0.35;
  });

  return (
    <group ref={g}>
      <group ref={kick}>
        <ShipModel />
        {/* engine plume */}
        <mesh ref={trail} position={[0, -0.02, 3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.34, 1, 12, 1, true]} />
          <meshBasicMaterial
            ref={trailMat}
            color={CYAN}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight ref={engL} position={[0, 0, 2.6]} color={CYAN} intensity={3} distance={22} />
      </group>
    </group>
  );
}

/* -------------------------------------------------- enemy silhouettes */
function EnemyChassis({ kind, hull, accent }: { kind: EnemyKind; hull: THREE.Material; accent: THREE.Material }) {
  switch (kind) {
    /* SCOUT — tiny slim dart */
    case "drone":
      return (
        <group>
          <mesh material={hull} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.5, 2.4, 5]} />
          </mesh>
          <mesh material={hull} position={[0, 0, 0.9]} scale={[1.6, 0.14, 0.5]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={accent} position={[0, 0, 1.1]}>
            <sphereGeometry args={[0.18, 8, 8]} />
          </mesh>
        </group>
      );
    /* FIGHTER — delta-wing military interceptor */
    case "interceptor":
      return (
        <group>
          <mesh material={hull} scale={[0.7, 0.5, 2.4]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={hull} position={[0, 0, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.35, 1.4, 4]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={hull} position={[s * 1, 0, 0.5]} rotation={[0, s * 0.4, 0]} scale={[2, 0.12, 1.3]}>
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          ))}
          <mesh material={accent} position={[0, 0, 1.5]}>
            <boxGeometry args={[0.9, 0.24, 0.3]} />
          </mesh>
        </group>
      );
    /* HUNTER — twin-boom heavy fighter */
    case "hunter":
      return (
        <group>
          <mesh material={hull} scale={[0.9, 0.7, 2]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 1.3, 0, 0]}>
              <mesh material={hull} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.34, 0.4, 3.4, 8]} />
              </mesh>
              <mesh material={accent} position={[0, 0, 1.8]}>
                <sphereGeometry args={[0.2, 8, 8]} />
              </mesh>
            </group>
          ))}
          <mesh material={hull} position={[0, 0, -0.4]} scale={[2.8, 0.14, 1]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        </group>
      );
    /* SNIPER — long rail platform */
    case "sniper":
      return (
        <group>
          <mesh material={hull} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.32, 5, 10]} />
          </mesh>
          <mesh material={accent} position={[0, 0, -2.7]}>
            <sphereGeometry args={[0.34, 10, 10]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={hull} position={[s * 0.55, 0, 1.6]} rotation={[0, 0, s * 0.7]} scale={[0.1, 1.4, 0.7]}>
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          ))}
        </group>
      );
    /* HEAVY — blunt armoured gunship */
    case "tanker":
      return (
        <group>
          <mesh material={hull} scale={[2.4, 1.7, 3]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={hull} position={[s * 1.5, 0, 0.2]} scale={[0.9, 1.1, 2]}>
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          ))}
          <mesh material={hull} position={[0, 0.9, 0]} scale={[1.4, 0.5, 1.4]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} material={accent} position={[x, -0.2, -1.7]}>
              <boxGeometry args={[0.4, 0.4, 0.8]} />
            </mesh>
          ))}
        </group>
      );
    /* DESTROYER — long capital escort with turrets + mast */
    case "guardian":
      return (
        <group>
          <mesh material={hull} scale={[1.6, 1.3, 6]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={hull} position={[0, 0, -3.4]} scale={[1, 0.9, 1.6]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={hull} position={[0, 0.95, 1]} scale={[0.8, 1, 1.6]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={hull} position={[0, 1.9, 1]}>
            <cylinderGeometry args={[0.06, 0.06, 1.6, 6]} />
          </mesh>
          {[-1.6, 0.2, 2].map((z) => (
            <mesh key={z} material={hull} position={[0, 0.8, z]}>
              <sphereGeometry args={[0.34, 10, 8]} />
            </mesh>
          ))}
          {[-0.6, 0, 0.6].map((x) => (
            <mesh key={x} material={accent} position={[x, 0, 3.2]}>
              <circleGeometry args={[0.22, 12]} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}

const ENEMY_POOL = 24;
const KINDS: EnemyKind[] = ["drone", "interceptor", "hunter", "sniper", "tanker", "guardian"];

function EnemySlot({ engine, index }: { engine: GameEngine; index: number }) {
  const g = useRef<THREE.Group>(null);
  const subs = useRef<Record<string, THREE.Group | null>>({});
  const hull = useMemo(
    () => new THREE.MeshStandardMaterial({ color: HULL_DARK, metalness: 0.82, roughness: 0.5 }),
    [],
  );
  const accent = useMemo(
    () => new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1, toneMapped: false }),
    [],
  );

  useFrame(() => {
    const e = engine.world.enemies[index];
    const grp = g.current;
    if (!grp) return;
    if (!e || !e.alive) {
      grp.visible = false;
      return;
    }
    grp.visible = true;
    grp.position.copy(e.pos);
    grp.lookAt(engine.world.player.pos); // +Z faces the player
    grp.rotateZ(Math.sin(e.wobble * 1.7) * 0.25);
    grp.scale.setScalar(e.radius * (0.35 + 0.65 * e.spawnT));

    for (const k of KINDS) {
      const s = subs.current[k];
      if (s) s.visible = k === e.kind;
    }
    accent.color.set(e.colour);
    accent.emissive.set(e.disabledT > 0 ? "#7c5cff" : e.colour);
    accent.emissiveIntensity =
      0.7 + e.hitFlash * 4 + (e.charging ? (Math.sin(performance.now() / 40) + 1) * 2 : 0);
    hull.emissive.set(WARN_RED);
    hull.emissiveIntensity = e.hitFlash * 0.8;
  });

  return (
    <group ref={g} visible={false}>
      {KINDS.map((k) => (
        <group key={k} ref={(r) => { subs.current[k] = r; }} visible={false}>
          <EnemyChassis kind={k} hull={hull} accent={accent} />
        </group>
      ))}
    </group>
  );
}

function Enemies({ engine }: { engine: GameEngine }) {
  return (
    <>
      {Array.from({ length: ENEMY_POOL }).map((_, i) => (
        <EnemySlot key={i} engine={engine} index={i} />
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
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const list = get();
    let n = 0;
    for (let i = 0; i < list.length && n < max; i++) {
      const b = list[i];
      if (!b.active) continue;
      dummy.position.copy(b.pos);
      const len = 1 + b.vel.length() * 0.014;
      dummy.scale.set(b.radius * size, b.radius * size, b.radius * size * len);
      dir.copy(b.vel).normalize();
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
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
      <capsuleGeometry args={[0.42, 1.5, 3, 6]} />
      <meshBasicMaterial color={colour} toneMapped={false} />
    </instancedMesh>
  );
}

function Missiles({ engine }: { engine: GameEngine }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    let n = 0;
    for (const m of engine.world.missiles) {
      if (!m.active) continue;
      dummy.position.copy(m.pos);
      dir.copy(m.vel).normalize();
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      dummy.scale.set(0.45, 0.45, 1.5);
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 24]} frustumCulled={false}>
      <coneGeometry args={[0.5, 1.7, 6]} />
      <meshBasicMaterial color="#ff8f7a" toneMapped={false} />
    </instancedMesh>
  );
}

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
      const grow = f.kind === "explosion" || f.kind === "big" || f.kind === "emp" ? 1 + k * 2.4 : 1 + k * 0.4;
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
      <meshBasicMaterial toneMapped={false} transparent opacity={0.92} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

function Pickups({ engine }: { engine: GameEngine }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const colours: Record<string, string> = {
    energy: CYAN, shield: "#4aa8d8", hull: "#9fdc5a", credits: "#e0b64a", combo: "#d98cc8", missile: "#ff8f7a",
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
function useLumpyRock() {
  return useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        Math.sin(v.x * 3.1 + v.y * 2.3) * 0.16 +
        Math.sin(v.y * 4.7 + v.z * 1.9) * 0.11 +
        Math.sin(v.z * 6.1 + v.x * 3.7) * 0.07;
      v.multiplyScalar(1 + n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

function Asteroids({ engine }: { engine: GameEngine }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useLumpyRock();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const max = 150;
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
    <instancedMesh ref={mesh} args={[geo, undefined, max]} frustumCulled={false}>
      <meshStandardMaterial color="#4b4a4f" roughness={0.98} metalness={0.03} flatShading />
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
      coreMat.current.emissiveIntensity = (b.invulnerable ? 0.4 : 1.7) + b.hitFlash * 3 + (b.phase === 3 ? 1 : 0);
      coreMat.current.color.set(b.id === "void-reaper" ? "#b47bff" : b.id === "rift-guardian" ? CYAN : "#e06ad0");
      coreMat.current.emissive.copy(coreMat.current.color);
    }
    const parts = [...b.generators, ...b.nodes];
    parts.forEach((gp, i) => {
      const m = gens.current[i];
      if (!m) return;
      m.visible = gp.alive;
      if (!gp.alive) return;
      m.position.copy(gp.pos).sub(b.id === "rift-core" ? new THREE.Vector3() : b.pos);
      m.rotation.y += 0.06;
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + (1 - gp.hull / gp.hullMax) * 2;
    });
  });
  const b = engine.world.boss;
  return (
    <group ref={root} visible={false}>
      <mesh>
        <icosahedronGeometry args={[b?.id === "rift-core" ? 9 : 6, 1]} />
        <meshStandardMaterial ref={coreMat} color="#b47bff" emissive="#b47bff" emissiveIntensity={1.4} metalness={0.5} roughness={0.3} flatShading />
      </mesh>
      <mesh scale={b?.id === "rift-core" ? 12 : 8}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#000" wireframe transparent opacity={0.2} />
      </mesh>
      <pointLight color="#b47bff" intensity={7} distance={44} />
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} ref={(r) => { gens.current[i] = r; }} visible={false}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#d9b6ff" emissive="#d9b6ff" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------- starfield + speed streaks */
function Starfield({ quality, tint }: { quality: Settings["quality"]; tint: string }) {
  const count = quality === "low" ? 1100 : quality === "medium" ? 2200 : 3600;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 420 + Math.random() * 420;
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
    <points geometry={geo}>
      <pointsMaterial size={1.1} color={tint} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Streaks({ engine, quality }: { engine: GameEngine; quality: Settings["quality"] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const N = quality === "low" ? 40 : 80;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offs = useMemo(() => {
    const a: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      a.push(new THREE.Vector3((Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90));
    }
    return a;
  }, [N]);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const vdir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const p = engine.world.player;
    const spd = p.speed;
    const boost = p.boostRamp;
    const show = spd * 0.02 + boost;
    if (mat.current) mat.current.opacity = THREE.MathUtils.clamp(show * 0.5, 0, 0.8);
    if (show < 0.05) { im.count = 0; im.instanceMatrix.needsUpdate = true; return; }
    vdir.copy(p.vel).normalize();
    if (vdir.lengthSq() < 0.1) vdir.copy(p.fwd);
    q.setFromUnitVectors(zAxis, vdir);
    const streakLen = 2.5 + spd * 0.08 + boost * 12;
    for (let i = 0; i < N; i++) {
      const o = offs[i];
      // keep the field roughly centred on the ship; recycle when it drifts away
      o.addScaledVector(p.vel, -0.016);
      if (o.lengthSq() > 90 * 90) o.set((Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90);
      dummy.position.copy(p.pos).add(o).addScaledVector(p.fwd, 20);
      dummy.quaternion.copy(q);
      dummy.scale.set(0.05, 0.05, streakLen);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.count = N;
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial ref={mat} color="#dce8ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/* -------------------------------------------------- the battlefield (huge, distant) */
function Greeble({ n = 16, spread = 1, box = 1, color = PANEL }: { n?: number; spread?: number; box?: number; color?: string }) {
  const items = useMemo(() => {
    const a: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (let i = 0; i < n; i++) {
      a.push({
        p: [(Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.5, (Math.random() - 0.5) * spread * 2],
        s: [box * (0.3 + Math.random()), box * (0.3 + Math.random()), box * (0.3 + Math.random() * 1.5)],
      });
    }
    return a;
  }, [n, spread, box]);
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} scale={it.s}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} metalness={0.75} roughness={0.55} />
        </mesh>
      ))}
    </>
  );
}

function Dreadnought({ position, rotationY = 0, length = 240 }: { position: [number, number, number]; rotationY?: number; length?: number }) {
  const g = useRef<THREE.Group>(null);
  const beacons = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame(() => {
    if (g.current) g.current.rotation.y += 0.0006;
    const pulse = (Math.sin(performance.now() / 500) + 1) * 0.5;
    beacons.current.forEach((m) => m && (m.opacity = 0.3 + pulse * 0.7));
  });
  const u = length / 240;
  return (
    <group ref={g} position={position} rotation={[0, rotationY, 0.04]}>
      {/* keel */}
      <mesh scale={[26 * u, 20 * u, length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.8} roughness={0.5} />
      </mesh>
      {/* prow */}
      <mesh position={[0, 0, -length * 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[14 * u, 60 * u, 4]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.8} roughness={0.5} />
      </mesh>
      {/* towers / island */}
      <mesh position={[0, 16 * u, length * 0.1]} scale={[10 * u, 16 * u, 40 * u]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={PANEL} metalness={0.7} roughness={0.55} />
      </mesh>
      <group position={[0, 12 * u, 0]}><Greeble n={22} spread={40 * u} box={5 * u} /></group>
      <group position={[0, -12 * u, 0]}><Greeble n={18} spread={36 * u} box={4 * u} color={HULL_DARK} /></group>
      {/* window strips */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 13.2 * u, 2, 0]} scale={[0.4, 3, length * 0.7]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#d8a24a" toneMapped={false} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* red beacons */}
      {[-0.4, 0.1, 0.55].map((z, i) => (
        <mesh key={z} position={[0, 24 * u, z * length]}>
          <sphereGeometry args={[1.3 * u, 8, 8]} />
          <meshBasicMaterial ref={(r) => { beacons.current[i] = r; }} color="#ff2b2b" toneMapped={false} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* engine bells */}
      {[-8, 0, 8].map((x) => (
        <mesh key={x} position={[x * u, 0, length * 0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[4 * u, 5 * u, 8 * u, 12]} />
          <meshBasicMaterial color={CYAN} toneMapped={false} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Station({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.rotation.z += 0.0015; });
  return (
    <group ref={g} position={position} rotation={[0.5, 0.3, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[64, 5, 8, 44]} />
        <meshStandardMaterial color={HULL} metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[6, 6, 120, 12]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.8} roughness={0.5} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]}>
          <boxGeometry args={[130, 3, 3]} />
          <meshStandardMaterial color={PANEL} metalness={0.7} roughness={0.55} />
        </mesh>
      ))}
      <group><Greeble n={26} spread={28} box={4} /></group>
      {[-40, 0, 40].map((y) => (
        <mesh key={y} position={[0, y, 6.2]}>
          <boxGeometry args={[3, 6, 0.6]} />
          <meshBasicMaterial color="#d8a24a" toneMapped={false} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Planet({ position, radius, colour }: { position: [number, number, number]; radius: number; colour: string }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial color={colour} roughness={1} metalness={0} />
      </mesh>
      <mesh scale={1.03}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#2b4a66" transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DebrisField() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useLumpyRock();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const a: { p: THREE.Vector3; r: THREE.Euler; s: number; spin: number }[] = [];
    for (let i = 0; i < 46; i++) {
      a.push({
        p: new THREE.Vector3((Math.random() - 0.5) * 340, (Math.random() - 0.5) * 120, -80 - Math.random() * 260),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        s: 1.4 + Math.random() * 5,
        spin: (Math.random() - 0.5) * 0.3,
      });
    }
    return a;
  }, []);
  useFrame((_, dt) => {
    const im = mesh.current;
    if (!im) return;
    data.forEach((d, i) => {
      d.r.y += d.spin * dt;
      dummy.position.copy(d.p);
      dummy.rotation.copy(d.r);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, 46]} frustumCulled={false}>
      <meshStandardMaterial color="#3c3c42" roughness={1} metalness={0.05} flatShading />
    </instancedMesh>
  );
}

function DistantWar({ quality }: { quality: Settings["quality"] }) {
  const flashes = useRef<(THREE.Mesh | null)[]>([]);
  const state = useRef(
    Array.from({ length: 8 }, () => ({ t: Math.random() * 6, life: 0, pos: new THREE.Vector3() })),
  );
  const N = quality === "low" ? 4 : 8;
  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const s = state.current[i];
      const m = flashes.current[i];
      if (!m) continue;
      s.t -= dt;
      if (s.life > 0) {
        s.life -= dt;
        const k = Math.max(0, s.life / 0.8);
        m.scale.setScalar(2 + (1 - k) * 40);
        (m.material as THREE.MeshBasicMaterial).opacity = k * 0.9;
        m.visible = true;
      } else {
        m.visible = false;
        if (s.t <= 0) {
          s.t = 3 + Math.random() * 9;
          s.life = 0.8;
          s.pos.set((Math.random() - 0.5) * 700, (Math.random() - 0.5) * 300, -200 - Math.random() * 400);
          m.position.copy(s.pos);
        }
      }
    }
  });
  return (
    <>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(r) => { flashes.current[i] = r; }} visible={false}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffd9a0" toneMapped={false} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function Battlefield({ env, quality }: { env: EnvKey; quality: Settings["quality"] }) {
  const def = ENVIRONMENTS[env];
  return (
    <group>
      <Starfield quality={quality} tint={def.starTint} />
      <Planet position={[-360, -160, -560]} radius={200} colour={def.planet} />
      {env !== "dead-space" && env !== "rift-core" && <Dreadnought position={[420, 60, -460]} rotationY={0.6} length={280} />}
      {(env === "outer-orbit" || env === "asteroid-field") && <Station position={[-360, 120, -220]} />}
      {env !== "rift-core" && <DebrisField />}
      <DistantWar quality={quality} />
      {/* faint volume so the black has depth without colour noise */}
      <mesh>
        <sphereGeometry args={[900, 24, 24]} />
        <meshBasicMaterial color={def.haze} side={THREE.BackSide} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------- exported game world */
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
  const applied = useRef<EnvKey | null>(null);
  useFrame(() => {
    if (applied.current !== env) {
      applied.current = env;
      scene.background = new THREE.Color(def.fog);
      scene.fog = new THREE.FogExp2(def.fog, def.fogDensity);
    }
  });
  return (
    <>
      {/* one hard key light (a distant star) + a cold rim fill + almost no ambient */}
      <ambientLight intensity={0.06} color="#26324b" />
      <directionalLight position={[190, 70, -230]} intensity={2.7} color="#fff2df" />
      <directionalLight position={[-140, -50, 170]} intensity={0.4} color="#3f63a8" />

      <Simulation engine={engine} settings={settings} running={running} />
      <Battlefield env={env} quality={q} />
      <Streaks engine={engine} quality={q} />
      <Asteroids engine={engine} />
      <Phantom engine={engine} />
      <Enemies engine={engine} />
      <BossView engine={engine} />
      <Pickups engine={engine} />
      <BulletLayer get={() => engine.world.pBullets} colour={CYAN} size={0.9} max={160} />
      <BulletLayer get={() => engine.world.eBullets} colour={WARN_RED} size={1} max={220} />
      <Missiles engine={engine} />
      <FxLayer engine={engine} />

      {q !== "low" && (
        <EffectComposer>
          <Bloom
            intensity={q === "high" ? 0.7 : 0.5}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.22} darkness={0.9} />
        </EffectComposer>
      )}
    </>
  );
}
