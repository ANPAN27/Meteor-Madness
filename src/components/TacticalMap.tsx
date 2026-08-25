import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as L from 'leaflet';
import * as turf from '@turf/turf';
import { SimulationResults, ImpactInputs } from '../types';
import { soundEffects } from '../utils/audio';
import { TelemetryDashboard } from './TelemetryDashboard';
import { Target, Layers, MapPin, ZoomIn, ZoomOut, Flame, ShieldAlert, Waves, CircleDot } from 'lucide-react';

interface TacticalMapProps {
  inputs: ImpactInputs;
  onCoordinatesChange: (lat: number, lon: number) => void;
  simulationResults: SimulationResults | null;
  onSimulate: (inputs: ImpactInputs) => void;
  isSimulating: boolean;
}

const COUNTRIES_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

export const TacticalMap: React.FC<TacticalMapProps> = ({
  inputs,
  onCoordinatesChange,
  simulationResults,
  onSimulate,
  isSimulating
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const damageLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number }>({
    lat: inputs.latitude,
    lng: inputs.longitude
  });
  const [affectedCountryNames, setAffectedCountryNames] = useState<string[]>([]);
  const [activeLayers, setActiveLayers] = useState<{
    crater: boolean;
    thermal: boolean;
    blast5psi: boolean;
    blast1psi: boolean;
    seismic: boolean;
  }>({
    crater: true,
    thermal: true,
    blast5psi: true,
    blast1psi: true,
    seismic: true
  });

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [inputs.latitude, inputs.longitude],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      preferCanvas: true // Use canvas for high-performance rendering
    });

    // Dark high-contrast base tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      updateWhenZooming: false,
      updateWhenIdle: true
    }).addTo(map);

    const damageGroup = L.layerGroup().addTo(map);
    damageLayersGroupRef.current = damageGroup;

    // Mouse coordinates tracking
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4))
      });
    });

    // Click to set new coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      soundEffects.beep(800, 0.04);
      const newLat = Number(e.latlng.lat.toFixed(4));
      const newLng = Number(e.latlng.lng.toFixed(4));
      onCoordinatesChange(newLat, newLng);
    });

    mapInstanceRef.current = map;

    // Load Country boundaries asynchronously
    fetch(COUNTRIES_GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => {
        if (!mapInstanceRef.current) return;
        const layer = L.geoJSON(data, {
          style: {
            color: '#1e222b',
            weight: 1,
            fillColor: 'transparent',
            fillOpacity: 0
          },
          onEachFeature: (feature, l) => {
            const name = feature.properties?.ADMIN || feature.properties?.NAME || 'Zone';
            l.bindTooltip(
              `<div class="font-mono text-[10px] uppercase text-[#00d8e6] bg-[#0e1015] border border-[#1e222b] px-2 py-1 rounded-[2px] shadow">
                SECTOR: ${name}
              </div>`,
              { sticky: true, opacity: 0.95 }
            );
          }
        }).addTo(mapInstanceRef.current);

        countriesLayerRef.current = layer;
      })
      .catch((err) => {
        console.warn('GeoJSON boundary dataset load failed:', err);
      });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Target Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }

    const reticleIcon = L.divIcon({
      className: 'target-marker-icon',
      html: `
        <div style="position: relative; width: 28px; height: 28px; transform: translate(-14px, -14px);">
          <div style="position: absolute; inset: 0; border: 1.5px solid #00d8e6; transform: rotate(45deg); background: rgba(0,216,230,0.12);"></div>
          <div style="position: absolute; top: 13px; left: 13px; width: 2px; height: 2px; background: #ef4444;"></div>
          <div style="position: absolute; -top: 18px; left: -32px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #00d8e6; white-space: nowrap; background: #0e1015; border: 1px solid #1e222b; padding: 1px 5px; border-radius: 2px;">
            TARGET [${inputs.latitude.toFixed(2)}°, ${inputs.longitude.toFixed(2)}°]
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    markerRef.current = L.marker([inputs.latitude, inputs.longitude], { icon: reticleIcon }).addTo(mapInstanceRef.current);
  }, [inputs.latitude, inputs.longitude]);

  // Render Exact Physical Concentric Blast Zones & Geospatial Intersections
  useEffect(() => {
    if (!mapInstanceRef.current || !damageLayersGroupRef.current || !simulationResults) return;

    const map = mapInstanceRef.current;
    const group = damageLayersGroupRef.current;
    const { inputs: resInputs, damageTiers, impactEnergyMegatonsTNT } = simulationResults;
    const targetLat = resInputs.latitude;
    const targetLng = resInputs.longitude;

    // Clear previous damage layers
    group.clearLayers();

    // Pan smoothly to target with appropriate zoom level
    const maxRadius = Math.max(
      damageTiers.overpressure1psiRadiusKm,
      damageTiers.seismicFeltRadiusKm,
      damageTiers.thermalFlashRadiusKm
    );
    const targetZoom = Math.max(3, Math.min(10, Math.round(11.5 - Math.log10(maxRadius + 1) * 2.2)));
    map.setView([targetLat, targetLng], targetZoom);

    // 1. Seismic Felt Radius Overlay (MMI IV / VII)
    if (activeLayers.seismic && damageTiers.seismicFeltRadiusKm > 0) {
      const seismicCircle = L.circle([targetLat, targetLng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.03,
        weight: 1,
        dashArray: '2, 6',
        radius: damageTiers.seismicFeltRadiusKm * 1000
      });
      seismicCircle.bindTooltip(
        `<div class="font-mono text-[10px] text-blue-400 bg-[#0e1015] border border-[#1e222b] p-2 rounded-[2px]">
          <div class="font-semibold uppercase flex items-center gap-1.5"><Waves class="w-3 h-3"/> Seismic Ground Motion</div>
          <div>Radius: <b>${damageTiers.seismicFeltRadiusKm} km</b></div>
          <div>Magnitude: <b>Richter M ${damageTiers.seismicMagnitude}</b></div>
          <div class="text-[9px] text-neutral-400">MMI IV Felt / Structural Vibration</div>
        </div>`,
        { sticky: true }
      );
      group.addLayer(seismicCircle);
    }

    // 2. Overpressure 1 psi (6.9 kPa) Ring - Glass Shatter & Flying Debris Hazard
    if (activeLayers.blast1psi && damageTiers.overpressure1psiRadiusKm > 0) {
      const blast1Circle = L.circle([targetLat, targetLng], {
        color: '#00d8e6',
        fillColor: '#00d8e6',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '4, 4',
        radius: damageTiers.overpressure1psiRadiusKm * 1000
      });
      blast1Circle.bindTooltip(
        `<div class="font-mono text-[10px] text-teal-300 bg-[#0e1015] border border-[#1e222b] p-2 rounded-[2px]">
          <div class="font-semibold uppercase flex items-center gap-1.5"><ShieldAlert class="w-3 h-3"/> 1 psi (6.9 kPa) Shockwave</div>
          <div>Radius: <b>${damageTiers.overpressure1psiRadiusKm} km</b></div>
          <div>Arrival Time: <b>${damageTiers.shockwave1psiArrivalSec} s</b></div>
          <div class="text-[9px] text-neutral-400">Widespread window breakage, flying glass lacerations</div>
        </div>`,
        { sticky: true }
      );
      group.addLayer(blast1Circle);
    }

    // 3. Overpressure 5 psi (34.5 kPa) Ring - Heavy Structural Collapse
    if (activeLayers.blast5psi && damageTiers.overpressure5psiRadiusKm > 0) {
      const blast5Circle = L.circle([targetLat, targetLng], {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '5, 5',
        radius: damageTiers.overpressure5psiRadiusKm * 1000
      });
      blast5Circle.bindTooltip(
        `<div class="font-mono text-[10px] text-amber-400 bg-[#0e1015] border border-[#1e222b] p-2 rounded-[2px]">
          <div class="font-semibold uppercase flex items-center gap-1.5"><ShieldAlert class="w-3 h-3"/> 5 psi (34.5 kPa) Heavy Blast</div>
          <div>Radius: <b>${damageTiers.overpressure5psiRadiusKm} km</b></div>
          <div>Arrival Time: <b>${damageTiers.shockwave5psiArrivalSec} s</b></div>
          <div class="text-[9px] text-neutral-400">Residential buildings collapse, universal tree blowdown</div>
        </div>`,
        { sticky: true }
      );
      group.addLayer(blast5Circle);
    }

    // 4. Thermal Radiation (3rd-Degree Burns / Spontaneous Ignition)
    if (activeLayers.thermal && damageTiers.thermalIgnitionRadiusKm > 0) {
      const thermalCircle = L.circle([targetLat, targetLng], {
        color: '#ff6b00',
        fillColor: '#ff6b00',
        fillOpacity: 0.12,
        weight: 1.5,
        radius: damageTiers.thermalIgnitionRadiusKm * 1000
      });
      thermalCircle.bindTooltip(
        `<div class="font-mono text-[10px] text-orange-400 bg-[#0e1015] border border-[#1e222b] p-2 rounded-[2px]">
          <div class="font-semibold uppercase flex items-center gap-1.5"><Flame class="w-3 h-3"/> Thermal Ignition Perimeter</div>
          <div>Radius: <b>${damageTiers.thermalIgnitionRadiusKm} km</b></div>
          <div>Energy Flux: <b>~420 kJ/m²</b></div>
          <div class="text-[9px] text-neutral-400">3rd-degree burns to exposed skin, clothing & foliage ignite</div>
        </div>`,
        { sticky: true }
      );
      group.addLayer(thermalCircle);
    }

    // 5. Crater Excavation Bowl & Rim
    if (activeLayers.crater && damageTiers.craterRadiusKm > 0) {
      const craterCircle = L.circle([targetLat, targetLng], {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.65,
        weight: 2,
        radius: Math.max(30, damageTiers.craterRadiusKm * 1000)
      });
      craterCircle.bindTooltip(
        `<div class="font-mono text-[10px] text-red-400 bg-[#0e1015] border border-[#1e222b] p-2 rounded-[2px]">
          <div class="font-semibold uppercase flex items-center gap-1.5"><CircleDot class="w-3 h-3"/> Excavation Crater Bowl</div>
          <div>Diameter: <b>${damageTiers.craterDiameterM >= 1000 ? `${(damageTiers.craterDiameterM / 1000).toFixed(2)} km` : `${damageTiers.craterDiameterM} m`}</b></div>
          <div>Depth: <b>${damageTiers.craterDepthM >= 1000 ? `${(damageTiers.craterDepthM / 1000).toFixed(2)} km` : `${damageTiers.craterDepthM} m`}</b></div>
          <div>Rim Height: <b>+${damageTiers.craterRimHeightM} m</b></div>
        </div>`,
        { sticky: true }
      );
      group.addLayer(craterCircle);
    }

    // Turf Geospatial Country Intersection Evaluation
    try {
      const point = turf.point([targetLng, targetLat]);
      const circle5psiTurf = turf.circle(point, damageTiers.overpressure5psiRadiusKm, { units: 'kilometers', steps: 32 });
      const circle1psiTurf = turf.circle(point, damageTiers.overpressure1psiRadiusKm, { units: 'kilometers', steps: 32 });

      const affected: string[] = [];

      if (countriesLayerRef.current) {
        countriesLayerRef.current.eachLayer((layer: any) => {
          const feature = layer.feature;
          if (!feature) return;

          try {
            const intersects5psi = turf.booleanIntersects(feature, circle5psiTurf);
            const intersects1psi = turf.booleanIntersects(feature, circle1psiTurf);
            const countryName = feature.properties?.ADMIN || feature.properties?.NAME || 'Zone';

            if (intersects5psi) {
              affected.push(countryName);
              layer.setStyle({
                fillColor: '#ef4444',
                fillOpacity: 0.22,
                color: '#ef4444',
                weight: 1.5
              });
            } else if (intersects1psi) {
              affected.push(countryName);
              layer.setStyle({
                fillColor: '#f59e0b',
                fillOpacity: 0.1,
                color: '#f59e0b',
                weight: 1
              });
            } else {
              layer.setStyle({
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#1e222b',
                weight: 1
              });
            }
          } catch {
            // Coordinate parsing safety
          }
        });
      }

      setAffectedCountryNames(Array.from(new Set(affected)));
    } catch (e) {
      console.warn('Geospatial calculation error:', e);
    }

    // Animate Approach Vector
    const entryAngle = resInputs.impactAngle || 45;
    const vectorLength = Math.max(15, Math.min(45, (entryAngle / 90) * 35));
    const startLat = targetLat + Math.cos((entryAngle * Math.PI) / 180) * vectorLength;
    const startLng = targetLng - Math.sin((entryAngle * Math.PI) / 180) * vectorLength * 1.4;

    if (trajectoryLineRef.current) {
      map.removeLayer(trajectoryLineRef.current);
    }

    soundEffects.impactRumble();

    const steps = 30;
    const path: [number, number][] = [];
    let curStep = 0;

    const animTimer = setInterval(() => {
      if (curStep <= steps) {
        const curLat = startLat + (targetLat - startLat) * (curStep / steps);
        const curLng = startLng + (targetLng - startLng) * (curStep / steps);
        path.push([curLat, curLng]);

        if (trajectoryLineRef.current) {
          map.removeLayer(trajectoryLineRef.current);
        }

        trajectoryLineRef.current = L.polyline(path, {
          color: '#00d8e6',
          weight: 2,
          dashArray: '3, 4',
          opacity: 0.95
        }).addTo(map);

        curStep++;
      } else {
        clearInterval(animTimer);
      }
    }, 20);

    return () => clearInterval(animTimer);
  }, [simulationResults, activeLayers]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050505] overflow-hidden select-none">
      {/* Map Canvas Surface */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Top HUD Coordinates Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="border border-[#1e222b] bg-[#0e1015]/90 backdrop-blur-sm px-2.5 py-1.5 rounded-[2px] font-mono text-[10px] text-neutral-300 pointer-events-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d8e6]"></div>
          <span className="text-neutral-400 uppercase">Cursor</span>
          <span className="text-neutral-200 font-semibold tabular-nums">
            [{mouseCoords.lat.toFixed(2)}°, {mouseCoords.lng.toFixed(2)}°]
          </span>
        </div>
        <div className="border border-[#1e222b] bg-[#0e1015]/90 backdrop-blur-sm px-2.5 py-1.5 rounded-[2px] font-mono text-[10px] text-neutral-300 pointer-events-auto flex items-center gap-2">
          <MapPin className="w-3 h-3 text-amber-400" />
          <span className="text-neutral-400 uppercase">Target</span>
          <span className="text-neutral-200 font-semibold tabular-nums">
            [{inputs.latitude.toFixed(2)}°, {inputs.longitude.toFixed(2)}°]
          </span>
        </div>
        {affectedCountryNames.length > 0 && (
          <div className="border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 rounded-[2px] font-mono text-[10px] text-red-400 pointer-events-auto flex items-center gap-1.5">
            <span className="font-semibold uppercase">Impact Corridor:</span>
            <span>
              {affectedCountryNames.slice(0, 3).join(', ')}
              {affectedCountryNames.length > 3 ? ` +${affectedCountryNames.length - 3}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Top Right: Layer Toggles & Map Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end pointer-events-auto">
        {/* Layer Visibility Pills */}
        <div className="flex items-center gap-1 bg-[#0e1015]/90 backdrop-blur-sm border border-[#1e222b] p-1 rounded-[2px] font-mono text-[9px]">
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, crater: !p.crater }))}
            className={`px-1.5 py-0.5 rounded-[1px] transition-colors ${
              activeLayers.crater ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-neutral-400'
            }`}
          >
            Crater
          </button>
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, thermal: !p.thermal }))}
            className={`px-1.5 py-0.5 rounded-[1px] transition-colors ${
              activeLayers.thermal ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-neutral-400'
            }`}
          >
            Thermal
          </button>
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, blast5psi: !p.blast5psi }))}
            className={`px-1.5 py-0.5 rounded-[1px] transition-colors ${
              activeLayers.blast5psi ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-neutral-400'
            }`}
          >
            5 psi
          </button>
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, blast1psi: !p.blast1psi }))}
            className={`px-1.5 py-0.5 rounded-[1px] transition-colors ${
              activeLayers.blast1psi ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-neutral-400'
            }`}
          >
            1 psi
          </button>
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, seismic: !p.seismic }))}
            className={`px-1.5 py-0.5 rounded-[1px] transition-colors ${
              activeLayers.seismic ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-neutral-400'
            }`}
          >
            Seismic
          </button>
        </div>

        {/* Zoom & Recenter Controls */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              soundEffects.click();
              mapInstanceRef.current?.zoomIn();
            }}
            title="Zoom In"
            className="w-8 h-8 flex items-center justify-center bg-[#0e1015] border border-[#1e222b] text-neutral-300 hover:text-[#00d8e6] hover:border-[#00d8e6] rounded-[2px] transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              soundEffects.click();
              mapInstanceRef.current?.zoomOut();
            }}
            title="Zoom Out"
            className="w-8 h-8 flex items-center justify-center bg-[#0e1015] border border-[#1e222b] text-neutral-300 hover:text-[#00d8e6] hover:border-[#00d8e6] rounded-[2px] transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              soundEffects.beep(1100, 0.05);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([inputs.latitude, inputs.longitude], 4);
              }
            }}
            title="Center on Target"
            className="w-8 h-8 flex items-center justify-center bg-[#0e1015] border border-[#1e222b] text-amber-400 hover:border-amber-400 hover:bg-amber-400/10 rounded-[2px] transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtle Center Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-20">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0V40M50 100V60M0 50H40M100 50H60" stroke="#00d8e6" strokeWidth="1" />
          <circle cx="50" cy="50" r="24" stroke="#00d8e6" strokeDasharray="2 3" strokeWidth="0.75" />
        </svg>
      </div>

      {/* Telemetry Dashboard (Overlay on Bottom) */}
      <div className="mt-auto z-10 p-2 sm:p-3 pointer-events-none">
        <TelemetryDashboard simulationResults={simulationResults} inputs={inputs} />
      </div>
    </div>
  );
};
