import * as THREE from "three";
import { CAMERA } from "../config";
import { clamp, damp, lerp } from "./procAnim";

/**
 * Third-person orbit camera with obstacle collision. One instance drives the
 * game camera in every mode; mount/dismount just retargets distance/height and
 * the rig lerps there instead of cutting.
 */
export class CameraRig {
  yaw = Math.PI;
  pitch = 0.25;
  private dist = CAMERA.foot.distance;
  private height = CAMERA.foot.height;
  private fov = CAMERA.foot.fov;
  private target = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private tmp = new THREE.Vector3();
  private desired = new THREE.Vector3();

  rotate(dx: number, dy: number) {
    this.yaw -= dx * CAMERA.sensitivity;
    this.pitch = clamp(this.pitch + dy * CAMERA.sensitivity, CAMERA.minPitch, CAMERA.maxPitch);
  }

  setMode(mode: "foot" | "horse") {
    const c = mode === "foot" ? CAMERA.foot : CAMERA.horse;
    this.distTarget = c.distance;
    this.heightTarget = c.height;
    this.fovTarget = c.fov;
  }
  private distTarget = CAMERA.foot.distance;
  private heightTarget = CAMERA.foot.height;
  private fovTarget = CAMERA.foot.fov;

  update(cam: THREE.PerspectiveCamera, focus: THREE.Vector3, colliders: THREE.Object3D[], dt: number) {
    const k = damp(CAMERA.transitionLerp, dt);
    this.dist = lerp(this.dist, this.distTarget, k);
    this.height = lerp(this.height, this.heightTarget, k);
    this.fov = lerp(this.fov, this.fovTarget, k);

    // smooth the point we orbit
    this.target.x = lerp(this.target.x, focus.x, damp(CAMERA.followLerp, dt));
    this.target.y = lerp(this.target.y, focus.y + this.height, damp(CAMERA.followLerp, dt));
    this.target.z = lerp(this.target.z, focus.z, damp(CAMERA.followLerp, dt));

    const dir = this.tmp.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.desired.copy(this.target).addScaledVector(dir, this.dist);

    // pull in if something is between target and camera
    let d = this.dist;
    if (colliders.length) {
      this.ray.set(this.target, dir);
      this.ray.far = this.dist;
      const hits = this.ray.intersectObjects(colliders, true);
      if (hits.length) d = Math.max(0.6, hits[0].distance - CAMERA.collisionRadius);
    }
    this.desired.copy(this.target).addScaledVector(dir, d);

    cam.position.lerp(this.desired, damp(18, dt));
    cam.lookAt(this.target);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = lerp(cam.fov, this.fov, k);
      cam.updateProjectionMatrix();
    }
  }
}
