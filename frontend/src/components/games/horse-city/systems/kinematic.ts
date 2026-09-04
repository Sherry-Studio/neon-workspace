import * as THREE from "three";
import { BOUNDS } from "../config";
import { KinematicBody } from "./controller";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Raycast collide-and-slide against the city mesh (a three.js Raycaster, no
 * physics engine). Ground is a single down ray; walls are a small fan of
 * forward rays that project movement along the surface. `position` is the FEET.
 */
export function makeCharacterBody(
  colliders: THREE.Object3D[],
  halfHeight: number, // feet -> shape centre
  radius: number,
  feetStart: THREE.Vector3,
): { body: KinematicBody } {
  const center = new THREE.Vector3(feetStart.x, feetStart.y + halfHeight, feetStart.z);
  const feet = feetStart.clone();
  let grounded = true;

  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true as never; // harmless if BVH not present
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const wallN = new THREE.Vector3();
  const DOWN = new THREE.Vector3(0, -1, 0);

  const cast = (ox: number, oy: number, oz: number, d: THREE.Vector3, far: number) => {
    origin.set(ox, oy, oz);
    ray.set(origin, d);
    ray.near = 0;
    ray.far = far;
    const hits = ray.intersectObjects(colliders, false);
    return hits.length ? hits[0] : null;
  };

  const body: KinematicBody = {
    get position() {
      return feet;
    },
    setPosition(p: THREE.Vector3) {
      feet.copy(p);
      center.set(p.x, p.y + halfHeight, p.z);
    },
    moveAndSlide(delta: THREE.Vector3) {
      // ---- walls ----
      const horiz = new THREE.Vector3(delta.x, 0, delta.z);
      let hdist = horiz.length();
      if (hdist > 1e-4) {
        for (let pass = 0; pass < 2; pass++) {
          dir.copy(horiz).multiplyScalar(1 / Math.max(hdist, 1e-4));
          let blocked = false;
          for (const hy of [0.3, 1.0, 1.6]) {
            const hit = cast(center.x, center.y - halfHeight + hy, center.z, dir, hdist + radius + 0.05);
            if (hit && hit.face && hit.distance < hdist + radius) {
              wallN.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
              wallN.y = 0;
              if (wallN.lengthSq() < 1e-5) continue;
              wallN.normalize();
              const into = horiz.dot(wallN);
              if (into < 0) {
                horiz.addScaledVector(wallN, -into);
                blocked = true;
              }
            }
          }
          hdist = horiz.length();
          if (!blocked || hdist < 1e-4) break;
        }
        center.x += horiz.x;
        center.z += horiz.z;
      }
      // invisible play boundary
      center.x = clamp(center.x, -BOUNDS.x, BOUNDS.x);
      center.z = clamp(center.z, -BOUNDS.z, BOUNDS.z);

      // ---- ground: thin down ray from just above the feet ----
      const feetY = center.y - halfHeight;
      const STEP = 0.3;
      const fall = Math.max(0, -delta.y);
      const gHit = cast(center.x, feetY + STEP, center.z, DOWN, STEP + fall + 0.6);
      const flatY = gHit && gHit.face
        ? new THREE.Vector3().copy(gHit.face.normal).transformDirection(gHit.object.matrixWorld).y
        : 0;
      if (gHit && flatY > 0.5) {
        const groundY = feetY + STEP - gHit.distance;
        const gap = groundY - feetY;
        if (gap > 0.01) {
          center.y += Math.min(gap, STEP);
          grounded = true;
        } else if (delta.y <= 0 && feetY + delta.y <= groundY + 0.05) {
          center.y = groundY + halfHeight;
          grounded = true;
        } else {
          center.y += delta.y;
          grounded = false;
        }
      } else {
        center.y += delta.y;
        grounded = false;
      }

      feet.set(center.x, center.y - halfHeight, center.z);
      return grounded;
    },
  };

  return { body };
}
