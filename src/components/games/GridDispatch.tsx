import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';
import { GameState, GridScenarioRecord } from '../../types/games';
import { soundEngine } from '../../utils/sound';

interface HourProfile {
  hour: number;
  demandMW: number;
  solarMW: number;
  windMW: number;
  eventNote?: string;
}

interface GridScenario {
  id: string;
  name: string;
  subtitle: string;
  challenge: string;
  batteryCapacityMWh: number;
  initialBatteryMWh: number;
  hydroBudgetMWh: number;
  hours: HourProfile[];
}

interface HourLog {
  hour: number;
  demandMW: number;
  cleanMW: number;
  fossilMW: number;
  curtailedMW: number;
  frequencyHz: number;
  blackout: boolean;
}

interface GridDispatchProps {
  records: Record<string, GridScenarioRecord>;
  onRecordUpdate: (
    scenarioId: string,
    cleanPercent: number,
    stabilityScore: number,
    blackouts: number
  ) => void;
  onBackToHub: () => void;
  soundMuted: boolean;
  onToggleMute: () => void;
}

const SCENARIOS: GridScenario[] = [
  {
    id: 'solis-harbor',
    name: 'Solis Harbor',
    subtitle: 'Coastal Duck Curve · Sunny Afternoon & Steep Evening EV Surge',
    challenge:
      'Store abundant midday solar surplus inside the grid battery, then discharge smoothly across the 17:00–21:00 sunset ramp.',
    batteryCapacityMWh: 420,
    initialBatteryMWh: 160,
    hydroBudgetMWh: 750,
    hours: [
      { hour: 0, demandMW: 190, solarMW: 0, windMW: 95 },
      { hour: 1, demandMW: 175, solarMW: 0, windMW: 90 },
      { hour: 2, demandMW: 165, solarMW: 0, windMW: 85 },
      { hour: 3, demandMW: 160, solarMW: 0, windMW: 80 },
      { hour: 4, demandMW: 170, solarMW: 0, windMW: 85 },
      { hour: 5, demandMW: 200, solarMW: 10, windMW: 80 },
      { hour: 6, demandMW: 245, solarMW: 45, windMW: 75, eventNote: 'Morning Transit Ramp' },
      { hour: 7, demandMW: 280, solarMW: 105, windMW: 70 },
      { hour: 8, demandMW: 295, solarMW: 175, windMW: 65 },
      { hour: 9, demandMW: 300, solarMW: 240, windMW: 60 },
      { hour: 10, demandMW: 305, solarMW: 295, windMW: 55 },
      { hour: 11, demandMW: 310, solarMW: 340, windMW: 55, eventNote: 'Solar Surplus Window' },
      { hour: 12, demandMW: 315, solarMW: 365, windMW: 60, eventNote: 'Peak Solar — Charge Battery' },
      { hour: 13, demandMW: 320, solarMW: 350, windMW: 65 },
      { hour: 14, demandMW: 325, solarMW: 310, windMW: 70 },
      { hour: 15, demandMW: 340, solarMW: 245, windMW: 70 },
      { hour: 16, demandMW: 365, solarMW: 155, windMW: 65 },
      { hour: 17, demandMW: 410, solarMW: 65, windMW: 60, eventNote: 'Sunset Duck Ramp Begins' },
      { hour: 18, demandMW: 445, solarMW: 10, windMW: 65, eventNote: 'Evening EV & Cooking Peak' },
      { hour: 19, demandMW: 435, solarMW: 0, windMW: 75 },
      { hour: 20, demandMW: 405, solarMW: 0, windMW: 85 },
      { hour: 21, demandMW: 355, solarMW: 0, windMW: 90 },
      { hour: 22, demandMW: 290, solarMW: 0, windMW: 95 },
      { hour: 23, demandMW: 235, solarMW: 0, windMW: 95 },
    ],
  },
  {
    id: 'monsoon-valley',
    name: 'Monsoon Valley',
    subtitle: 'Cloud Fronts & Offshore Wind Gusts',
    challenge:
      'A midday storm front suddenly cuts solar generation before high evening winds arrive. Conserve hydro water for the lull.',
    batteryCapacityMWh: 400,
    initialBatteryMWh: 180,
    hydroBudgetMWh: 820,
    hours: [
      { hour: 0, demandMW: 200, solarMW: 0, windMW: 140 },
      { hour: 1, demandMW: 185, solarMW: 0, windMW: 135 },
      { hour: 2, demandMW: 175, solarMW: 0, windMW: 125 },
      { hour: 3, demandMW: 175, solarMW: 0, windMW: 120 },
      { hour: 4, demandMW: 185, solarMW: 0, windMW: 110 },
      { hour: 5, demandMW: 215, solarMW: 10, windMW: 95 },
      { hour: 6, demandMW: 260, solarMW: 40, windMW: 80 },
      { hour: 7, demandMW: 300, solarMW: 95, windMW: 70 },
      { hour: 8, demandMW: 315, solarMW: 155, windMW: 60 },
      { hour: 9, demandMW: 325, solarMW: 215, windMW: 55 },
      { hour: 10, demandMW: 330, solarMW: 250, windMW: 55 },
      { hour: 11, demandMW: 335, solarMW: 180, windMW: 75, eventNote: 'Cloud Front Rolling In' },
      { hour: 12, demandMW: 340, solarMW: 115, windMW: 95, eventNote: 'Storm Shade — Solar Dip' },
      { hour: 13, demandMW: 335, solarMW: 110, windMW: 115 },
      { hour: 14, demandMW: 330, solarMW: 170, windMW: 130 },
      { hour: 15, demandMW: 345, solarMW: 195, windMW: 145 },
      { hour: 16, demandMW: 370, solarMW: 120, windMW: 160, eventNote: 'Offshore Wind Surge' },
      { hour: 17, demandMW: 405, solarMW: 45, windMW: 185 },
      { hour: 18, demandMW: 430, solarMW: 5, windMW: 195 },
      { hour: 19, demandMW: 415, solarMW: 0, windMW: 185 },
      { hour: 20, demandMW: 380, solarMW: 0, windMW: 170 },
      { hour: 21, demandMW: 335, solarMW: 0, windMW: 155 },
      { hour: 22, demandMW: 280, solarMW: 0, windMW: 150 },
      { hour: 23, demandMW: 230, solarMW: 0, windMW: 145 },
    ],
  },
  {
    id: 'northern-ridge',
    name: 'Northern Ridge',
    subtitle: 'Winter Cold Snap · High Heating Demand & Low Sun',
    challenge:
      'Short winter daylight and high morning + evening heating loads test your Demand Response timing and hydro reserve.',
    batteryCapacityMWh: 380,
    initialBatteryMWh: 220,
    hydroBudgetMWh: 950,
    hours: [
      { hour: 0, demandMW: 255, solarMW: 0, windMW: 120 },
      { hour: 1, demandMW: 245, solarMW: 0, windMW: 115 },
      { hour: 2, demandMW: 240, solarMW: 0, windMW: 110 },
      { hour: 3, demandMW: 240, solarMW: 0, windMW: 105 },
      { hour: 4, demandMW: 255, solarMW: 0, windMW: 100 },
      { hour: 5, demandMW: 295, solarMW: 0, windMW: 95 },
      { hour: 6, demandMW: 350, solarMW: 0, windMW: 95, eventNote: 'Morning Heating Spike' },
      { hour: 7, demandMW: 390, solarMW: 15, windMW: 90, eventNote: 'Peak Morning Commute' },
      { hour: 8, demandMW: 385, solarMW: 55, windMW: 85 },
      { hour: 9, demandMW: 365, solarMW: 105, windMW: 85 },
      { hour: 10, demandMW: 350, solarMW: 145, windMW: 90 },
      { hour: 11, demandMW: 340, solarMW: 170, windMW: 95 },
      { hour: 12, demandMW: 335, solarMW: 175, windMW: 100 },
      { hour: 13, demandMW: 340, solarMW: 160, windMW: 105 },
      { hour: 14, demandMW: 350, solarMW: 125, windMW: 105 },
      { hour: 15, demandMW: 375, solarMW: 65, windMW: 100 },
      { hour: 16, demandMW: 415, solarMW: 10, windMW: 95, eventNote: 'Early Sunset — Heating Surge' },
      { hour: 17, demandMW: 455, solarMW: 0, windMW: 90, eventNote: 'Critical Winter Peak' },
      { hour: 18, demandMW: 460, solarMW: 0, windMW: 95, eventNote: 'Consider Demand Response' },
      { hour: 19, demandMW: 440, solarMW: 0, windMW: 105 },
      { hour: 20, demandMW: 405, solarMW: 0, windMW: 115 },
      { hour: 21, demandMW: 365, solarMW: 0, windMW: 120 },
      { hour: 22, demandMW: 320, solarMW: 0, windMW: 125 },
      { hour: 23, demandMW: 280, solarMW: 0, windMW: 125 },
    ],
  },
];

export function GridDispatch({
  records,
  onRecordUpdate,
  onBackToHub,
  soundMuted,
  onToggleMute,
}: GridDispatchProps) {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const scenario = SCENARIOS[scenarioIdx];

  const [currentHour, setCurrentHour] = useState(0);
  const [batteryMWh, setBatteryMWh] = useState(scenario.initialBatteryMWh);
  const [hydroRemainingMWh, setHydroRemainingMWh] = useState(scenario.hydroBudgetMWh);
  const [demandResponseLeft, setDemandResponseLeft] = useState(4);
  const [demandResponseActive, setDemandResponseActive] = useState(false);

  // Dispatch sliders for the current hour
  const [batteryDispatchMW, setBatteryDispatchMW] = useState(0); // negative = charge, positive = discharge
  const [hydroMW, setHydroMW] = useState(60);
  const [peakerMW, setPeakerMW] = useState(0);

  const [logs, setLogs] = useState<HourLog[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);

  const hourData = scenario.hours[currentHour];
  const effectiveDemandMW = Math.round(
    hourData.demandMW * (demandResponseActive ? 0.85 : 1.0)
  );

  // Clamp battery dispatch against physical storage limits
  const maxChargeMW = -Math.min(120, Math.round(scenario.batteryCapacityMWh - batteryMWh));
  const maxDischargeMW = Math.min(120, Math.round(batteryMWh));
  const clampedBatteryMW = Math.max(maxChargeMW, Math.min(maxDischargeMW, batteryDispatchMW));
  const clampedHydroMW = Math.min(hydroMW, Math.round(hydroRemainingMWh));

  const renewableMW = hourData.solarMW + hourData.windMW;
  const totalSupplyMW = renewableMW + clampedBatteryMW + clampedHydroMW + peakerMW;
  const netBalanceMW = totalSupplyMW - effectiveDemandMW;
  const frequencyHz = Number((60.0 + netBalanceMW / 450).toFixed(2));

  const frequencyStatus = useMemo(() => {
    const diff = Math.abs(frequencyHz - 60.0);
    if (diff <= 0.1) return { label: 'NOMINAL', tone: 'text-emerald-700', isAlert: false };
    if (diff <= 0.22) return { label: 'STRAINED', tone: 'text-amber-700', isAlert: false };
    if (frequencyHz < 60.0) return { label: 'UNDERVOLTAGE RISK', tone: 'text-red-600', isAlert: true };
    return { label: 'SURPLUS OVERLOAD', tone: 'text-amber-700', isAlert: true };
  }, [frequencyHz]);

  const startScenario = useCallback((idx: number) => {
    const target = SCENARIOS[idx];
    setScenarioIdx(idx);
    setCurrentHour(0);
    setBatteryMWh(target.initialBatteryMWh);
    setHydroRemainingMWh(target.hydroBudgetMWh);
    setDemandResponseLeft(4);
    setDemandResponseActive(false);
    setBatteryDispatchMW(0);
    setHydroMW(60);
    setPeakerMW(0);
    setLogs([]);
    setAutoPlay(false);
    setGameState('PLAYING');
  }, []);

  const matchSupplySmart = useCallback(() => {
    const gap = effectiveDemandMW - renewableMW;
    if (gap < 0) {
      // Surplus renewables: charge battery as much as possible
      const chargeAmt = Math.max(maxChargeMW, gap);
      setBatteryDispatchMW(chargeAmt);
      setHydroMW(0);
      setPeakerMW(0);
    } else {
      // Deficit: prioritize hydro + battery before peaker
      const useHydro = Math.min(120, Math.round(hydroRemainingMWh), gap);
      const rem1 = gap - useHydro;
      const useBatt = Math.min(maxDischargeMW, rem1);
      const rem2 = rem1 - useBatt;
      const usePeaker = Math.min(200, rem2);
      setHydroMW(useHydro);
      setBatteryDispatchMW(useBatt);
      setPeakerMW(usePeaker);
    }
    soundEngine.playTick();
  }, [effectiveDemandMW, hydroRemainingMWh, maxChargeMW, maxDischargeMW, renewableMW]);

  const advanceHour = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const isBlackout = frequencyHz < 59.78;
    const cleanSupply = Math.max(0, renewableMW + Math.max(0, clampedBatteryMW) + clampedHydroMW);
    const curtailed = Math.max(0, netBalanceMW);

    const entry: HourLog = {
      hour: hourData.hour,
      demandMW: effectiveDemandMW,
      cleanMW: Math.min(effectiveDemandMW, cleanSupply),
      fossilMW: peakerMW,
      curtailedMW: curtailed,
      frequencyHz,
      blackout: isBlackout,
    };

    const nextLogs = [...logs, entry];
    setLogs(nextLogs);

    // Update storage pools
    const nextBattery = Math.max(
      0,
      Math.min(scenario.batteryCapacityMWh, batteryMWh - clampedBatteryMW)
    );
    const nextHydro = Math.max(0, hydroRemainingMWh - clampedHydroMW);
    setBatteryMWh(nextBattery);
    setHydroRemainingMWh(nextHydro);

    if (demandResponseActive) {
      setDemandResponseLeft((prev) => Math.max(0, prev - 1));
      setDemandResponseActive(false);
    }

    if (isBlackout) {
      soundEngine.playFailure();
    } else {
      soundEngine.playTick();
    }

    if (currentHour >= 23) {
      setAutoPlay(false);
      // Compute day report card
      const totalServed = nextLogs.reduce((s, l) => s + l.demandMW, 0);
      const totalFossil = nextLogs.reduce((s, l) => s + l.fossilMW, 0);
      const cleanPct = Math.max(
        0,
        Math.min(100, Math.round(((totalServed - totalFossil) / Math.max(1, totalServed)) * 100))
      );
      const nominalHours = nextLogs.filter((l) => Math.abs(l.frequencyHz - 60.0) <= 0.12).length;
      const stabilityScore = Math.round((nominalHours / 24) * 100);
      const blackouts = nextLogs.filter((l) => l.blackout).length;

      onRecordUpdate(scenario.id, cleanPct, stabilityScore, blackouts);
      soundEngine.playSuccess();
      setGameState('ROUND_SUMMARY');
    } else {
      setCurrentHour((h) => h + 1);
    }
  }, [
    batteryMWh,
    clampedBatteryMW,
    clampedHydroMW,
    currentHour,
    demandResponseActive,
    effectiveDemandMW,
    frequencyHz,
    gameState,
    hourData.hour,
    hydroRemainingMWh,
    logs,
    netBalanceMW,
    onRecordUpdate,
    peakerMW,
    renewableMW,
    scenario.batteryCapacityMWh,
    scenario.id,
  ]);

  // Optional auto-advance timer
  useEffect(() => {
    if (!autoPlay || gameState !== 'PLAYING') return;
    const timer = window.setTimeout(() => {
      advanceHour();
    }, 1650);
    return () => window.clearTimeout(timer);
  }, [advanceHour, autoPlay, gameState]);

  const summaryStats = useMemo(() => {
    if (logs.length === 0) return { cleanPct: 100, stabilityScore: 100, blackouts: 0, co2Tons: 0 };
    const totalServed = logs.reduce((s, l) => s + l.demandMW, 0);
    const totalFossil = logs.reduce((s, l) => s + l.fossilMW, 0);
    const cleanPct = Math.max(
      0,
      Math.min(100, Math.round(((totalServed - totalFossil) / Math.max(1, totalServed)) * 100))
    );
    const nominalHours = logs.filter((l) => Math.abs(l.frequencyHz - 60.0) <= 0.12).length;
    const stabilityScore = Math.round((nominalHours / logs.length) * 100);
    const blackouts = logs.filter((l) => l.blackout).length;
    const co2Tons = Math.round(totalFossil * 0.45);
    return { cleanPct, stabilityScore, blackouts, co2Tons };
  }, [logs]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      {/* Header strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Games
            </button>
            <span aria-hidden="true">·</span>
            <span>Real-World Challenge</span>
            <span aria-hidden="true">·</span>
            <span>Clean Energy Microgrid Dispatch</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Grid Dispatch
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {soundMuted ? 'Sound Off' : 'Sound On'}
          </button>

          {gameState === 'PLAYING' && (
            <button
              type="button"
              onClick={() => {
                setAutoPlay(false);
                setGameState('TITLE_MENU');
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              Scenarios
            </button>
          )}
        </div>
      </div>

      {/* TITLE MENU */}
      {gameState === 'TITLE_MENU' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-medium text-emerald-700">
                Real-World Climate & Infrastructure Game · 24-Hour Shift
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">
                Keep the lights on at 60.0 Hz without burning fossil fuel.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Modern renewable grids face the "Duck Curve": solar peaks at noon when demand is
                moderate, then vanishes right as evening demand surges. Balance battery storage,
                limited hydro reserves, and voluntary demand response across 24 hours with zero
                blackouts.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => startScenario(0)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Start 24-Hour Shift
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="text-xs font-semibold text-slate-500">Select Grid Scenario</div>
              {SCENARIOS.map((sc, idx) => {
                const rec = records[sc.id];
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => startScenario(idx)}
                    className="flex w-full flex-col items-start rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-left hover:border-emerald-600 hover:bg-white transition-colors cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-display text-base font-semibold text-slate-900">
                        {sc.name}
                      </span>
                      <span className="font-mono text-xs text-emerald-700">
                        {rec
                          ? `${rec.cleanPercent}% Clean · ${rec.blackouts} Blackouts`
                          : 'Unplayed'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{sc.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SIMULATION VIEW */}
      {gameState !== 'TITLE_MENU' && (
        <div className="space-y-4">
          {/* Top Grid Telemetry Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div>
              <div className="text-xs text-slate-500">Grid Clock</div>
              <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {String(hourData.hour).padStart(2, '0')}:00
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Grid Frequency</div>
              <div className={`font-mono text-lg font-bold tabular-nums ${frequencyStatus.tone}`}>
                {frequencyHz.toFixed(2)} Hz
              </div>
              <div className={`font-mono text-[11px] font-semibold ${frequencyStatus.tone}`}>
                {frequencyStatus.label}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Supply vs. Demand</div>
              <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {totalSupplyMW} / {effectiveDemandMW} MW
              </div>
              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                Net {netBalanceMW >= 0 ? `+${netBalanceMW}` : netBalanceMW} MW
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Battery Storage</div>
              <div className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                {Math.round(batteryMWh)} / {scenario.batteryCapacityMWh} MWh
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Hydro Reservoir</div>
              <div className="font-mono text-lg font-bold text-sky-700 tabular-nums">
                {Math.round(hydroRemainingMWh)} MWh
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Stage: 24-Hour Forecast & Dispatch Timeline */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">{scenario.name} · 24-Hour Profile</div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Load Forecast & Generation Mix
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-amber-400" />
                      Solar
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-sky-500" />
                      Wind
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-0.5 w-3.5 bg-slate-900" />
                      Demand
                    </span>
                  </div>
                </div>

                {/* 24-hour SVG Bar + Demand Curve */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <svg
                    viewBox="0 0 640 240"
                    className="w-full h-auto"
                    role="img"
                    aria-label="24 hour electricity demand and renewable supply chart"
                  >
                    {/* Horizontal grid lines */}
                    {[100, 200, 300, 400].map((mw) => {
                      const y = 215 - (mw / 500) * 190;
                      return (
                        <g key={mw}>
                          <line
                            x1={32}
                            y1={y}
                            x2={628}
                            y2={y}
                            stroke="rgba(148,163,184,0.14)"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={4}
                            y={y + 4}
                            fill="#94a3b8"
                            fontSize="9"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {mw}
                          </text>
                        </g>
                      );
                    })}

                    {/* Hourly renewable bars */}
                    {scenario.hours.map((h, i) => {
                      const barW = 18;
                      const x = 38 + i * 24.5;
                      const solarH = (h.solarMW / 500) * 190;
                      const windH = (h.windMW / 500) * 190;
                      const isCurrent = i === currentHour;
                      const pastLog = logs[i];

                      return (
                        <g key={h.hour}>
                          {isCurrent && (
                            <rect
                              x={x - 2}
                              y={18}
                              width={barW + 4}
                              height={198}
                              fill="rgba(56, 189, 248, 0.14)"
                              stroke="#38bdf8"
                              strokeWidth="1"
                              rx="2"
                            />
                          )}
                          {/* Wind bar */}
                          <rect
                            x={x}
                            y={215 - windH}
                            width={barW}
                            height={windH}
                            fill="#0ea5e9"
                            opacity={i < currentHour ? 0.55 : 0.9}
                          />
                          {/* Solar stacked on wind */}
                          <rect
                            x={x}
                            y={215 - windH - solarH}
                            width={barW}
                            height={solarH}
                            fill="#fbbf24"
                            opacity={i < currentHour ? 0.55 : 0.95}
                          />
                          {/* Fossil peaker marker if used in past log */}
                          {pastLog && pastLog.fossilMW > 0 && (
                            <rect
                              x={x}
                              y={215 - windH - solarH - (pastLog.fossilMW / 500) * 190}
                              width={barW}
                              height={(pastLog.fossilMW / 500) * 190}
                              fill="#ef4444"
                              opacity={0.85}
                            />
                          )}
                          {i % 3 === 0 && (
                            <text
                              x={x + barW / 2}
                              y={232}
                              textAnchor="middle"
                              fill={isCurrent ? '#ffffff' : '#94a3b8'}
                              fontSize="9"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {String(h.hour).padStart(2, '0')}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Forecast Demand Polyline */}
                    <polyline
                      fill="none"
                      stroke="#f8fafc"
                      strokeWidth="2.2"
                      points={scenario.hours
                        .map((h, i) => {
                          const x = 38 + i * 24.5 + 9;
                          const y = 215 - (h.demandMW / 500) * 190;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>

                {/* Live Hour Breakdown */}
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-slate-500">Solar Output</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-amber-600 tabular-nums">
                      {hourData.solarMW} MW
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-slate-500">Wind Output</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-sky-700 tabular-nums">
                      {hourData.windMW} MW
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-slate-500">Clean Share So Far</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-emerald-700 tabular-nums">
                      {summaryStats.cleanPct}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Advisory Banner */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  {frequencyStatus.isAlert ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  ) : (
                    <BatteryCharging className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {hourData.eventNote ? `Grid Advisory: ${hourData.eventNote}` : 'Dispatch Strategy'}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {scenario.challenge}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Deck: Dispatch Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Hour {String(hourData.hour).padStart(2, '0')}:00 Dispatch
                  </h3>
                  <button
                    type="button"
                    onClick={matchSupplySmart}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer whitespace-nowrap"
                  >
                    Auto-Balance Hour
                  </button>
                </div>

                {/* Battery Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="grid-battery" className="font-medium text-slate-700">
                      Battery ({clampedBatteryMW < 0 ? 'Charging' : clampedBatteryMW > 0 ? 'Discharging' : 'Idle'})
                    </label>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      {clampedBatteryMW > 0 ? `+${clampedBatteryMW}` : clampedBatteryMW} MW
                    </span>
                  </div>
                  <input
                    id="grid-battery"
                    type="range"
                    min={maxChargeMW}
                    max={maxDischargeMW}
                    step={5}
                    value={clampedBatteryMW}
                    onChange={(e) => setBatteryDispatchMW(Number(e.target.value))}
                    className="atelier-slider w-full"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Charge ({maxChargeMW} MW)</span>
                    <span>Discharge (+{maxDischargeMW} MW)</span>
                  </div>
                </div>

                {/* Hydro Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="grid-hydro" className="font-medium text-slate-700">
                      Hydro Reservoir (Clean)
                    </label>
                    <span className="font-mono font-semibold text-sky-700 tabular-nums">
                      {clampedHydroMW} MW
                    </span>
                  </div>
                  <input
                    id="grid-hydro"
                    type="range"
                    min={0}
                    max={Math.min(120, Math.round(hydroRemainingMWh))}
                    step={5}
                    value={clampedHydroMW}
                    onChange={(e) => setHydroMW(Number(e.target.value))}
                    className="atelier-slider w-full"
                  />
                </div>

                {/* Gas Peaker Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="grid-peaker" className="font-medium text-slate-700">
                      Gas Peaker (Emergency Fossil)
                    </label>
                    <span className="font-mono font-semibold text-red-600 tabular-nums">
                      {peakerMW} MW
                    </span>
                  </div>
                  <input
                    id="grid-peaker"
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={peakerMW}
                    onChange={(e) => setPeakerMW(Number(e.target.value))}
                    className="atelier-slider w-full"
                  />
                </div>

                {/* Demand Response Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Demand Response (-15% Load)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {demandResponseLeft} shifts remaining today
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={demandResponseLeft === 0 && !demandResponseActive}
                    onClick={() => setDemandResponseActive((prev) => !prev)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                      demandResponseActive
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {demandResponseActive ? 'Active' : 'Enable'}
                  </button>
                </div>

                {/* Advance Hour Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startScenario(scenarioIdx)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restart
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoPlay((p) => !p)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer whitespace-nowrap ${
                        autoPlay
                          ? 'border-sky-600 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {autoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {autoPlay ? 'Pause Auto' : 'Auto-Run'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={advanceHour}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {currentHour === 23 ? 'Finish Shift' : 'Advance Hour'}
                    <FastForward className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* End of Day Report Modal */}
          {gameState === 'ROUND_SUMMARY' && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-6">
              <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-7 shadow-xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  24-Hour Shift Complete · {scenario.name}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-slate-900">
                  Grid Sustainability Report
                </h3>

                <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <div className="text-xs text-slate-500">Clean Energy Share</div>
                    <div className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                      {summaryStats.cleanPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Frequency Stability</div>
                    <div className="font-mono text-2xl font-bold text-sky-700 tabular-nums">
                      {summaryStats.stabilityScore}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Blackout Hours</div>
                    <div
                      className={`font-mono text-xl font-bold tabular-nums ${
                        summaryStats.blackouts === 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {summaryStats.blackouts} hrs
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Estimated Peaker CO₂</div>
                    <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                      {summaryStats.co2Tons} t
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {scenarioIdx < SCENARIOS.length - 1 && (
                    <button
                      type="button"
                      onClick={() => startScenario(scenarioIdx + 1)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                    >
                      Next City Scenario
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startScenario(scenarioIdx)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    Play Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    All Scenarios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
