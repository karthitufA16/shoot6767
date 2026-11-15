import * as THREE from 'three';
import { ContainerTextureSet, TerrainTextureSet } from './textures';
import { createHydroDomeWaterMaterial, createWaterfallMaterial } from './water';
import {
  ARENA_MAPS,
  LoadoutConfig,
  MapId,
  MELEE_WEAPONS,
  PRIMARY_WEAPONS,
  SECONDARY_WEAPONS,
  TeamSide,
  UTILITY_ITEMS,
  WeaponSkinId,
} from './types';
import {
  resolveGunSpec,
  resolveMeleeSpec,
  resolveUtilitySpec,
  WeaponBuildsMap,
} from './weaponTemplates';

export interface ArenaBox {
  x: number;
  z: number;
  w: number;
  h: number;
  minY?: number;
  d: number;
  kind: 'a' | 'b' | 'neutral';
  legs?: boolean;
}

export interface ElevatedDeckSlab {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface BouncePadSpec {
  id: number;
  x: number;
  z: number;
  y: number;
  radius: number;
  impulseY: number;
  color: number;
  label: string;
}

const MAP_BOUNCE_PADS: Record<MapId, BouncePadSpec[]> = {
  arena: [],
  construction: [],
  hydro: [],
  docks: [],
  splash: [
    { id: 0, x: 0, z: 0, y: 0.25, radius: 3.1, impulseY: 19.5, color: 0xfacc15, label: 'MEGA' },
    { id: 1, x: 0, z: 14.5, y: 0.2, radius: 2.2, impulseY: 16.0, color: 0x38bdf8, label: 'BOOST' },
    { id: 2, x: 0, z: -14.5, y: 0.2, radius: 2.2, impulseY: 16.0, color: 0xf43f5e, label: 'BOOST' },
    { id: 3, x: -18.0, z: 0, y: 0.2, radius: 2.2, impulseY: 15.6, color: 0x10b981, label: 'BOING' },
    { id: 4, x: 18.0, z: 0, y: 0.2, radius: 2.2, impulseY: 15.6, color: 0xa855f7, label: 'BOING' },
    { id: 5, x: -15.0, z: 14.0, y: 0.2, radius: 2.15, impulseY: 15.2, color: 0xf97316, label: 'JUMP' },
    { id: 6, x: 15.0, z: 14.0, y: 0.2, radius: 2.15, impulseY: 15.2, color: 0x06b6d4, label: 'JUMP' },
    { id: 7, x: -15.0, z: -14.0, y: 0.2, radius: 2.15, impulseY: 15.2, color: 0xec4899, label: 'JUMP' },
    { id: 8, x: 15.0, z: -14.0, y: 0.2, radius: 2.15, impulseY: 15.2, color: 0x84cc16, label: 'JUMP' },
  ],
};

export function getMapBouncePads(mapId: MapId): BouncePadSpec[] {
  return MAP_BOUNCE_PADS[mapId];
}

const MAP_BOXES: Record<MapId, ArenaBox[]> = {
  arena: [
    { x: -10.5, z: 16.5, w: 6.2, h: 3.1, d: 2.8, kind: 'a' },
    { x: 10.5, z: 16.5, w: 6.2, h: 3.1, d: 2.8, kind: 'a' },
    { x: -10.5, z: -16.5, w: 6.2, h: 3.1, d: 2.8, kind: 'b' },
    { x: 10.5, z: -16.5, w: 6.2, h: 3.1, d: 2.8, kind: 'b' },
    { x: -19.5, z: 0, w: 4.2, minY: 2.6, h: 5.1, d: 7.5, kind: 'neutral', legs: true },
    { x: 19.5, z: 0, w: 4.2, minY: 2.6, h: 5.1, d: 7.5, kind: 'neutral', legs: true },
    { x: 0, z: 22.5, w: 5.4, h: 1.4, d: 1.3, kind: 'neutral' },
    { x: 0, z: -22.5, w: 5.4, h: 1.4, d: 1.3, kind: 'neutral' },
  ],
  construction: [
    { x: -5.5, z: 12.0, w: 3.2, h: 3.0, d: 3.2, kind: 'neutral' },
    { x: 5.5, z: 12.0, w: 3.2, h: 3.0, d: 3.2, kind: 'neutral' },
    { x: -5.5, z: -12.0, w: 3.2, h: 3.0, d: 3.2, kind: 'neutral' },
    { x: 5.5, z: -12.0, w: 3.2, h: 3.0, d: 3.2, kind: 'neutral' },
    { x: 0, z: 21.0, w: 6.8, h: 1.5, d: 1.5, kind: 'a' },
    { x: 0, z: -21.0, w: 6.8, h: 1.5, d: 1.5, kind: 'b' },
    { x: -22.0, z: 0, w: 4.2, minY: 2.6, h: 5.0, d: 7.4, kind: 'a', legs: true },
    { x: 22.0, z: 0, w: 4.2, minY: 2.6, h: 5.0, d: 7.4, kind: 'b', legs: true },
  ],
  hydro: [
    { x: -16.5, z: 13.5, w: 4.8, h: 2.8, d: 3.2, kind: 'a' },
    { x: 16.5, z: 13.5, w: 4.8, h: 2.8, d: 3.2, kind: 'a' },
    { x: -16.5, z: -13.5, w: 4.8, h: 2.8, d: 3.2, kind: 'b' },
    { x: 16.5, z: -13.5, w: 4.8, h: 2.8, d: 3.2, kind: 'b' },
    { x: -21.0, z: 0, w: 4.2, minY: 2.55, h: 4.65, d: 6.2, kind: 'neutral', legs: true },
    { x: 21.0, z: 0, w: 4.2, minY: 2.55, h: 4.65, d: 6.2, kind: 'neutral', legs: true },
    { x: 0, z: 21.5, w: 5.6, h: 1.35, d: 1.4, kind: 'a' },
    { x: 0, z: -21.5, w: 5.6, h: 1.35, d: 1.4, kind: 'b' },
  ],
  splash: [
    { x: 0, z: 24.5, w: 6.2, h: 1.4, d: 1.4, kind: 'a' },
    { x: 0, z: -24.5, w: 6.2, h: 1.4, d: 1.4, kind: 'b' },
    { x: -10.5, z: 10.5, w: 3.4, h: 2.2, d: 2.6, kind: 'a' },
    { x: 10.5, z: 10.5, w: 3.4, h: 2.2, d: 2.6, kind: 'a' },
    { x: -10.5, z: -10.5, w: 3.4, h: 2.2, d: 2.6, kind: 'b' },
    { x: 10.5, z: -10.5, w: 3.4, h: 2.2, d: 2.6, kind: 'b' },
    { x: -22.5, z: 0, w: 3.6, minY: 2.5, h: 4.5, d: 5.6, kind: 'neutral', legs: true },
    { x: 22.5, z: 0, w: 3.6, minY: 2.5, h: 4.5, d: 5.6, kind: 'neutral', legs: true },
  ],
  docks: [
    { x: -7.5, z: 8.5, w: 6.6, minY: 2.6, h: 5.1, d: 3.8, kind: 'a', legs: true },
    { x: 7.5, z: -8.5, w: 6.6, minY: 2.6, h: 5.1, d: 3.8, kind: 'b', legs: true },
    { x: 8.0, z: 16.0, w: 6.4, h: 3.3, d: 2.9, kind: 'a' },
    { x: -8.0, z: -16.0, w: 6.4, h: 3.3, d: 2.9, kind: 'b' },
    { x: 0, z: 0, w: 6.8, minY: 2.75, h: 5.25, d: 4.8, kind: 'neutral', legs: true },
    { x: -6.5, z: 23.0, w: 4.6, h: 1.45, d: 1.4, kind: 'a' },
    { x: 6.5, z: -23.0, w: 4.6, h: 1.45, d: 1.4, kind: 'b' },
  ],
};

export function getMapBoxes(mapId: MapId): ArenaBox[] {
  return MAP_BOXES[mapId];
}

const ELEVATED_DECK_SLABS: Record<MapId, ElevatedDeckSlab[]> = {
  arena: [{ minX: -5.3, maxX: 5.3, minZ: -5.6, maxZ: 5.6, minY: 2.61, maxY: 2.95 }],
  construction: [
    { minX: -17.5, maxX: -10.5, minZ: -11.0, maxZ: 11.0, minY: 2.61, maxY: 2.95 },
    { minX: 10.5, maxX: 17.5, minZ: -11.0, maxZ: 11.0, minY: 2.61, maxY: 2.95 },
    { minX: -10.5, maxX: 10.5, minZ: -2.6, maxZ: 2.6, minY: 2.61, maxY: 2.95 },
  ],
  hydro: [{ minX: -6.8, maxX: 6.8, minZ: -6.8, maxZ: 6.8, minY: 2.32, maxY: 2.65 }],
  splash: [
    { minX: -14.0, maxX: -9.0, minZ: -3.5, maxZ: 3.5, minY: 2.25, maxY: 2.58 },
    { minX: 9.0, maxX: 14.0, minZ: -3.5, maxZ: 3.5, minY: 2.25, maxY: 2.58 },
  ],
  docks: [
    { minX: -24.0, maxX: -16.0, minZ: -8.5, maxZ: 8.5, minY: 2.61, maxY: 2.95 },
    { minX: 16.0, maxX: 24.0, minZ: -8.5, maxZ: 8.5, minY: 2.61, maxY: 2.95 },
  ],
};

export function getMapDeckSlabs(mapId: MapId): ElevatedDeckSlab[] {
  return ELEVATED_DECK_SLABS[mapId];
}

export interface ElevatedSupportInfo {
  surfY: number;
  underY: number;
  isRamp: boolean;
}

export function getElevatedSurfaceAt(mapId: MapId, x: number, z: number): ElevatedSupportInfo | null {
  const absX = Math.abs(x);
  const absZ = Math.abs(z);

  if (mapId === 'arena') {
    if (absX <= 5.2 && absZ <= 5.5) return { surfY: 2.95, underY: 2.61, isRamp: false };
    if (absX > 5.2 && absX <= 13.6 && absZ <= 3.4) {
      const s = (1 - (absX - 5.2) / 8.4) * 2.95;
      return { surfY: s, underY: s - 0.34, isRamp: true };
    }
  } else if (mapId === 'construction') {
    if (absX >= 10.5 && absX <= 17.5 && absZ <= 11.0) return { surfY: 2.95, underY: 2.61, isRamp: false };
    if (absX <= 10.5 && absZ <= 2.6) return { surfY: 2.95, underY: 2.61, isRamp: false };
    if (absX >= 11.5 && absX <= 16.5 && absZ > 11.0 && absZ <= 19.6) {
      const s = (1 - (absZ - 11.0) / 8.6) * 2.95;
      return { surfY: s, underY: s - 0.3, isRamp: true };
    }
  } else if (mapId === 'hydro') {
    if (absX <= 6.8 && absZ <= 6.8) return { surfY: 2.65, underY: 2.32, isRamp: false };
    if (absX > 6.8 && absX <= 13.4 && absZ <= 2.8) {
      const s = (1 - (absX - 6.8) / 6.6) * 2.65;
      return { surfY: s, underY: s - 0.28, isRamp: true };
    }
    if (absZ > 6.8 && absZ <= 13.4 && absX <= 2.8) {
      const s = (1 - (absZ - 6.8) / 6.6) * 2.65;
      return { surfY: s, underY: s - 0.28, isRamp: true };
    }
  } else if (mapId === 'splash') {
    if (absX >= 9.0 && absX <= 14.0 && absZ <= 3.5) {
      return { surfY: 2.58, underY: 2.25, isRamp: false };
    }
    if (absX >= 9.2 && absX <= 13.8 && absZ > 3.5 && absZ <= 10.5) {
      const s = (1 - (absZ - 3.5) / 7.0) * 2.58;
      return { surfY: s, underY: s - 0.28, isRamp: true };
    }
  } else if (mapId === 'docks') {
    if (absX >= 16.0 && absX <= 24.0 && absZ <= 8.5) return { surfY: 2.95, underY: 2.61, isRamp: false };
    if (absX >= 16.0 && absX <= 24.0 && absZ > 8.5 && absZ <= 17.1) {
      const s = (1 - (absZ - 8.5) / 8.6) * 2.95;
      return { surfY: s, underY: s - 0.3, isRamp: true };
    }
  }

  return null;
}

/**
 * Multi-level floor/ramp/bridge/underpass elevation per map.
 * Pass currentFootY when simulating grounded/underpass traversal so entities below a structure
 * walk cleanly underneath instead of snapping to the roof.
 */
export function getMapFloorHeightAt(
  mapId: MapId,
  x: number,
  z: number,
  currentFootY = 10
): number {
  const spec = ARENA_MAPS[mapId];
  const absX = Math.abs(x);
  const absZ = Math.abs(z);

  const elev = getElevatedSurfaceAt(mapId, x, z);
  if (elev && currentFootY >= elev.surfY - 0.95) {
    return elev.surfY;
  }

  for (const box of MAP_BOXES[mapId]) {
    if (
      Math.abs(x - box.x) <= box.w / 2 &&
      Math.abs(z - box.z) <= box.d / 2 &&
      currentFootY >= box.h - 0.35
    ) {
      return box.h;
    }
  }

  if (mapId === 'hydro' && absX <= 13.5 && absZ <= 13.5) {
    return -0.35;
  }

  // Outer rolling terrain beyond arena perimeter
  if (mapId === 'hydro') {
    if (absX > spec.halfX + 1 || absZ > spec.halfZ + 1) {
      const dx = Math.max(0, absX - (spec.halfX + 1));
      const dz = Math.max(0, absZ - (spec.halfZ + 1));
      const dist = Math.hypot(dx, dz);
      // Submerged outer tropical ocean lagoon from seawall out to ~46-50m
      if (dist <= 16) return -1.2;
      const coastalDist = dist - 16;
      const t = Math.min(1, coastalDist / 26);
      const ridge = t * t * (7.2 + Math.sin(x * 0.07) * Math.cos(z * 0.07) * 3.4);
      return -1.2 + ridge;
    }
    return 0;
  }

  if (mapId === 'splash') {
    if (absX <= 9.5 && absZ >= 26.8 && absZ <= 31.8) {
      return 0.22;
    }
    if (absX <= 14.0 && absZ <= 14.0) {
      return -0.38;
    }
    if (absX > spec.halfX + 1 || absZ > spec.halfZ + 1) {
      const dx = Math.max(0, absX - (spec.halfX + 1));
      const dz = Math.max(0, absZ - (spec.halfZ + 1));
      const dist = Math.hypot(dx, dz);
      if (dist <= 18) return -1.1;
      const coastalDist = dist - 18;
      const t = Math.min(1, coastalDist / 26);
      const ridge = t * t * (6.8 + Math.sin(x * 0.07) * Math.cos(z * 0.07) * 3.2);
      return -1.1 + ridge;
    }
    return -0.18;
  }

  if (absX > spec.halfX + 4 || absZ > spec.halfZ + 4) {
    const dx = Math.max(0, absX - (spec.halfX + 4));
    const dz = Math.max(0, absZ - (spec.halfZ + 4));
    const dist = Math.hypot(dx, dz);
    const t = Math.min(1, dist / 38);
    return t * t * (6.2 + Math.sin(x * 0.07) * Math.cos(z * 0.07) * 3.5);
  }

  return 0;
}

/**
 * Returns the underside ceiling height above an entity standing underneath an elevated deck,
 * ramp, or raised shipping container. Returns Infinity when open sky is overhead.
 */
export function getMapCeilingHeightAt(
  mapId: MapId,
  x: number,
  z: number,
  currentFootY: number
): number {
  let ceil = Infinity;
  const elev = getElevatedSurfaceAt(mapId, x, z);
  if (elev && currentFootY < elev.surfY - 0.95 && elev.underY > 0.1) {
    ceil = Math.min(ceil, elev.underY);
  }
  for (const box of MAP_BOXES[mapId]) {
    const minY = box.minY ?? 0;
    if (
      minY > 0.25 &&
      currentFootY < minY &&
      Math.abs(x - box.x) <= box.w / 2 + 0.35 &&
      Math.abs(z - box.z) <= box.d / 2 + 0.35
    ) {
      ceil = Math.min(ceil, minY);
    }
  }
  return ceil;
}

export interface MaterialPalette {
  armorDark: THREE.MeshStandardMaterial;
  armorSlate: THREE.MeshStandardMaterial;
  matteTrim: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  gunmetal: THREE.MeshStandardMaterial;
  opticGlass: THREE.MeshStandardMaterial;
  sleeveFabric: THREE.MeshStandardMaterial;
  gloveDark: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  blueTeam: THREE.MeshStandardMaterial;
  redTeam: THREE.MeshStandardMaterial;
  visorGlow: THREE.MeshStandardMaterial;
  visorGlowBlue: THREE.MeshStandardMaterial;
  skinTone: THREE.MeshStandardMaterial;
  containerA: THREE.MeshStandardMaterial;
  containerB: THREE.MeshStandardMaterial;
  containerNeutral: THREE.MeshStandardMaterial;
  bridgeDeck: THREE.MeshStandardMaterial;
  rockMat: THREE.MeshStandardMaterial;
  concreteMat: THREE.MeshStandardMaterial;
  hazardOrange: THREE.MeshStandardMaterial;
  robotChassis: THREE.MeshPhysicalMaterial;
  robotArmor: THREE.MeshPhysicalMaterial;
  robotJoint: THREE.MeshStandardMaterial;
  robotChrome: THREE.MeshPhysicalMaterial;
  robotCopper: THREE.MeshPhysicalMaterial;
  robotTeamBlue: THREE.MeshPhysicalMaterial;
  robotTeamRed: THREE.MeshPhysicalMaterial;
  robotOpticGlass: THREE.MeshPhysicalMaterial;
  robotEmissiveBlue: THREE.MeshStandardMaterial;
  robotEmissiveRed: THREE.MeshStandardMaterial;
}

export function createMaterialPalette(
  texA: ContainerTextureSet,
  texB: ContainerTextureSet,
  texNeutral: ContainerTextureSet,
  bridgeTex?: TerrainTextureSet,
  gunmetalTex?: TerrainTextureSet,
  fabricTex?: TerrainTextureSet,
  concreteTex?: TerrainTextureSet,
  rockTex?: TerrainTextureSet
): MaterialPalette {
  return {
    armorDark: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: gunmetalTex?.roughnessMap ?? null,
      metalness: 0,
      roughness: 0.9,
      envMapIntensity: 0,
    }),
    armorSlate: new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: gunmetalTex?.roughnessMap ?? null,
      metalness: 0,
      roughness: 0.9,
      envMapIntensity: 0,
    }),
    matteTrim: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0,
      roughness: 0.95,
      envMapIntensity: 0,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.3, 0.3),
      metalness: 0,
      roughness: 0.88,
      envMapIntensity: 0,
    }),
    gunmetal: new THREE.MeshStandardMaterial({
      color: gunmetalTex ? 0x64748b : 0x262d38,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: gunmetalTex?.roughnessMap ?? null,
      metalness: 0,
      roughness: 0.9,
      envMapIntensity: 0,
    }),
    opticGlass: new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      metalness: 0,
      roughness: 0.85,
      transparent: true,
      opacity: 0.1,
      envMapIntensity: 0,
    }),
    sleeveFabric: new THREE.MeshStandardMaterial({
      color: fabricTex ? 0x475569 : 0x1e2430,
      map: fabricTex?.map ?? null,
      normalMap: fabricTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: fabricTex?.roughnessMap ?? null,
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0,
    }),
    gloveDark: new THREE.MeshStandardMaterial({
      color: fabricTex ? 0x334155 : 0x111827,
      map: fabricTex?.map ?? null,
      normalMap: fabricTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: fabricTex?.roughnessMap ?? null,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0,
      roughness: 0.88,
      envMapIntensity: 0,
    }),
    blueTeam: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0,
    }),
    redTeam: new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0,
    }),
    visorGlow: new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0,
    }),
    visorGlowBlue: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0,
    }),
    skinTone: new THREE.MeshStandardMaterial({
      color: 0xc68b67,
      roughness: 0.86,
      metalness: 0,
      envMapIntensity: 0,
    }),
    containerA: new THREE.MeshStandardMaterial({
      map: texA.map,
      normalMap: texA.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: texA.roughnessMap,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0,
    }),
    containerB: new THREE.MeshStandardMaterial({
      map: texB.map,
      normalMap: texB.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: texB.roughnessMap,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0,
    }),
    containerNeutral: new THREE.MeshStandardMaterial({
      map: texNeutral.map,
      normalMap: texNeutral.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: texNeutral.roughnessMap,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0,
    }),
    bridgeDeck: new THREE.MeshStandardMaterial({
      color: bridgeTex ? 0xdbeafe : 0x64748b,
      map: bridgeTex?.map ?? null,
      normalMap: bridgeTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: bridgeTex?.roughnessMap ?? null,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0,
    }),
    rockMat: new THREE.MeshStandardMaterial({
      color: rockTex ? 0x94a3b8 : 0x64748b,
      map: rockTex?.map ?? concreteTex?.map ?? null,
      normalMap: rockTex?.normalMap ?? concreteTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: rockTex?.roughnessMap ?? concreteTex?.roughnessMap ?? null,
      roughness: 0.96,
      metalness: 0,
      envMapIntensity: 0,
    }),
    concreteMat: new THREE.MeshStandardMaterial({
      color: concreteTex ? 0xd1d5db : 0x9ca3af,
      map: concreteTex?.map ?? null,
      normalMap: concreteTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: concreteTex?.roughnessMap ?? null,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0,
    }),
    hazardOrange: new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0,
    }),
    robotChassis: new THREE.MeshPhysicalMaterial({
      color: 0x1e2530,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: gunmetalTex?.roughnessMap ?? null,
      metalness: 0.72,
      roughness: 0.46,
      clearcoat: 0.22,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.05,
    }),
    robotArmor: new THREE.MeshPhysicalMaterial({
      color: 0x717d8c,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: gunmetalTex?.roughnessMap ?? null,
      metalness: 0.86,
      roughness: 0.26,
      anisotropy: 0.75,
      clearcoat: 0.32,
      clearcoatRoughness: 0.24,
      envMapIntensity: 1.1,
    }),
    robotJoint: new THREE.MeshStandardMaterial({
      color: 0x0d121a,
      normalMap: fabricTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.45, 0.45),
      metalness: 0.12,
      roughness: 0.84,
      envMapIntensity: 0.55,
    }),
    robotChrome: new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.25, 0.25),
      metalness: 0.96,
      roughness: 0.12,
      anisotropy: 0.8,
      envMapIntensity: 1.25,
    }),
    robotCopper: new THREE.MeshPhysicalMaterial({
      color: 0xc26d27,
      metalness: 0.9,
      roughness: 0.2,
      anisotropy: 0.5,
      envMapIntensity: 1.05,
    }),
    robotTeamBlue: new THREE.MeshPhysicalMaterial({
      color: 0x0369a1,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.35, 0.35),
      metalness: 0.44,
      roughness: 0.3,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.05,
    }),
    robotTeamRed: new THREE.MeshPhysicalMaterial({
      color: 0xbe123c,
      map: gunmetalTex?.map ?? null,
      normalMap: gunmetalTex?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.35, 0.35),
      metalness: 0.44,
      roughness: 0.3,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.05,
    }),
    robotOpticGlass: new THREE.MeshPhysicalMaterial({
      color: 0x06111e,
      metalness: 0.12,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      iridescence: 0.85,
      iridescenceIOR: 1.35,
      envMapIntensity: 1.35,
    }),
    robotEmissiveBlue: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.15,
      envMapIntensity: 0.5,
    }),
    robotEmissiveRed: new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.15,
      envMapIntensity: 0.5,
    }),
  };
}

/**
 * Builds detailed, grounded architectural 3D map structures per arena
 */
export function buildMapEnvironment(
  mapId: MapId,
  mats: MaterialPalette,
  shadowTex?: THREE.CanvasTexture,
  floorMarkingsTex?: THREE.CanvasTexture,
  domeGlassTex?: THREE.CanvasTexture,
  sunPos?: THREE.Vector3
): THREE.Group {
  const group = new THREE.Group();
  const spec = ARENA_MAPS[mapId];
  const bobbers: Array<{ mesh: THREE.Object3D; baseY: number; phase: number }> = [];
  const swayers: Array<{ mesh: THREE.Object3D; phase: number }> = [];

  if (floorMarkingsTex) {
    const markings = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.halfX * 2, spec.halfZ * 2),
      new THREE.MeshBasicMaterial({
        map: floorMarkingsTex,
        transparent: true,
        opacity: mapId === 'hydro' || mapId === 'splash' ? 0.72 : 0.9,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    markings.rotation.x = -Math.PI / 2;
    markings.position.set(0, mapId === 'hydro' || mapId === 'splash' ? -0.126 : 0.012, 0);
    markings.userData.isNonSolid = true;
    group.add(markings);
  }

  // 1. Map-Specific Elevated Structures (Walk-Under Underpasses + Walkable Decks), Trusses, Pool Grotto & Cranes
  if (mapId === 'arena') {
    const bridgeTop = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.34, 11.2), mats.bridgeDeck);
    bridgeTop.position.set(0, 2.78, 0);
    bridgeTop.castShadow = true;
    bridgeTop.receiveShadow = true;
    group.add(bridgeTop);

    // Bridge concrete under-trim & cable guardrails
    [-5.35, 5.35].forEach((zOff) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.25, 0.36), mats.concreteMat);
      curb.position.set(0, 3.07, zOff);
      curb.castShadow = true;
      group.add(curb);

      // Steel rail posts + horizontal guardrails
      [-4.6, -2.3, 0, 2.3, 4.6].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 8), mats.armorDark);
        post.position.set(px, 3.5, zOff);
        post.castShadow = true;
        group.add(post);
      });
      [3.43, 3.87].forEach((ry) => {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 9.4, 8), mats.chrome);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, ry, zOff);
        group.add(bar);
      });
    });

    // Underpass ceiling soffit strip lights illuminating the tunnel beneath Central Bridge
    const underStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-3.2, 3.2].forEach((lx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 9.8), underStripMat);
      strip.position.set(lx, 2.58, 0);
      group.add(strip);
    });

    // Reinforced corner support columns + base footings (wide 8.8m clear underpass tunnel)
    [-4.85, 4.85].forEach((cx) => {
      [-5.05, 5.05].forEach((cz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 2.65, 10), mats.armorSlate);
        col.position.set(cx, 1.325, cz);
        col.castShadow = true;
        group.add(col);
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.26, 1.15), mats.armorDark);
        plinth.position.set(cx, 0.13, cz);
        group.add(plinth);
      });
    });

    const rampLen = Math.hypot(8.4, 2.95);
    const rampAngle = Math.atan2(2.95, 8.4);
    [-1, 1].forEach((side) => {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.34, 6.8), mats.bridgeDeck);
      ramp.position.set(side * 9.4, 1.31, 0);
      ramp.rotation.z = side * -rampAngle;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      group.add(ramp);

      // Side curb ledges on ramps
      [-3.3, 3.3].forEach((rz) => {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.24, 0.24), mats.concreteMat);
        ledge.position.set(side * 9.4, 1.5, rz);
        ledge.rotation.z = side * -rampAngle;
        group.add(ledge);
      });
    });

    // Overhead Steel Gantry Archway framing Central Bridge + Diagonal Trusses
    const archBeaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-4.8, 4.8].forEach((az) => {
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.8, 0.42), mats.armorDark);
      pillarL.position.set(-4.8, 5.15, az);
      pillarL.castShadow = true;
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.8, 0.42), mats.armorDark);
      pillarR.position.set(4.8, 5.15, az);
      pillarR.castShadow = true;
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.46, 0.48), mats.armorDark);
      topBeam.position.set(0, 7.55, az);
      topBeam.castShadow = true;
      const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.24, 0.42), mats.armorSlate);
      upperBeam.position.set(0, 8.3, az);
      const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 0.52), archBeaconMat);
      lightStrip.position.set(0, 7.37, az);
      group.add(pillarL, pillarR, topBeam, upperBeam, lightStrip);

      // Diagonal steel truss struts along top gantry
      for (let tx = -4.2; tx <= 4.2; tx += 1.4) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.16), mats.chrome);
        strut.position.set(tx, 7.93, az);
        strut.rotation.z = tx % 2.8 === 0 ? 0.52 : -0.52;
        group.add(strut);
      }
    });

    // Holographic Tactical Ring & Beveled Orb Emitter Pad on Bridge Center
    const centerPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.65, 0.12, 24),
      mats.armorDark
    );
    centerPad.position.set(0, 3.01, 0);
    centerPad.receiveShadow = true;
    const centerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 2.75, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.set(0, 2.99, 0);
    centerRing.userData.isNonSolid = true;
    const outerHoloRing = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 3.82, 48),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    outerHoloRing.rotation.x = -Math.PI / 2;
    outerHoloRing.position.set(0, 2.99, 0);
    outerHoloRing.userData.isNonSolid = true;
    group.add(centerPad, centerRing, outerHoloRing);

    // Cyber glowing edge strips along bridge sides
    const bridgeNeonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-5.45, 5.45].forEach((bz) => {
      const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.08, 0.08), bridgeNeonMat);
      edgeGlow.position.set(0, 2.93, bz);
      group.add(edgeGlow);
    });

    // Outer Stadium Scoreboard Pylons & Rotating Radar Dish
    const animList: THREE.Object3D[] = [];
    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 7.9, -4.8);
    const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8), mats.chrome);
    radarMast.position.y = 0.42;
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.22, 0.28), mats.armorSlate);
    radarBar.position.y = 0.88;
    const radarTipL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.3), archBeaconMat);
    radarTipL.position.set(-0.85, 0.88, 0);
    const radarTipR = radarTipL.clone();
    radarTipR.position.x = 0.85;
    radarGroup.add(radarMast, radarBar, radarTipL, radarTipR);
    group.add(radarGroup);
    animList.push(radarGroup);
    group.userData.animatedSpinners = animList;

    // Stadium spectator canopy stands outside east/west curbs
    [-29.5, 29.5].forEach((sx) => {
      const standBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 24), mats.armorDark);
      standBase.position.set(sx, 1.6, 0);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 25), mats.armorSlate);
      canopy.position.set(sx > 0 ? sx - 0.5 : sx + 0.5, 5.2, 0);
      canopy.rotation.z = sx > 0 ? 0.16 : -0.16;
      const trimMat = new THREE.MeshBasicMaterial({ color: sx > 0 ? 0xf43f5e : 0x0ea5e9 });
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 22), trimMat);
      banner.position.set(sx > 0 ? sx - 1.45 : sx + 1.45, 2.7, 0);
      group.add(standBase, canopy, banner);
    });

    // Stadium floodlight pylons + overhead catenary steel suspension cables
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    [-31, 31].forEach((lx) => {
      [-37, 37].forEach((lz) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 16, 10), mats.armorDark);
        pole.position.set(lx, 8, lz);
        group.add(pole);
        const head = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.9), mats.armorSlate);
        head.position.set(lx, 16.1, lz);
        head.lookAt(0, 2, 0);
        group.add(head);
        const face = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 0.12), bulbMat);
        face.position.set(lx * 0.98, 16.05, lz * 0.98);
        face.lookAt(0, 2, 0);
        group.add(face);

        const cableCurve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(lx, 15.2, lz),
          new THREE.Vector3(lx * 0.55, 10.2, lz * 0.45),
          new THREE.Vector3(lx > 0 ? 4.8 : -4.8, 7.6, lz > 0 ? 4.8 : -4.8)
        );
        const cableMesh = new THREE.Mesh(
          new THREE.TubeGeometry(cableCurve, 14, 0.045, 5, false),
          mats.matteTrim
        );
        group.add(cableMesh);
      });
    });

    // Tactical approach chevron lights leading onto central ramps
    const chevMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.52,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    [-1, 1].forEach((side) => {
      for (let c = 0; c < 3; c++) {
        const chev = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.32), chevMat);
        chev.rotation.x = -Math.PI / 2;
        chev.rotation.z = Math.PI / 2;
        chev.position.set(side * (14.4 + c * 1.4), 0.025, 0);
        chev.userData.isNonSolid = true;
        group.add(chev);
      }
    });
  } else if (mapId === 'construction') {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0,
    });

    [-14.0, 14.0].forEach((dx) => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.34, 22.0), mats.bridgeDeck);
      deck.position.set(dx, 2.78, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      group.add(deck);

      // Tubular scaffolding frames & high overhead knee-bracing (leaving full walk-under clearance)
      const zCols = [-9.5, -3.2, 3.2, 9.5];
      zCols.forEach((cz, idx) => {
        [-3.2, 3.2].forEach((ox) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.65, 8), steelMat);
          post.position.set(dx + ox, 1.825, cz);
          post.castShadow = true;
          group.add(post);

          if (idx < zCols.length - 1) {
            const nextCz = zCols[idx + 1];
            const midZ = (cz + nextCz) / 2;
            const span = nextCz - cz;
            const beamTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, span), steelMat);
            beamTop.position.set(dx + ox, 2.52, midZ);
            group.add(beamTop);
          }
        });
      });

      const rampLen = Math.hypot(8.6, 2.95);
      const rampAng = Math.atan2(2.95, 8.6);
      [-1, 1].forEach((zSide) => {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.28, rampLen), mats.bridgeDeck);
        ramp.position.set(dx, 1.34, zSide * 15.3);
        ramp.rotation.x = zSide * rampAng;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        group.add(ramp);
      });
    });

    // High Central Sky Catwalk with side safety railings (2.61m clear underpass)
    const catwalk = new THREE.Mesh(new THREE.BoxGeometry(21.0, 0.34, 5.2), steelMat);
    catwalk.position.set(0, 2.78, 0);
    catwalk.castShadow = true;
    catwalk.receiveShadow = true;
    group.add(catwalk);

    [-2.5, 2.5].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.1, 0.1), mats.hazardOrange);
      rail.position.set(0, 3.6, rz);
      const plasmaBar = new THREE.Mesh(
        new THREE.BoxGeometry(20.4, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      plasmaBar.position.set(0, 3.18, rz);
      group.add(rail, plasmaBar);
    });

    // Worksite floodlight tripods + cones
    const workLampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    [
      [-19, 19],
      [19, 19],
      [-19, -19],
      [19, -19],
    ].forEach(([cx, cz]) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65), mats.matteTrim);
      base.position.set(cx, 0.04, cz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.72, 10), mats.hazardOrange);
      cone.position.set(cx, 0.4, cz);
      cone.castShadow = true;
      group.add(base, cone);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 6), mats.armorDark);
      stand.position.set(cx * 1.12, 1.4, cz * 1.12);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.2), workLampMat);
      bulb.position.set(cx * 1.12, 2.85, cz * 1.12);
      bulb.lookAt(0, 1, 0);
      group.add(stand, bulb);
    });

    // Realistic lattice tower crane silhouette + suspended steel load outside perimeter
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.8, 30, 1.8), steelMat);
    mast.position.set(-28, 15, -36);
    group.add(mast);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(38, 1.4, 1.4), steelMat);
    boom.position.set(-11, 29, -36);
    group.add(boom);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), mats.hazardOrange);
    cab.position.set(-26, 28, -34.2);
    group.add(cab);
    const craneHookPivot = new THREE.Group();
    craneHookPivot.position.set(-4, 29, -36);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 13, 6), mats.chrome);
    cable.position.set(0, -6.5, 0);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.9), mats.armorDark);
    hook.position.set(0, -13.0, 0);
    const girderLoad = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.55, 0.55), steelMat);
    girderLoad.position.set(0, -13.8, 0);
    craneHookPivot.add(cable, hook, girderLoad);
    group.add(craneHookPivot);
    swayers.push({ mesh: craneHookPivot, phase: 0.4 });

    // Wooden supply pallets & stacked steel I-beams near worksite corners
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    [
      [-17.5, 22],
      [17.5, -22],
    ].forEach(([px, pz]) => {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 1.8), woodMat);
      pallet.position.set(px, 0.11, pz);
      pallet.castShadow = true;
      for (let b = -1; b <= 1; b += 2) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 0.34), steelMat);
        beam.position.set(px, 0.38, pz + b * 0.42);
        beam.castShadow = true;
        group.add(beam);
      }
      group.add(pallet);
    });

    // Stacked I-Beam & Rebar Pallets + Hazard Barrels near construction flanks
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9, metalness: 0, envMapIntensity: 0 });
    [
      [-23, 18],
      [23, -18],
      [-23, -18],
      [23, 18],
    ].forEach(([bx, bz]) => {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.12, 14), barrelMat);
      drum.position.set(bx, 0.56, bz);
      drum.castShadow = true;
      const band1 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 14), mats.armorDark);
      band1.position.set(bx, 0.32, bz);
      const band2 = band1.clone();
      band2.position.y = 0.82;
      group.add(drum, band1, band2);
    });

    // Steel truss safety railings along elevated side decks
    [-14.0, 14.0].forEach((dx) => {
      [-3.35, 3.35].forEach((ox) => {
        const railBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 21.6), mats.hazardOrange);
        railBar.position.set(dx + ox, 3.7, 0);
        group.add(railBar);
      });
    });

    // Distant city skyline crane #2 on opposite horizon
    const crane2Mast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 1.6), steelMat);
    crane2Mast.position.set(34, 13, 38);
    const crane2Boom = new THREE.Mesh(new THREE.BoxGeometry(32, 1.2, 1.2), steelMat);
    crane2Boom.position.set(20, 25.5, 38);
    group.add(crane2Mast, crane2Boom);

    // Stacked hollow concrete drainage pipes & timber pallets at perimeter corners
    [
      [-23, -24],
      [23, 24],
    ].forEach(([px, pz]) => {
      const pipeGeo = new THREE.CylinderGeometry(0.46, 0.46, 2.8, 14, 1, true);
      pipeGeo.rotateZ(Math.PI / 2);
      const p1 = new THREE.Mesh(pipeGeo, mats.concreteMat);
      p1.position.set(px, 0.46, pz);
      p1.castShadow = true;
      const p2 = new THREE.Mesh(pipeGeo, mats.concreteMat);
      p2.position.set(px, 0.46, pz + 0.96);
      p2.castShadow = true;
      const p3 = new THREE.Mesh(pipeGeo, mats.concreteMat);
      p3.position.set(px, 1.26, pz + 0.48);
      p3.castShadow = true;
      group.add(p1, p2, p3);
    });
  } else if (mapId === 'hydro') {
    const effectiveSunPos = sunPos ?? new THREE.Vector3(28, 46, 22);

    // 1A. Full-Arena Crystal-Clear Hydro Dome Water Surface (covers entire flooded arena court + central plunge pool)
    const { material: waterMat, controller: waterCtrl } = createHydroDomeWaterMaterial({
      sunPosition: effectiveSunPos,
      sunColorHex: spec.sunColor,
      skyZenithHex: 0x075985,
      skyHorizonHex: 0x7dd3fc,
      isLagoon: false,
    });
    group.userData.waterTimeUniform = waterCtrl.timeUniform;
    group.userData.waterController = waterCtrl;

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.halfX * 2 + 0.4, spec.halfZ * 2 + 0.4, 112, 112),
      waterMat
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.025;
    water.receiveShadow = true;
    water.renderOrder = 2;
    water.userData.isWater = true;
    group.add(water);

    // 1B. Outer Tropical Ocean Lagoon encircling the Hydro Dome seawall
    const { material: lagoonMat, controller: lagoonCtrl } = createHydroDomeWaterMaterial({
      sunPosition: effectiveSunPos,
      sunColorHex: spec.sunColor,
      skyZenithHex: 0x075985,
      skyHorizonHex: 0x7dd3fc,
      isLagoon: true,
    });
    group.userData.lagoonWaterController = lagoonCtrl;

    const lagoonShape = new THREE.Shape();
    lagoonShape.moveTo(-115, -115);
    lagoonShape.lineTo(115, -115);
    lagoonShape.lineTo(115, 115);
    lagoonShape.lineTo(-115, 115);
    lagoonShape.closePath();
    const domeCutout = new THREE.Path();
    domeCutout.moveTo(-spec.halfX - 1.1, -spec.halfZ - 1.1);
    domeCutout.lineTo(spec.halfX + 1.1, -spec.halfZ - 1.1);
    domeCutout.lineTo(spec.halfX + 1.1, spec.halfZ + 1.1);
    domeCutout.lineTo(-spec.halfX - 1.1, spec.halfZ + 1.1);
    domeCutout.closePath();
    lagoonShape.holes.push(domeCutout);

    const lagoonSea = new THREE.Mesh(new THREE.ShapeGeometry(lagoonShape, 24), lagoonMat);
    lagoonSea.rotation.x = -Math.PI / 2;
    lagoonSea.position.y = -0.26;
    lagoonSea.receiveShadow = true;
    lagoonSea.userData.isWater = true;
    group.add(lagoonSea);

    // 1C. Central Deep Plunge Pool Basin Walls, Illuminated Steps & Coping Rim
    const poolFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(27.2, 27.2),
      new THREE.MeshStandardMaterial({
        color: 0x0891b2,
        roughness: 0.72,
        metalness: 0.04,
        envMapIntensity: 0.4,
      })
    );
    poolFloor.rotation.x = -Math.PI / 2;
    poolFloor.position.y = -0.56;
    poolFloor.receiveShadow = true;
    group.add(poolFloor);

    // Underwater glowing turquoise strip lights lining central plunge basin
    const poolGlowMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    [-13.42, 13.42].forEach((e) => {
      const stripNS = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.1, 0.1), poolGlowMat);
      stripNS.position.set(0, -0.24, e);
      const stripEW = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 20.5), poolGlowMat);
      stripEW.position.set(e, -0.24, 0);
      group.add(stripNS, stripEW);
    });

    // Pool perimeter coping segments (split cleanly around the 4 ramps at |x|<=2.9, |z|<=2.9)
    [-13.7, 13.7].forEach((edge) => {
      [-8.3, 8.3].forEach((segCenter) => {
        const copingNS = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.24, 0.72), mats.concreteMat);
        copingNS.position.set(segCenter, -0.05, edge);
        copingNS.receiveShadow = true;
        const copingEW = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 10.8), mats.concreteMat);
        copingEW.position.set(edge, -0.05, segCenter);
        copingEW.receiveShadow = true;
        group.add(copingNS, copingEW);
      });
    });

    // Submerged corner entry steps in the deep plunge basin
    [
      [-12.6, -12.6],
      [12.6, -12.6],
      [-12.6, 12.6],
      [12.6, 12.6],
    ].forEach(([sx, sz]) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.24, 1.8), mats.concreteMat);
      step.position.set(sx, -0.32, sz);
      step.receiveShadow = true;
      group.add(step);
    });

    // 1D. Monumental 3D Geodesic Glass & Titanium Hydro Dome Conservatory Overhead
    const domeRx = spec.halfX + 3.2; // ~32.2m
    const domeRz = spec.halfZ + 3.2; // ~36.2m
    const domeRy = 24.2;
    const domeRibCount = 12;
    const archGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 12 Sculpted Perimeter Arch Buttress Piers anchored in the lagoon seawall + sweeping arch ribs
    for (let i = 0; i < domeRibCount; i++) {
      const theta = (i / domeRibCount) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const pierX = cosT * (domeRx + 0.6);
      const pierZ = sinT * (domeRz + 0.6);
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 4.2, 1.5),
        mats.armorSlate
      );
      pier.position.set(pierX, 1.4, pierZ);
      pier.rotation.y = -theta;
      pier.castShadow = true;
      group.add(pier);

      const pierCap = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.24, 1.2),
        archGlowMat
      );
      pierCap.position.set(pierX, 3.6, pierZ);
      pierCap.rotation.y = -theta;
      group.add(pierCap);

      // Sweeping meridian arch rib from buttress pier up to apex Oculus Ring (radius ~6.4m)
      const ribPts: THREE.Vector3[] = [];
      const steps = 14;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const phi = u * (Math.PI * 0.42); // stop cleanly at the apex oculus collar
        const rScale = Math.cos(phi);
        const yVal = Math.sin(phi) * domeRy;
        ribPts.push(new THREE.Vector3(cosT * domeRx * rScale, yVal, sinT * domeRz * rScale));
      }
      const ribCurve = new THREE.CatmullRomCurve3(ribPts);
      const ribMesh = new THREE.Mesh(
        new THREE.TubeGeometry(ribCurve, 18, 0.24, 7, false),
        mats.armorDark
      );
      ribMesh.castShadow = true;
      group.add(ribMesh);

      if (i % 2 === 0) {
        const innerStrip = new THREE.Mesh(
          new THREE.TubeGeometry(ribCurve, 18, 0.075, 5, false),
          archGlowMat
        );
        innerStrip.position.y = -0.18;
        group.add(innerStrip);
      }
    }

    // 3 Horizontal Elliptical Steel Tension Rings encircling the dome
    [0.14, 0.27, 0.38].forEach((phiRatio) => {
      const phi = phiRatio * Math.PI;
      const rScale = Math.cos(phi);
      const yRing = Math.sin(phi) * domeRy;
      const ringGeo = new THREE.TorusGeometry(1, 0.012, 6, 48);
      const ring = new THREE.Mesh(ringGeo, mats.chrome);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(domeRx * rScale, domeRz * rScale, 20);
      ring.position.y = yRing;
      group.add(ring);
    });

    // Apex Hydro-Oculus Skylight Collar + Rotating Climate Louver Blades
    const oculusPhi = Math.PI * 0.42;
    const oculusRScale = Math.cos(oculusPhi);
    const oculusY = Math.sin(oculusPhi) * domeRy;
    const oculusRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.045, 10, 48),
      mats.armorDark
    );
    oculusRing.rotation.x = Math.PI / 2;
    oculusRing.scale.set(domeRx * oculusRScale, domeRz * oculusRScale, 12);
    oculusRing.position.y = oculusY;
    group.add(oculusRing);

    const oculusGlow = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.018, 8, 48),
      archGlowMat
    );
    oculusGlow.rotation.x = Math.PI / 2;
    oculusGlow.scale.set(domeRx * oculusRScale * 0.96, domeRz * oculusRScale * 0.96, 8);
    oculusGlow.position.y = oculusY - 0.25;
    group.add(oculusGlow);

    const oculusSpinner = new THREE.Group();
    oculusSpinner.position.set(0, oculusY + 0.1, 0);
    const hubCore = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.9, 12), mats.armorSlate);
    oculusSpinner.add(hubCore);
    for (let b = 0; b < 6; b++) {
      const bAng = (b / 6) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 0.68), mats.chrome);
      blade.position.set(Math.cos(bAng) * 3.8, 0, Math.sin(bAng) * 3.8);
      blade.rotation.y = -bAng;
      blade.rotation.x = 0.28;
      oculusSpinner.add(blade);
    }
    group.add(oculusSpinner);
    const curSpinners = Array.isArray(group.userData.animatedSpinners)
      ? (group.userData.animatedSpinners as THREE.Object3D[])
      : [];
    curSpinners.push(oculusSpinner);
    group.userData.animatedSpinners = curSpinners;

    // Translucent Geodesic Glass Conservatory Dome Shell (non-occluding, shimmering mullion grid)
    const domeGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      map: domeGlassTex ?? null,
      transparent: true,
      opacity: domeGlassTex ? 0.56 : 0.18,
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const domeShell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 44, 18, 0, Math.PI * 2, Math.PI * 0.08, Math.PI * 0.41),
      domeGlassMat
    );
    domeShell.scale.set(domeRx - 0.2, domeRy - 0.1, domeRz - 0.2);
    domeShell.renderOrder = 4;
    domeShell.userData.isDomeGlass = true;
    domeShell.raycast = () => {};
    group.add(domeShell);

    // 1E. Perimeter Hydro-Spillway Waterfall Cascades pouring over outer seawalls into the Lagoon
    const waterfallMat = createWaterfallMaterial(waterCtrl.timeUniform);
    const foamPoolMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    [
      { x: 0, z: spec.halfZ + 1.32, w: 12, rotY: 0 },
      { x: 0, z: -spec.halfZ - 1.32, w: 12, rotY: Math.PI },
      { x: spec.halfX + 1.32, z: 0, w: 14, rotY: Math.PI / 2 },
      { x: -spec.halfX - 1.32, z: 0, w: 14, rotY: -Math.PI / 2 },
    ].forEach((wf) => {
      const fallGroup = new THREE.Group();
      fallGroup.position.set(wf.x, 0, wf.z);
      fallGroup.rotation.y = wf.rotY;

      const lip = new THREE.Mesh(new THREE.BoxGeometry(wf.w + 0.8, 0.18, 0.65), mats.chrome);
      lip.position.set(0, 0.22, -0.15);
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(wf.w, 1.35, 1, 1), waterfallMat);
      curtain.position.set(0, -0.12, 0.18);
      curtain.rotation.x = -0.28;
      curtain.renderOrder = 3;
      curtain.userData.isNonSolid = true;
      const splashFoam = new THREE.Mesh(new THREE.PlaneGeometry(wf.w + 1.2, 1.6), foamPoolMat);
      splashFoam.rotation.x = -Math.PI / 2;
      splashFoam.position.set(0, -0.23, 0.95);
      splashFoam.userData.isNonSolid = true;
      fallGroup.add(lip, curtain, splashFoam);
      group.add(fallGroup);
    });

    // 1F. 4 Tropical Palm Oasis Islands (raised stone planter basins rising from the water)
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0.1,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.78,
      metalness: 0,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    });
    [
      [-23, -24],
      [23, -24],
      [-23, 24],
      [23, 24],
    ].forEach(([px, pz], idx) => {
      const palm = new THREE.Group();

      // Stone planter island base rising out of the water + glowing aqua rim
      const planterBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.32, 1.56, 0.42, 14),
        mats.concreteMat
      );
      planterBase.position.y = 0.02;
      planterBase.receiveShadow = true;
      planterBase.castShadow = true;
      const planterSoil = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.15, 0.12, 12),
        trunkMat
      );
      planterSoil.position.y = 0.22;
      const uplight = new THREE.Mesh(
        new THREE.TorusGeometry(1.38, 0.045, 6, 20),
        poolGlowMat
      );
      uplight.rotation.x = Math.PI / 2;
      uplight.position.y = -0.04;
      palm.add(planterBase, planterSoil, uplight);

      // Decorative coastal rocks around planter base
      for (let r = 0; r < 3; r++) {
        const rAng = r * 2.1 + idx;
        const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), mats.rockMat);
        boulder.scale.set(1.2, 0.72, 1.0);
        boulder.position.set(Math.cos(rAng) * 0.85, 0.24, Math.sin(rAng) * 0.85);
        boulder.castShadow = true;
        palm.add(boulder);
      }

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.18, 0),
        new THREE.Vector3(idx % 2 === 0 ? 0.5 : -0.5, 2.8, 0.3),
        new THREE.Vector3(idx % 2 === 0 ? 1.1 : -1.1, 6.2, -0.2),
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.24, 8, false), trunkMat);
      trunk.castShadow = true;
      palm.add(trunk);

      const topPos = curve.getPoint(1);
      for (let c = 0; c < 3; c++) {
        const cAng = (c / 3) * Math.PI * 2;
        const coco = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 7), trunkMat);
        coco.position.set(
          topPos.x + Math.cos(cAng) * 0.22,
          topPos.y - 0.24,
          topPos.z + Math.sin(cAng) * 0.22
        );
        palm.add(coco);
      }
      for (let f = 0; f < 9; f++) {
        const ang = (f / 9) * Math.PI * 2 + idx;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.68, 3.3, 4), frondMat);
        frond.scale.set(0.7, 1, 0.18);
        frond.position.set(
          topPos.x + Math.cos(ang) * 1.45,
          topPos.y - 0.12 + (f % 2 === 0 ? 0.12 : -0.1),
          topPos.z + Math.sin(ang) * 1.45
        );
        frond.rotation.y = -ang + Math.PI / 2;
        frond.rotation.x = Math.PI * (f % 2 === 0 ? 0.6 : 0.72);
        frond.castShadow = true;
        palm.add(frond);
      }
      palm.position.set(px, 0, pz);
      group.add(palm);
    });

    // 1G. Elevated Overwater Resort Sun-Deck Pavilion (open shaded pool grotto underneath!)
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.78,
      metalness: 0.05,
      envMapIntensity: 0.35,
    });
    const islandDeck = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.34, 13.6), islandMat);
    islandDeck.position.set(0, 2.48, 0);
    islandDeck.castShadow = true;
    islandDeck.receiveShadow = true;
    group.add(islandDeck);

    // Translucent cyan glass safety balustrades along pavilion corner edges (clear around the 4 ramps)
    const railGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.34,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        const railNS = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.72, 0.06), railGlassMat);
        railNS.position.set(sx * 4.95, 3.01, sz * 6.72);
        const railEW = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 3.4), railGlassMat);
        railEW.position.set(sx * 6.72, 3.01, sz * 4.95);
        const topNS = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.06, 0.1), mats.chrome);
        topNS.position.set(sx * 4.95, 3.4, sz * 6.72);
        const topEW = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 3.5), mats.chrome);
        topEW.position.set(sx * 6.72, 3.4, sz * 4.95);
        group.add(railNS, railEW, topNS, topEW);
      });
    });

    // 4 Corner Architectural Support Columns anchored to pool floor with underwater glow collars
    [-6.1, 6.1].forEach((cx) => {
      [-6.1, 6.1].forEach((cz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 2.95, 12), mats.concreteMat);
        col.position.set(cx, 0.85, cz);
        col.castShadow = true;
        const glowCollar = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 8, 18), poolGlowMat);
        glowCollar.rotation.x = Math.PI / 2;
        glowCollar.position.set(cx, -0.06, cz);
        group.add(col, glowCollar);
      });
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 4.4, 12), mats.chrome);
    pole.position.set(0, 4.85, 0);
    pole.castShadow = true;
    group.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 1.18, 8),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.65 })
    );
    canopy.position.set(0, 6.8, 0);
    canopy.castShadow = true;
    const canopyHoloRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.75, 0.07, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    canopyHoloRim.rotation.x = Math.PI / 2;
    canopyHoloRim.position.set(0, 6.22, 0);
    group.add(canopy, canopyHoloRim);

    const rLen = Math.hypot(6.6, 2.65);
    const rAng = Math.atan2(2.65, 6.6);
    [-1, 1].forEach((side) => {
      const rx = new THREE.Mesh(new THREE.BoxGeometry(rLen, 0.28, 5.6), mats.bridgeDeck);
      rx.position.set(side * 10.1, 1.18, 0);
      rx.rotation.z = side * -rAng;
      rx.castShadow = true;
      rx.receiveShadow = true;
      group.add(rx);

      const rz = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.28, rLen), mats.bridgeDeck);
      rz.position.set(0, 1.18, side * 10.1);
      rz.rotation.x = side * rAng;
      rz.castShadow = true;
      rz.receiveShadow = true;
      group.add(rz);
    });

    // Curved stainless steel poolside entry ladders
    [
      [-13.2, -7.2],
      [13.2, 7.2],
    ].forEach(([lx, lz]) => {
      const sideDir = lx < 0 ? 1 : -1;
      [-0.3, 0.3].forEach((offZ) => {
        const railCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(lx - sideDir * 0.45, 0.12, lz + offZ),
          new THREE.Vector3(lx - sideDir * 0.2, 0.76, lz + offZ),
          new THREE.Vector3(lx + sideDir * 0.15, 0.66, lz + offZ),
          new THREE.Vector3(lx + sideDir * 0.18, -0.45, lz + offZ),
        ]);
        const rail = new THREE.Mesh(
          new THREE.TubeGeometry(railCurve, 12, 0.035, 8, false),
          mats.chrome
        );
        group.add(rail);
      });
    });

    // Floating colorful pool lane buoys (animated bobbing on waves)
    const buoyMatA = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, metalness: 0.08, envMapIntensity: 0.4 });
    const buoyMatB = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, metalness: 0.08, envMapIntensity: 0.4 });
    [
      [-10.5, -10.5],
      [10.5, -10.5],
      [-10.5, 10.5],
      [10.5, 10.5],
    ].forEach(([bx, bz], i) => {
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 18), i % 2 === 0 ? buoyMatA : buoyMatB);
      buoy.rotation.x = Math.PI / 2;
      buoy.position.set(bx, 0.03, bz);
      buoy.castShadow = true;
      group.add(buoy);
      bobbers.push({ mesh: buoy, baseY: 0.03, phase: i * 1.6 });
    });

    // Poolside resort umbrellas & raised wooden teak loungers on floating water decks
    const loungerWood = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85, metalness: 0, envMapIntensity: 0.15 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, metalness: 0, envMapIntensity: 0.1 });
    [
      [-21, -18, 0x0ea5e9],
      [21, -18, 0xf43f5e],
      [-21, 18, 0xf59e0b],
      [21, 18, 0x10b981],
    ].forEach(([ux, uz, uColor]) => {
      const deckPad = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.2, 2.8), mats.concreteMat);
      deckPad.position.set(ux + (ux > 0 ? -0.55 : 0.55), -0.02, uz);
      deckPad.receiveShadow = true;
      const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8), mats.chrome);
      uPole.position.set(ux, 1.6, uz);
      uPole.castShadow = true;
      const uTop = new THREE.Mesh(
        new THREE.ConeGeometry(2.1, 0.85, 8),
        new THREE.MeshStandardMaterial({ color: uColor, roughness: 0.72, metalness: 0.05, envMapIntensity: 0.2 })
      );
      uTop.position.set(ux, 3.2, uz);
      uTop.castShadow = true;
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 2.0), loungerWood);
      chair.position.set(ux + (ux > 0 ? -1.1 : 1.1), 0.2, uz);
      chair.castShadow = true;
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 1.85), cushionMat);
      cushion.position.set(ux + (ux > 0 ? -1.1 : 1.1), 0.36, uz);
      group.add(deckPad, uPole, uTop, chair, cushion);
    });
  } else if (mapId === 'splash') {
    const effectiveSunPos = sunPos ?? new THREE.Vector3(28, 46, 22);

    // 1A. Full-Arena Crystal-Clear Splash Lagoon Water Surface
    const { material: waterMat, controller: waterCtrl } = createHydroDomeWaterMaterial({
      sunPosition: effectiveSunPos,
      sunColorHex: spec.sunColor,
      skyZenithHex: 0x0284c7,
      skyHorizonHex: 0xbae6fd,
      isLagoon: false,
    });
    group.userData.waterTimeUniform = waterCtrl.timeUniform;
    group.userData.waterController = waterCtrl;

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.halfX * 2 + 0.4, spec.halfZ * 2 + 0.4, 112, 112),
      waterMat
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.025;
    water.receiveShadow = true;
    water.renderOrder = 2;
    water.userData.isWater = true;
    group.add(water);

    // 1B. Outer Endless Tropical Lagoon Sea
    const { material: lagoonMat, controller: lagoonCtrl } = createHydroDomeWaterMaterial({
      sunPosition: effectiveSunPos,
      sunColorHex: spec.sunColor,
      skyZenithHex: 0x0284c7,
      skyHorizonHex: 0xbae6fd,
      isLagoon: true,
    });
    group.userData.lagoonWaterController = lagoonCtrl;

    const lagoonShape = new THREE.Shape();
    lagoonShape.moveTo(-115, -115);
    lagoonShape.lineTo(115, -115);
    lagoonShape.lineTo(115, 115);
    lagoonShape.lineTo(-115, 115);
    lagoonShape.closePath();
    const lagoonCutout = new THREE.Path();
    lagoonCutout.moveTo(-spec.halfX - 1.1, -spec.halfZ - 1.1);
    lagoonCutout.lineTo(spec.halfX + 1.1, -spec.halfZ - 1.1);
    lagoonCutout.lineTo(spec.halfX + 1.1, spec.halfZ + 1.1);
    lagoonCutout.lineTo(-spec.halfX - 1.1, spec.halfZ + 1.1);
    lagoonCutout.closePath();
    lagoonShape.holes.push(lagoonCutout);

    const lagoonSea = new THREE.Mesh(new THREE.ShapeGeometry(lagoonShape, 24), lagoonMat);
    lagoonSea.rotation.x = -Math.PI / 2;
    lagoonSea.position.y = -0.24;
    lagoonSea.receiveShadow = true;
    lagoonSea.userData.isWater = true;
    group.add(lagoonSea);

    // 1C. Submerged Lagoon Pool Basin & Glowing Aqua Rim
    const poolFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.72,
        metalness: 0.04,
        envMapIntensity: 0.4,
      })
    );
    poolFloor.rotation.x = -Math.PI / 2;
    poolFloor.position.y = -0.58;
    poolFloor.receiveShadow = true;
    group.add(poolFloor);

    const poolGlowMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    [-14.0, 14.0].forEach((e) => {
      const stripNS = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.1, 0.12), poolGlowMat);
      stripNS.position.set(0, -0.22, e);
      const stripEW = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 27.5), poolGlowMat);
      stripEW.position.set(e, -0.22, 0);
      group.add(stripNS, stripEW);
    });

    // 1D. Floating Alpha & Omega Timber-Inflatable Spawn Pontoons (z = +-29)
    const pontoonDeckMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.85,
      metalness: 0.05,
    });
    const pontoonFloatMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.55,
      metalness: 0.08,
    });
    [29.3, -29.3].forEach((pz) => {
      const isAlpha = pz > 0;
      const trimMat = new THREE.MeshBasicMaterial({ color: isAlpha ? 0x38bdf8 : 0xf43f5e });
      const dock = new THREE.Mesh(new THREE.BoxGeometry(19, 0.34, 5.0), pontoonDeckMat);
      dock.position.set(0, 0.06, pz);
      dock.castShadow = true;
      dock.receiveShadow = true;
      group.add(dock);

      [-9.4, -4.7, 0, 4.7, 9.4].forEach((bx) => {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 4.8, 12),
          pontoonFloatMat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(bx, -0.1, pz);
        group.add(barrel);
      });
      const neonRim = new THREE.Mesh(new THREE.BoxGeometry(19.1, 0.09, 0.12), trimMat);
      neonRim.position.set(0, 0.24, isAlpha ? pz - 2.5 : pz + 2.5);
      group.add(neonRim);
    });

    // 1E. Twin Floating Lifeguard Water-Slide Decks & Sloped Aqua Slides (x = +-11.5)
    const slideDeckMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.52,
      metalness: 0.08,
    });
    const slideFlumeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.25,
      metalness: 0.12,
    });
    const slideLen = Math.hypot(7.0, 2.58);
    const slideAng = Math.atan2(2.58, 7.0);
    [-11.5, 11.5].forEach((sx) => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.33, 7.0), slideDeckMat);
      deck.position.set(sx, 2.415, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      group.add(deck);

      // Float pontoon legs supporting slide deck
      [-2.1, 2.1].forEach((ox) => {
        [-3.0, 3.0].forEach((oz) => {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.36, 2.75, 10),
            mats.concreteMat
          );
          post.position.set(sx + ox, 0.9, oz);
          post.castShadow = true;
          const collar = new THREE.Mesh(
            new THREE.TorusGeometry(0.38, 0.06, 8, 16),
            poolGlowMat
          );
          collar.rotation.x = Math.PI / 2;
          collar.position.set(sx + ox, -0.02, oz);
          group.add(post, collar);
        });
      });

      // North & South Water-Slide Ramps
      [-1, 1].forEach((zSide) => {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.26, slideLen), slideFlumeMat);
        ramp.position.set(sx, 1.18, zSide * 7.0);
        ramp.rotation.x = zSide * slideAng;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        group.add(ramp);

        [-2.25, 2.25].forEach((rx) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, slideLen), pontoonFloatMat);
          rail.position.set(sx + rx, 1.38, zSide * 7.0);
          rail.rotation.x = zSide * slideAng;
          group.add(rail);
        });
      });
    });

    // 1F. 9 Interactive 3D Hydro-Trampoline Bounce Pads!
    const bouncePadMeshes: Array<{
      id: number;
      mesh: THREE.Group;
      disc: THREE.Mesh;
      ring: THREE.Mesh;
      baseY: number;
      squash: number;
      phase: number;
    }> = [];
    for (const pad of MAP_BOUNCE_PADS.splash) {
      const padGroup = new THREE.Group();
      padGroup.position.set(pad.x, pad.y, pad.z);

      // Submerged pontoon pedestal anchor
      const basePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(pad.radius * 0.85, pad.radius * 0.98, 0.55, 24),
        mats.armorDark
      );
      basePedestal.position.y = -0.32;
      basePedestal.receiveShadow = true;
      padGroup.add(basePedestal);

      // Chrome compression coil rings
      for (let c = 0; c < 6; c++) {
        const ang = (c / 6) * Math.PI * 2;
        const spring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 0.36, 8),
          mats.chrome
        );
        spring.position.set(Math.cos(ang) * (pad.radius * 0.72), -0.05, Math.sin(ang) * (pad.radius * 0.72));
        padGroup.add(spring);
      }

      // Bright inflated outer bumper torus
      const ringMat = new THREE.MeshStandardMaterial({
        color: pad.color,
        emissive: pad.color,
        emissiveIntensity: 0.35,
        roughness: 0.32,
        metalness: 0.12,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(pad.radius * 0.88, 0.24, 12, 32),
        ringMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.04;
      ring.castShadow = true;
      ring.receiveShadow = true;
      padGroup.add(ring);

      // Elastic dark-mesh trampoline center disc with glowing bullseye ring
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.65,
        metalness: 0.1,
      });
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(pad.radius * 0.82, pad.radius * 0.82, 0.12, 28),
        discMat
      );
      disc.position.y = 0.06;
      disc.receiveShadow = true;
      padGroup.add(disc);

      const bullseye = new THREE.Mesh(
        new THREE.RingGeometry(pad.radius * 0.32, pad.radius * 0.46, 28),
        new THREE.MeshBasicMaterial({ color: pad.color, side: THREE.DoubleSide })
      );
      bullseye.rotation.x = -Math.PI / 2;
      bullseye.position.y = 0.13;
      padGroup.add(bullseye);

      // Upward holographic chevrons signaling launch impulse
      const glowCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(pad.radius * 0.94, pad.radius * 0.94, 0.45, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: pad.color,
          transparent: true,
          opacity: 0.26,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      glowCollar.position.y = 0.32;
      glowCollar.raycast = () => {};
      padGroup.add(glowCollar);

      group.add(padGroup);
      bouncePadMeshes.push({
        id: pad.id,
        mesh: padGroup,
        disc,
        ring,
        baseY: pad.y,
        squash: 0,
        phase: pad.id * 0.8,
      });
    }
    group.userData.bouncePadMeshes = bouncePadMeshes;

    // 1G. Mid-Air Glowing Sky Boost Hoops above key Bounce Pads
    [
      { x: 0, y: 7.2, z: 0, rotY: 0, color: 0xfacc15, r: 3.4 },
      { x: 0, y: 5.5, z: 14.5, rotY: 0, color: 0x38bdf8, r: 2.5 },
      { x: 0, y: 5.5, z: -14.5, rotY: 0, color: 0xf43f5e, r: 2.5 },
      { x: -18, y: 5.2, z: 0, rotY: Math.PI / 2, color: 0x10b981, r: 2.4 },
      { x: 18, y: 5.2, z: 0, rotY: Math.PI / 2, color: 0xa855f7, r: 2.4 },
    ].forEach((hp) => {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(hp.r, 0.14, 10, 32),
        new THREE.MeshBasicMaterial({ color: hp.color, transparent: true, opacity: 0.78 })
      );
      hoop.position.set(hp.x, hp.y, hp.z);
      hoop.rotation.y = hp.rotY;
      hoop.raycast = () => {};
      group.add(hoop);
    });

    // 1H. Bobbing Giant Striped Beach Balls & Neon Donut Inner Tubes across the Lagoon
    const beachBallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
    });
    const beachStripeColors = [0xf43f5e, 0xfacc15, 0x38bdf8, 0x10b981, 0xf97316, 0xec4899];
    [
      [-6.5, 7.5],
      [6.5, 7.5],
      [-6.5, -7.5],
      [6.5, -7.5],
      [-23.5, 16.5],
      [23.5, 16.5],
      [-23.5, -16.5],
      [23.5, -16.5],
    ].forEach(([bx, bz], idx) => {
      const ballGroup = new THREE.Group();
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), beachBallMat);
      sphere.castShadow = true;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.11, 8, 22),
        new THREE.MeshStandardMaterial({
          color: beachStripeColors[idx % beachStripeColors.length],
          roughness: 0.38,
        })
      );
      band.rotation.x = idx * 0.7;
      band.rotation.y = idx * 0.9;
      ballGroup.add(sphere, band);
      ballGroup.position.set(bx, 0.42, bz);
      group.add(ballGroup);
      bobbers.push({ mesh: ballGroup, baseY: 0.42, phase: idx * 1.15 });
    });

    [
      [-14.5, 22.0, 0xec4899],
      [14.5, 22.0, 0xfacc15],
      [-14.5, -22.0, 0x38bdf8],
      [14.5, -22.0, 0x84cc16],
      [-24.5, -8.5, 0xf97316],
      [24.5, 8.5, 0xa855f7],
    ].forEach(([tx, tz, tCol], idx) => {
      const tube = new THREE.Mesh(
        new THREE.TorusGeometry(0.88, 0.34, 12, 24),
        new THREE.MeshStandardMaterial({
          color: tCol,
          roughness: 0.32,
          metalness: 0.08,
        })
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(tx, 0.08, tz);
      tube.castShadow = true;
      group.add(tube);
      bobbers.push({ mesh: tube, baseY: 0.08, phase: idx * 1.4 + 0.5 });
    });

    // 1I. Corner Tropical Palm Oasis Planters & Beach Umbrellas
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.92,
      metalness: 0,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.78,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    [
      [-24.5, -25.5],
      [24.5, -25.5],
      [-24.5, 25.5],
      [24.5, 25.5],
    ].forEach(([px, pz], idx) => {
      const palm = new THREE.Group();
      const planterBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.6, 0.48, 14),
        mats.concreteMat
      );
      planterBase.position.y = 0.04;
      planterBase.receiveShadow = true;
      planterBase.castShadow = true;
      palm.add(planterBase);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(idx % 2 === 0 ? 0.5 : -0.5, 3.0, 0.3),
        new THREE.Vector3(idx % 2 === 0 ? 1.1 : -1.1, 6.4, -0.2),
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.24, 8, false), trunkMat);
      trunk.castShadow = true;
      palm.add(trunk);

      const topPos = curve.getPoint(1);
      for (let f = 0; f < 8; f++) {
        const ang = (f / 8) * Math.PI * 2 + idx;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.68, 3.3, 4), frondMat);
        frond.scale.set(0.7, 1, 0.18);
        frond.position.set(
          topPos.x + Math.cos(ang) * 1.45,
          topPos.y - 0.12 + (f % 2 === 0 ? 0.12 : -0.1),
          topPos.z + Math.sin(ang) * 1.45
        );
        frond.rotation.y = -ang + Math.PI / 2;
        frond.rotation.x = Math.PI * (f % 2 === 0 ? 0.6 : 0.72);
        frond.castShadow = true;
        palm.add(frond);
      }
      palm.position.set(px, 0, pz);
      group.add(palm);
    });
  } else if (mapId === 'docks') {
    [-20.0, 20.0].forEach((gx) => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.34, 17.0), mats.bridgeDeck);
      deck.position.set(gx, 2.78, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      group.add(deck);

      // Outer portal legs leaving wide-open cargo underpass underneath each gantry deck
      [-3.45, 3.45].forEach((ox) => {
        [-7.6, 7.6].forEach((cz) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.54, 2.65, 0.54), mats.armorDark);
          leg.position.set(gx + ox, 1.325, cz);
          leg.castShadow = true;
          group.add(leg);
        });
      });

      const rampLen = Math.hypot(8.6, 2.95);
      const rampAng = Math.atan2(2.95, 8.6);
      [-1, 1].forEach((zSide) => {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.28, rampLen), mats.bridgeDeck);
        ramp.position.set(gx, 1.34, zSide * 12.8);
        ramp.rotation.x = zSide * rampAng;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        group.add(ramp);
      });

      const magRailMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      [-3.95, 3.95].forEach((ox) => {
        const magRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 16.8), magRailMat);
        magRail.position.set(gx + ox, 2.96, 0);
        group.add(magRail);
      });
    });

    // Towering Red Harbor Gantry Cranes framing the dockyard
    const craneMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0,
    });
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [-35, 35].forEach((cx) => {
      [-14, 14].forEach((cz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.3, 24, 1.3), craneMat);
        leg.position.set(cx, 12, cz);
        group.add(leg);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 36), craneMat);
      beam.position.set(cx, 24, 0);
      const trolley = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 3.2), mats.hazardOrange);
      trolley.position.set(cx, 22.8, cx < 0 ? -4 : 4);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), beaconMat);
      beacon.position.set(cx, 25.2, 0);
      group.add(beam, trolley, beacon);
    });

    // Mooring bollards along harbor apron
    [-27, 27].forEach((bx) => {
      [-24, -12, 12, 24].forEach((bz) => {
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.72, 10), mats.armorDark);
        bollard.position.set(bx, 0.36, bz);
        bollard.castShadow = true;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 10), mats.hazardOrange);
        cap.position.set(bx, 0.74, bz);
        group.add(bollard, cap);
      });
    });

    // Harbor floodlight towers
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });
    [-26, 26].forEach((px) => {
      [-34, 34].forEach((pz) => {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.7, 15, 0.7), mats.armorDark);
        pole.position.set(px, 7.5, pz);
        group.add(pole);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.9), lightMat);
        lamp.position.set(px, 15, pz);
        lamp.lookAt(0, 1, 0);
        group.add(lamp);
      });
    });

    // Animated surrounding ocean harbor water outside the concrete dock pier (matte finish)
    const harborWaterTime = { value: 0 };
    const harborMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0,
    });
    harborMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = harborWaterTime;
      shader.vertexShader =
        `uniform float uWaterTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed.z += sin(position.x * 0.28 + uWaterTime * 1.7) * 0.12
                         + cos(position.y * 0.31 - uWaterTime * 1.4) * 0.12;
          `
        );
    };
    group.userData.waterTimeUniform = harborWaterTime;

    const harborShape = new THREE.Shape();
    harborShape.moveTo(-110, -110);
    harborShape.lineTo(110, -110);
    harborShape.lineTo(110, 110);
    harborShape.lineTo(-110, 110);
    harborShape.closePath();
    const dockCutout = new THREE.Path();
    dockCutout.moveTo(-31, -39);
    dockCutout.lineTo(31, -39);
    dockCutout.lineTo(31, 39);
    dockCutout.lineTo(-31, 39);
    dockCutout.closePath();
    harborShape.holes.push(dockCutout);

    const harborGeo = new THREE.ShapeGeometry(harborShape, 18);
    const harborSea = new THREE.Mesh(harborGeo, harborMat);
    harborSea.rotation.x = -Math.PI / 2;
    harborSea.position.y = -0.32;
    group.add(harborSea);

    // Moored Freighter Ship Silhouette in outer harbor + rotating radar scanner
    const shipGroup = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 48), mats.armorDark);
    hull.position.set(-48, 1.8, 0);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 9), mats.armorSlate);
    bridge.position.set(-48, 7.2, -16);
    const cargo1 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 12), mats.containerB);
    cargo1.position.set(-48, 5.5, 2);
    const cargo2 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 10), mats.containerA);
    cargo2.position.set(-48, 5.5, 15);
    shipGroup.add(hull, bridge, cargo1, cargo2);
    group.add(shipGroup);

    const harborRadar = new THREE.Group();
    harborRadar.position.set(35, 25.4, 0);
    const dish = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 0.5), mats.chrome);
    harborRadar.add(dish);
    group.add(harborRadar);
    group.userData.animatedSpinners = [harborRadar];

    // Catenary mooring hawser ropes connecting dock bollards to moored freighter + wooden harbor pilings
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.92 });
    [-12, 12].forEach((bz) => {
      const hawser = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-27, 0.62, bz),
        new THREE.Vector3(-34.5, -0.15, bz * 0.9),
        new THREE.Vector3(-42.0, 2.2, bz * 0.85)
      );
      const ropeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(hawser, 12, 0.06, 6, false),
        ropeMat
      );
      group.add(ropeMesh);
    });

    [-32.5, 32.5].forEach((px) => {
      for (let pz = -32; pz <= 32; pz += 16) {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.2, 8), ropeMat);
        piling.position.set(px, 0.5, pz);
        group.add(piling);
      }
    });

    // Floating Harbor Channel Navigation Buoys
    [
      [-39, -28, 0xef4444],
      [39, 28, 0x10b981],
      [42, -22, 0xf59e0b],
    ].forEach(([nbx, nbz, nbCol], idx) => {
      const hBuoy = new THREE.Group();
      const bBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.85, 1.2, 10),
        new THREE.MeshStandardMaterial({ color: nbCol, roughness: 0.45 })
      );
      const bBeacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 8),
        new THREE.MeshBasicMaterial({ color: nbCol })
      );
      bBeacon.position.y = 0.85;
      hBuoy.add(bBody, bBeacon);
      hBuoy.position.set(nbx, 0.1, nbz);
      group.add(hBuoy);
      bobbers.push({ mesh: hBuoy, baseY: 0.1, phase: idx * 2.1 });
    });

    // Distant Harbor Lighthouse Tower on outer headland
    const lhTower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 22, 12), mats.concreteMat);
    lhTower.position.set(52, 11, -54);
    const lhBand = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 5, 12), mats.redTeam);
    lhBand.position.set(52, 14, -54);
    const lhLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 2.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    lhLamp.position.set(52, 23, -54);
    const lhRoof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 12), mats.armorDark);
    lhRoof.position.set(52, 24.8, -54);
    group.add(lhTower, lhBand, lhLamp, lhRoof);
  }

  // 2. Corrugated Shipping Containers & Elevated Walk-Under Container Arches
  for (const box of MAP_BOXES[mapId]) {
    const minY = box.minY ?? 0;
    const boxHeight = Math.max(0.4, box.h - minY);
    const centerY = minY + boxHeight / 2;

    if (shadowTex) {
      const aoPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(box.w + 1.35, box.d + 1.35),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: minY > 0.2 ? 0.32 : 0.48,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        })
      );
      aoPlane.rotation.x = -Math.PI / 2;
      aoPlane.position.set(box.x, mapId === 'hydro' || mapId === 'splash' ? -0.125 : 0.015, box.z);
      aoPlane.userData.isNonSolid = true;
      group.add(aoPlane);
    }
    const mat =
      box.kind === 'a'
        ? mats.containerA
        : box.kind === 'b'
        ? mats.containerB
        : mats.containerNeutral;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(box.w, boxHeight, box.d), mat);
    mesh.position.set(box.x, centerY, box.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(box.w + 0.16, 0.16, box.d + 0.16),
      mats.armorDark
    );
    cap.position.set(box.x, box.h + 0.06, box.z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);

    // Base plinth rail (at container underside so elevated containers have realistic I-beam cradle)
    const baseSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(box.w + 0.12, 0.18, box.d + 0.12),
      mats.matteTrim
    );
    baseSkirt.position.set(box.x, minY + 0.09, box.z);
    group.add(baseSkirt);

    // Steel portal legs down to ground for walk-under elevated container arches
    if (box.legs && minY > 0.2) {
      const legOffX = box.w / 2 - 0.28;
      const legOffZ = box.d / 2 - 0.28;
      [-1, 1].forEach((sx) => {
        [-1, 1].forEach((sz) => {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, minY + 0.08, 0.36),
            mats.armorDark
          );
          leg.position.set(box.x + sx * legOffX, minY / 2, box.z + sz * legOffZ);
          leg.castShadow = true;
          leg.receiveShadow = true;
          const footing = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.16, 0.56),
            mats.matteTrim
          );
          footing.position.set(box.x + sx * legOffX, 0.08, box.z + sz * legOffZ);
          group.add(leg, footing);
        });
      });
    }

    // Steel corner pillar reinforcements for realistic container silhouette
    if (boxHeight >= 2.2) {
      [-1, 1].forEach((sx) => {
        [-1, 1].forEach((sz) => {
          const corner = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, boxHeight + 0.1, 0.24),
            mats.matteTrim
          );
          corner.position.set(
            box.x + sx * (box.w / 2 - 0.04),
            centerY + 0.05,
            box.z + sz * (box.d / 2 - 0.04)
          );
          group.add(corner);
        });
      });
    }
  }

  // 3. Team Spawn Lane Floor Strips
  const spawnLineZ = spec.spawnZ - 3.5;
  const stripY = mapId === 'hydro' || mapId === 'splash' ? -0.12 : 0.02;
  const blueStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 0.55),
    new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  blueStrip.rotation.x = -Math.PI / 2;
  blueStrip.position.set(0, stripY, spawnLineZ);
  blueStrip.userData.isNonSolid = true;
  group.add(blueStrip);

  const redStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 0.55),
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  redStrip.rotation.x = -Math.PI / 2;
  redStrip.position.set(0, stripY, -spawnLineZ);
  redStrip.userData.isNonSolid = true;
  group.add(redStrip);

  // 4. Low Perimeter Concrete Jersey Barriers, Hazard Corner Bollards & Tactical Crates
  const curbMat = mats.armorDark;
  const curbH = mapId === 'hydro' || mapId === 'splash' ? 1.85 : 1.45;
  const curbY = mapId === 'hydro' || mapId === 'splash' ? 0.52 : 0.72;
  const nsGeo = new THREE.BoxGeometry(spec.halfX * 2 + 2, curbH, 1.25);
  [-spec.halfZ - 0.62, spec.halfZ + 0.62].forEach((zPos) => {
    const curb = new THREE.Mesh(nsGeo, curbMat);
    curb.position.set(0, curbY, zPos);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  });
  const ewGeo = new THREE.BoxGeometry(1.25, curbH, spec.halfZ * 2 + 2);
  [-spec.halfX - 0.62, spec.halfX + 0.62].forEach((xPos) => {
    const curb = new THREE.Mesh(ewGeo, curbMat);
    curb.position.set(xPos, curbY, 0);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  });

  // Glowing perimeter corner beacons + Hard-Light Energy Containment Rails
  const blueBeaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const flankFenceMat = new THREE.MeshBasicMaterial({
    color: mapId === 'construction' ? 0xfbbf24 : 0x22d3ee,
    transparent: true,
    opacity: 0.72,
  });
  [-spec.halfX - 0.62, spec.halfX + 0.62].forEach((bx) => {
    [-spec.halfZ - 0.62, spec.halfZ + 0.62].forEach((bz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.35, 1.5), mats.armorSlate);
      post.position.set(bx, 1.18, bz);
      post.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.28, 1.15),
        bz > 0 ? blueBeaconMat : redBeaconMat
      );
      cap.position.set(bx, 2.48, bz);
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.14, 1.4, 8),
        mats.armorDark
      );
      spire.position.set(bx, 3.25, bz);
      group.add(post, cap, spire);
    });
  });

  // Hard-light energy rails along perimeter curb walls
  [-spec.halfZ - 0.62, spec.halfZ + 0.62].forEach((zPos) => {
    const railMat = zPos > 0 ? blueBeaconMat : redBeaconMat;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(spec.halfX * 2, 0.08, 0.08), railMat);
    beam.position.set(0, 1.92, zPos);
    beam.userData.isNonSolid = true;
    group.add(beam);
  });
  [-spec.halfX - 0.62, spec.halfX + 0.62].forEach((xPos) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, spec.halfZ * 2), flankFenceMat);
    beam.position.set(xPos, 1.92, 0);
    beam.userData.isNonSolid = true;
    group.add(beam);
  });

  // Floating Orbital Holo-Ring Megastructure high overhead (well above gameplay height)
  const orbitalRingMat = new THREE.MeshBasicMaterial({
    color: mapId === 'construction' ? 0xfbbf24 : 0x38bdf8,
    transparent: true,
    opacity: 0.58,
  });
  const orbitalHub = new THREE.Group();
  orbitalHub.position.set(0, 18.5, 0);
  const bigHalo = new THREE.Mesh(new THREE.TorusGeometry(13.5, 0.14, 8, 64), orbitalRingMat);
  bigHalo.rotation.x = Math.PI / 2;
  const chassisRing = new THREE.Mesh(new THREE.TorusGeometry(14.1, 0.22, 8, 48), mats.armorDark);
  chassisRing.rotation.x = Math.PI / 2;
  orbitalHub.add(bigHalo, chassisRing);
  for (let n = 0; n < 4; n++) {
    const ang = (n / 4) * Math.PI * 2;
    const node = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 1.1), mats.armorSlate);
    node.position.set(Math.cos(ang) * 14.1, 0, Math.sin(ang) * 14.1);
    const nodeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), orbitalRingMat);
    nodeGlow.position.copy(node.position);
    orbitalHub.add(node, nodeGlow);
  }
  group.add(orbitalHub);
  const existingSpinners = Array.isArray(group.userData.animatedSpinners)
    ? (group.userData.animatedSpinners as THREE.Object3D[])
    : [];
  existingSpinners.push(orbitalHub);
  group.userData.animatedSpinners = existingSpinners;

  // 5. Physical 3D Ground Hardware (Flush Steel Drainage Channels, Utility Manholes, Cable Ramps & Curb Aprons)
  if (mapId !== 'hydro' && mapId !== 'splash') {
    // Steel recessed floor drainage channels along flanks
    [-15.2, 15.2].forEach((tx) => {
      const trench = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.024, 18.0),
        mats.gunmetal
      );
      trench.position.set(tx, 0.012, 0);
      trench.receiveShadow = true;
      group.add(trench);
      for (let gz = -8.4; gz <= 8.4; gz += 0.7) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.032, 0.16),
          mats.matteTrim
        );
        slat.position.set(tx, 0.016, gz);
        group.add(slat);
      }
    });
  }

  // Bolted steel floor utility access plates on arena quadrants
  const plateBaseY = mapId === 'hydro' || mapId === 'splash' ? -0.12 : 0.018;
  [
    [-18.5, 20.5],
    [18.5, 20.5],
    [-18.5, -20.5],
    [18.5, -20.5],
  ].forEach(([mx, mz]) => {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.9, 0.036, 16),
      mats.armorSlate
    );
    plate.position.set(mx, plateBaseY, mz);
    plate.receiveShadow = true;
    const innerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.042, 14),
      mats.matteTrim
    );
    innerRing.position.set(mx, plateBaseY + 0.003, mz);
    group.add(plate, innerRing);
  });

  // Low-profile armored floor cable ramps crossing outer lanes
  if (mapId === 'arena' || mapId === 'construction') {
    [-25.5, 25.5].forEach((cz) => {
      const conduit = new THREE.Mesh(
        new THREE.BoxGeometry(11.0, 0.038, 0.42),
        mats.matteTrim
      );
      conduit.position.set(0, 0.019, cz);
      conduit.receiveShadow = true;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(10.8, 0.042, 0.12),
        mats.hazardOrange
      );
      stripe.position.set(0, 0.021, cz);
      group.add(conduit, stripe);
    });
  }

  // Concrete perimeter floor apron sills anchoring walls to ground
  [-spec.halfZ - 0.05, spec.halfZ + 0.05].forEach((az) => {
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(spec.halfX * 2 + 1.2, 0.08, 0.85),
      mats.concreteMat
    );
    sill.position.set(0, 0.04, az);
    sill.receiveShadow = true;
    group.add(sill);
  });
  [-spec.halfX - 0.05, spec.halfX + 0.05].forEach((ax) => {
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.08, spec.halfZ * 2 + 1.2),
      mats.concreteMat
    );
    sill.position.set(ax, 0.04, 0);
    sill.receiveShadow = true;
    group.add(sill);
  });

  if (bobbers.length > 0) group.userData.animatedBobbers = bobbers;
  if (swayers.length > 0) group.userData.animatedSwayers = swayers;

  return group;
}

/**
 * Detailed Articulated Combat Robot Rig (Multi-joint Legs/Knees/Ankles, Waist Gimbal,
 * Hydraulic Pistons, Reactor Core, Jetpack Turbine/Thrusters, Optic Head & Pulse Rifle)
 */
export interface RivalCharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftLeg: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightLeg: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  leftArm: THREE.Group;
  leftElbow: THREE.Group;
  rightArm: THREE.Group;
  rightElbow: THREE.Group;
  headGroup: THREE.Group;
  torso: THREE.Mesh;
  backRotor: THREE.Group;
  leftThrusterFlame: THREE.Mesh;
  rightThrusterFlame: THREE.Mesh;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Mesh;
}

function makeBeveledPlateGeo(
  pts: ReadonlyArray<[number, number]>,
  depth: number,
  bevelSize = 0.018,
  bevelThickness = 0.02
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 3,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

export function buildRivalCharacter(
  mats: MaterialPalette,
  shadowTex: THREE.CanvasTexture,
  team: TeamSide = 'enemy',
  botId = 'enemy-0'
): RivalCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const teamMat = team === 'ally' ? mats.robotTeamBlue : mats.robotTeamRed;
  const glowMat = team === 'ally' ? mats.robotEmissiveBlue : mats.robotEmissiveRed;

  const tagBody = <T extends THREE.Object3D>(obj: T, isCritZone = false, castShadow = true): T => {
    obj.userData = { isRival: team === 'enemy', team, botId, isCritZone };
    if (obj instanceof THREE.Mesh) obj.castShadow = castShadow;
    return obj;
  };

  // Sculpted reusable beveled geometries
  const pelvisShieldGeo = makeBeveledPlateGeo(
    [
      [-0.1, 0.12],
      [0.1, 0.12],
      [0.075, -0.09],
      [0, -0.14],
      [-0.075, -0.09],
    ],
    0.1,
    0.016,
    0.018
  );
  const thighArmorGeo = makeBeveledPlateGeo(
    [
      [-0.1, 0.18],
      [0.1, 0.18],
      [0.085, -0.15],
      [0, -0.19],
      [-0.085, -0.15],
    ],
    0.11,
    0.016,
    0.018
  );
  const shinGreaveGeo = makeBeveledPlateGeo(
    [
      [-0.085, 0.17],
      [0.085, 0.17],
      [0.065, -0.16],
      [-0.065, -0.16],
    ],
    0.1,
    0.014,
    0.016
  );
  const kneeCupGeo = makeBeveledPlateGeo(
    [
      [-0.075, 0.08],
      [0.075, 0.08],
      [0.085, -0.02],
      [0, -0.09],
      [-0.085, -0.02],
    ],
    0.06,
    0.014,
    0.015
  );
  const chestPlateGeo = makeBeveledPlateGeo(
    [
      [-0.13, 0.13],
      [0.11, 0.15],
      [0.13, -0.08],
      [0.03, -0.14],
      [-0.11, -0.1],
    ],
    0.08,
    0.018,
    0.02
  );
  const pauldronGeo = makeBeveledPlateGeo(
    [
      [-0.12, 0.11],
      [0.12, 0.11],
      [0.15, -0.06],
      [0, -0.13],
      [-0.15, -0.06],
    ],
    0.14,
    0.018,
    0.02
  );
  const helmetProfileGeo = makeBeveledPlateGeo(
    [
      [-0.17, 0.13],
      [0.12, 0.15],
      [0.19, 0.05],
      [0.15, -0.11],
      [-0.08, -0.13],
      [-0.18, -0.02],
    ],
    0.24,
    0.022,
    0.024
  );
  helmetProfileGeo.rotateY(Math.PI / 2);

  // Turned LatheGeometry optical lens barrel + bell thruster nozzle
  const opticBarrelGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, 0),
      new THREE.Vector2(0.056, 0),
      new THREE.Vector2(0.056, 0.035),
      new THREE.Vector2(0.044, 0.052),
      new THREE.Vector2(0.048, 0.072),
      new THREE.Vector2(0.032, 0.072),
    ],
    16
  );
  const thrusterBellGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.042, 0.12),
      new THREE.Vector2(0.058, 0.08),
      new THREE.Vector2(0.076, 0.02),
      new THREE.Vector2(0.095, -0.06),
      new THREE.Vector2(0.072, -0.06),
    ],
    14
  );

  // ---------------- PELVIS & HIP GIMBAL ----------------
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 1.06, 0);
  bodyGroup.add(pelvisGroup);

  const pelvisCore = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.2, 16), mats.robotChassis)
  );
  pelvisCore.scale.set(1.24, 1, 0.82);
  pelvisGroup.add(pelvisCore);

  const codpiece = tagBody(new THREE.Mesh(pelvisShieldGeo, mats.robotArmor));
  codpiece.position.set(0, -0.02, 0.12);
  codpiece.rotation.x = 0.14;
  const rearPelvisPlate = tagBody(new THREE.Mesh(pelvisShieldGeo, mats.robotChassis));
  rearPelvisPlate.position.set(0, 0.01, -0.14);
  rearPelvisPlate.rotation.x = -0.22;
  pelvisGroup.add(codpiece, rearPelvisPlate);

  // Machined Titanium Hip Axle & Bearing Collars
  const hipAxle = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.56, 14), mats.robotChrome)
  );
  hipAxle.rotation.z = Math.PI / 2;
  hipAxle.position.y = -0.02;
  pelvisGroup.add(hipAxle);

  // Articulated Tactical Utility Belt + Battery Canisters
  const belt = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.085, 16), mats.robotJoint)
  );
  belt.scale.set(1.2, 1, 0.84);
  belt.position.y = 0.09;
  const buckle = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 8), mats.robotChrome),
    false,
    false
  );
  buckle.rotation.x = Math.PI / 2;
  buckle.position.set(0, 0.09, 0.255);
  const buckleLed = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 10), glowMat),
    false,
    false
  );
  buckleLed.rotation.x = Math.PI / 2;
  buckleLed.position.set(0, 0.09, 0.272);
  pelvisGroup.add(belt, buckle, buckleLed);

  [-0.34, 0.34].forEach((px) => {
    const canister = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.17, 12), mats.robotCopper)
    );
    canister.position.set(px, 0.08, 0.03);
    const cap = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.035, 12), mats.robotChassis)
    );
    cap.position.set(px, 0.165, 0.03);
    pelvisGroup.add(canister, cap);
  });

  // ---------------- ARTICULATED 3-JOINT ROBOTIC LEGS (HIP -> KNEE -> ANKLE) ----------------
  const makeRobotLeg = (xOff: number, isRight: boolean) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(xOff, 1.04, 0);
    const sideSign = isRight ? 1 : -1;

    // Hip Ball Joint & Machined Servo Ring
    const hipBall = tagBody(new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 14), mats.robotJoint));
    const hipDrum = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.08, 16), mats.robotChassis)
    );
    hipDrum.rotation.z = Math.PI / 2;
    hipDrum.position.set(sideSign * 0.1, 0, 0);
    const hipRing = tagBody(
      new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 16), mats.robotChrome),
      false,
      false
    );
    hipRing.rotation.y = Math.PI / 2;
    hipRing.position.set(sideSign * 0.145, 0, 0);
    hipPivot.add(hipBall, hipDrum, hipRing);

    // Thigh Endoskeleton Truss + Beveled Armor Shell + Rear Hydraulic Piston + Hose
    const femurCore = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.44, 12), mats.robotJoint)
    );
    femurCore.position.y = -0.24;
    const thighFrontPlate = tagBody(new THREE.Mesh(thighArmorGeo, mats.robotArmor));
    thighFrontPlate.position.set(0, -0.24, 0.055);
    const thighSidePlate = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8), teamMat)
    );
    thighSidePlate.scale.set(0.55, 1, 1.4);
    thighSidePlate.position.set(sideSign * 0.115, -0.24, 0.0);
    const thighPistonHousing = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.22, 10), mats.robotChassis)
    );
    thighPistonHousing.position.set(0, -0.17, -0.095);
    const thighPistonRod = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.25, 8), mats.robotChrome)
    );
    thighPistonRod.position.set(0, -0.34, -0.095);

    const legHoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideSign * 0.08, -0.08, -0.08),
      new THREE.Vector3(sideSign * 0.12, -0.25, -0.11),
      new THREE.Vector3(sideSign * 0.07, -0.43, -0.07),
    ]);
    const legHose = tagBody(
      new THREE.Mesh(new THREE.TubeGeometry(legHoseCurve, 10, 0.015, 6, false), mats.robotCopper),
      false,
      false
    );
    hipPivot.add(
      femurCore,
      thighFrontPlate,
      thighSidePlate,
      thighPistonHousing,
      thighPistonRod,
      legHose
    );

    if (isRight) {
      // Tactical Drop-Leg Holster + Compact Energy Sidearm
      const holster = tagBody(
        new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.13), mats.robotChassis)
      );
      holster.position.set(0.165, -0.24, 0.02);
      const sidearm = tagBody(
        new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.11, 0.12), mats.robotArmor)
      );
      sidearm.position.set(0.165, -0.15, -0.015);
      sidearm.rotation.x = -0.35;
      hipPivot.add(holster, sidearm);
    }

    // KNEE PIVOT (at y = -0.48)
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.48, 0);
    hipPivot.add(kneePivot);

    const kneeAxle = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.21, 14), mats.robotChrome)
    );
    kneeAxle.rotation.z = Math.PI / 2;
    const kneeDrum = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.12, 14), mats.robotChassis)
    );
    kneeDrum.rotation.z = Math.PI / 2;
    const kneeShield = tagBody(new THREE.Mesh(kneeCupGeo, mats.robotArmor));
    kneeShield.position.set(0, 0.02, 0.105);
    kneeShield.rotation.x = -0.2;
    const kneeLed = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.02), teamMat),
      false,
      false
    );
    kneeLed.position.set(0, 0.04, 0.145);
    kneePivot.add(kneeAxle, kneeDrum, kneeShield, kneeLed);

    // Lower Shin (Twin Struts + Beveled Greave + Twin Achilles Dampers)
    const shinCore = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.048, 0.44, 12), mats.robotJoint)
    );
    shinCore.position.y = -0.24;
    const shinGreave = tagBody(new THREE.Mesh(shinGreaveGeo, mats.robotArmor));
    shinGreave.position.set(0, -0.23, 0.05);
    shinGreave.rotation.x = 0.07;
    const calfDamper = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.038, 0.22, 10), mats.robotChassis)
    );
    calfDamper.position.set(0, -0.17, -0.065);
    calfDamper.rotation.x = -0.15;

    [-0.042, 0.042].forEach((ax) => {
      const achillesRod = tagBody(
        new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), mats.robotChrome)
      );
      achillesRod.position.set(ax, -0.25, -0.075);
      kneePivot.add(achillesRod);
    });
    kneePivot.add(shinCore, shinGreave, calfDamper);

    // ANKLE & ARTICULATED SPLIT-TOE FOOT PIVOT (at y = -0.48 -> world y = 0.08)
    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.48, 0);
    kneePivot.add(anklePivot);

    const ankleBall = tagBody(new THREE.Mesh(new THREE.SphereGeometry(0.064, 12, 12), mats.robotChrome));
    const footInstep = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.16, 10), mats.robotChassis)
    );
    footInstep.position.set(0, -0.02, 0.05);
    footInstep.rotation.x = 0.9;
    [-0.055, 0.055].forEach((tx) => {
      const splitToe = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.048, 0.2), mats.robotArmor));
      splitToe.position.set(tx, -0.052, 0.17);
      anklePivot.add(splitToe);
    });
    const heelSpur = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 8), mats.robotChassis)
    );
    heelSpur.rotation.x = Math.PI / 2;
    heelSpur.position.set(0, -0.05, -0.08);
    const bootSole = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.032, 0.42), mats.robotJoint)
    );
    bootSole.position.set(0, -0.066, 0.07);
    anklePivot.add(ankleBall, footInstep, heelSpur, bootSole);

    return { hipPivot, kneePivot, anklePivot };
  };

  const leftLegRig = makeRobotLeg(-0.21, false);
  const rightLegRig = makeRobotLeg(0.21, true);
  const leftLeg = leftLegRig.hipPivot;
  const leftKnee = leftLegRig.kneePivot;
  const leftAnkle = leftLegRig.anklePivot;
  const rightLeg = rightLegRig.hipPivot;
  const rightKnee = rightLegRig.kneePivot;
  const rightAnkle = rightLegRig.anklePivot;
  bodyGroup.add(leftLeg, rightLeg);

  // ---------------- ARTICULATED WAIST & TORSO GROUP (pivoted at y = 1.14) ----------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.14, 0);
  bodyGroup.add(torsoGroup);

  // Articulated Vertebral Spine Column & Abdominal Hydraulic Actuators
  const spineCol = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.36, 14), mats.robotJoint)
  );
  spineCol.position.set(0, 0.15, -0.02);
  torsoGroup.add(spineCol);

  for (let seg = 0; seg < 4; seg++) {
    const ribRing = tagBody(
      new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.024, 8, 18), mats.robotChassis)
    );
    ribRing.rotation.x = Math.PI / 2;
    ribRing.scale.set(1.2, 0.88, 1);
    ribRing.position.set(0, 0.04 + seg * 0.075, 0);
    torsoGroup.add(ribRing);
  }

  [-0.165, 0.165].forEach((ax) => {
    const abCyl = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10), mats.robotChassis)
    );
    abCyl.position.set(ax, 0.19, 0.14);
    abCyl.rotation.z = ax < 0 ? -0.14 : 0.14;
    const abRod = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), mats.robotChrome)
    );
    abRod.position.set(ax * 0.85, 0.08, 0.14);
    abRod.rotation.z = ax < 0 ? -0.14 : 0.14;
    torsoGroup.add(abCyl, abRod);

    // Braided copper waist hydraulic conduit
    const waistTubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ax * 1.25, 0.02, 0.02),
      new THREE.Vector3(ax * 1.5, 0.15, 0.04),
      new THREE.Vector3(ax * 1.32, 0.31, -0.02),
    ]);
    const waistTube = tagBody(
      new THREE.Mesh(new THREE.TubeGeometry(waistTubeCurve, 10, 0.018, 8, false), mats.robotCopper),
      false,
      false
    );
    torsoGroup.add(waistTube);
  });

  // Main Armored Chest Chassis (torso ref preserved)
  const torso = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.27, 0.54, 16), mats.robotChassis)
  );
  torso.scale.set(1.24, 1, 0.78);
  torso.position.set(0, 0.5, 0);
  torsoGroup.add(torso);

  // Sculpted Beveled Pectoral Carapace + Clavicle Shock Struts
  [-1, 1].forEach((sx) => {
    const pecPlate = tagBody(new THREE.Mesh(chestPlateGeo, teamMat));
    pecPlate.position.set(sx * 0.18, 0.57, 0.235);
    pecPlate.rotation.set(-0.16, sx * 0.26, sx * -0.08);
    if (sx < 0) pecPlate.scale.x = -1;

    const clavicle = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.32, 8), mats.robotChrome)
    );
    clavicle.rotation.z = Math.PI / 2 + sx * 0.22;
    clavicle.position.set(sx * 0.24, 0.76, 0.12);

    const shoulderYoke = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.32), mats.robotArmor)
    );
    shoulderYoke.position.set(sx * 0.24, 0.78, 0.0);
    shoulderYoke.rotation.z = sx * -0.16;
    torsoGroup.add(pecPlate, clavicle, shoulderYoke);
  });

  // Recessed Telemetry Sensor Core (Machined Bezel + Sapphire Lens + Internal Optical Ring)
  const reactorHousing = tagBody(new THREE.Mesh(opticBarrelGeo, mats.robotChrome));
  reactorHousing.rotation.x = Math.PI / 2;
  reactorHousing.scale.setScalar(1.45);
  reactorHousing.position.set(0, 0.56, 0.22);
  const reactorRing = tagBody(
    new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.01, 8, 18), glowMat),
    false,
    false
  );
  reactorRing.position.set(0, 0.56, 0.312);
  const reactorLens = tagBody(
    new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), mats.robotOpticGlass),
    false,
    false
  );
  reactorLens.scale.set(1, 1, 0.4);
  reactorLens.position.set(0, 0.56, 0.316);
  torsoGroup.add(reactorHousing, reactorRing, reactorLens);

  // Armored Neck Gorget Collar
  const gorget = tagBody(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.23, 0.11, 14, 1, false, -Math.PI * 0.55, Math.PI * 1.1),
      mats.robotArmor
    )
  );
  gorget.position.set(0, 0.81, 0.03);
  torsoGroup.add(gorget);

  // Dorsal Power Pack + Spinning Cooling Turbine + Turned Bell Thrusters
  const jetpackBody = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.48, 12), mats.robotArmor)
  );
  jetpackBody.scale.set(1.15, 1, 0.6);
  jetpackBody.position.set(0, 0.54, -0.28);
  const jetpackSpine = tagBody(
    new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.44, 0.24), mats.robotChassis)
  );
  jetpackSpine.position.set(0, 0.54, -0.3);
  torsoGroup.add(jetpackBody, jetpackSpine);

  // Recessed Cooling Turbine Shroud + Spinning Blades (`backRotor`)
  const rotorShroud = tagBody(
    new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 18), mats.robotChassis)
  );
  rotorShroud.position.set(0, 0.62, -0.415);
  torsoGroup.add(rotorShroud);

  const backRotor = new THREE.Group();
  backRotor.position.set(0, 0.62, -0.41);
  const rotorHub = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), mats.robotChrome),
    false,
    false
  );
  rotorHub.rotation.x = Math.PI / 2;
  backRotor.add(rotorHub);
  for (let b = 0; b < 5; b++) {
    const blade = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.026, 0.01), mats.robotCopper),
      false,
      false
    );
    blade.rotation.z = (b * Math.PI) / 5;
    backRotor.add(blade);
  }
  torsoGroup.add(backRotor);

  // Futuristic Dorsal Energy Wing Fins flanking Jetpack
  [-1, 1].forEach((sx) => {
    const wingBase = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.18), mats.robotArmor));
    wingBase.position.set(sx * 0.26, 0.66, -0.34);
    wingBase.rotation.set(0.24, sx * -0.25, sx * -0.42);
    const wingBlade = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.46, 0.08), glowMat),
      false,
      false
    );
    wingBlade.position.set(sx * 0.34, 0.72, -0.38);
    wingBlade.rotation.set(0.24, sx * -0.25, sx * -0.42);
    torsoGroup.add(wingBase, wingBlade);
  });

  // Turned LatheGeometry Bell Thruster Nozzles & Exhaust Plumes
  const makeThruster = (xOff: number) => {
    const nozzle = tagBody(new THREE.Mesh(thrusterBellGeo, mats.robotChassis));
    nozzle.position.set(xOff, 0.27, -0.33);
    nozzle.rotation.x = 0.3;
    const nozzleCollar = tagBody(
      new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 8, 14), mats.robotChrome),
      false,
      false
    );
    nozzleCollar.position.set(xOff, 0.21, -0.35);
    nozzleCollar.rotation.x = Math.PI / 2 + 0.3;
    const flame = tagBody(
      new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.24, 10), glowMat),
      false,
      false
    );
    flame.rotation.x = Math.PI + 0.3;
    flame.position.set(xOff, 0.11, -0.385);
    torsoGroup.add(nozzle, nozzleCollar, flame);
    return flame;
  };
  const leftThrusterFlame = makeThruster(-0.17);
  const rightThrusterFlame = makeThruster(0.17);

  // Curved Dorsal Power Conduits + Layered Beveled Pauldrons
  [-1, 1].forEach((sx) => {
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.2, 0.68, -0.26),
      new THREE.Vector3(sx * 0.4, 0.82, -0.17),
      new THREE.Vector3(sx * 0.46, 0.74, 0.0),
    ]);
    const cable = tagBody(
      new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 10, 0.02, 8, false), mats.robotJoint),
      false,
      false
    );
    torsoGroup.add(cable);

    const sBall = tagBody(new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 12), mats.robotJoint));
    sBall.position.set(sx * 0.47, 0.74, 0);
    const sDrum = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.14, 14), mats.robotChrome)
    );
    sDrum.rotation.z = Math.PI / 2;
    sDrum.position.set(sx * 0.52, 0.74, 0);
    const pauldronMain = tagBody(new THREE.Mesh(pauldronGeo, mats.robotArmor));
    pauldronMain.rotation.y = Math.PI / 2;
    pauldronMain.rotation.x = sx * 0.32;
    pauldronMain.position.set(sx * 0.62, 0.78, 0);
    const pauldronTrim = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.24), teamMat)
    );
    pauldronTrim.position.set(sx * 0.67, 0.81, 0);
    pauldronTrim.rotation.z = sx * -0.34;
    torsoGroup.add(sBall, sDrum, pauldronMain, pauldronTrim);
  });

  // ---------------- SCULPTED REALISTIC COMBAT ROBOT HEAD (isCritZone = true) ----------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.12, 0);
  torsoGroup.add(headGroup);

  // Ribbed Elastomeric Neck Bellows + Triple Hydraulic Actuators
  const neckCore = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.105, 0.26, 12), mats.robotJoint),
    true
  );
  neckCore.position.set(0, -0.17, 0);
  headGroup.add(neckCore);

  for (let nr = 0; nr < 3; nr++) {
    const neckBellow = tagBody(
      new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 14), mats.robotJoint),
      true
    );
    neckBellow.rotation.x = Math.PI / 2;
    neckBellow.position.set(0, -0.22 + nr * 0.055, 0);
    headGroup.add(neckBellow);
  }

  [-0.09, 0.09].forEach((nx) => {
    const neckPiston = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.22, 8), mats.robotChrome),
      true
    );
    neckPiston.position.set(nx, -0.17, 0.045);
    neckPiston.rotation.z = nx < 0 ? -0.16 : 0.16;
    headGroup.add(neckPiston);
  });

  // Aerodynamic Beveled Ballistic Helmet Shell + Internal Sensor Visor
  const helmetShell = tagBody(new THREE.Mesh(helmetProfileGeo, mats.robotArmor), true);
  helmetShell.position.set(0, 0.04, 0);
  headGroup.add(helmetShell);

  const headCrest = tagBody(
    new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.055, 0.34), teamMat),
    true
  );
  headCrest.position.set(0, 0.21, -0.02);
  headGroup.add(headCrest);

  // Recessed Dark Sapphire Optical Visor + Triple Camera Lenses
  const visorFrame = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.11, 16, 1, false, -0.78, 1.56), mats.robotChassis),
    true
  );
  visorFrame.position.set(0, 0.045, 0.065);
  const visorGlass = tagBody(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.148, 0.088, 16, 1, false, -0.72, 1.44),
      mats.robotOpticGlass
    ),
    true,
    false
  );
  visorGlass.position.set(0, 0.045, 0.07);
  headGroup.add(visorFrame, visorGlass);

  // Asymmetric Multi-Element Optical Camera Turret + Micro Laser Sensor
  const mainOptic = tagBody(new THREE.Mesh(opticBarrelGeo, mats.robotChrome), true);
  mainOptic.rotation.x = Math.PI / 2;
  mainOptic.position.set(0.068, 0.048, 0.16);
  const mainOpticLens = tagBody(
    new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), mats.robotOpticGlass),
    true,
    false
  );
  mainOpticLens.position.set(0.068, 0.048, 0.22);
  const opticMicroGlow = tagBody(
    new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), glowMat),
    true,
    false
  );
  opticMicroGlow.position.set(0.068, 0.048, 0.244);

  const subOptic = tagBody(new THREE.Mesh(opticBarrelGeo, mats.robotChassis), true);
  subOptic.rotation.x = Math.PI / 2;
  subOptic.scale.setScalar(0.68);
  subOptic.position.set(-0.062, 0.048, 0.165);
  const subOpticLed = tagBody(
    new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), glowMat),
    true,
    false
  );
  subOpticLed.position.set(-0.062, 0.048, 0.215);
  headGroup.add(mainOptic, mainOpticLens, opticMicroGlow, subOptic, subOpticLed);

  // Lower Mandible Acoustic Louver Grille
  const jawBlock = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.11, 10), mats.robotChassis),
    true
  );
  jawBlock.position.set(0, -0.06, 0.11);
  jawBlock.scale.set(1.15, 1, 0.9);
  headGroup.add(jawBlock);
  for (let vl = 0; vl < 3; vl++) {
    const slat = tagBody(
      new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.04), mats.robotChrome),
      true,
      false
    );
    slat.position.set(0, -0.04 - vl * 0.025, 0.195);
    headGroup.add(slat);
  }

  // Side Servo Ear Pods + Flexible Comms Whip Antennas
  [-1, 1].forEach((sx) => {
    const earPod = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.055, 14), mats.robotChrome),
      true
    );
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(sx * 0.16, 0.04, -0.01);
    const earCap = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.068, 12), mats.robotChassis),
      true
    );
    earCap.rotation.z = Math.PI / 2;
    earCap.position.set(sx * 0.165, 0.04, -0.01);
    headGroup.add(earPod, earCap);
  });

  const antCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.175, 0.08, -0.05),
    new THREE.Vector3(-0.19, 0.28, -0.08),
    new THREE.Vector3(-0.21, 0.48, -0.14),
  ]);
  const antennaMain = tagBody(
    new THREE.Mesh(new THREE.TubeGeometry(antCurve, 10, 0.009, 6, false), mats.robotChrome),
    true,
    false
  );
  const antLed = tagBody(
    new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), glowMat),
    true,
    false
  );
  antLed.position.set(-0.21, 0.48, -0.14);
  headGroup.add(antennaMain, antLed);

  // ---------------- ARTICULATED 2-JOINT ROBOTIC ARMS & MECHANICAL HANDS ----------------
  const buildMechanicalArm = (isRight: boolean) => {
    const sx = isRight ? 1 : -1;
    const armPivot = new THREE.Group();
    armPivot.position.set(sx * 0.58, 0.74, 0);
    torsoGroup.add(armPivot);

    const upperStrut = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.054, 0.34, 12), mats.robotJoint)
    );
    upperStrut.position.y = -0.18;
    const bicepPlate = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.068, 0.24, 10), mats.robotArmor)
    );
    bicepPlate.scale.set(0.9, 1, 1.15);
    bicepPlate.position.set(sx * 0.015, -0.18, 0);
    const bicepPiston = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 8), mats.robotChrome)
    );
    bicepPiston.position.set(-sx * 0.065, -0.18, 0.04);
    armPivot.add(upperStrut, bicepPlate, bicepPiston);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.36, 0);
    armPivot.add(elbowPivot);

    const elbowDrum = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.14, 14), mats.robotChrome)
    );
    elbowDrum.rotation.z = Math.PI / 2;
    const forearmFrame = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.052, 0.32, 10), mats.robotChassis)
    );
    forearmFrame.position.set(0, -0.18, 0);
    const vambrace = tagBody(new THREE.Mesh(shinGreaveGeo, teamMat));
    vambrace.scale.set(0.85, 0.74, 0.72);
    vambrace.position.set(sx * 0.02, -0.18, 0.055);
    const wristDrum = tagBody(
      new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.055, 12), mats.robotChrome)
    );
    wristDrum.position.set(0, -0.34, 0.01);

    // Mechanical Palm + Articulated Fingers
    const palm = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.09, 0.08), mats.robotJoint));
    palm.position.set(0, -0.39, 0.02);
    elbowPivot.add(elbowDrum, forearmFrame, vambrace, wristDrum, palm);

    for (let f = 0; f < 3; f++) {
      const finger = tagBody(
        new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.065, 0.026), mats.robotArmor),
        false,
        false
      );
      finger.position.set(-0.028 + f * 0.028, -0.445, 0.032);
      finger.rotation.x = 0.45;
      elbowPivot.add(finger);
    }

    if (!isRight) {
      const wristHolo = tagBody(
        new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.014), glowMat),
        false,
        false
      );
      wristHolo.position.set(-0.02, -0.21, 0.1);
      elbowPivot.add(wristHolo);
    }

    return { armPivot, elbowPivot };
  };

  const leftArmRig = buildMechanicalArm(false);
  const rightArmRig = buildMechanicalArm(true);
  const leftArm = leftArmRig.armPivot;
  const leftElbow = leftArmRig.elbowPivot;
  const rightArm = rightArmRig.armPivot;
  const rightElbow = rightArmRig.elbowPivot;

  leftArm.rotation.set(-0.62, 0.18, 0.14);
  leftElbow.rotation.set(-0.78, 0.28, -0.25);
  rightArm.rotation.set(-0.48, -0.1, -0.06);
  rightElbow.rotation.set(-1.02, 0.08, 0);

  // ---------------- DETAILED REALISTIC TACTICAL CARBINE ----------------
  const rivalGunGroup = new THREE.Group();
  rivalGunGroup.position.set(-0.08, -0.38, 0.14);
  rivalGunGroup.rotation.x = Math.PI / 2;

  const rStock = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.25), mats.robotJoint));
  rStock.position.set(0, -0.01, -0.37);
  const rBody = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.64), mats.robotChassis));
  const rHandguard = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.062, 0.36, 8), mats.robotArmor)
  );
  rHandguard.rotation.x = Math.PI / 2;
  rHandguard.position.set(0, 0.015, 0.42);
  const rBarrel = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.48, 12), mats.robotChrome)
  );
  rBarrel.rotation.x = Math.PI / 2;
  rBarrel.position.set(0, 0.02, 0.72);
  rBarrel.raycast = () => {};
  const rSuppressor = tagBody(
    new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 0.24, 14), mats.robotJoint)
  );
  rSuppressor.rotation.x = Math.PI / 2;
  rSuppressor.position.set(0, 0.02, 0.98);
  rSuppressor.raycast = () => {};
  const rMag = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.25, 0.1), mats.robotJoint));
  rMag.position.set(0, -0.16, 0.14);
  rMag.rotation.x = 0.2;
  const rOptic = tagBody(new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.074, 0.17), mats.robotChassis));
  rOptic.position.set(0, 0.125, 0.04);
  const rOpticLens = tagBody(
    new THREE.Mesh(new THREE.CircleGeometry(0.026, 12), mats.robotOpticGlass),
    false,
    false
  );
  rOpticLens.position.set(0, 0.125, 0.128);
  const rEnergyStrip = tagBody(
    new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.28), glowMat),
    false,
    false
  );
  rEnergyStrip.position.set(0, 0.02, 0.42);

  // Twin Plasma Induction Rings on Barrel
  [0.64, 0.78].forEach((cz) => {
    const coil = tagBody(
      new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 6, 12), glowMat),
      false,
      false
    );
    coil.position.set(0, 0.02, cz);
    rivalGunGroup.add(coil);
  });

  rivalGunGroup.add(
    rStock,
    rBody,
    rHandguard,
    rBarrel,
    rSuppressor,
    rMag,
    rOptic,
    rOpticLens,
    rEnergyStrip
  );
  rightElbow.add(rivalGunGroup);

  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), flashMat);
  muzzleFlash.position.set(-0.08, -1.52, 0.16);
  muzzleFlash.visible = false;
  muzzleFlash.raycast = () => {};
  rightElbow.add(muzzleFlash);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(-0.08, -1.5, 0.16);
  rightElbow.add(muzzlePoint);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  shadow.raycast = () => {};
  root.add(shadow);

  return {
    root,
    bodyGroup,
    pelvisGroup,
    torsoGroup,
    leftLeg,
    leftKnee,
    leftAnkle,
    rightLeg,
    rightKnee,
    rightAnkle,
    leftArm,
    leftElbow,
    rightArm,
    rightElbow,
    headGroup,
    torso,
    backRotor,
    leftThrusterFlame,
    rightThrusterFlame,
    muzzlePoint,
    muzzleFlash,
  };
}

function buildMuzzleFlashMesh(): THREE.Group {
  const g = new THREE.Group();
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), coreMat);
  core.scale.set(1, 1, 2.2);
  g.add(core);

  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.18, 4), outerMat);
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.set(Math.cos((i * Math.PI) / 2) * 0.06, Math.sin((i * Math.PI) / 2) * 0.06, -0.02);
    fin.rotation.y = Math.PI / 2;
    g.add(fin);
  }
  const frontCone = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 6), outerMat);
  frontCone.rotation.x = -Math.PI / 2;
  frontCone.position.z = -0.11;
  g.add(frontCone);

  g.visible = false;
  return g;
}

function buildFirstPersonHands(mats: MaterialPalette, twoHanded: boolean): THREE.Group {
  const hands = new THREE.Group();

  // Trigger hand + tactical ripstop forearm sleeve + wrist cuff (right)
  const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.086, 0.34), mats.sleeveFabric);
  rightSleeve.position.set(0.065, -0.13, 0.14);
  rightSleeve.rotation.set(0.28, -0.16, 0);
  hands.add(rightSleeve);

  const rightCuff = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.09, 0.036), mats.armorDark);
  rightCuff.position.set(0.038, -0.095, 0.02);
  rightCuff.rotation.set(0.28, -0.16, 0);
  hands.add(rightCuff);

  const rightHoloStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.096, 0.012, 0.016),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  rightHoloStrip.position.set(0.038, -0.052, 0.02);
  rightHoloStrip.rotation.set(0.28, -0.16, 0);
  hands.add(rightHoloStrip);

  const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.08, 0.11), mats.gloveDark);
  rightGlove.position.set(0.015, -0.075, -0.02);
  hands.add(rightGlove);

  const rKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.022, 0.042), mats.armorDark);
  rKnuckle.position.set(0.015, -0.038, -0.03);
  hands.add(rKnuckle);

  // Articulated right gloved fingers wrapping grip
  for (let f = 0; f < 3; f++) {
    const rFinger = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.017, 0.022), mats.gloveDark);
    rFinger.position.set(-0.014, -0.068 - f * 0.018, -0.045);
    hands.add(rFinger);
  }

  if (twoHanded) {
    // Support forearm + digital tactical watch + angled gloved hand holding handguard
    const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.082, 0.38), mats.sleeveFabric);
    leftSleeve.position.set(-0.15, -0.11, -0.08);
    leftSleeve.rotation.set(0.18, 0.42, 0.1);
    hands.add(leftSleeve);

    const watchBand = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.086, 0.032), mats.matteTrim);
    watchBand.position.set(-0.08, -0.075, -0.18);
    watchBand.rotation.set(0.18, 0.42, 0.1);
    const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.028), mats.chrome);
    watchFace.position.set(-0.08, -0.032, -0.18);
    watchFace.rotation.set(0.18, 0.42, 0.1);
    const watchDial = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.004, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    watchDial.position.set(-0.08, -0.025, -0.18);
    watchDial.rotation.set(0.18, 0.42, 0.1);
    hands.add(watchBand, watchFace, watchDial);

    const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.07, 0.11), mats.gloveDark);
    leftGlove.position.set(-0.02, -0.045, -0.26);
    hands.add(leftGlove);

    const lKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.02, 0.04), mats.armorDark);
    lKnuckle.position.set(-0.02, -0.012, -0.27);
    hands.add(lKnuckle);

    for (let f = 0; f < 3; f++) {
      const lFinger = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.026), mats.gloveDark);
      lFinger.position.set(0.022, -0.035 + f * 0.014, -0.24 - f * 0.022);
      hands.add(lFinger);
    }
  }

  return hands;
}

/**
 * Detailed First-Person 4-Slot Tactical Weapon Viewmodel Rig
 */
export interface ViewmodelRig {
  root: THREE.Group;
  slotGroups: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  muzzlePoint: THREE.Object3D;
  ejectionPoint: THREE.Object3D;
  muzzleFlash: THREE.Group;
  primaryBolt: THREE.Object3D;
  primaryMag: THREE.Object3D;
  secondarySlide: THREE.Object3D;
  secondaryMag: THREE.Object3D;
}

const _skinMatCache = new Map<WeaponSkinId, THREE.MeshPhysicalMaterial>();

function getWeaponSkinMaterial(
  skinId: WeaponSkinId | undefined,
  fallbackMat: THREE.Material
): THREE.Material {
  if (!skinId || skinId === 'standard') return fallbackMat;
  const cached = _skinMatCache.get(skinId);
  if (cached) return cached;

  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  let metalness = 0.72;
  let roughness = 0.36;
  let clearcoat = 0.25;
  let clearcoatRoughness = 0.22;
  let envMapIntensity = 0.9;
  let emissiveHex = 0x000000;
  let emissiveIntensity = 0;

  if (skinId === 'carbon_hex') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#686868';
    rCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        const alt = ((x + y) / 16) % 2 === 0;
        ctx.fillStyle = alt ? '#1e293b' : '#0b1120';
        ctx.fillRect(x + 1, y + 1, 14, 14);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, 12, 12);
        rCtx.fillStyle = alt ? '#484848' : '#8a8a8a';
        rCtx.fillRect(x + 1, y + 1, 14, 14);
      }
    }
    metalness = 0.52;
    roughness = 0.42;
    clearcoat = 0.55;
  } else if (skinId === 'cobalt_anodized') {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#082f49');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#3c3c3c';
    rCtx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    for (let i = -size; i < size * 2; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    metalness = 0.86;
    roughness = 0.26;
    clearcoat = 0.65;
  } else if (skinId === 'emerald_circuit') {
    ctx.fillStyle = '#031d17';
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#707070';
    rCtx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.4;
    rCtx.strokeStyle = '#262626';
    rCtx.lineWidth = 3;
    for (let i = 16; i < size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(i, i);
      ctx.lineTo(i + 24, i + 24);
      ctx.lineTo(size, i + 24);
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(i, i, 4, 0, Math.PI * 2);
      ctx.fill();
      rCtx.beginPath();
      rCtx.moveTo(0, i);
      rCtx.lineTo(i, i);
      rCtx.lineTo(i + 24, i + 24);
      rCtx.lineTo(size, i + 24);
      rCtx.stroke();
    }
    metalness = 0.68;
    roughness = 0.34;
    clearcoat = 0.4;
    emissiveHex = 0x059669;
    emissiveIntensity = 0.28;
  } else if (skinId === 'crimson_damascus') {
    ctx.fillStyle = '#270712';
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#585858';
    rCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 6) {
      ctx.strokeStyle = y % 12 === 0 ? '#e11d48' : '#7f1d1d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const wy = y + Math.sin(x * 0.06 + y * 0.04) * 10 + Math.cos(x * 0.03 - y * 0.05) * 6;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    metalness = 0.84;
    roughness = 0.28;
    clearcoat = 0.6;
  } else if (skinId === 'solar_amber') {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#626262';
    rCtx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#f59e0b';
    for (let i = -size; i < size * 2; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 0);
      ctx.lineTo(i + 20 + size, size);
      ctx.lineTo(i + size, size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(28, 25, 23, 0.24)';
    for (let y = 0; y < size; y += 8) ctx.fillRect(0, y, size, 2);
    metalness = 0.72;
    roughness = 0.34;
    clearcoat = 0.45;
    emissiveHex = 0xd97706;
    emissiveIntensity = 0.16;
  } else if (skinId === 'auric_prestige') {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#92400e');
    grad.addColorStop(0.35, '#facc15');
    grad.addColorStop(0.65, '#ca8a04');
    grad.addColorStop(1, '#fef08a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#2c2c2c';
    rCtx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    for (let i = 0; i < size; i += 64) {
      ctx.strokeRect(i + 8, 8, 48, size - 16);
    }
    metalness = 0.94;
    roughness = 0.2;
    clearcoat = 0.85;
    clearcoatRoughness = 0.12;
    envMapIntensity = 1.15;
  } else if (skinId === 'quantum_nebula') {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#3b0764');
    grad.addColorStop(0.38, '#7e22ce');
    grad.addColorStop(0.72, '#0891b2');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    rCtx.fillStyle = '#282828';
    rCtx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let s = 0; s < 55; s++) {
      const sx = ((s * 73) % size);
      const sy = ((s * 137) % size);
      ctx.fillRect(sx, sy, 2, 2);
    }
    metalness = 0.86;
    roughness = 0.2;
    clearcoat = 1.0;
    clearcoatRoughness = 0.1;
    emissiveHex = 0x7e22ce;
    emissiveIntensity = 0.24;
    envMapIntensity = 1.2;
  }

  const map = new THREE.CanvasTexture(albedo);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.colorSpace = THREE.SRGBColorSpace;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map,
    roughnessMap,
    metalness,
    roughness,
    clearcoat,
    clearcoatRoughness,
    envMapIntensity,
    emissive: emissiveHex,
    emissiveIntensity,
  });
  _skinMatCache.set(skinId, mat);
  return mat;
}

export function buildRivalsViewmodel(
  loadout: LoadoutConfig,
  mats: MaterialPalette,
  builds?: WeaponBuildsMap
): ViewmodelRig {
  const root = new THREE.Group();

  // ---------------- SLOT 0: PRIMARY FIREARM ----------------
  const primarySkinMat = getWeaponSkinMaterial(
    builds?.[loadout.primary]?.skin,
    mats.gunmetal
  );
  const primaryUpperMat = getWeaponSkinMaterial(
    builds?.[loadout.primary]?.skin,
    mats.armorDark
  );
  const primarySpec = resolveGunSpec(
    PRIMARY_WEAPONS[loadout.primary],
    builds?.[loadout.primary]
  );
  const primaryGroup = new THREE.Group();
  const accentMat0 = new THREE.MeshStandardMaterial({
    color: primarySpec.color,
    emissive: primarySpec.color,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.3,
    envMapIntensity: 0.4,
  });

  primaryGroup.add(buildFirstPersonHands(mats, true));

  const primaryBolt = new THREE.Group();
  const primaryMag = new THREE.Group();
  let muzzleTipZ = -0.88;
  let muzzleLen = 0.12;

  if (loadout.primary === 'rpg') {
    // Sci-Fi Shoulder-Mounted RPG Rocket Launcher
    const launchTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.058, 0.96, 16),
      primaryUpperMat
    );
    launchTube.rotation.x = Math.PI / 2;
    launchTube.position.set(0, 0.04, -0.32);
    primaryGroup.add(launchTube);

    // Flared Rear Venturi Exhaust Bell & Forward Blast Collar
    const rearBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.076, 0.14, 16),
      mats.gunmetal
    );
    rearBell.rotation.x = Math.PI / 2;
    rearBell.position.set(0, 0.04, 0.22);
    const frontCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.062, 0.12, 16),
      primarySkinMat
    );
    frontCollar.rotation.x = Math.PI / 2;
    frontCollar.position.set(0, 0.04, -0.82);
    primaryGroup.add(rearBell, frontCollar);

    // Dual Plasma Rail Strips & Induction Rings along Launcher Tube
    [-0.062, 0.062].forEach((sx) => {
      const sideStrip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.62), accentMat0);
      sideStrip.position.set(sx, 0.04, -0.34);
      primaryGroup.add(sideStrip);
    });
    [-0.58, -0.72].forEach((cz) => {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.006, 6, 16),
        accentMat0
      );
      coil.position.set(0, 0.04, cz);
      primaryGroup.add(coil);
    });

    // Loaded Rocket Warhead Nosecone protruding from Muzzle
    const warheadBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.11, 14),
      mats.chrome
    );
    warheadBody.rotation.x = Math.PI / 2;
    warheadBody.position.set(0, 0.04, -0.89);
    const warheadCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.13, 14),
      accentMat0
    );
    warheadCone.rotation.x = -Math.PI / 2;
    warheadCone.position.set(0, 0.04, -1.01);
    primaryBolt.add(warheadBody, warheadCone);
    primaryGroup.add(primaryBolt);

    // Pistol Grip, Foregrip & Rocket Pod Ammo Pack
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.068), mats.gloveDark);
    pGrip.position.set(0, -0.075, -0.02);
    pGrip.rotation.x = 0.25;
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.11, 0.056), mats.gloveDark);
    foregrip.position.set(0, -0.065, -0.34);
    foregrip.rotation.x = -0.15;
    const podPack = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.24), primarySkinMat);
    podPack.position.set(0.055, -0.02, -0.2);
    primaryMag.add(podPack);
    primaryGroup.add(pGrip, foregrip, primaryMag);

    // Side-Mounted Cyber Optic Sight on Launcher
    const sideBracket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.024, 0.09), mats.gunmetal);
    sideBracket.position.set(-0.058, 0.085, -0.22);
    const scopeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.026, 0.18, 12),
      mats.armorDark
    );
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(-0.065, 0.11, -0.22);
    const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), mats.opticGlass);
    scopeLens.position.set(-0.065, 0.11, -0.311);
    scopeLens.rotation.y = Math.PI;
    primaryGroup.add(sideBracket, scopeBody, scopeLens);

    muzzleTipZ = -0.96;
  } else {
    // Upper & Lower Receiver
    const receiverLower = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.095, 0.38), primarySkinMat);
    receiverLower.position.set(0, -0.01, -0.14);
    primaryGroup.add(receiverLower);

    const receiverUpper = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.06, 0.36), primaryUpperMat);
    receiverUpper.position.set(0, 0.055, -0.14);
    primaryGroup.add(receiverUpper);

    // Pistol Grip & Buttstock
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.068), mats.gloveDark);
    pGrip.position.set(0, -0.09, -0.02);
    pGrip.rotation.x = 0.28;
    primaryGroup.add(pGrip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.11, 0.22), primarySkinMat);
    stock.position.set(0, -0.01, 0.13);
    const recoilPad = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.118, 0.024), mats.gloveDark);
    recoilPad.position.set(0, -0.01, 0.245);
    const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.028, 0.12), mats.armorDark);
    cheekRiser.position.set(0, 0.052, 0.12);
    const selectorPin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.084, 8), mats.brass);
    selectorPin.rotation.z = Math.PI / 2;
    selectorPin.position.set(0, -0.004, -0.05);
    primaryGroup.add(stock, recoilPad, cheekRiser, selectorPin);

    // Reciprocating Bolt / Charging Handle
    const boltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.026, 0.09), mats.chrome);
    boltMesh.position.set(0.039, 0.055, -0.15);
    primaryBolt.add(boltMesh);
    primaryGroup.add(primaryBolt);

    // Detachable Magazine (extended / quick / standard visual geometry)
    const magHeight =
      primarySpec.magazine === 'extended'
        ? 0.25
        : loadout.primary === 'sniper'
        ? 0.11
        : 0.18;
    const magMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, magHeight, primarySpec.magazine === 'extended' ? 0.105 : 0.088),
      mats.matteTrim
    );
    magMesh.position.set(0, -0.1 - magHeight * 0.15, -0.2);
    magMesh.rotation.x = -0.14;
    primaryMag.add(magMesh);
    if (primarySpec.magazine === 'quick') {
      const pullTab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.094), accentMat0);
      pullTab.position.set(0, -0.1 - magHeight * 0.6, -0.21);
      primaryMag.add(pullTab);
    }
    primaryGroup.add(primaryMag);

    // Handguard, Top Picatinny Rail & Barrel
    const hgLen = loadout.primary === 'sniper' ? 0.34 : 0.28;
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.075, hgLen), primaryUpperMat);
    handguard.position.set(0, 0.03, -0.42);
    primaryGroup.add(handguard);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.52), mats.matteTrim);
    topRail.position.set(0, 0.092, -0.24);
    primaryGroup.add(topRail);

    // Machined Picatinny Rail Teeth & Ejection Port Recess + Side Tactical Laser Module
    for (let rz = -0.46; rz <= -0.02; rz += 0.036) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.014), mats.gunmetal);
      tooth.position.set(0, 0.102, rz);
      primaryGroup.add(tooth);
    }
    const ejPort = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.085), mats.brass);
    ejPort.position.set(0.036, 0.055, -0.14);
    primaryGroup.add(ejPort);

    const peqBox = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.032, 0.095), mats.armorDark);
    peqBox.position.set(-0.044, 0.032, -0.44);
    const peqLens = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 10), accentMat0);
    peqLens.rotation.x = Math.PI / 2;
    peqLens.position.set(-0.044, 0.032, -0.49);
    primaryGroup.add(peqBox, peqLens);

    // Angled Foregrip
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.09, 0.052), mats.gloveDark);
    foregrip.position.set(0, -0.035, -0.36);
    foregrip.rotation.x = -0.18;
    primaryGroup.add(foregrip);

    const barrelLen =
      (loadout.primary === 'sniper' ? 0.62 : loadout.primary === 'shotgun' ? 0.34 : 0.32) +
      (primarySpec.barrel === 'heavy' ? 0.12 : 0);
    const barrelZ = -0.54 - barrelLen / 2;
    const barrelRadius = primarySpec.barrel === 'heavy' ? 0.022 : 0.016;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(barrelRadius, barrelRadius + 0.004, barrelLen, 12),
      mats.gunmetal
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, barrelZ);
    primaryGroup.add(barrel);

    // Shotgun underbarrel tube magazine
    if (loadout.primary === 'shotgun') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 10), mats.chrome);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, -0.002, -0.58);
      primaryGroup.add(tube);
    }

    // Barrel Muzzle Attachment (Suppressor / Heavy Compensator / Standard Brake)
    muzzleLen =
      primarySpec.barrel === 'suppressor' ? 0.24 : primarySpec.barrel === 'heavy' ? 0.12 : 0.09;
    const muzzleRad =
      primarySpec.barrel === 'suppressor' ? 0.03 : primarySpec.barrel === 'heavy' ? 0.028 : 0.024;
    const brake = new THREE.Mesh(
      new THREE.CylinderGeometry(muzzleRad, muzzleRad, muzzleLen, 12),
      primarySpec.barrel === 'suppressor' ? mats.matteTrim : mats.armorDark
    );
    brake.rotation.x = Math.PI / 2;
    muzzleTipZ = barrelZ - barrelLen / 2 - muzzleLen / 2;
    brake.position.set(0, 0.035, muzzleTipZ);
    primaryGroup.add(brake);

    // Optic Assembly (Scope / Holo / Iron Sights)
    if (primarySpec.optic === 'scope') {
      const scopeTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.028, 0.28, 14),
        mats.gunmetal
      );
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.145, -0.16);
      const scopeTurretTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.022, 10),
        mats.armorDark
      );
      scopeTurretTop.position.set(0, 0.175, -0.16);
      const scopeTurretSide = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10),
        mats.armorDark
      );
      scopeTurretSide.rotation.z = Math.PI / 2;
      scopeTurretSide.position.set(0.032, 0.145, -0.16);
      const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), mats.opticGlass);
      frontLens.position.set(0, 0.145, -0.301);
      frontLens.rotation.y = Math.PI;
      const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 14), mats.opticGlass);
      rearLens.position.set(0, 0.145, -0.019);
      primaryGroup.add(scopeTube, scopeTurretTop, scopeTurretSide, frontLens, rearLens);
    } else if (primarySpec.optic === 'holo') {
      const holoBase = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.02, 0.09), mats.gunmetal);
      holoBase.position.set(0, 0.108, -0.14);
      const holoHoodL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.044, 0.075), mats.armorDark);
      holoHoodL.position.set(-0.022, 0.138, -0.14);
      const holoHoodR = holoHoodL.clone();
      holoHoodR.position.x = 0.022;
      const holoTop = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.008, 0.075), mats.armorDark);
      holoTop.position.set(0, 0.162, -0.14);
      const holoLens = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.038), mats.opticGlass);
      holoLens.position.set(0, 0.138, -0.14);
      const reticleDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), accentMat0);
      reticleDot.position.set(0, 0.138, -0.142);
      primaryGroup.add(holoBase, holoHoodL, holoHoodR, holoTop, holoLens, reticleDot);
    } else {
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.024, 0.022), mats.armorDark);
      rearL.position.set(-0.016, 0.114, -0.06);
      const rearR = rearL.clone();
      rearR.position.x = 0.016;
      const frontIron = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.028, 0.016), accentMat0);
      frontIron.position.set(0, 0.116, -0.48);
      primaryGroup.add(rearL, rearR, frontIron);
    }

    // Custom caliber & plasma induction trim strip + barrel energy coils
    const pStripe = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.014, 0.28), accentMat0);
    pStripe.position.set(0, 0.032, -0.2);
    primaryGroup.add(pStripe);
    [-0.58, -0.66, -0.74].forEach((cz) => {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(barrelRadius + 0.011, 0.004, 6, 14),
        accentMat0
      );
      coil.position.set(0, 0.035, cz);
      primaryGroup.add(coil);
    });
  }

  // ---------------- SLOT 1: SECONDARY SIDEARM ----------------
  const secSkinMat = getWeaponSkinMaterial(
    builds?.[loadout.secondary]?.skin,
    mats.chrome
  );
  const secFrameMat = getWeaponSkinMaterial(
    builds?.[loadout.secondary]?.skin,
    mats.gunmetal
  );
  const secSpec = resolveGunSpec(
    SECONDARY_WEAPONS[loadout.secondary],
    builds?.[loadout.secondary]
  );
  const secondaryGroup = new THREE.Group();
  const accentMat1 = new THREE.MeshStandardMaterial({
    color: secSpec.color,
    emissive: secSpec.color,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.3,
    envMapIntensity: 0.4,
  });

  secondaryGroup.add(buildFirstPersonHands(mats, loadout.secondary === 'uzi'));

  const sFrame = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.044, 0.24), secFrameMat);
  sFrame.position.set(0, -0.01, -0.13);
  secondaryGroup.add(sFrame);

  const secondarySlide = new THREE.Group();
  const slideLen = loadout.secondary === 'uzi' ? 0.34 : 0.25;
  const sSlide = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.056, slideLen), secSkinMat);
  sSlide.position.set(0, 0.035, -0.15);
  secondarySlide.add(sSlide);

  // Secondary Optic / Iron Sights
  if (secSpec.optic === 'holo' || secSpec.optic === 'scope') {
    const sHoloL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.028, 0.05), mats.armorDark);
    sHoloL.position.set(-0.018, 0.078, -0.12);
    const sHoloR = sHoloL.clone();
    sHoloR.position.x = 0.018;
    const sDot = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 6, 6), accentMat1);
    sDot.position.set(0, 0.078, -0.12);
    secondarySlide.add(sHoloL, sHoloR, sDot);
  } else {
    const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.016), mats.armorDark);
    rearSightL.position.set(-0.014, 0.07, -0.04);
    const rearSightR = rearSightL.clone();
    rearSightR.position.x = 0.014;
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.016), accentMat1);
    frontPost.position.set(0, 0.072, -0.255);
    secondarySlide.add(rearSightL, rearSightR, frontPost);
  }
  secondaryGroup.add(secondarySlide);

  if (secSpec.barrel === 'suppressor') {
    const secSup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.18, 10),
      mats.matteTrim
    );
    secSup.rotation.x = Math.PI / 2;
    secSup.position.set(0, 0.035, -0.36);
    secondaryGroup.add(secSup);
  } else if (secSpec.barrel === 'heavy') {
    const secComp = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.052, 0.09),
      mats.armorDark
    );
    secComp.position.set(0, 0.028, -0.31);
    secondaryGroup.add(secComp);
  }

  if (loadout.secondary === 'revolver') {
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.075, 10),
      mats.armorDark
    );
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(0, 0.025, -0.11);
    secondaryGroup.add(cylinder);
  }

  const sGrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.13, 0.068), mats.gloveDark);
  sGrip.position.set(0, -0.08, -0.04);
  sGrip.rotation.x = 0.24;
  secondaryGroup.add(sGrip);

  const secondaryMag = new THREE.Group();
  const secExt = secSpec.magazine === 'extended' ? 0.08 : 0;
  if (loadout.secondary === 'uzi') {
    const uziMag = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.18 + secExt, 0.056),
      mats.matteTrim
    );
    uziMag.position.set(0, -0.11 - secExt * 0.4, -0.14);
    secondaryMag.add(uziMag);
  } else {
    const pMag = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.03 + secExt, 0.06),
      mats.matteTrim
    );
    pMag.position.set(0, -0.145 - secExt * 0.4, -0.02);
    secondaryMag.add(pMag);
  }
  secondaryGroup.add(secondaryMag);

  const sAccent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.12), accentMat1);
  sAccent.position.set(0, 0.035, -0.17);
  secondaryGroup.add(sAccent);

  // ---------------- SLOT 2: MELEE BLADE ----------------
  const meleeSpec = resolveMeleeSpec(
    MELEE_WEAPONS[loadout.melee],
    builds?.[loadout.melee]
  );
  const meleeGroup = new THREE.Group();
  meleeGroup.add(buildFirstPersonHands(mats, false));

  const defaultBladeMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.6,
    roughness: 0.32,
    envMapIntensity: 0.6,
  });
  const bladeMat = getWeaponSkinMaterial(builds?.[loadout.melee]?.skin, defaultBladeMat);
  const plasmaEdgeMat = new THREE.MeshStandardMaterial({
    color: meleeSpec.color,
    emissive: meleeSpec.color,
    emissiveIntensity: 1.25,
    roughness: 0.2,
    metalness: 0.2,
  });
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.24, 10), mats.matteTrim);
  hilt.position.set(0, -0.06, -0.08);
  hilt.rotation.x = -0.35;
  meleeGroup.add(hilt);

  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 12), mats.chrome);
  tsuba.position.set(0, 0.04, -0.12);
  tsuba.rotation.x = -0.35;
  const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 14), plasmaEdgeMat);
  emitterRing.rotation.x = Math.PI / 2 - 0.35;
  emitterRing.position.set(0, 0.052, -0.124);
  meleeGroup.add(tsuba, emitterRing);

  const baseBladeLen =
    loadout.melee === 'katana' ? 0.72 : loadout.melee === 'scythe' ? 0.82 : 0.38;
  const bladeLen = baseBladeLen * meleeSpec.reachMult;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.014, bladeLen, 0.042), bladeMat);
  blade.position.set(0, 0.28 + (bladeLen - baseBladeLen) * 0.35, -0.22);
  blade.rotation.x = -0.35;
  const energyEdge = new THREE.Mesh(new THREE.BoxGeometry(0.008, bladeLen + 0.02, 0.016), plasmaEdgeMat);
  energyEdge.position.set(0, 0.28 + (bladeLen - baseBladeLen) * 0.35, -0.245);
  energyEdge.rotation.x = -0.35;
  meleeGroup.add(blade, energyEdge);

  if (loadout.melee === 'scythe') {
    const hook = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.075, 0.34 * meleeSpec.reachMult),
      bladeMat
    );
    hook.position.set(0, 0.62 + (bladeLen - baseBladeLen) * 0.6, -0.44);
    const hookEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.026, 0.36 * meleeSpec.reachMult),
      plasmaEdgeMat
    );
    hookEdge.position.set(0, 0.58 + (bladeLen - baseBladeLen) * 0.6, -0.45);
    meleeGroup.add(hook, hookEdge);
  }

  // ---------------- SLOT 3: TACTICAL UTILITY ----------------
  const utilSpec = resolveUtilitySpec(
    UTILITY_ITEMS[loadout.utility],
    builds?.[loadout.utility]
  );
  const utilSkinMat = getWeaponSkinMaterial(
    builds?.[loadout.utility]?.skin,
    loadout.utility === 'medkit' ? mats.chrome : mats.gunmetal
  );
  const utilGroup = new THREE.Group();
  utilGroup.add(buildFirstPersonHands(mats, false));

  const utilAccent = new THREE.MeshStandardMaterial({
    color: utilSpec.color,
    emissive: utilSpec.color,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.2,
    envMapIntensity: 0.4,
  });
  if (loadout.utility === 'medkit') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.11), utilSkinMat);
    box.position.set(0, -0.02, -0.18);
    utilGroup.add(box);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.026, 0.118), utilAccent);
    crossH.position.set(0, -0.02, -0.18);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.08, 0.118), utilAccent);
    crossV.position.set(0, -0.02, -0.18);
    utilGroup.add(crossH, crossV);
  } else {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.17, 14), utilSkinMat);
    canister.position.set(0, -0.02, -0.18);
    utilGroup.add(canister);
    const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.018), mats.chrome);
    spoon.position.set(0.058, -0.01, -0.18);
    const pinRing = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 14), mats.brass);
    pinRing.position.set(-0.04, 0.06, -0.18);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.048, 14), utilAccent);
    band.position.set(0, -0.02, -0.18);
    utilGroup.add(spoon, pinRing, band);
  }

  secondaryGroup.visible = false;
  meleeGroup.visible = false;
  utilGroup.visible = false;

  root.add(primaryGroup, secondaryGroup, meleeGroup, utilGroup);

  const muzzleZ = muzzleTipZ - muzzleLen * 0.5;
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.035, muzzleZ);
  root.add(muzzlePoint);

  const muzzleFlash = buildMuzzleFlashMesh();
  muzzleFlash.position.set(0, 0.035, muzzleZ);
  root.add(muzzleFlash);

  const ejectionPoint = new THREE.Object3D();
  ejectionPoint.position.set(0.05, 0.05, -0.15);
  root.add(ejectionPoint);

  root.position.set(0.26, -0.24, -0.4);

  return {
    root,
    slotGroups: [primaryGroup, secondaryGroup, meleeGroup, utilGroup],
    muzzlePoint,
    ejectionPoint,
    muzzleFlash,
    primaryBolt,
    primaryMag,
    secondarySlide,
    secondaryMag,
  };
}
