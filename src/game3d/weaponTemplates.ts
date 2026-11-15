import {
  FinisherId,
  GunSpec,
  MELEE_WEAPONS,
  MeleeId,
  MeleeSpec,
  PRIMARY_WEAPONS,
  PrimaryId,
  SECONDARY_WEAPONS,
  SecondaryId,
  UTILITY_ITEMS,
  UtilityId,
  UtilitySpec,
  WeaponSkinId,
} from './types';

export type WeaponId = PrimaryId | SecondaryId | MeleeId | UtilityId;
export type WeaponCategory = 'primary' | 'secondary' | 'melee' | 'utility';

export type OpticAttachment = 'iron' | 'holo' | 'scope';
export type BarrelAttachment = 'standard' | 'suppressor' | 'heavy';
export type MagazineAttachment = 'standard' | 'extended' | 'quick';
export type FireModeOverride = 'default' | 'auto' | 'semi';

export interface WeaponFinisherSpec {
  id: FinisherId;
  name: string;
  subtitle: string;
  colorHex: string;
}

export const WEAPON_FINISHERS: WeaponFinisherSpec[] = [
  {
    id: 'standard',
    name: 'Shockwave Burst',
    subtitle: 'Classic tactical shockwave ring',
    colorHex: '#38bdf8',
  },
  {
    id: 'plasma_burst',
    name: 'Plasma Overdrive',
    subtitle: 'Twin cyber-plasma shock rings & fountain',
    colorHex: '#22d3ee',
  },
  {
    id: 'orbital_beam',
    name: 'Orbital Ion Beam',
    subtitle: 'Sky-piercing orbital laser strike',
    colorHex: '#60a5fa',
  },
  {
    id: 'vortex_implosion',
    name: 'Gravity Vortex',
    subtitle: 'Collapsing void singularity sphere',
    colorHex: '#a855f7',
  },
  {
    id: 'cyber_shatter',
    name: 'Cyber Data Shatter',
    subtitle: 'Exploding holographic voxel shards',
    colorHex: '#10b981',
  },
  {
    id: 'lightning_strike',
    name: 'Volt Arc Strike',
    subtitle: 'High-voltage electric plasma pillars',
    colorHex: '#fde047',
  },
  {
    id: 'supernova_blast',
    name: 'Solar Supernova',
    subtitle: 'Triple solar blastwave & star core',
    colorHex: '#f97316',
  },
];

export interface WeaponCustomBuild {
  templateId: string;
  templateName: string;
  colorHex: string;
  skin: WeaponSkinId;
  finisher: FinisherId;
  optic: OpticAttachment;
  barrel: BarrelAttachment;
  magazine: MagazineAttachment;
  fireMode: FireModeOverride;
  damageMult: number;
  fireRateMult: number;
  magBonus: number;
  accuracyMult: number;
  recoilMult: number;
  adsZoomDelta: number;
  speedMult: number;
  dashMult: number;
  reachMult: number;
  powerMult: number;
}

export interface WeaponTemplatePreset {
  id: string;
  name: string;
  subtitle: string;
  patch: Partial<WeaponCustomBuild>;
}

export interface UserSavedTemplate {
  id: string;
  weaponId: WeaponId;
  name: string;
  build: WeaponCustomBuild;
}

export const WEAPON_FINISH_SWATCHES: Array<{ name: string; hex: string }> = [
  { name: 'Sky Neon', hex: '#38bdf8' },
  { name: 'Crimson', hex: '#f43f5e' },
  { name: 'Solar Gold', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#a855f7' },
  { name: 'Cobalt', hex: '#3b82f6' },
  { name: 'Titanium', hex: '#cbd5e1' },
  { name: 'Inferno', hex: '#f97316' },
];

export const ALL_WEAPON_LIST: Array<{
  id: WeaponId;
  name: string;
  category: WeaponCategory;
}> = [
  ...(Object.keys(PRIMARY_WEAPONS) as PrimaryId[]).map((id) => ({
    id: id as WeaponId,
    name: PRIMARY_WEAPONS[id].name,
    category: 'primary' as WeaponCategory,
  })),
  ...(Object.keys(SECONDARY_WEAPONS) as SecondaryId[]).map((id) => ({
    id: id as WeaponId,
    name: SECONDARY_WEAPONS[id].name,
    category: 'secondary' as WeaponCategory,
  })),
  ...(Object.keys(MELEE_WEAPONS) as MeleeId[]).map((id) => ({
    id: id as WeaponId,
    name: MELEE_WEAPONS[id].name,
    category: 'melee' as WeaponCategory,
  })),
  ...(Object.keys(UTILITY_ITEMS) as UtilityId[]).map((id) => ({
    id: id as WeaponId,
    name: UTILITY_ITEMS[id].name,
    category: 'utility' as WeaponCategory,
  })),
];

export function hexNumToCss(num: number): string {
  return `#${num.toString(16).padStart(6, '0')}`;
}

export function cssHexToNum(hex: string): number {
  const cleaned = hex.replace('#', '');
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : 0x38bdf8;
}

export function getWeaponCategory(id: WeaponId): WeaponCategory {
  if (id in PRIMARY_WEAPONS) return 'primary';
  if (id in SECONDARY_WEAPONS) return 'secondary';
  if (id in MELEE_WEAPONS) return 'melee';
  return 'utility';
}

export function getDefaultWeaponBuild(id: WeaponId): WeaponCustomBuild {
  const cat = getWeaponCategory(id);
  let defaultColor = '#38bdf8';
  let defaultOptic: OpticAttachment = 'holo';

  if (cat === 'primary') {
    const spec = PRIMARY_WEAPONS[id as PrimaryId];
    defaultColor = hexNumToCss(spec.color);
    defaultOptic = id === 'sniper' ? 'scope' : 'holo';
  } else if (cat === 'secondary') {
    const spec = SECONDARY_WEAPONS[id as SecondaryId];
    defaultColor = hexNumToCss(spec.color);
    defaultOptic = id === 'uzi' ? 'holo' : 'iron';
  } else if (cat === 'melee') {
    defaultColor = hexNumToCss(MELEE_WEAPONS[id as MeleeId].color);
    defaultOptic = 'iron';
  } else {
    defaultColor = hexNumToCss(UTILITY_ITEMS[id as UtilityId].color);
    defaultOptic = 'iron';
  }

  return {
    templateId: 'factory_default',
    templateName: 'Factory Standard',
    colorHex: defaultColor,
    skin: 'standard',
    finisher: id === 'rpg' ? 'supernova_blast' : 'plasma_burst',
    optic: defaultOptic,
    barrel: 'standard',
    magazine: 'standard',
    fireMode: 'default',
    damageMult: 1.0,
    fireRateMult: 1.0,
    magBonus: 0,
    accuracyMult: 1.0,
    recoilMult: 1.0,
    adsZoomDelta: 0,
    speedMult: 1.0,
    dashMult: 1.0,
    reachMult: 1.0,
    powerMult: 1.0,
  };
}

export function getTemplatesForWeapon(id: WeaponId): WeaponTemplatePreset[] {
  const cat = getWeaponCategory(id);
  const base = getDefaultWeaponBuild(id);

  if (cat === 'primary' || cat === 'secondary') {
    const isSniper = id === 'sniper';
    const isShotgun = id === 'shotgun';
    const isRpg = id === 'rpg';
    const isSecondary = cat === 'secondary';
    return [
      {
        id: 'factory_default',
        name: 'Factory Standard',
        subtitle: 'Balanced original factory configuration',
        patch: {
          colorHex: base.colorHex,
          finisher: base.finisher,
          optic: base.optic,
          barrel: 'standard',
          magazine: 'standard',
          fireMode: 'default',
          damageMult: 1.0,
          fireRateMult: 1.0,
          magBonus: 0,
          accuracyMult: 1.0,
          recoilMult: 1.0,
          adsZoomDelta: 0,
        },
      },
      {
        id: 'phantom_ops',
        name: 'Phantom Spec-Ops',
        subtitle: 'Suppressed, crisp holo, ultra-low recoil',
        patch: {
          colorHex: '#0ea5e9',
          finisher: 'orbital_beam',
          optic: 'holo',
          barrel: 'suppressor',
          magazine: 'quick',
          fireMode: 'default',
          damageMult: 1.05,
          fireRateMult: 1.12,
          magBonus: isSniper || isRpg ? 2 : 4,
          accuracyMult: 1.25,
          recoilMult: 0.55,
          adsZoomDelta: -2,
        },
      },
      {
        id: 'marksman_pro',
        name: 'Marksman Precision',
        subtitle: 'Magnified scope, heavy barrel & pinpoint spread',
        patch: {
          colorHex: '#10b981',
          finisher: 'cyber_shatter',
          optic: 'scope',
          barrel: 'heavy',
          magazine: 'standard',
          fireMode: isSniper || isRpg ? 'semi' : 'default',
          damageMult: 1.28,
          fireRateMult: 0.9,
          magBonus: 0,
          accuracyMult: 1.48,
          recoilMult: 0.85,
          adsZoomDelta: isSniper ? -6 : -10,
        },
      },
      {
        id: 'hyper_rusher',
        name: 'Hyper Full-Auto',
        subtitle: 'Full-auto trigger, rapid fire & extended mag',
        patch: {
          colorHex: '#f43f5e',
          finisher: 'lightning_strike',
          optic: 'holo',
          barrel: 'standard',
          magazine: 'extended',
          fireMode: 'auto',
          damageMult: isShotgun || isSniper || isRpg ? 0.88 : 0.96,
          fireRateMult: 1.45,
          magBonus: isSniper || isRpg ? 3 : isSecondary ? 10 : 14,
          accuracyMult: 0.92,
          recoilMult: 0.72,
          adsZoomDelta: 4,
        },
      },
      {
        id: 'heavy_gold',
        name: 'Solar Heavyweight',
        subtitle: 'Maximum stopping power & drum capacity',
        patch: {
          colorHex: '#f59e0b',
          finisher: 'supernova_blast',
          optic: isSniper ? 'scope' : 'iron',
          barrel: 'heavy',
          magazine: 'extended',
          fireMode: 'default',
          damageMult: 1.38,
          fireRateMult: 0.88,
          magBonus: isSniper || isRpg ? 3 : 10,
          accuracyMult: 1.15,
          recoilMult: 1.1,
          adsZoomDelta: 0,
        },
      },
    ];
  }

  if (cat === 'melee') {
    return [
      {
        id: 'factory_default',
        name: 'Balanced Steel',
        subtitle: 'Standard blade length & dash balance',
        patch: {
          colorHex: base.colorHex,
          damageMult: 1.0,
          fireRateMult: 1.0,
          speedMult: 1.0,
          dashMult: 1.0,
          reachMult: 1.0,
        },
      },
      {
        id: 'shadow_ronin',
        name: 'Shadow Ronin',
        subtitle: 'High sprint speed & explosive dash lunge',
        patch: {
          colorHex: '#a855f7',
          damageMult: 1.1,
          fireRateMult: 1.2,
          speedMult: 1.25,
          dashMult: 1.45,
          reachMult: 1.1,
        },
      },
      {
        id: 'titan_cleaver',
        name: 'Titan Longblade',
        subtitle: 'Extended blade reach & heavy cleave damage',
        patch: {
          colorHex: '#f43f5e',
          damageMult: 1.45,
          fireRateMult: 0.88,
          speedMult: 1.0,
          dashMult: 1.15,
          reachMult: 1.4,
        },
      },
      {
        id: 'volt_flash',
        name: 'Volt Cyclone',
        subtitle: 'Ultra-fast slash cadence & agility',
        patch: {
          colorHex: '#38bdf8',
          damageMult: 1.05,
          fireRateMult: 1.5,
          speedMult: 1.3,
          dashMult: 1.3,
          reachMult: 1.15,
        },
      },
    ];
  }

  return [
    {
      id: 'factory_default',
      name: 'Standard Issue',
      subtitle: 'Balanced tactical utility spec',
      patch: {
        colorHex: base.colorHex,
        powerMult: 1.0,
        magBonus: 0,
        dashMult: 1.0,
        fireRateMult: 1.0,
      },
    },
    {
      id: 'overcharged',
      name: 'Overcharged Core',
      subtitle: '+1 Charge & boosted blast/heal/stun power',
      patch: {
        colorHex: '#f59e0b',
        powerMult: 1.4,
        magBonus: 1,
        dashMult: 1.1,
        fireRateMult: 1.15,
      },
    },
    {
      id: 'quartermaster',
      name: 'Quartermaster Pack',
      subtitle: '+2 Extra Charges & fast high-velocity throw',
      patch: {
        colorHex: '#10b981',
        powerMult: 1.1,
        magBonus: 2,
        dashMult: 1.35,
        fireRateMult: 1.3,
      },
    },
    {
      id: 'crimson_impact',
      name: 'Apex Payload',
      subtitle: 'Maximum potency & instant fuse velocity',
      patch: {
        colorHex: '#f43f5e',
        powerMult: 1.65,
        magBonus: 1,
        dashMult: 1.4,
        fireRateMult: 1.25,
      },
    },
  ];
}

export function applyTemplateToBuild(
  weaponId: WeaponId,
  preset: WeaponTemplatePreset
): WeaponCustomBuild {
  return {
    ...getDefaultWeaponBuild(weaponId),
    ...preset.patch,
    templateId: preset.id,
    templateName: preset.name,
  };
}

export interface ResolvedGunSpec extends GunSpec {
  optic: OpticAttachment;
  barrel: BarrelAttachment;
  magazine: MagazineAttachment;
}

export function resolveGunSpec(base: GunSpec, build?: WeaponCustomBuild): ResolvedGunSpec {
  const b = build ?? getDefaultWeaponBuild(base.id as WeaponId);
  const magMult = b.magazine === 'extended' ? 1.35 : 1.0;
  const reloadMult = b.magazine === 'quick' ? 0.65 : b.magazine === 'extended' ? 1.15 : 1.0;
  const barrelAccMult = b.barrel === 'heavy' ? 1.22 : b.barrel === 'suppressor' ? 1.1 : 1.0;
  const barrelRecoilMult = b.barrel === 'suppressor' ? 0.78 : b.barrel === 'heavy' ? 0.88 : 1.0;
  const opticZoom = b.optic === 'scope' ? -14 : b.optic === 'holo' ? -3 : 4;

  const auto =
    b.fireMode === 'auto' ? true : b.fireMode === 'semi' ? false : base.auto;

  const magSize = Math.max(
    1,
    Math.round(base.magSize * magMult) + Math.round(b.magBonus)
  );
  const fireInterval = Math.max(0.045, base.fireInterval / Math.max(0.5, b.fireRateMult));
  const reloadTime = Math.max(0.45, base.reloadTime * reloadMult);
  const totalAcc = Math.max(0.3, b.accuracyMult * barrelAccMult);

  return {
    ...base,
    damage: Math.max(4, Math.round(base.damage * b.damageMult)),
    fireInterval,
    magSize,
    reloadTime,
    spread: Math.max(0.001, base.spread / totalAcc),
    adsSpread: Math.max(0.0002, base.adsSpread / totalAcc),
    adsFov: Math.min(72, Math.max(24, base.adsFov + opticZoom + b.adsZoomDelta)),
    auto,
    color: cssHexToNum(b.colorHex),
    recoilKick: Math.max(0.01, base.recoilKick * b.recoilMult * barrelRecoilMult),
    optic: b.optic,
    barrel: b.barrel,
    magazine: b.magazine,
  };
}

export interface ResolvedMeleeSpec extends MeleeSpec {
  reachMult: number;
}

export function resolveMeleeSpec(
  base: MeleeSpec,
  build?: WeaponCustomBuild
): ResolvedMeleeSpec {
  const b = build ?? getDefaultWeaponBuild(base.id);
  return {
    ...base,
    damage: Math.max(10, Math.round(base.damage * b.damageMult)),
    cooldown: Math.max(0.16, base.cooldown / Math.max(0.5, b.fireRateMult)),
    range: Number((base.range * b.reachMult).toFixed(2)),
    speedBonus: Number((base.speedBonus * b.speedMult).toFixed(2)),
    dashImpulse: Number((base.dashImpulse * b.dashMult).toFixed(1)),
    color: cssHexToNum(b.colorHex),
    reachMult: b.reachMult,
  };
}

export interface ResolvedUtilitySpec extends UtilitySpec {
  powerMult: number;
  throwSpeedMult: number;
}

export function resolveUtilitySpec(
  base: UtilitySpec,
  build?: WeaponCustomBuild
): ResolvedUtilitySpec {
  const b = build ?? getDefaultWeaponBuild(base.id);
  return {
    ...base,
    charges: Math.max(1, base.charges + Math.round(b.magBonus)),
    cooldown: Math.max(1.5, Number((base.cooldown / Math.max(0.5, b.fireRateMult)).toFixed(1))),
    color: cssHexToNum(b.colorHex),
    powerMult: b.powerMult,
    throwSpeedMult: b.dashMult,
  };
}

const BUILDS_STORAGE_KEY = 'rivals_weapon_builds_v1';
const USER_TEMPLATES_STORAGE_KEY = 'rivals_user_weapon_templates_v1';

export type WeaponBuildsMap = Record<WeaponId, WeaponCustomBuild>;

export function createDefaultBuildsMap(): WeaponBuildsMap {
  const out = {} as WeaponBuildsMap;
  for (const w of ALL_WEAPON_LIST) {
    out[w.id] = getDefaultWeaponBuild(w.id);
  }
  return out;
}

export function loadWeaponBuilds(): WeaponBuildsMap {
  const defaults = createDefaultBuildsMap();
  try {
    const raw = window.localStorage.getItem(BUILDS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<WeaponId, Partial<WeaponCustomBuild>>>;
    for (const w of ALL_WEAPON_LIST) {
      if (parsed[w.id]) {
        defaults[w.id] = { ...defaults[w.id], ...parsed[w.id] };
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

export function saveWeaponBuilds(builds: WeaponBuildsMap): void {
  try {
    window.localStorage.setItem(BUILDS_STORAGE_KEY, JSON.stringify(builds));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadUserTemplates(): UserSavedTemplate[] {
  try {
    const raw = window.localStorage.getItem(USER_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserSavedTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveUserTemplates(list: UserSavedTemplate[]): void {
  try {
    window.localStorage.setItem(USER_TEMPLATES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}
