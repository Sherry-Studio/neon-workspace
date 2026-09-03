/* ============================================================
   NEON ORBIT — ProjectileSystem  (Phase 3)
   ------------------------------------------------------------
   Scaffolding: a fixed pool so the scene can render an
   instanced mesh over `pool` from day one of combat. No spawns
   yet.
   ============================================================ */

import * as THREE from "three";
import type { EnemySystem } from "./EnemySystem";

export interface Projectile {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
}

export class ProjectileSystem {
  readonly pool: Projectile[] = Array.from({ length: 256 }, () => ({
    active: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    life: 0,
    damage: 0,
  }));

  spawn(pos: THREE.Vector3, dir: THREE.Vector3, speed: number, damage: number) {
    const p = this.pool.find((x) => !x.active);
    if (!p) return;
    p.active = true;
    p.pos.copy(pos);
    p.vel.copy(dir).normalize().multiplyScalar(speed);
    p.life = 2.2;
    p.damage = damage;
  }

  update(dt: number, enemies: EnemySystem) {
    void enemies;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.pos.addScaledVector(p.vel, dt);
      p.life -= dt;
      if (p.life <= 0) p.active = false;
      // Phase 3: collide against enemies
    }
  }
}
