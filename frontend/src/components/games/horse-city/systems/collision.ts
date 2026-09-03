import * as THREE from "three";
import { BOUNDS, GROUND_Y } from "../config";

/**
 * Lightweight collision against the static city mesh: a downward ray for ground
 * height, and a ring of horizontal rays for walls. Cheap enough to run for both
 * the girl and the horse every frame.
 */
export class CityCollider {
  private ray = new THREE.Raycaster();
  private down = new THREE.Vector3(0, -1, 0);
  private meshes: THREE.Object3D[] = [];
  private origin = new THREE.Vector3();
  private dir = new THREE.Vector3();

  setWorld(root: THREE.Object3D) {
    this.meshes = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) this.meshes.push(m);
    });
  }

  /** Ground Y under a point. Falls back to the safety floor where the city
   *  mesh has a gap, so nothing can ever drop through the world. */
  groundAt(x: number, z: number, fromY: number): number | null {
    this.origin.set(x, Math.max(fromY, GROUND_Y) + 6, z);
    this.ray.set(this.origin, this.down);
    this.ray.far = 60;
    const hits = this.ray.intersectObjects(this.meshes, false);
    // ignore ceilings well above the search origin's feet
    const hit = hits.find((hh) => hh.point.y <= fromY + 3.5) ?? hits[0];
    if (hit && hit.point.y >= GROUND_Y - 2) return hit.point.y;
    return GROUND_Y;
  }
  /** Raw mesh ground with no fallback — for the pre-spawn drop. */
  rawGroundAt(x: number, z: number, fromY: number): number | null {
    this.origin.set(x, fromY, z);
    this.ray.set(this.origin, this.down);
    this.ray.far = 120;
    const hit = this.ray.intersectObjects(this.meshes, false)[0];
    return hit ? hit.point.y : null;
  }

  /**
   * Given a desired horizontal move, returns an adjusted move that slides along
   * walls and respects the play boundary.
   */
  resolveMove(pos: THREE.Vector3, move: THREE.Vector3, radius: number): THREE.Vector3 {
    const out = move.clone();
    const len = out.length();
    if (len > 1e-4) {
      this.dir.copy(out).normalize();
      // probe at knee + chest height; only near-vertical surfaces count as walls
      for (const h of [0.5, 1.4]) {
        this.origin.set(pos.x, pos.y + h, pos.z);
        this.ray.set(this.origin, this.dir);
        this.ray.far = len + radius;
        const hit = this.ray.intersectObjects(this.meshes, false)[0];
        if (!hit || !hit.face || hit.distance > len + radius) continue;
        const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        if (Math.abs(n.y) > 0.6) continue; // floor / ceiling, not a wall
        n.y = 0;
        n.normalize();
        const into = out.dot(n);
        if (into < 0) out.addScaledVector(n, -into);
      }
    }
    // hard play boundary
    const nx = pos.x + out.x;
    const nz = pos.z + out.z;
    if (nx > BOUNDS.x || nx < -BOUNDS.x) out.x = 0;
    if (nz > BOUNDS.z || nz < -BOUNDS.z) out.z = 0;
    return out;
  }

  get objects() {
    return this.meshes;
  }
}
