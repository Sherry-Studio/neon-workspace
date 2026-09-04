"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

import { ASSETS, SPAWN, HORSE, GROUND_Y } from "./config";
import { InputManager } from "./systems/input";
import { CameraRig } from "./systems/camera";
import { GameController } from "./systems/controller";
import { makeCharacterBody } from "./systems/kinematic";
import { WorldState, toHud } from "./systems/state";
import { StridePhase, quadrupedPose, bipedPose, damp, lerp } from "./systems/procAnim";

useGLTF.preload(ASSETS.city);
useGLTF.preload(ASSETS.girl);
useGLTF.preload(ASSETS.horse);

const GIRL_YAW_OFFSET = Math.PI;
const HORSE_YAW_OFFSET = Math.PI;
const GIRL_R = 0.34;
const GIRL_HALF = 0.95; // feet -> body centre
const HORSE_R = 0.6;
const HORSE_HALF = 0.95;

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
  const advance = useThree((s) => s.advance);

  const city = useMemo(() => {
    const s = cityScene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.receiveShadow = true;
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.vertexColors = true;
          mat.roughness = 0.96;
          mat.metalness = 0;
          mat.envMapIntensity = 0.5;
        }
      }
    });
    return s;
  }, [cityScene]);

  const girl = useMemo(() => prepChar(girlScene), [girlScene]);
  const horse = useMemo(() => prepChar(horseScene), [horseScene]);

  const girlRef = useRef<THREE.Group>(null);
  const horseRef = useRef<THREE.Group>(null);
  const rigGirl = useRef<THREE.Group>(null);
  const rigHorse = useRef<THREE.Group>(null);
  const floorRef = useRef<THREE.Mesh>(null);

  const sys = useRef<{
    input: InputManager;
    cam: CameraRig;
    ctrl: GameController;
    cityMeshes: THREE.Object3D[];
    girlStride: StridePhase;
    horseStride: StridePhase;
    lastGirl: THREE.Vector3;
    lastHorse: THREE.Vector3;
    dispose: () => void;
    hudT: number;
  } | null>(null);

  useEffect(() => {
    const input = new InputManager(gl.domElement);
    const cam = new CameraRig();

    const cityMeshes: THREE.Object3D[] = [];
    city.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) cityMeshes.push(o);
    });
    if (floorRef.current) cityMeshes.push(floorRef.current);

    // real street height at each spawn
    const groundAt = (x: number, z: number, fallback: number) => {
      const rc = new THREE.Raycaster(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0), 0, 120);
      const hit = rc.intersectObjects(cityMeshes, false)[0];
      return hit ? hit.point.y : fallback;
    };

    const girlFeet = new THREE.Vector3(SPAWN.girl[0], groundAt(SPAWN.girl[0], SPAWN.girl[2], SPAWN.girl[1]) + 0.05, SPAWN.girl[2]);
    const horseFeet = new THREE.Vector3(SPAWN.horse[0], groundAt(SPAWN.horse[0], SPAWN.horse[2], SPAWN.horse[1]) + 0.05, SPAWN.horse[2]);

    const girlBody = makeCharacterBody(cityMeshes, GIRL_HALF, GIRL_R, girlFeet);
    const horseBody = makeCharacterBody(cityMeshes, HORSE_HALF, HORSE_R, horseFeet);
    world.girlPos.copy(girlBody.body.position);
    world.horsePos.copy(horseBody.body.position);

    const ctrl = new GameController(world, input, girlBody.body, horseBody.body, cam);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "F9") world.debug = !world.debug;
      if (e.code === "KeyP") world.paused = !world.paused;
      if (world.debug && e.code === "KeyT") {
        const p = world.horsePos.clone().add(new THREE.Vector3(1.4, 0.1, 0));
        girlBody.body.setPosition(p);
        world.girlPos.copy(p);
      }
      if (world.debug && e.code === "KeyR") {
        const p = new THREE.Vector3(SPAWN.horse[0], groundAt(SPAWN.horse[0], SPAWN.horse[2], 3) + 0.05, SPAWN.horse[2]);
        horseBody.body.setPosition(p);
        world.horsePos.copy(p);
        world.mode = "onfoot";
      }
    };
    window.addEventListener("keydown", onKey);

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __hb: unknown }).__hb = {
        world,
        cam,
        camera,
        step: (n = 60) => {
          for (let i = 0; i < n; i++) advance(performance.now() + i * 16.7);
        },
      };
    }

    sys.current = {
      input,
      cam,
      ctrl,
      cityMeshes,
      girlStride: new StridePhase(),
      horseStride: new StridePhase(),
      lastGirl: world.girlPos.clone(),
      lastHorse: world.horsePos.clone(),
      hudT: 0,
      dispose: () => {
        input.dispose();
        window.removeEventListener("keydown", onKey);
      },
    };
    return () => sys.current?.dispose();
  }, [city, camera, gl, world, advance]);

  useFrame((_, dt) => {
    const s = sys.current;
    if (!s) return;
    const w = world;
    s.ctrl.update(dt);

    // ---- girl visual + procedural anim ----
    if (girlRef.current) {
      girlRef.current.position.set(w.girlPos.x, w.girlPos.y - 0.06, w.girlPos.z);
      girlRef.current.rotation.y = w.girlYaw + GIRL_YAW_OFFSET;
    }
    const girlDist = w.girlPos.distanceTo(s.lastGirl);
    s.lastGirl.copy(w.girlPos);
    if (rigGirl.current) {
      const rg = rigGirl.current;
      if (w.mode === "onfoot" && w.girlSpeed > 0.4) {
        const stride = 1.5 + w.girlSpeed * 0.16;
        const ph = s.girlStride.advance(girlDist, stride);
        const p = bipedPose(ph, w.girlGait === 2 ? 2 : 1);
        rg.position.y = -Math.abs(Math.sin(ph)) * (0.05 + w.girlSpeed * 0.012);
        rg.position.x = Math.sin(ph) * 0.05;
        rg.rotation.z = Math.sin(ph) * 0.09;
        rg.rotation.x = lerp(rg.rotation.x, -0.06 - w.girlSpeed * 0.02, damp(8, dt));
        rg.rotation.y = Math.sin(ph) * 0.06 + p.yawBob;
      } else if (w.mode === "riding") {
        const gaitN = gaitIndex(w.horseGait);
        const q = quadrupedPose(s.horseStride.phase, gaitN);
        rg.position.y = q.heave * 0.7;
        rg.position.x = 0;
        rg.rotation.z = q.roll * 0.8;
        rg.rotation.x = lerp(rg.rotation.x, -0.16 - q.pitch * 0.6 + q.surge, damp(11, dt));
        rg.rotation.y = 0;
      } else {
        const ph = s.girlStride.idle(dt, 1.1);
        rg.position.y = lerp(rg.position.y, Math.sin(ph) * 0.012, damp(5, dt));
        rg.position.x = lerp(rg.position.x, 0, damp(5, dt));
        rg.rotation.x = lerp(rg.rotation.x, w.mode === "mounting" || w.mode === "dismounting" ? -0.12 : Math.sin(ph * 0.7) * 0.02, damp(5, dt));
        rg.rotation.z = lerp(rg.rotation.z, 0, damp(5, dt));
        rg.rotation.y = lerp(rg.rotation.y, 0, damp(5, dt));
      }
    }

    // ---- horse visual + procedural gait ----
    if (horseRef.current) {
      horseRef.current.position.set(w.horsePos.x, w.horsePos.y, w.horsePos.z);
      horseRef.current.rotation.y = w.horseYaw + HORSE_YAW_OFFSET;
    }
    const horseDist = w.horsePos.distanceTo(s.lastHorse);
    s.lastHorse.copy(w.horsePos);
    if (rigHorse.current) {
      const rh = rigHorse.current;
      const gaitN = gaitIndex(w.horseGait);
      let ph: number;
      if (Math.abs(w.horseSpeed) > 0.2) {
        const stride = HORSE.gaits[w.horseGait].stride || 1.8;
        ph = s.horseStride.advance(horseDist, stride);
      } else {
        ph = s.horseStride.idle(dt, 1.4);
      }
      const q = quadrupedPose(ph, gaitN);
      rh.position.y = q.heave * 1.6 + (gaitN >= 3 ? Math.abs(Math.sin(ph)) * 0.12 : 0);
      rh.position.z = q.surge * 1.4;
      rh.rotation.x = lerp(rh.rotation.x, q.pitch * 1.6, damp(12, dt));
      rh.rotation.z = q.roll * 1.3;
      const breathe = 1 + Math.sin(ph * (Math.abs(w.horseSpeed) > 0.2 ? 2 : 1)) * (gaitN === 0 ? 0.012 : 0.02);
      rh.scale.setScalar(breathe);
    }

    // ---- camera ----
    const focus = w.mode === "onfoot" ? w.girlPos : w.horsePos;
    s.cam.update(camera as THREE.PerspectiveCamera, focus, s.cityMeshes, dt);

    s.hudT += dt;
    if (s.hudT > 0.1) {
      s.hudT = 0;
      onHud(toHud(w));
    }
    s.input.endFrame();
  });

  return (
    <>
      <hemisphereLight args={[0xaec2e6, 0x413528, 0.55]} />
      <directionalLight
        position={[38, 52, 24]}
        intensity={2.0}
        color={0xfff2df}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-far={180}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.18} />
      <fog attach="fog" args={[0xcdd6e2, 70, 210]} />
      <color attach="background" args={[0xcdd6e2]} />

      <primitive object={city} />

      {/* invisible safety floor well below street level, for gaps in the mesh */}
      <mesh ref={floorRef} position={[0, GROUND_Y - 1.6, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={girlRef}>
        <group ref={rigGirl}>
          <primitive object={girl} />
        </group>
      </group>
      <group ref={horseRef}>
        <group ref={rigHorse}>
          <primitive object={horse} />
        </group>
      </group>

      {world.debug && <axesHelper args={[4]} />}
    </>
  );
}

function gaitIndex(g: string) {
  return ({ idle: 0, walk: 1, trot: 2, gallop: 3 } as Record<string, number>)[g] ?? 0;
}

function prepChar(src: THREE.Object3D) {
  const o = src.clone(true);
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat) mat.envMapIntensity = 0.7;
    }
  });
  return o;
}
