"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

import { ASSETS, SPAWN, HORSE } from "./config";
import { InputManager } from "./systems/input";
import { CityCollider } from "./systems/collision";
import { CameraRig } from "./systems/camera";
import { GameController } from "./systems/controller";
import { WorldState, toHud } from "./systems/state";
import { StridePhase, bipedPose, quadrupedPose, damp, lerp } from "./systems/procAnim";

useGLTF.preload(ASSETS.city);
useGLTF.preload(ASSETS.girl);
useGLTF.preload(ASSETS.horse);

/** Front of each scan model relative to +Z, tuned by eye. */
const GIRL_YAW_OFFSET = 0;
const HORSE_YAW_OFFSET = 0;

export default function Scene({
  world,
  onHud,
}: {
  world: WorldState;
  onHud: (h: ReturnType<typeof toHud>) => void;
}) {
  const { scene: cityScene } = useGLTF(ASSETS.city);
  const { scene: girlScene } = useGLTF(ASSETS.girl);
  const { scene: horseScene } = useGLTF(ASSETS.horse);
  const { camera, gl } = useThree();

  const city = useMemo(() => {
    const s = cityScene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.roughness = 0.95;
          mat.metalness = 0;
          mat.envMapIntensity = 0.4;
        }
      }
    });
    return s;
  }, [cityScene]);

  const girl = useMemo(() => prepChar(girlScene, 0.9), [girlScene]);
  const horse = useMemo(() => prepChar(horseScene, 0.06), [horseScene]);

  const girlRef = useRef<THREE.Group>(null);
  const horseRef = useRef<THREE.Group>(null);
  const rigGirl = useRef<THREE.Group>(null);
  const rigHorse = useRef<THREE.Group>(null);
  const headHorse = useRef<THREE.Group>(null);

  const sys = useRef<{
    input: InputManager;
    collider: CityCollider;
    cam: CameraRig;
    ctrl: GameController;
    girlStride: StridePhase;
    horseStride: StridePhase;
    lastGirl: THREE.Vector3;
    lastHorse: THREE.Vector3;
    hudT: number;
  }>(null);

  useEffect(() => {
    const input = new InputManager(gl.domElement);
    const collider = new CityCollider();
    collider.setWorld(city);
    const cam = new CameraRig();
    const ctrl = new GameController(world, input, collider, cam);
    // drop spawns onto the real street surface
    for (const pos of [world.girlPos, world.horsePos]) {
      pos.y = collider.rawGroundAt(pos.x, pos.z, 30) ?? collider.groundAt(pos.x, pos.z, 30) ?? pos.y;
    }
    sys.current = {
      input,
      collider,
      cam,
      ctrl,
      girlStride: new StridePhase(),
      horseStride: new StridePhase(),
      lastGirl: world.girlPos.clone(),
      lastHorse: world.horsePos.clone(),
      hudT: 0,
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "F9") world.debug = !world.debug;
      if (e.code === "KeyP") world.paused = !world.paused;
      if (world.debug && e.code === "KeyT") {
        // teleport to horse
        world.girlPos.copy(world.horsePos).add(new THREE.Vector3(1.2, 0, 0));
      }
      if (world.debug && e.code === "KeyR") {
        world.horsePos.set(...SPAWN.horse);
        world.mode = "onfoot";
      }
    };
    window.addEventListener("keydown", onKey);
    (window as unknown as { __hb: unknown }).__hb = {
      world,
      sys: sys.current,
      camera,
      THREE,
      city,
      probe: (x: number, z: number) => collider.groundAt(x, z, 30),
      bounds: new THREE.Box3().setFromObject(city).min.toArray().concat(new THREE.Box3().setFromObject(city).max.toArray()),
    };
    return () => {
      input.dispose();
      window.removeEventListener("keydown", onKey);
    };
  }, [city, gl, world]);

  useFrame((_, dt) => {
    const s = sys.current;
    if (!s) return;
    const w = world;

    s.ctrl.update(dt);

    // --- girl transform + procedural anim ---
    if (girlRef.current) {
      girlRef.current.position.set(w.girlPos.x, w.girlPos.y - 0.12, w.girlPos.z);
      girlRef.current.rotation.y = w.girlYaw + GIRL_YAW_OFFSET;
    }
    const girlDist = w.girlPos.distanceTo(s.lastGirl);
    s.lastGirl.copy(w.girlPos);
    if (rigGirl.current) {
      const rg = rigGirl.current;
      if (w.mode === "onfoot" && w.girlSpeed > 0.3) {
        const stride = 1.4 + w.girlSpeed * 0.18;
        const ph = s.girlStride.advance(girlDist, stride);
        const p = bipedPose(ph, w.girlGait === 2 ? 2 : 1);
        rg.position.y = p.heave;
        rg.position.x = p.sway;
        rg.rotation.z = p.roll * 0.6;
        rg.rotation.x = lerp(rg.rotation.x, p.pitch, damp(8, dt));
        rg.rotation.y = p.yawBob;
      } else if (w.mode === "riding") {
        // rider follows horse gait: bounce + lean
        const gaitN = { idle: 0, walk: 1, trot: 2, gallop: 3 }[w.horseGait];
        const ph = s.horseStride.phase;
        const q = quadrupedPose(ph, gaitN);
        rg.position.y = q.heave * 0.8 + 0.02;
        rg.position.x = 0;
        rg.rotation.z = q.roll;
        rg.rotation.x = lerp(rg.rotation.x, -0.18 - q.pitch * 0.5 + q.surge, damp(10, dt));
        rg.rotation.y = 0;
      } else {
        // idle breathing / sequence
        const ph = s.girlStride.idle(dt, 1.0);
        rg.position.y = lerp(rg.position.y, Math.sin(ph) * 0.008, damp(6, dt));
        rg.position.x = lerp(rg.position.x, 0, damp(6, dt));
        rg.rotation.x = lerp(rg.rotation.x, w.mode === "mounting" || w.mode === "dismounting" ? -0.1 : 0, damp(6, dt));
        rg.rotation.z = lerp(rg.rotation.z, 0, damp(6, dt));
        rg.rotation.y = lerp(rg.rotation.y, 0, damp(6, dt));
      }
    }

    // --- horse transform + procedural gait ---
    if (horseRef.current) {
      horseRef.current.position.copy(w.horsePos);
      horseRef.current.rotation.y = w.horseYaw + HORSE_YAW_OFFSET;
    }
    const horseDist = w.horsePos.distanceTo(s.lastHorse);
    s.lastHorse.copy(w.horsePos);
    if (rigHorse.current) {
      const rh = rigHorse.current;
      const gaitN = { idle: 0, walk: 1, trot: 2, gallop: 3 }[w.horseGait];
      let ph: number;
      if (Math.abs(w.horseSpeed) > 0.2) {
        const stride = HORSE.gaits[w.horseGait].stride || 1.8;
        ph = s.horseStride.advance(horseDist, stride);
      } else {
        ph = s.horseStride.idle(dt, 1.3);
      }
      const q = quadrupedPose(ph, gaitN);
      rh.position.y = q.heave;
      rh.rotation.x = lerp(rh.rotation.x, q.pitch, damp(12, dt));
      rh.rotation.z = q.roll;
      rh.position.z = q.surge;
      if (headHorse.current) {
        headHorse.current.rotation.x = q.headBob;
        headHorse.current.rotation.z = Math.sin(ph * 0.5) * 0.05;
      }
    }

    // --- camera ---
    const focus = w.mode === "onfoot" ? w.girlPos : w.horsePos;
    s.cam.update(camera as THREE.PerspectiveCamera, focus, s.collider.objects, dt);

    // --- HUD throttle ---
    s.hudT += dt;
    if (s.hudT > 0.1) {
      s.hudT = 0;
      onHud(toHud(w));
    }
    s.input.endFrame();
  });

  return (
    <>
      <hemisphereLight args={[0xbfd4ff, 0x4a3f33, 1.0]} />
      <directionalLight
        position={[30, 45, 20]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.25} />
      <fog attach="fog" args={[0xcdd6e4, 55, 170]} />
      <color attach="background" args={[0xcdd6e4]} />

      <primitive object={city} />
      {world.debug && <axesHelper args={[5]} />}
      {world.debug && <gridHelper args={[100, 50, 0x444444, 0x222222]} />}

      <group ref={girlRef}>
        <group ref={rigGirl}>
          <primitive object={girl} />
        </group>
      </group>

      <group ref={horseRef}>
        <group ref={rigHorse}>
          <primitive object={horse} />
          <group ref={headHorse} position={[0, 1.7, 0.95]} />
        </group>
      </group>
    </>
  );
}

function prepChar(src: THREE.Object3D, _s: number) {
  const o = src.clone(true);
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat) mat.envMapIntensity = 0.6;
    }
  });
  return o;
}
