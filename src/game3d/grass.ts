import * as THREE from 'three';
import { ARENA_MAPS, MapId } from './types';

function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Matches the GLSL `organic` FBM term in ArenaShooter3D terrainMat so
 * 3D grass placement aligns cleanly with ground turf/dirt transitions.
 */
export function organicTerrainNoise(x: number, z: number): number {
  const n1 = Math.sin(x * 0.16) * Math.cos(z * 0.15);
  const n2 = Math.sin((x - z) * 0.085);
  const n3 = Math.cos((x + z) * 0.038);
  const raw = 0.5 + n1 * 0.3 + n2 * 0.22 + n3 * 0.14;
  return Math.max(0, Math.min(1, raw));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Returns 0..1 grass coverage density at world (x, z) for each arena map.
 */
export function getGrassWeightAt(mapId: MapId, x: number, z: number): number {
  const spec = ARENA_MAPS[mapId];
  const absX = Math.abs(x);
  const absZ = Math.abs(z);
  const organic = organicTerrainNoise(x, z);
  const edgeDist = Math.max(absX - (spec.halfX + 1.0), absZ - (spec.halfZ + 1.0));
  const outerMix = smoothstep(0.0, 4.2, edgeDist);

  if (mapId === 'arena') {
    const spawnClear =
      absZ >= 22.0 && absX <= 10.0
        ? 1.0 - smoothstep(7.5, 10.5, absX) * (1.0 - smoothstep(21.5, 24.0, absZ))
        : 0.0;
    const flankMask = smoothstep(5.2, 11.5, absX + (organic - 0.5) * 4.5);
    const outerHills = smoothstep(1.2, 5.2, edgeDist);
    const weight = Math.max(flankMask * (1 - spawnClear), outerHills);
    return Math.max(0, Math.min(1, weight));
  }

  if (mapId === 'construction') {
    const deckPad =
      smoothstep(9.2, 11.2, absX) *
      (1.0 - smoothstep(17.2, 19.2, absX)) *
      (1.0 - smoothstep(11.2, 14.5, absZ));
    const pathCut = smoothstep(0.76, 0.98, organic) * 0.7;
    return Math.max(0, Math.min(1, (1.0 - deckPad) * (1.0 - pathCut * 0.55) + outerMix * 0.35));
  }

  if (mapId === 'hydro' || mapId === 'splash') {
    const outerGrass = smoothstep(18.5, 24.0, edgeDist);
    return outerGrass;
  }

  if (absX > spec.halfX - 0.8 || absZ > spec.halfZ - 0.8) return 0;
  const wornPatch = smoothstep(0.74, 0.97, organic) * 0.72;
  return Math.max(0, 1.0 - wornPatch);
}

/**
 * Builds a high-detail 11-blade curved botanical grass tuft BufferGeometry
 * (4 vertical segments/blade with V-midrib crease, natural twist, under-blades & seed stalks).
 * Stores custom `aBladeData` vec4: (heightNorm 0..1, bladeSeed 0..1, radialOut 0..1, bladeRole 0..1).
 */
export function createGrassBladeClusterGeometry(): THREE.BufferGeometry {
  const bladeCount = 11;
  const segments = 4;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const bladeData: number[] = [];
  const indices: number[] = [];

  let vertOffset = 0;

  for (let b = 0; b < bladeCount; b++) {
    const seedA = hash2d(b * 3.17, 1.93);
    const seedB = hash2d(b * 7.41, 5.29);
    const seedC = hash2d(b * 11.83, 9.17);
    const seedD = hash2d(b * 17.29, 3.61);

    const isSeedStalk = b === bladeCount - 1;
    const isUnderBlade = b === 1 || b === 5 || b === 8;

    const radialAngle = (b / bladeCount) * Math.PI * 2 + (seedA - 0.5) * 0.65;
    const radialDist = b === 0 ? 0.012 : 0.038 + seedB * 0.135;
    const rootX = Math.cos(radialAngle) * radialDist;
    const rootZ = Math.sin(radialAngle) * radialDist;

    const bendDir = radialAngle + (seedC - 0.5) * 0.95;
    const twistTotal = (seedD - 0.5) * 0.55;

    const bladeHeight = isSeedStalk
      ? 0.41 + seedA * 0.11
      : isUnderBlade
        ? 0.12 + seedA * 0.08
        : 0.22 + seedA * 0.2;
    const baseHalfWidth = isSeedStalk
      ? 0.0085
      : isUnderBlade
        ? 0.013 + seedB * 0.006
        : 0.0125 + seedB * 0.0085;
    const archAmount = isSeedStalk
      ? 0.055 + seedC * 0.05
      : isUnderBlade
        ? 0.045 + seedC * 0.06
        : 0.075 + seedC * 0.135;
    const bladeSeed = (b + seedA * 0.7) / bladeCount;
    const radialOut = Math.min(1, radialDist / 0.17);
    const bladeRole = isSeedStalk ? 1.0 : isUnderBlade ? 0.2 : 0.55;

    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      // Natural botanical silhouette: slight belly swell near lower third, then smooth needle taper
      const widthCurve =
        t < 0.25 ? 1.0 + Math.sin((t / 0.25) * Math.PI) * 0.14 : 1.0 - Math.pow((t - 0.25) / 0.75, 1.15) * 0.8;
      const halfW = baseHalfWidth * Math.max(0.18, widthCurve);

      const curAngle = bendDir + twistTotal * t;
      const dirX = Math.cos(curAngle);
      const dirZ = Math.sin(curAngle);
      const sideX = -dirZ;
      const sideZ = dirX;

      const bend = t * t * archAmount;
      const y = t * bladeHeight - bend * 0.22;
      const cx = rootX + dirX * bend;
      const cz = rootZ + dirZ * bend;

      const crease = halfW * 0.28;

      positions.push(cx - sideX * halfW - dirX * crease, y, cz - sideZ * halfW - dirZ * crease);
      positions.push(cx + sideX * halfW - dirX * crease, y, cz + sideZ * halfW - dirZ * crease);

      const nxL = -sideX * 0.34 + dirX * 0.32;
      const nzL = -sideZ * 0.34 + dirZ * 0.32;
      const ny = 0.88;
      const lenL = Math.hypot(nxL, ny, nzL) || 1;
      normals.push(nxL / lenL, ny / lenL, nzL / lenL);

      const nxR = sideX * 0.34 + dirX * 0.32;
      const nzR = sideZ * 0.34 + dirZ * 0.32;
      const lenR = Math.hypot(nxR, ny, nzR) || 1;
      normals.push(nxR / lenR, ny / lenR, nzR / lenR);

      uvs.push(0, t, 1, t);
      bladeData.push(t, bladeSeed, radialOut, bladeRole, t, bladeSeed, radialOut, bladeRole);
    }

    const tipAngle = bendDir + twistTotal;
    const tipDirX = Math.cos(tipAngle);
    const tipDirZ = Math.sin(tipAngle);
    const tipX = rootX + tipDirX * archAmount;
    const tipZ = rootZ + tipDirZ * archAmount;
    const tipY = bladeHeight - archAmount * 0.24;
    positions.push(tipX, tipY, tipZ);

    const tnx = tipDirX * 0.42;
    const tnz = tipDirZ * 0.42;
    const tny = 0.9;
    const tLen = Math.hypot(tnx, tny, tnz) || 1;
    normals.push(tnx / tLen, tny / tLen, tnz / tLen);
    uvs.push(0.5, 1.0);
    bladeData.push(1.0, bladeSeed, radialOut, bladeRole);

    for (let s = 0; s < segments - 1; s++) {
      const r0 = vertOffset + s * 2;
      const r1 = vertOffset + (s + 1) * 2;
      indices.push(r0, r0 + 1, r1 + 1);
      indices.push(r0, r1 + 1, r1);
    }
    const lastRow = vertOffset + (segments - 1) * 2;
    const tipIdx = vertOffset + segments * 2;
    indices.push(lastRow, lastRow + 1, tipIdx);

    vertOffset += segments * 2 + 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aBladeData', new THREE.Float32BufferAttribute(bladeData, 4));
  geo.setIndex(indices);
  return geo;
}

export interface GrassBladeMaterialHandle {
  material: THREE.MeshStandardMaterial;
  timeUniform: { value: number };
  sunDirUniform: { value: THREE.Vector3 };
  sunColorUniform: { value: THREE.Color };
  playerPosUniform: { value: THREE.Vector3 };
}

/**
 * PBR MeshStandardMaterial extended with traveling meadow wind waves,
 * player-reactive footstep parting/trample, midrib leaf veining,
 * cloud-dapple modulation, golden seed heads, root AO, and subsurface scattering.
 */
export function createGrassBladeMaterial(
  sunDirection: THREE.Vector3,
  sunColorHex: number
): GrassBladeMaterialHandle {
  const timeUniform = { value: 0 };
  const sunDirUniform = { value: sunDirection.clone().normalize() };
  const sunColorUniform = { value: new THREE.Color(sunColorHex) };
  const playerPosUniform = { value: new THREE.Vector3(0, -100, 0) };

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.0,
    envMapIntensity: 0.26,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = timeUniform;
    shader.uniforms.uSunDir = sunDirUniform;
    shader.uniforms.uSunColor = sunColorUniform;
    shader.uniforms.uPlayerPos = playerPosUniform;

    shader.vertexShader =
      `
      uniform float uGrassTime;
      uniform vec3 uPlayerPos;
      attribute vec4 aBladeData;
      varying vec4 vBladeData;
      varying vec3 vGrassWorldPos;
      varying vec2 vGrassUv;
      varying float vWindCrest;
      ` +
      shader.vertexShader
        .replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vBladeData = aBladeData;
          vGrassUv = uv;
          float tipMask = aBladeData.x;
          float bendWeight = tipMask * tipMask;

          vec4 instBase = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            instBase = instanceMatrix * instBase;
          #endif
          vec3 worldBase = (modelMatrix * instBase).xyz;

          // Rolling directional meadow wind wave + cross-breeze turbulence + tip flutter
          float gustPhase = uGrassTime * 1.55 + worldBase.x * 0.13 + worldBase.z * 0.1;
          float crossWave = sin(uGrassTime * 0.92 - worldBase.x * 0.07 + worldBase.z * 0.12);
          float gust = 0.52 + 0.48 * sin(gustPhase + crossWave * 0.85);
          float flutter = sin(uGrassTime * 4.2 + worldBase.x * 1.9 + worldBase.z * 1.4 + aBladeData.y * 6.2831);
          vWindCrest = clamp(gust, 0.0, 1.0);

          float windX = (0.105 * gust + 0.024 * flutter) * bendWeight;
          float windZ = (0.056 * cos(gustPhase * 0.85) + 0.02 * cos(uGrassTime * 3.4 + worldBase.z * 1.6)) * bendWeight;

          transformed.x += windX;
          transformed.z += windZ;

          // Entity-reactive grass parting around the player's footsteps
          vec2 toGrass = worldBase.xz - uPlayerPos.xz;
          float pDist = length(toGrass);
          float yDiff = abs(worldBase.y - uPlayerPos.y);
          if (pDist < 1.55 && yDiff < 2.2) {
            float pushFactor = (1.0 - smoothstep(0.18, 1.55, pDist)) * (1.0 - smoothstep(1.0, 2.2, yDiff));
            vec2 pushDir = pDist > 0.001 ? toGrass / pDist : vec2(1.0, 0.0);
            float bendPush = pushFactor * 0.34 * bendWeight;
            transformed.x += pushDir.x * bendPush;
            transformed.z += pushDir.y * bendPush;
            transformed.y *= mix(1.0, 0.54, pushFactor * tipMask);
          }

          // Preserve arc length under bending
          transformed.y -= (windX * windX + windZ * windZ) * 0.42;

          // Smooth distance fade into ground turf
          float camDist = length(cameraPosition - worldBase);
          float distFade = 1.0 - smoothstep(58.0, 88.0, camDist);
          transformed.y *= distFade;

          vec4 grassWorldPos = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            grassWorldPos = instanceMatrix * grassWorldPos;
          #endif
          grassWorldPos = modelMatrix * grassWorldPos;
          vGrassWorldPos = grassWorldPos.xyz;
          `
        );

    shader.fragmentShader =
      `
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying vec4 vBladeData;
      varying vec3 vGrassWorldPos;
      varying vec2 vGrassUv;
      varying float vWindCrest;
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float hNorm = clamp(vBladeData.x, 0.0, 1.0);
          float bSeed = vBladeData.y;
          float bRole = vBladeData.w;

          // Macro meadow patches + subtle drifting cloud dapple
          float macroN = 0.5 + 0.5 * sin(vGrassWorldPos.x * 0.085 + cos(vGrassWorldPos.z * 0.075));
          float cloudDapple = 0.88 + 0.16 * sin(vGrassWorldPos.x * 0.042 + vGrassWorldPos.z * 0.036);

          // Central leaf midrib vein for botanical detail
          float midrib = 1.0 - smoothstep(0.0, 0.28, abs(vGrassUv.x - 0.5));

          vec3 deepBlade = vec3(0.095, 0.22, 0.052);
          vec3 lushBlade = vec3(0.19, 0.38, 0.088);
          vec3 warmTip = mix(vec3(0.34, 0.51, 0.13), vec3(0.45, 0.56, 0.17), macroN);
          vec3 dryStraw = vec3(0.48, 0.40, 0.16);
          vec3 seedHead = vec3(0.62, 0.54, 0.22);

          float isDry = smoothstep(0.84, 0.96, bSeed);
          float isSeedTip = smoothstep(0.8, 0.95, bRole) * smoothstep(0.62, 0.96, hNorm);

          vec3 midTone = mix(deepBlade, lushBlade, smoothstep(0.1, 0.84, bSeed));
          midTone = mix(midTone, dryStraw, isDry * 0.7);
          midTone *= 1.0 + midrib * 0.12;

          vec3 bladeGrad = mix(midTone, mix(warmTip, dryStraw * 1.15, isDry * 0.65), smoothstep(0.22, 1.0, hNorm));
          bladeGrad = mix(bladeGrad, seedHead, isSeedTip * 0.82);

          // Traveling wind wave crests brighten slightly as blades tilt toward sky light
          bladeGrad *= 0.92 + vWindCrest * 0.18 * hNorm;

          // Deep soil-contact ambient occlusion at the root
          vec3 rootShadow = vec3(0.042, 0.075, 0.02);
          float rootAo = smoothstep(0.0, 0.34, hNorm) * mix(0.74, 1.0, 1.0 - vBladeData.z * 0.24);
          vec3 finalBlade = mix(rootShadow, bladeGrad, rootAo) * cloudDapple;

          diffuseColor.rgb = finalBlade * diffuseColor.rgb * 1.68;
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          float midVein = 1.0 - smoothstep(0.0, 0.3, abs(vGrassUv.x - 0.5));
          // Matte shaded base -> waxy sunlit cuticle + dewy midrib sheen near tips
          roughnessFactor = mix(0.94, 0.52, smoothstep(0.15, 0.92, vBladeData.x)) - midVein * 0.06;
          roughnessFactor = clamp(roughnessFactor, 0.44, 0.96);
          `
        )
        .replace(
          '#include <lights_fragment_end>',
          `
          #include <lights_fragment_end>
          // Dual-sided sunlit subsurface translucency + rim glow along arched tips
          vec3 viewDirW = normalize(cameraPosition - vGrassWorldPos);
          vec3 sDir = normalize(uSunDir);
          float backLight = pow(max(0.0, dot(viewDirW, -sDir)), 2.6);
          float directLit = smoothstep(0.02, 0.26, length(reflectedLight.directDiffuse));
          float tipScatter = smoothstep(0.18, 1.0, vBladeData.x);
          reflectedLight.directDiffuse += diffuseColor.rgb * uSunColor * (0.16 + 1.05 * backLight) * tipScatter * directLit * 0.46;
          `
        );
  };

  return { material, timeUniform, sunDirUniform, sunColorUniform, playerPosUniform };
}

const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

/**
 * Populates the InstancedMesh with densely packed, organically patch-clustered 3D grass clumps
 * matching each map's grass mask & terrain elevation.
 */
export function populateGrassInstances(
  grassInstanced: THREE.InstancedMesh,
  maxCount: number,
  mapId: MapId,
  getFloorHeight: (mapId: MapId, x: number, z: number, currentFootY?: number) => number,
  isClearGroundSpot: (mapId: MapId, x: number, z: number) => boolean
): void {
  const spec = ARENA_MAPS[mapId];
  let placed = 0;

  const innerTarget = Math.floor(maxCount * 0.72);
  const maxAttempts = maxCount * 5;

  const tryPlaceSingleTuft = (
    gx: number,
    gz: number,
    isOuterPass: boolean,
    h3: number,
    h4: number
  ): boolean => {
    if (placed >= maxCount) return false;
    const insideWalls = Math.abs(gx) <= spec.halfX - 0.5 && Math.abs(gz) <= spec.halfZ - 0.5;
    if (mapId === 'docks' && !insideWalls) return false;

    const onWallStrip =
      !insideWalls && Math.abs(gx) <= spec.halfX + 2.4 && Math.abs(gz) <= spec.halfZ + 2.4;
    if (onWallStrip) return false;

    if (insideWalls && !isClearGroundSpot(mapId, gx, gz)) return false;

    const weight = getGrassWeightAt(mapId, gx, gz);
    if (weight < 0.2) return false;
    if (h4 > weight * 1.06) return false;

    const gy = getFloorHeight(mapId, gx, gz, 0);
    if (gy < -0.1) return false;

    const outerScaleBoost = isOuterPass ? 1.32 : 1.0;
    const lushScale = 0.66 + weight * 0.54;
    const scXZ = (0.82 + h3 * 0.7) * lushScale * outerScaleBoost;
    const scY = (0.7 + h4 * 0.68) * lushScale * outerScaleBoost;

    _scale.set(scXZ, scY, scXZ);
    _euler.set((h3 - 0.5) * 0.16, h4 * Math.PI * 2, (h4 - 0.5) * 0.16);
    _quat.setFromEuler(_euler);
    _pos.set(gx, gy - 0.018, gz);
    _mat4.compose(_pos, _quat, _scale);
    grassInstanced.setMatrixAt(placed, _mat4);

    const macro = organicTerrainNoise(gx * 0.85, gz * 0.85);
    const shade = 0.52 + h3 * 0.24;
    const warmShift = macro * 0.11;
    const edgeDry = (1 - weight) * 0.14;
    _color.setRGB(
      shade * (0.86 + warmShift + edgeDry),
      shade * (1.03 - edgeDry * 0.32),
      shade * (0.76 - warmShift * 0.42)
    );
    grassInstanced.setColorAt(placed, _color);
    placed += 1;
    return true;
  };

  for (let i = 0; i < maxAttempts && placed < maxCount; i++) {
    const isOuterPass = placed >= innerTarget;
    const h1 = hash2d(i * 1.13 + 7.1, isOuterPass ? 19.3 : 3.7);
    const h2 = hash2d(i * 2.41 + 3.3, isOuterPass ? 43.7 : 11.9);
    const h3 = hash2d(i * 3.79 + 9.7, 29.1);
    const h4 = hash2d(i * 5.03 + 1.1, 61.3);

    const isWaterArena = mapId === 'hydro' || mapId === 'splash';
    const spreadX =
      isWaterArena
        ? spec.halfX + 38
        : isOuterPass
          ? spec.halfX + 23
          : spec.halfX + 4;
    const spreadZ =
      isWaterArena
        ? spec.halfZ + 38
        : isOuterPass
          ? spec.halfZ + 23
          : spec.halfZ + 4;

    const baseX = (h1 * 2 - 1) * spreadX;
    const baseZ = (h2 * 2 - 1) * spreadZ;

    if (!tryPlaceSingleTuft(baseX, baseZ, isOuterPass, h3, h4)) continue;

    // Organically cluster 1–3 companion tufts around dense patches for wild meadow volume
    const clusterCount = h3 > 0.42 ? 2 : h3 > 0.22 ? 1 : 0;
    for (let c = 0; c < clusterCount && placed < maxCount; c++) {
      const ch1 = hash2d(i * 7.13 + c * 11.7, 3.1 + c);
      const ch2 = hash2d(i * 5.31 + c * 13.3, 9.7 + c);
      const ang = ch1 * Math.PI * 2;
      const dist = 0.24 + ch2 * 0.62;
      tryPlaceSingleTuft(
        baseX + Math.cos(ang) * dist,
        baseZ + Math.sin(ang) * dist,
        isOuterPass,
        ch1,
        ch2
      );
    }
  }

  for (let k = placed; k < maxCount; k++) {
    _scale.set(0, 0, 0);
    _pos.set(0, -120, 0);
    _quat.identity();
    _mat4.compose(_pos, _quat, _scale);
    grassInstanced.setMatrixAt(k, _mat4);
  }

  grassInstanced.instanceMatrix.needsUpdate = true;
  if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
  grassInstanced.computeBoundingSphere();
}
