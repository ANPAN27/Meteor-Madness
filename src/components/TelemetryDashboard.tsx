import React, { useState, useEffect, useRef } from 'react';
import { SimulationResults, ImpactInputs, TelemetryLogEntry } from '../types';
import { simulationService } from '../services/simulationEngine';
import { Activity, Flame, ShieldAlert, Clock } from 'lucide-react';

interface TelemetryDashboardProps {
  simulationResults: SimulationResults | null;
  inputs: ImpactInputs;
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  simulationResults,
  inputs
}) => {
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const prevResultsRef = useRef(simulationResults);

  useEffect(() => {
    setLogs(simulationService.getLogs());
  }, [simulationResults]);

  const atmosphericLoss = simulationResults ? simulationResults.atmosphericLossPercent : 0;
  const groundCoupling = 100 - atmosphericLoss;

  const tiers = simulationResults?.damageTiers;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full max-w-7xl mx-auto">
      {/* 1. Kinetic Yield & Crater Architecture */}
      <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 pointer-events-auto rounded-[2px] shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#1e222b] pb-1.5 mb-2">
            <div className="font-mono text-[10px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d8e6]"></span>
              <span>Crater & Yield</span>
            </div>
            <div className="font-mono text-[9px] text-neutral-400 tabular-nums">
              {simulationResults ? simulationResults.id : 'STANDBY'}
            </div>
          </div>

          {simulationResults ? (
            <table className="w-full font-mono text-xs text-left">
              <tbody className="divide-y divide-[#1e222b]/60">
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Kinetic Yield</td>
                  <td className="py-1 text-right font-semibold text-amber-400 tabular-nums">
                    {simulationResults.impactEnergyMegatonsTNT > 1e6
                      ? `${simulationResults.impactEnergyMegatonsTNT.toExponential(2)} MT`
                      : `${simulationResults.impactEnergyMegatonsTNT.toLocaleString()} MT`}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Crater Ø</td>
                  <td className="py-1 text-right font-semibold text-neutral-100 tabular-nums">
                    {simulationResults.estimatedCraterDiameterM >= 1000
                      ? `${(simulationResults.estimatedCraterDiameterM / 1000).toFixed(2)} km`
                      : `${simulationResults.estimatedCraterDiameterM} m`}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Crater Depth</td>
                  <td className="py-1 text-right text-neutral-300 tabular-nums">
                    {simulationResults.estimatedCraterDepthM >= 1000
                      ? `${(simulationResults.estimatedCraterDepthM / 1000).toFixed(2)} km`
                      : `${simulationResults.estimatedCraterDepthM} m`}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Rim Height</td>
                  <td className="py-1 text-right text-teal-400 tabular-nums font-medium">
                    +{simulationResults.craterRimHeightM} m
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Equivalent</td>
                  <td className="py-1 text-right text-neutral-400 text-[10px] tabular-nums">
                    {simulationResults.energyHiroshimaEquivalent.toLocaleString()}× TNT
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="font-mono text-xs text-neutral-400 py-6 text-center">
              Awaiting coordinates...
            </div>
          )}
        </div>
      </div>

      {/* 2. Overpressure Blast Waves (5 psi & 1 psi) */}
      <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 pointer-events-auto rounded-[2px] shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#1e222b] pb-1.5 mb-2">
            <div className="font-mono text-[10px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-red-400" />
              <span>Overpressure Blast</span>
            </div>
            <div className="font-mono text-[9px] text-neutral-400">
              AIR SHOCK
            </div>
          </div>

          {tiers ? (
            <div className="font-mono flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center py-0.5 border-b border-[#1e222b]/50">
                <span className="text-[10px] text-red-400 font-medium">20 psi (138 kPa) Severe</span>
                <span className="text-neutral-200 font-semibold tabular-nums">{tiers.overpressure20psiRadiusKm} km</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1e222b]/50">
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-300">5 psi (34.5 kPa) Collapse</span>
                  <span className="text-[8px] text-neutral-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> ETA: {tiers.shockwave5psiArrivalSec}s
                  </span>
                </div>
                <span className="text-amber-400 font-semibold tabular-nums">{tiers.overpressure5psiRadiusKm} km</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-300">1 psi (6.9 kPa) Glass Hazard</span>
                  <span className="text-[8px] text-neutral-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> ETA: {tiers.shockwave1psiArrivalSec}s
                  </span>
                </div>
                <span className="text-teal-400 font-semibold tabular-nums">{tiers.overpressure1psiRadiusKm} km</span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-xs text-neutral-400 py-6 text-center">
              Standby for blast model...
            </div>
          )}
        </div>
      </div>

      {/* 3. Thermal Radiation & Seismic Shock */}
      <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 pointer-events-auto rounded-[2px] shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#1e222b] pb-1.5 mb-2">
            <div className="font-mono text-[10px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Thermal & Seismic</span>
            </div>
            <div className="font-mono text-[9px] text-neutral-400">
              PHYSICS
            </div>
          </div>

          {tiers && simulationResults ? (
            <table className="w-full font-mono text-xs text-left">
              <tbody className="divide-y divide-[#1e222b]/60">
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">3° Burn / Ignition</td>
                  <td className="py-1 text-right font-semibold text-amber-400 tabular-nums">
                    {tiers.thermalIgnitionRadiusKm} km
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Thermal Flash</td>
                  <td className="py-1 text-right text-neutral-200 tabular-nums">
                    {tiers.thermalFlashRadiusKm} km
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">Seismic Richter</td>
                  <td className="py-1 text-right font-semibold text-red-400 tabular-nums">
                    M {simulationResults.estimatedSeismicMagnitude}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">MMI VII Ground Damage</td>
                  <td className="py-1 text-right text-neutral-300 tabular-nums">
                    {tiers.seismicDamageRadiusKm} km
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-neutral-400 text-[10px] uppercase">MMI IV Felt Radius</td>
                  <td className="py-1 text-right text-neutral-400 text-[10px] tabular-nums">
                    {tiers.seismicFeltRadiusKm} km
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="font-mono text-xs text-neutral-400 py-6 text-center">
              Standby for physics model...
            </div>
          )}
        </div>
      </div>

      {/* 4. Planetary Atmosphere & Event Log */}
      <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 pointer-events-auto rounded-[2px] shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#1e222b] pb-1.5 mb-2">
            <div className="font-mono text-[10px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-teal-400" />
              <span>Coupling & Event Feed</span>
            </div>
            <div className="font-mono text-[9px] text-neutral-400">
              SYS LOG
            </div>
          </div>

          <div className="flex flex-col gap-2 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Atmospheric Drag:</span>
              <span className="text-neutral-200 font-semibold tabular-nums">{atmosphericLoss}%</span>
            </div>
            <div className="w-full bg-[#14171e] h-1.5 rounded-none border border-[#1e222b] overflow-hidden">
              <div className="bg-[#00d8e6] h-full" style={{ width: `${groundCoupling}%` }} />
            </div>

            <div className="text-neutral-400 h-14 overflow-hidden flex flex-col gap-1 border-t border-[#1e222b]/50 pt-1.5">
              {logs.slice(0, 3).map((log) => (
                <div key={log.id} className="truncate text-[9px] leading-tight">
                  <span className="text-teal-400 font-semibold">[{log.code}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
