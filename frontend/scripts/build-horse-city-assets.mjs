/**
 * HOOFBEAT asset pipeline.
 *
 * The source assets are dense photogrammetry OBJ scans (~525 MB across ~30 parts,
 * no usable .mtl, city has no textures). This script:
 *   1. converts every OBJ part to a temp GLB (obj2gltf, default material)
 *   2. merges the parts of each subject into one document
 *   3. welds + simplifies geometry hard (web budget)
 *   4. assigns stylised PBR materials (procedural, since MTLs are missing)
 *   5. resizes/compresses textures and Draco-compresses geometry
 *   6. writes frontend/public/models/horse-city/{city,girl,horse}.glb
 *
 * Run from frontend/:  node scripts/build-horse-city-assets.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  weld, simplify, dedup, prune, resample, textureCompress, draco, flatten, join as joinMeshes,
  mergeDocuments,
} from "@gltf-transform/functions";
import { getBounds } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import sharp from "sharp";
import obj2gltf from "obj2gltf";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DL = "C:/Users/XC/Downloads";
const OUT = join(HERE, "..", "public", "models", "horse-city");
const TMP = join(HERE, "..", ".asset-tmp");

const SUBJECTS = {
  city: {
    dir: `${DL}/Medieval City Pack Demo (1)`,
    simplifyRatio: 0.28,
    material: "city",
    // photogrammetry units are ~mm; bring to metres, sit on ground, centre in XZ
    norm: { scale: 0.0018, rotX: 0, groundY: 0, centreXZ: true },
  },
  girl: {
    dir: `${DL}/LeeAnna Vamp - Firefly Cosplay`,
    simplifyRatio: 0.08,
    texture: `${DL}/LeeAnna Vamp - Firefly Cosplay/leeanna vamp texture4096.png`,
    material: "girl",
    // scan is lying along +Z — stand her up, real scale is already ~metres
    norm: { scale: 1, rotX: -Math.PI / 2, groundY: 0, centreXZ: true },
  },
  horse: {
    dir: `${DL}/Midnight Black Horse 3d model free`,
    simplifyRatio: 0.05,
    material: "horse",
    norm: { scale: 1.3, rotX: 0, groundY: 0, centreXZ: true },
  },
};

async function objPartsToGlb(subjectDir, tmpDir) {
  mkdirSync(tmpDir, { recursive: true });
  const { writeFileSync } = await import("node:fs");
  const parts = readdirSync(subjectDir)
    .filter((f) => f.toLowerCase().endsWith(".obj"))
    .sort();
  const glbs = [];
  for (const p of parts) {
    const src = join(subjectDir, p);
    if (statSync(src).size < 4096) continue; // skip stray/empty parts
    const dst = join(tmpDir, basename(p, ".obj") + ".glb");
    if (existsSync(dst) && statSync(dst).size > 0) {
      console.log(`  cached ${p}`);
      glbs.push(dst);
      continue;
    }
    console.log(`  obj2gltf ${p} (${(statSync(src).size / 1e6).toFixed(1)} MB)`);
    const glb = await obj2gltf(src, { binary: true, unlit: false, separate: false });
    writeFileSync(dst, Buffer.from(glb));
    glbs.push(dst);
  }
  return glbs;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });
  await MeshoptSimplifier.ready;

  for (const [name, cfg] of Object.entries(SUBJECTS)) {
    console.log(`\n=== ${name} ===`);
    const tmpDir = join(TMP, name);
    const glbs = await objPartsToGlb(cfg.dir, tmpDir);

    // merge all parts into one document
    const doc = await io.read(glbs[0]);
    for (const g of glbs.slice(1)) mergeDocuments(doc, await io.read(g));
    // collapse the many imported scenes into one
    const scenes = doc.getRoot().listScenes();
    const main = scenes[0];
    for (const s of scenes.slice(1)) {
      for (const n of s.listChildren()) main.addChild(n);
      s.dispose();
    }
    doc.getRoot().setDefaultScene(main);

    if (cfg.norm) normalize(doc, main, cfg.norm);

    console.log("  weld / simplify / dedup / prune …");
    await doc.transform(
      dedup(),
      flatten(),
      joinMeshes(),
      weld({ tolerance: 0.0001 }),
      simplify({ simplifier: MeshoptSimplifier, ratio: cfg.simplifyRatio, error: 0.02 }),
      prune(),
    );

    // stylised material (MTLs are missing from every source)
    applyMaterial(doc, cfg.material);

    if (cfg.texture && existsSync(cfg.texture)) {
      await attachBaseColor(doc, cfg.texture);
    }

    console.log("  textures + draco …");
    await doc.transform(
      resample(),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [2048, 2048] }),
      draco({ method: "edgebreaker" }),
    );

    const outPath = join(OUT, `${name}.glb`);
    await io.write(outPath, doc);
    console.log(`  -> ${outPath}  ${(statSync(outPath).size / 1e6).toFixed(2)} MB`);
  }

  console.log("\nDone. (temp GLBs kept in .asset-tmp for re-runs)");
}

/** Wrap the scene in a node that scales / stands-up / grounds / centres it. */
function normalize(doc, scene, n) {
  const b = getBounds(scene); // { min:[x,y,z], max:[x,y,z] }
  const s = n.scale;
  const c = Math.cos(n.rotX);
  const si = Math.sin(n.rotX);
  const rot = (p) => [p[0], p[1] * c - p[2] * si, p[1] * si + p[2] * c];
  let mn = [Infinity, Infinity, Infinity];
  let mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
    const raw = [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]];
    const p = rot([raw[0] * s, raw[1] * s, raw[2] * s]);
    for (let k = 0; k < 3; k++) {
      mn[k] = Math.min(mn[k], p[k]);
      mx[k] = Math.max(mx[k], p[k]);
    }
  }
  const t = [
    n.centreXZ ? -(mn[0] + mx[0]) / 2 : 0,
    (n.groundY ?? 0) - mn[1],
    n.centreXZ ? -(mn[2] + mx[2]) / 2 : 0,
  ];
  const wrap = doc.createNode("normalized")
    .setScale([s, s, s])
    .setRotation([Math.sin(n.rotX / 2), 0, 0, Math.cos(n.rotX / 2)])
    .setTranslation(t);
  for (const child of scene.listChildren()) wrap.addChild(child);
  scene.addChild(wrap);
  console.log(
    `  normalized -> size [${(mx[0] - mn[0]).toFixed(1)}, ${(mx[1] - mn[1]).toFixed(1)}, ${(mx[2] - mn[2]).toFixed(1)}] m`,
  );
}

function applyMaterial(doc, kind) {
  const mats = doc.getRoot().listMaterials();
  const set = (m, base, metal, rough) => {
    m.setBaseColorFactor(base);
    m.setMetallicFactor(metal);
    m.setRoughnessFactor(rough);
  };
  for (const m of mats) {
    if (kind === "horse") set(m, [0.06, 0.055, 0.06, 1], 0.1, 0.55);
    else if (kind === "girl") set(m, [0.8, 0.72, 0.66, 1], 0.0, 0.7);
    else set(m, [0.62, 0.58, 0.5, 1], 0.0, 0.9); // city stone
  }
  if (mats.length === 0 && kind) {
    const m = doc.createMaterial(kind);
    if (kind === "horse") set(m, [0.06, 0.055, 0.06, 1], 0.1, 0.55);
    else if (kind === "girl") set(m, [0.8, 0.72, 0.66, 1], 0.0, 0.7);
    else set(m, [0.62, 0.58, 0.5, 1], 0.0, 0.9);
    for (const mesh of doc.getRoot().listMeshes())
      for (const prim of mesh.listPrimitives()) prim.setMaterial(m);
  }
}

async function attachBaseColor(doc, file) {
  const buf = await sharp(file).resize(2048, 2048, { fit: "inside" }).webp({ quality: 88 }).toBuffer();
  const tex = doc.createTexture("baseColor").setImage(buf).setMimeType("image/webp");
  for (const m of doc.getRoot().listMaterials()) {
    m.setBaseColorTexture(tex);
    m.setBaseColorFactor([1, 1, 1, 1]);
    m.setRoughnessFactor(0.72);
    m.setMetallicFactor(0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
