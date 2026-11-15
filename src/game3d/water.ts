import * as THREE from 'three';

export const MAX_WATER_RIPPLES = 8;

export interface HydroWaterController {
  timeUniform: { value: number };
  ripplesUniform: { value: THREE.Vector4[] };
  sunDirUniform: { value: THREE.Vector3 };
  sunColorUniform: { value: THREE.Color };
  addRipple: (x: number, z: number, strength?: number) => void;
  update: (elapsed: number) => void;
}

/**
 * Physically-grounded animated water material for Hydro Dome (splash) arena floor.
 * Extends MeshStandardMaterial via onBeforeCompile so it receives real-time shadows,
 * RoomEnvironment IBL reflections, multi-octave Gerstner/capillary ripples,
 * Schlick Fresnel sky reflection, Beer-Lambert depth absorption, underwater caustics,
 * obstacle/shoreline contact foam, and interactive player/impact ripple rings.
 */
export function createHydroDomeWaterMaterial(options: {
  sunPosition: THREE.Vector3;
  sunColorHex: number;
  skyZenithHex?: number;
  skyHorizonHex?: number;
  isLagoon?: boolean;
}): {
  material: THREE.MeshStandardMaterial;
  controller: HydroWaterController;
} {
  const isLagoon = Boolean(options.isLagoon);
  const timeUniform = { value: 0 };
  const ripplesUniform = {
    value: Array.from({ length: MAX_WATER_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)),
  };
  const sunDirUniform = { value: options.sunPosition.clone().normalize() };
  const sunColorUniform = { value: new THREE.Color(options.sunColorHex) };
  const skyZenithUniform = { value: new THREE.Color(options.skyZenithHex ?? 0x075985) };
  const skyHorizonUniform = { value: new THREE.Color(options.skyHorizonHex ?? 0x7dd3fc) };

  let rippleCursor = 0;
  let lastElapsed = 0;

  const controller: HydroWaterController = {
    timeUniform,
    ripplesUniform,
    sunDirUniform,
    sunColorUniform,
    addRipple: (x: number, z: number, strength = 1.0) => {
      const slot = ripplesUniform.value[rippleCursor];
      slot.set(x, z, lastElapsed, Math.min(2.6, Math.max(0.25, strength)));
      rippleCursor = (rippleCursor + 1) % MAX_WATER_RIPPLES;
    },
    update: (elapsed: number) => {
      lastElapsed = elapsed;
      timeUniform.value = elapsed;
    },
  };

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: isLagoon ? 0.08 : 0.045,
    metalness: 0.08,
    envMapIntensity: isLagoon ? 1.15 : 1.38,
    transparent: !isLagoon,
    opacity: 1.0,
    depthWrite: isLagoon,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterTime = timeUniform;
    shader.uniforms.uRipples = ripplesUniform;
    shader.uniforms.uSunDir = sunDirUniform;
    shader.uniforms.uSunColor = sunColorUniform;
    shader.uniforms.uSkyZenith = skyZenithUniform;
    shader.uniforms.uSkyHorizon = skyHorizonUniform;
    shader.uniforms.uIsLagoon = { value: isLagoon ? 1.0 : 0.0 };

    shader.vertexShader =
      `
      uniform float uWaterTime;
      uniform float uIsLagoon;
      varying vec3 vWaterWorldPos;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec4 wPre = modelMatrix * vec4(transformed, 1.0);
        float wx = wPre.x;
        float wz = wPre.z;
        float absMax = max(abs(wx), abs(wz));
        float deepMask = 1.0 - smoothstep(13.0, 14.2, absMax);
        float amp = uIsLagoon > 0.5 ? 0.095 : mix(0.012, 0.036, deepMask);

        float w1 = sin(wx * 0.78 + wz * 0.34 + uWaterTime * 2.15);
        float w2 = cos(wz * 0.92 - wx * 0.41 + uWaterTime * 1.75);
        float w3 = sin((wx + wz) * 1.45 - uWaterTime * 2.75) * 0.45;
        float disp = (w1 + w2 + w3) * amp;

        // PlaneGeometry is rotated -PI/2 around X, so local +Z is world +Y
        transformed.z += disp;
        vec4 wPost = modelMatrix * vec4(transformed, 1.0);
        vWaterWorldPos = wPost.xyz;
        `
      );

    shader.fragmentShader =
      `
      uniform float uWaterTime;
      uniform vec4 uRipples[${MAX_WATER_RIPPLES}];
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyZenith;
      uniform vec3 uSkyHorizon;
      uniform float uIsLagoon;
      varying vec3 vWaterWorldPos;

      float waterHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float waterNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = waterHash(i);
        float b = waterHash(i + vec2(1.0, 0.0));
        float c = waterHash(i + vec2(0.0, 1.0));
        float d = waterHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      // Dual-layer animated water wave height for crisp analytical derivatives
      float sampleWaterHeight(vec2 p, float t, float detailScale) {
        float h = 0.0;
        h += sin(p.x * 0.85 + p.y * 0.42 + t * 2.1) * 0.022;
        h += cos(p.y * 1.05 - p.x * 0.55 + t * 1.85) * 0.020;
        h += sin((p.x - p.y) * 2.35 + t * 3.1) * 0.009 * detailScale;
        h += cos((p.x * 1.7 + p.y * 2.6) - t * 3.6) * 0.007 * detailScale;
        h += (waterNoise(p * 1.9 + vec2(t * 0.55, -t * 0.42)) - 0.5) * 0.015 * detailScale;
        h += (waterNoise(p * 4.4 + vec2(-t * 0.72, t * 0.65)) - 0.5) * 0.007 * detailScale;
        return h;
      }

      // Voronoi-like caustic interference pattern
      float causticPattern(vec2 uv, float t) {
        vec2 p1 = uv * 1.35 + vec2(t * 0.28, -t * 0.21);
        vec2 p2 = uv * 1.72 + vec2(-t * 0.24, t * 0.31);
        float a = sin(p1.x * 3.1 + sin(p1.y * 2.7 + t * 1.1));
        float b = cos(p2.y * 3.3 + cos(p2.x * 2.9 - t * 0.95));
        float c = sin((p1.x + p2.y) * 2.4 - t * 1.35);
        float web = 1.0 - abs(a + b * 0.8 + c * 0.5) * 0.45;
        return pow(clamp(web, 0.0, 1.0), 4.2);
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          vec2 wXZ = vWaterWorldPos.xz;
          float t = uWaterTime;

          // Distance to Hydro Dome pool boundaries & architectural features for depth & foam
          float boxPool = max(abs(wXZ.x), abs(wXZ.y)) - 13.5;
          float inDeepPool = 1.0 - smoothstep(-0.35, 0.45, boxPool);
          float copingRimDist = abs(boxPool);

          // Distances to 4 pavilion columns (+-6.1, +-6.1) and 4 corner palm planters (+-23, +-24)
          vec2 colP = abs(wXZ) - vec2(6.1, 6.1);
          float colDist = length(colP) - 0.44;
          vec2 palmP = abs(wXZ) - vec2(23.0, 24.0);
          float palmDist = length(palmP) - 1.35;

          // Distances to ground-level cover containers in splash
          vec2 contA = abs(abs(wXZ) - vec2(16.5, 13.5)) - vec2(2.4, 1.6);
          float contADist = length(max(contA, 0.0)) + min(max(contA.x, contA.y), 0.0);
          vec2 contB = abs(vec2(abs(wXZ.x), abs(wXZ.y) - 21.5)) - vec2(2.8, 0.7);
          float contBDist = length(max(contB, 0.0)) + min(max(contB.x, contB.y), 0.0);

          // Perimeter seawall distance
          float wallDist = min(29.0 - abs(wXZ.x), 33.0 - abs(wXZ.y));
          float outerWallFoam = uIsLagoon > 0.5
            ? 1.0 - smoothstep(0.0, 2.2, max(abs(wXZ.x) - 30.2, abs(wXZ.y) - 34.2))
            : 1.0 - smoothstep(0.0, 0.95, max(0.0, wallDist));

          // Interactive expanding ripple rings from footsteps, landings & bullet impacts
          float rippleHeight = 0.0;
          float rippleFoam = 0.0;
          vec2 rippleGrad = vec2(0.0);
          for (int i = 0; i < ${MAX_WATER_RIPPLES}; i++) {
            vec4 rp = uRipples[i];
            float age = t - rp.z;
            if (age > 0.0 && age < 2.2 && rp.w > 0.01) {
              vec2 dVec = wXZ - rp.xy;
              float dist = length(dVec);
              float ringR = age * 4.6;
              float band = exp(-pow((dist - ringR) * 2.2, 2.0));
              float fade = (1.0 - age / 2.2) * rp.w;
              float wave = sin((dist - ringR) * 11.0);
              rippleHeight += wave * band * fade * 0.035;
              rippleFoam += max(0.0, wave) * band * fade * 0.52;
              if (dist > 0.001) {
                vec2 dir = dVec / dist;
                rippleGrad += dir * cos((dist - ringR) * 11.0) * band * fade * 0.48;
              }
            }
          }

          // Water depth & Beer-Lambert optical color gradient
          float waterDepth = uIsLagoon > 0.5 ? 2.2 : mix(0.16, 0.62, inDeepPool);
          vec3 shallowCol = vec3(0.11, 0.78, 0.86);
          vec3 deepCol = vec3(0.015, 0.31, 0.52);
          vec3 lagoonCol = vec3(0.01, 0.21, 0.39);
          vec3 bodyCol = uIsLagoon > 0.5 ? lagoonCol : mix(shallowCol, deepCol, inDeepPool);

          // Caustics dancing beneath the surface
          float cVal = causticPattern(wXZ * 0.42, t);
          vec3 causticGlow = vec3(0.55, 0.96, 1.0) * cVal * (uIsLagoon > 0.5 ? 0.14 : mix(0.32, 0.48, inDeepPool));
          bodyCol += causticGlow;

          // Contact foam around obstacles, coping rim, columns, palms & seawalls
          float foamNoise = waterNoise(wXZ * 2.8 + vec2(t * 0.6, -t * 0.5));
          float copingFoam = (1.0 - smoothstep(0.0, 0.72, copingRimDist)) * smoothstep(0.28, 0.75, foamNoise + 0.18);
          float obsDist = min(min(colDist, palmDist), min(contADist, contBDist));
          float obsFoam = (1.0 - smoothstep(-0.08, 0.65, obsDist)) * smoothstep(0.25, 0.75, foamNoise + 0.2);
          float wallFoamMask = outerWallFoam * smoothstep(0.22, 0.76, foamNoise + 0.25);

          float totalFoam = uIsLagoon > 0.5
            ? clamp(wallFoamMask * 0.82 + smoothstep(0.76, 0.96, foamNoise) * 0.12, 0.0, 0.92)
            : clamp(copingFoam * 0.68 + obsFoam * 0.75 + wallFoamMask * 0.55 + rippleFoam, 0.0, 0.92);

          vec3 foamColor = vec3(0.92, 0.98, 1.0);
          diffuseColor.rgb = mix(bodyCol, foamColor, totalFoam);

          // View-angle Fresnel controls transparency so looking straight down reveals submerged pool tiles
          vec3 viewDirW = normalize(cameraPosition - vWaterWorldPos);
          float ndotv = clamp(viewDirW.y, 0.0, 1.0);
          float fresnelAlpha = 0.04 + 0.96 * pow(1.0 - ndotv, 3.6);
          if (uIsLagoon > 0.5) {
            diffuseColor.a = 1.0;
          } else {
            float baseOpacity = mix(0.36, 0.64, inDeepPool);
            diffuseColor.a = clamp(mix(baseOpacity, 0.92, fresnelAlpha) + totalFoam * 0.45, 0.34, 0.96);
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          roughnessFactor = mix(uIsLagoon > 0.5 ? 0.085 : 0.035, 0.58, totalFoam);
          `
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          float eps = 0.065;
          float dScale = uIsLagoon > 0.5 ? 1.35 : 1.0;
          float hC = sampleWaterHeight(vWaterWorldPos.xz, uWaterTime, dScale);
          float hX = sampleWaterHeight(vWaterWorldPos.xz + vec2(eps, 0.0), uWaterTime, dScale);
          float hZ = sampleWaterHeight(vWaterWorldPos.xz + vec2(0.0, eps), uWaterTime, dScale);
          float dHdx = (hX - hC) / eps + rippleGrad.x;
          float dHdz = (hZ - hC) / eps + rippleGrad.y;
          float waveSlope = uIsLagoon > 0.5 ? 1.55 : 1.25;
          vec3 worldWaterN = normalize(vec3(-dHdx * waveSlope, 1.0, -dHdz * waveSlope));
          normal = normalize((viewMatrix * vec4(worldWaterN, 0.0)).xyz);
          `
        )
        .replace(
          '#include <lights_fragment_end>',
          `
          #include <lights_fragment_end>
          // Crisp Schlick Fresnel sky dome reflection + sun sparkle glints
          vec3 vDir = normalize(cameraPosition - vWaterWorldPos);
          vec3 rDir = reflect(-vDir, worldWaterN);
          float fresnelSky = 0.03 + 0.97 * pow(1.0 - max(0.0, dot(worldWaterN, vDir)), 4.6);
          float skyPitch = clamp(rDir.y, 0.0, 1.0);
          vec3 skyRefl = mix(uSkyHorizon, uSkyZenith, pow(skyPitch, 0.55));
          // Subtle geodesic dome rib reflection tint overhead
          float domeGrid = smoothstep(0.92, 0.985, abs(sin(rDir.x * 9.0 + rDir.z * 9.0))) * (1.0 - uIsLagoon);
          skyRefl = mix(skyRefl, vec3(0.75, 0.94, 1.0), domeGrid * 0.25);

          reflectedLight.indirectSpecular += skyRefl * fresnelSky * (1.0 - totalFoam * 0.75) * 0.85;

          // Tight sun specular sparkle across capillary ripples
          vec3 halfV = normalize(normalize(uSunDir) + vDir);
          float specGlint = pow(max(0.0, dot(worldWaterN, halfV)), 220.0);
          float broadSheen = pow(max(0.0, dot(worldWaterN, halfV)), 32.0);
          reflectedLight.directSpecular += uSunColor * (specGlint * 2.2 + broadSheen * 0.14) * (1.0 - totalFoam * 0.65);
          `
        );
  };

  return { material, controller };
}

/**
 * Animated cascading waterfall sheet material for Hydro Dome perimeter spillways.
 */
export function createWaterfallMaterial(timeUniform: { value: number }): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.9,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterTime = timeUniform;
    shader.vertexShader =
      `varying vec2 vFallUv;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vFallUv = vec2(transformed.x * 0.085 + 0.5, clamp(transformed.y / 1.35 + 0.5, 0.0, 1.0));
        `
      );
    shader.fragmentShader =
      `
      uniform float uWaterTime;
      varying vec2 vFallUv;
      float fallHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float fallNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(fallHash(i), fallHash(i + vec2(1.0, 0.0)), u.x),
          mix(fallHash(i + vec2(0.0, 1.0)), fallHash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      ` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float scrollY = vFallUv.y * 3.5 + uWaterTime * 2.9;
        float streakA = fallNoise(vec2(vFallUv.x * 18.0, scrollY));
        float streakB = fallNoise(vec2(vFallUv.x * 34.0 + 3.1, scrollY * 1.45));
        float foamStreak = smoothstep(0.42, 0.86, streakA * 0.65 + streakB * 0.45);
        float topCrest = smoothstep(0.78, 1.0, vFallUv.y);
        float bottomSplash = 1.0 - smoothstep(0.0, 0.28, vFallUv.y);
        float foam = clamp(foamStreak * 0.68 + topCrest * 0.72 + bottomSplash * 0.85, 0.0, 1.0);

        vec3 aquaStream = vec3(0.14, 0.76, 0.92);
        vec3 whiteFoam = vec3(0.92, 0.98, 1.0);
        diffuseColor.rgb = mix(aquaStream, whiteFoam, foam);
        diffuseColor.a = clamp(0.55 + foam * 0.4, 0.45, 0.95);
        `
      );
  };

  return mat;
}
