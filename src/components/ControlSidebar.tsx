import React, { useState } from 'react';
import { ImpactInputs, FlightParameters3D, SimulationResults, PresetScenario } from '../types';
import { PRESET_SCENARIOS } from '../utils/physics';
import { soundEffects } from '../utils/audio';
import { TerminalSlider } from './TerminalSlider';
import { Play, RotateCcw, ShieldAlert, Flame, ChevronDown, ChevronUp, Orbit, X } from 'lucide-react';

interface ControlSidebarProps {
  activeTab: 'map' | '3d';
  onTabChange: (tab: 'map' | '3d') => void;
  // Tactical Map state
  mapInputs: ImpactInputs;
  onMapInputsChange: (inputs: ImpactInputs) => void;
  onSimulateMap: (inputs: ImpactInputs) => void;
  simulationResults: SimulationResults | null;
  isSimulating: boolean;
  // 3D View state
  flight3D: FlightParameters3D;
  onFlight3DChange: (params: FlightParameters3D) => void;
  onRunSim3D: () => void;
  onResetSim3D: () => void;
  sim3DResults: {
    impact: boolean;
    energyMT: number;
    classification: string;
    description: string;
    craterKm: number;
    location: string;
  } | null;
  onClose: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  activeTab,
  onTabChange,
  mapInputs,
  onMapInputsChange,
  onSimulateMap,
  simulationResults,
  isSimulating,
  flight3D,
  onFlight3DChange,
  onRunSim3D,
  onResetSim3D,
  sim3DResults,
  onClose
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleApplyPreset = (presetId: string) => {
    soundEffects.beep(980, 0.05);
    setSelectedPreset(presetId);
    const preset = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (preset) {
      const updated: ImpactInputs = {
        diameter: preset.diameter,
        velocity: preset.velocity,
        latitude: preset.latitude,
        longitude: preset.longitude,
        density: preset.density,
        impactAngle: preset.angle
      };
      onMapInputsChange(updated);
      onSimulateMap(updated);

      // Sync 3D parameters proportionally
      onFlight3DChange({
        velocity: Math.min(72, Math.max(11, preset.velocity / 1000)),
        mass: Math.min(1000, Math.max(0.001, ((Math.PI / 6) * Math.pow(preset.diameter, 3) * preset.density) / 1e12)),
        diameter: Math.min(10, Math.max(0.01, preset.diameter / 1000)),
        angle: preset.angle,
        distance: 100
      });
    }
  };

  const handleSubmitMapForm = (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.beep(1200, 0.08);
    onSimulateMap(mapInputs);
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-[#1e222b] flex flex-col h-auto md:h-full shrink-0 z-20 bg-[#0e1015] overflow-y-auto select-none">
      {/* Sidebar Header */}
      <div className="h-10 px-3.5 border-b border-[#1e222b] bg-[#14171e] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#00d8e6] rounded-full"></div>
          <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-wider">
            Parameter Matrix
          </span>
        </div>
        <button
          onClick={() => { soundEffects.click(); onClose(); }}
          title="Hide sidebar"
          className="p-1 rounded-[1px] text-neutral-500 hover:text-[#00d8e6] hover:bg-[#1e222b] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* ===================== MAP VIEW CONTROLS ===================== */}
        {activeTab === 'map' && (
          <>
            {/* Quick Scenario Preset Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="scenario-preset" className="font-mono text-[10px] font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                <span>Verified Scenario</span>
                <span className="text-teal-400">{PRESET_SCENARIOS.length} Presets</span>
              </label>
              <select
                id="scenario-preset"
                value={selectedPreset}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="telemetry-input cursor-pointer text-xs"
              >
                <option value="">-- Custom Target Telemetry --</option>
                {PRESET_SCENARIOS.map((p: PresetScenario) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.diameter}m @ {p.velocity / 1000}km/s)
                  </option>
                ))}
              </select>
            </div>

            {/* Tactile Sliders for Orbital & Kinetic Vectors */}
            <div className="border-t border-[#1e222b] pt-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Orbit className="w-3 h-3 text-[#00d8e6]" />
                  <span>Physical Vector Matrix</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="font-mono text-[9px] text-neutral-400 hover:text-[#00d8e6] tracking-wider uppercase flex items-center gap-1 transition-colors"
                >
                  <span>{showAdvanced ? 'Standard' : 'Advanced'}</span>
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <form onSubmit={handleSubmitMapForm} className="flex flex-col gap-2.5">
                {/* Impactor Diameter Slider */}
                <TerminalSlider
                  id="slider-diameter"
                  label="Impactor Diameter"
                  value={mapInputs.diameter}
                  min={10}
                  max={5000}
                  step={5}
                  unit="m"
                  variant="amber"
                  onChange={(val) => {
                    setSelectedPreset('');
                    onMapInputsChange({ ...mapInputs, diameter: val });
                  }}
                  quickButtons={[20, 50, 150, 500, 1000]}
                />

                {/* Entry Velocity Slider */}
                <TerminalSlider
                  id="slider-velocity"
                  label="Entry Velocity"
                  value={mapInputs.velocity}
                  min={11000}
                  max={72000}
                  step={500}
                  unit="km/s"
                  displayMultiplier={0.001}
                  displayDecimals={1}
                  variant="teal"
                  onChange={(val) => {
                    setSelectedPreset('');
                    onMapInputsChange({ ...mapInputs, velocity: val });
                  }}
                  quickButtons={[15000, 20000, 30000, 50000]}
                />

                {/* Entry Angle Slider */}
                <TerminalSlider
                  id="slider-angle"
                  label="Impact Angle"
                  value={mapInputs.impactAngle || 45}
                  min={10}
                  max={90}
                  step={1}
                  unit="°"
                  variant="amber"
                  onChange={(val) => {
                    setSelectedPreset('');
                    onMapInputsChange({ ...mapInputs, impactAngle: val });
                  }}
                  quickButtons={[15, 30, 45, 60, 90]}
                />

                {/* Target Coordinates */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="latitude" className="font-mono text-[9px] font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                      <span>Latitude</span>
                      <span className="text-neutral-300 tabular-nums">{mapInputs.latitude.toFixed(2)}°</span>
                    </label>
                    <input
                      id="latitude"
                      type="number"
                      min="-90"
                      max="90"
                      step="0.01"
                      value={mapInputs.latitude}
                      onChange={(e) => {
                        setSelectedPreset('');
                        onMapInputsChange({ ...mapInputs, latitude: parseFloat(e.target.value) || 0 });
                      }}
                      className="telemetry-input text-xs tabular-nums"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="longitude" className="font-mono text-[9px] font-medium text-neutral-400 uppercase tracking-wider flex justify-between">
                      <span>Longitude</span>
                      <span className="text-neutral-300 tabular-nums">{mapInputs.longitude.toFixed(2)}°</span>
                    </label>
                    <input
                      id="longitude"
                      type="number"
                      min="-180"
                      max="180"
                      step="0.01"
                      value={mapInputs.longitude}
                      onChange={(e) => {
                        setSelectedPreset('');
                        onMapInputsChange({ ...mapInputs, longitude: parseFloat(e.target.value) || 0 });
                      }}
                      className="telemetry-input text-xs tabular-nums"
                    />
                  </div>
                </div>

                {/* Advanced Density Options */}
                {showAdvanced && (
                  <div className="p-2.5 border border-[#1e222b] bg-[#14171e] rounded-[2px] flex flex-col gap-2">
                    <div className="font-mono text-[9px] font-semibold text-neutral-300 uppercase tracking-wider">
                      Composition Density (kg/m³)
                    </div>
                    <div className="grid grid-cols-3 gap-1 font-mono text-[9px]">
                      <button
                        type="button"
                        onClick={() => onMapInputsChange({ ...mapInputs, density: 1000 })}
                        className={`p-1 border rounded-[1px] text-center ${
                          mapInputs.density === 1000 ? 'border-[#00d8e6] bg-[#00d8e6]/10 text-teal-300' : 'border-[#1e222b] text-neutral-400'
                        }`}
                      >
                        Ice (1,000)
                      </button>
                      <button
                        type="button"
                        onClick={() => onMapInputsChange({ ...mapInputs, density: 2600 })}
                        className={`p-1 border rounded-[1px] text-center ${
                          mapInputs.density === 2600 ? 'border-[#00d8e6] bg-[#00d8e6]/10 text-teal-300' : 'border-[#1e222b] text-neutral-400'
                        }`}
                      >
                        Rock (2,600)
                      </button>
                      <button
                        type="button"
                        onClick={() => onMapInputsChange({ ...mapInputs, density: 7800 })}
                        className={`p-1 border rounded-[1px] text-center ${
                          mapInputs.density === 7800 ? 'border-[#00d8e6] bg-[#00d8e6]/10 text-teal-300' : 'border-[#1e222b] text-neutral-400'
                        }`}
                      >
                        Iron (7,800)
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="telemetry-btn telemetry-btn-primary w-full mt-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSimulating ? 'Computing Trajectory...' : 'Run Simulation'}</span>
                </button>
              </form>
            </div>

            {/* Tactical Threat Briefing */}
            <div className="border-t border-[#1e222b] pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Impact Incident Briefing</span>
                </span>
                <span className="font-mono text-[9px] text-neutral-400 uppercase">
                  UN-COPUOS
                </span>
              </div>

              {simulationResults ? (
                <div className="font-mono text-xs border border-[#1e222b] bg-[#14171e] rounded-[2px] p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-[#1e222b] pb-1.5">
                    <span className="font-semibold text-neutral-200">
                      {simulationResults.mitigation.threatLevel}
                    </span>
                    <span className="text-[10px] text-amber-400 tabular-nums">
                      EVAC: {simulationResults.mitigation.evacuationRadiusKm} KM
                    </span>
                  </div>

                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    {simulationResults.mitigation.summary}
                  </p>

                  <div className="flex flex-col gap-1 text-[10px] border-t border-[#1e222b] pt-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-teal-400 font-semibold shrink-0">ACTION:</span>
                      <span className="text-neutral-300">{simulationResults.mitigation.immediateAction}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-semibold shrink-0">FOCUS:</span>
                      <span className="text-neutral-300">{simulationResults.mitigation.regionalNotes}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-xs text-neutral-400 border border-dashed border-[#1e222b] p-3 text-center rounded-[2px]">
                  Awaiting trajectory coordinates...
                </div>
              )}
            </div>
          </>
        )}

        {/* ===================== 3D VIEW CONTROLS ===================== */}
        {activeTab === '3d' && (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1e222b] pb-1.5">
                <span className="font-mono text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Orbit className="w-3.5 h-3.5 text-[#00d8e6]" />
                  <span>3D Orbital Telemetry</span>
                </span>
                <span className="font-mono text-[9px] text-neutral-400">
                  N-BODY DESCENT
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Velocity */}
                <TerminalSlider
                  id="3d-velocity"
                  label="Approach Velocity"
                  value={flight3D.velocity}
                  min={11}
                  max={72}
                  step={0.5}
                  unit="km/s"
                  variant="teal"
                  onChange={(val) => onFlight3DChange({ ...flight3D, velocity: val })}
                  quickButtons={[15, 25, 40, 60]}
                />

                {/* Mass */}
                <TerminalSlider
                  id="3d-mass"
                  label="Impactor Mass"
                  value={flight3D.mass}
                  min={0.01}
                  max={500}
                  step={0.1}
                  unit="×10¹² kg"
                  variant="amber"
                  onChange={(val) => onFlight3DChange({ ...flight3D, mass: val })}
                  quickButtons={[0.1, 1, 10, 100]}
                />

                {/* Diameter */}
                <TerminalSlider
                  id="3d-diameter"
                  label="Core Diameter"
                  value={flight3D.diameter}
                  min={0.01}
                  max={10}
                  step={0.05}
                  unit="km"
                  variant="amber"
                  onChange={(val) => onFlight3DChange({ ...flight3D, diameter: val })}
                  quickButtons={[0.05, 0.5, 2.0, 5.0]}
                />

                {/* Entry Vector Angle */}
                <TerminalSlider
                  id="3d-angle"
                  label="Entry Angle"
                  value={flight3D.angle}
                  min={10}
                  max={90}
                  step={1}
                  unit="°"
                  variant="teal"
                  onChange={(val) => onFlight3DChange({ ...flight3D, angle: val })}
                  quickButtons={[15, 30, 45, 60, 90]}
                />

                {/* Initial Distance */}
                <TerminalSlider
                  id="3d-distance"
                  label="Initial Range"
                  value={flight3D.distance}
                  min={50}
                  max={1000}
                  step={10}
                  unit="×10³ km"
                  variant="amber"
                  onChange={(val) => onFlight3DChange({ ...flight3D, distance: val })}
                  quickButtons={[100, 250, 500, 1000]}
                />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.beep(1200, 0.08);
                      onRunSim3D();
                    }}
                    className="telemetry-btn telemetry-btn-primary"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Orbit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.click();
                      onResetSim3D();
                    }}
                    className="telemetry-btn telemetry-btn-secondary"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Telemetry Results Readout */}
            <div className="border-t border-[#1e222b] pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                  Simulation Outcome
                </span>
                <span className="font-mono text-[9px] text-neutral-400">
                  KINETIC COUPLING
                </span>
              </div>

              <div className="font-mono text-xs border border-[#1e222b] bg-[#14171e] rounded-[2px] p-2.5 flex flex-col gap-2">
                {sim3DResults ? (
                  <>
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#1e222b]">
                      <span className="text-neutral-400 text-[10px] uppercase">Status</span>
                      <span className={`font-semibold ${sim3DResults.impact ? 'text-red-400' : 'text-teal-400'}`}>
                        {sim3DResults.impact ? 'Impact Detected' : 'Trajectory Clear'}
                      </span>
                    </div>
                    {sim3DResults.impact && (
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-[#1e222b]/50">
                          <tr>
                            <td className="py-1 text-neutral-400 text-[10px] uppercase">Class</td>
                            <td className="py-1 text-right text-amber-400 font-medium">{sim3DResults.classification}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-neutral-400 text-[10px] uppercase">Yield</td>
                            <td className="py-1 text-right text-neutral-200 font-semibold tabular-nums">{sim3DResults.energyMT.toExponential(2)} MT</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-neutral-400 text-[10px] uppercase">Crater Ø</td>
                            <td className="py-1 text-right text-teal-400 font-semibold tabular-nums">{sim3DResults.craterKm.toFixed(1)} km</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-neutral-400 text-[10px] uppercase">Description</td>
                            <td className="py-1 text-right text-neutral-300 text-[11px]">{sim3DResults.description}</td>
                          </tr>
                          {sim3DResults.location && (
                            <tr>
                              <td className="py-1 text-neutral-400 text-[10px] uppercase">Coordinates</td>
                              <td className="py-1 text-right text-neutral-200 text-[10px] tabular-nums">{sim3DResults.location}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </>
                ) : (
                  <div className="text-neutral-400 text-center py-2.5 text-[11px]">
                    Awaiting flight execution...
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
