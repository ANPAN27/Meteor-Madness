import { ImpactInputs, SimulationResults, MitigationData, DamageRadiusTiers, PresetScenario } from '../types';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'tunguska-1908',
    name: 'Tunguska Airburst (1908)',
    code: 'HIST_TNG_08',
    description: 'Stony meteoroid airburst flattening 2,150 km² of Siberian taiga forest.',
    diameter: 55,
    velocity: 15200,
    latitude: 60.91,
    longitude: 101.93,
    density: 2200,
    angle: 35,
    historicalOrProjected: 'Historical Event'
  },
  {
    id: 'chelyabinsk-2013',
    name: 'Chelyabinsk Bolide (2013)',
    code: 'HIST_CHL_13',
    description: 'High-altitude fragmentation over Ural Mountains creating widespread glass shockwave.',
    diameter: 19,
    velocity: 19000,
    latitude: 55.15,
    longitude: 61.41,
    density: 3300,
    angle: 18,
    historicalOrProjected: 'Historical Event'
  },
  {
    id: 'chicxulub-kpg',
    name: 'Chicxulub Impactor (K-Pg ELE)',
    code: 'HIST_CHX_66M',
    description: '10km carbonaceous chondrite causing global winter & dinosaur extinction event.',
    diameter: 10000,
    velocity: 20000,
    latitude: 21.40,
    longitude: -89.52,
    density: 2600,
    angle: 60,
    historicalOrProjected: 'Mass Extinction'
  },
  {
    id: 'apophis-defcon',
    name: 'Apophis 99942 (Simulated Defcon)',
    code: 'SIM_APH_99942',
    description: '370m sub-kilometer PHA on hypothetical sub-orbital Pacific collision corridor.',
    diameter: 370,
    velocity: 12600,
    latitude: 33.94,
    longitude: -118.40,
    density: 3200,
    angle: 45,
    historicalOrProjected: 'Planetary Defense Drill'
  },
  {
    id: 'bennu-drill',
    name: 'Bennu 101955 (Atlantic Vector)',
    code: 'SIM_BNU_101955',
    description: '490m rubble-pile asteroid vector targeted into Western North Atlantic Basin.',
    diameter: 490,
    velocity: 12100,
    latitude: 37.50,
    longitude: -72.00,
    density: 1260,
    angle: 50,
    historicalOrProjected: 'Planetary Defense Drill'
  },
  {
    id: 'barringer-iron',
    name: 'Barringer Crater (Arizona)',
    code: 'HIST_BRG_50K',
    description: '50m nickel-iron meteor leaving a pristine 1.2km wide terrestrial impact bowl.',
    diameter: 50,
    velocity: 12800,
    latitude: 35.03,
    longitude: -111.02,
    density: 7800,
    angle: 80,
    historicalOrProjected: 'Historical Event'
  }
];

export function calculateImpactPhysics(inputs: ImpactInputs): SimulationResults {
  const d = Math.max(1, inputs.diameter);
  const v = Math.max(100, inputs.velocity);
  const lat = inputs.latitude;
  const lon = inputs.longitude;
  const density = inputs.density || 2600; // kg/m^3
  const angle = Math.min(90, Math.max(10, inputs.impactAngle || 45)); // deg
  const radAngle = (angle * Math.PI) / 180;

  // Mass = Volume * Density: Volume = (4/3) * pi * (d/2)^3
  const volume = (Math.PI / 6) * Math.pow(d, 3);
  const massKg = volume * density;

  // Total Kinetic Energy: 0.5 * m * v^2 (Joules)
  const energyJoules = 0.5 * massKg * Math.pow(v, 2);
  const energyMT = energyJoules / 4.184e15; // 1 MT = 4.184e15 J
  const hiroshimaEquiv = energyMT / 0.015; // 1 Hiroshima ~ 15 kT = 0.015 MT

  // Atmospheric dissipation vs ground delivery
  // Small meteoroids (< 30m) lose ~70-95% energy in atmosphere; large asteroids (>500m) lose < 1%
  let atmosphericLossPercent = 0;
  if (d < 25) {
    atmosphericLossPercent = Math.min(96, Math.max(70, 100 - d * 1.5));
  } else if (d < 100) {
    atmosphericLossPercent = Math.max(20, 70 - (d - 25) * 0.65);
  } else if (d < 500) {
    atmosphericLossPercent = Math.max(5, 20 - (d - 100) * 0.04);
  } else {
    atmosphericLossPercent = Math.max(0.5, 5 - (d - 500) * 0.001);
  }

  const effectiveEnergyMT = energyMT * (1 - atmosphericLossPercent / 100);

  // Collins, Melosh & Marcus (2005) Transient Crater scaling
  // D_tc = 1.161 * (rho_i / rho_t)^0.333 * d^0.78 * v^0.44 * g^-0.22 * sin(theta)^0.333
  const targetDensity = 2500; // kg/m^3 (crustal rock)
  const g = 9.81; // m/s^2
  const densityRatio = Math.pow(density / targetDensity, 0.333);
  const dTerm = Math.pow(d, 0.78);
  const vTerm = Math.pow(v, 0.44);
  const gTerm = Math.pow(g, -0.22);
  const angleTerm = Math.pow(Math.sin(radAngle), 0.333);

  let transientCraterDiamM = 1.161 * densityRatio * dTerm * vTerm * gTerm * angleTerm;
  
  // If small and high atmospheric loss, airburst might not form a complete bowl crater
  if (d < 30 && atmosphericLossPercent > 80) {
    transientCraterDiamM = transientCraterDiamM * 0.15; // Shallow depression/scattered pits
  }
  
  // Simple vs Complex Crater Transition (~3.2 km on Earth in crystalline rock)
  let finalCraterDiamM = transientCraterDiamM;
  if (transientCraterDiamM > 3200) {
    finalCraterDiamM = 1.17 * Math.pow(transientCraterDiamM, 1.13) / Math.pow(3200, 0.13);
  } else {
    finalCraterDiamM = 1.25 * transientCraterDiamM;
  }

  // Crater Depth & Rim Height
  const craterDepthM = finalCraterDiamM > 3200 
    ? Math.min(finalCraterDiamM / 6, 280 * Math.pow(finalCraterDiamM / 1000, 0.301))
    : finalCraterDiamM / 4.5;
  const craterRimHeightM = 0.04 * finalCraterDiamM;
  const craterRadiusKm = Math.max(0.01, (finalCraterDiamM / 2) / 1000);

  // Seismic Magnitude: Richter M = 0.67 * log10(energyJoules) - 5.87
  let seismicMag = 0.67 * Math.log10(Math.max(1e10, energyJoules)) - 5.87;
  seismicMag = Math.max(0, Math.min(12.5, Number(seismicMag.toFixed(1))));

  // Seismic damage radii (MMI VII - structural cracks vs MMI IV - felt shaking)
  const seismicDamageRadiusKm = Math.max(craterRadiusKm * 1.5, Math.pow(10, (seismicMag - 2.8) / 1.9));
  const seismicFeltRadiusKm = Math.max(seismicDamageRadiusKm * 2, Math.pow(10, (seismicMag - 1.5) / 1.7));

  // Thermal Radiation Radii:
  // 3rd-degree burns / spontaneous ignition of wood & textiles (~420 kJ/m² threshold):
  const thermalIgnitionRadiusKm = Math.max(craterRadiusKm * 1.2, 1.8 * Math.pow(Math.max(0.001, effectiveEnergyMT), 0.41));
  // 1st/2nd-degree radiant heat flash:
  const thermalFlashRadiusKm = Math.max(thermalIgnitionRadiusKm * 1.6, 3.2 * Math.pow(Math.max(0.001, effectiveEnergyMT), 0.41));

  // Shockwave Overpressure Radii:
  // 20 psi (138 kPa) - reinforced concrete demolition / complete destruction:
  const overpressure20psiRadiusKm = Math.max(craterRadiusKm * 1.5, 1.25 * Math.pow(Math.max(0.001, effectiveEnergyMT), 0.33));
  // 5 psi (34.5 kPa) - heavy residential building collapse / major trees felled:
  const overpressure5psiRadiusKm = Math.max(overpressure20psiRadiusKm * 1.8, 2.2 * Math.pow(Math.max(0.001, effectiveEnergyMT), 0.33));
  // 1 psi (6.9 kPa) - window shattering & widespread flying glass lacerations:
  const overpressure1psiRadiusKm = Math.max(overpressure5psiRadiusKm * 2.8, 6.8 * Math.pow(Math.max(0.001, effectiveEnergyMT), 0.33));

  // Shockwave Arrival Time: speed of sound ~ 340 m/s => t = (R_km * 1000) / 340
  const shockwave5psiArrivalSec = Number(((overpressure5psiRadiusKm * 1000) / 340).toFixed(1));
  const shockwave1psiArrivalSec = Number(((overpressure1psiRadiusKm * 1000) / 340).toFixed(1));

  // Consolidated Damage Tiers
  const damageTiers: DamageRadiusTiers = {
    craterRadiusKm: Number(craterRadiusKm.toFixed(3)),
    craterDiameterM: Math.round(finalCraterDiamM),
    craterDepthM: Math.round(craterDepthM),
    craterRimHeightM: Math.round(craterRimHeightM),
    thermalIgnitionRadiusKm: Number(thermalIgnitionRadiusKm.toFixed(2)),
    thermalFlashRadiusKm: Number(thermalFlashRadiusKm.toFixed(2)),
    overpressure20psiRadiusKm: Number(overpressure20psiRadiusKm.toFixed(2)),
    overpressure5psiRadiusKm: Number(overpressure5psiRadiusKm.toFixed(2)),
    overpressure1psiRadiusKm: Number(overpressure1psiRadiusKm.toFixed(2)),
    seismicMagnitude: seismicMag,
    seismicDamageRadiusKm: Number(seismicDamageRadiusKm.toFixed(1)),
    seismicFeltRadiusKm: Number(seismicFeltRadiusKm.toFixed(1)),
    shockwave5psiArrivalSec,
    shockwave1psiArrivalSec,
    // Legacy bindings
    criticalRadiusKm: Number(overpressure5psiRadiusKm.toFixed(2)),
    moderateRadiusKm: Number(overpressure1psiRadiusKm.toFixed(2)),
    advisoryRadiusKm: Number(Math.max(seismicFeltRadiusKm, overpressure1psiRadiusKm * 1.8).toFixed(1)),
    fireballRadiusKm: Number(thermalIgnitionRadiusKm.toFixed(2)),
    airblastOverpressureRadiusKm: Number(overpressure20psiRadiusKm.toFixed(2))
  };

  // Threat Classification
  let impactClassification: SimulationResults['impactClassification'] = 'Class I (Airburst)';
  let casualtyRisk: SimulationResults['estimatedCasualtyEstimateRisk'] = 'LOCALIZED';

  if (energyMT < 0.05) {
    impactClassification = 'Class I (Airburst)';
    casualtyRisk = 'MINIMAL';
  } else if (energyMT < 10) {
    impactClassification = 'Class II (Regional Blast)';
    casualtyRisk = 'LOCALIZED';
  } else if (energyMT < 1000) {
    impactClassification = 'Class III (Major Devastation)';
    casualtyRisk = 'REGIONAL';
  } else if (energyMT < 100000) {
    impactClassification = 'Class IV (Continental Catastrophe)';
    casualtyRisk = 'MASS_CASUALTY';
  } else {
    impactClassification = 'Class V (ELE - Extinction Level)';
    casualtyRisk = 'GLOBAL_COLLAPSE';
  }

  // Geographic context & Tsunami Analysis
  const isWater = isOceanicCoordinate(lat, lon);
  let tsunamiRisk: SimulationResults['tsunamiRisk'] = 'NONE';
  if (isWater) {
    if (energyMT > 100) tsunamiRisk = 'CRITICAL';
    else if (energyMT > 5) tsunamiRisk = 'MODERATE';
    else if (energyMT > 0.1) tsunamiRisk = 'LOW';
  }

  const targetEnvironment = isWater 
    ? 'Oceanic Basin / Marine Hydrosphere' 
    : (Math.abs(lat) > 65 ? 'Polar Cryosphere / Ice Sheet' : 'Continental Lithosphere / Land Surface');

  const mitigation = generateMitigationDirective(energyMT, lat, lon, isWater, overpressure5psiRadiusKm, overpressure1psiRadiusKm);

  return {
    id: `SIM-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    inputs,
    estimatedCraterDiameterM: Math.round(finalCraterDiamM),
    estimatedCraterDepthM: Math.round(craterDepthM),
    craterRimHeightM: Math.round(craterRimHeightM),
    impactEnergyJoules: energyJoules,
    impactEnergyMegatonsTNT: Number(energyMT.toFixed(2)),
    energyHiroshimaEquivalent: Math.round(hiroshimaEquiv),
    estimatedSeismicMagnitude: seismicMag,
    atmosphericLossPercent: Number(atmosphericLossPercent.toFixed(1)),
    effectiveGroundEnergyMegatons: Number(effectiveEnergyMT.toFixed(2)),
    impactClassification,
    damageTiers,
    tsunamiRisk,
    estimatedCasualtyEstimateRisk: casualtyRisk,
    mitigation,
    targetEnvironment
  };
}

function isOceanicCoordinate(lat: number, lon: number): boolean {
  // Broad Pacific Basin
  if ((lon > 120 || lon < -110) && lat > -60 && lat < 60) return true;
  // Atlantic Basin
  if (lon > -70 && lon < -10 && lat > -50 && lat < 65) return true;
  // Indian Ocean
  if (lon > 50 && lon < 100 && lat > -50 && lat < 20) return true;
  // Southern Ocean
  if (lat < -60) return true;
  // Arctic Ocean
  if (lat > 75) return true;
  return false;
}

function generateMitigationDirective(
  energyMT: number,
  lat: number,
  lon: number,
  isWater: boolean,
  criticalRadiusKm: number,
  moderateRadiusKm: number
): MitigationData {
  let threatLevel: MitigationData['threatLevel'] = 'LOW';
  let summary = '';
  let immediateAction = '';
  let regionalNotes = '';
  let tacticalIntervention = '';
  let defenseRecommendation = '';

  // Geographic sector identification
  if (lon > -180 && lon < -30 && lat > 10 && lat < 70) {
    regionalNotes = isWater ? 'PACIFIC/ATLANTIC MARITIME CORRIDOR — COASTAL EVACUATION MANDATED' : 'NORTH AMERICAN LITHOSPHERE — DENSE CRITICAL INFRASTRUCTURE GRID';
  } else if (lon > -10 && lon < 50 && lat > 35 && lat < 70) {
    regionalNotes = 'EUROPEAN THEATER — HIGH URBAN DENSITY & AIRSPACE CONTINGENCY';
  } else if (lon > 60 && lon < 145 && lat > 0 && lat < 60) {
    regionalNotes = 'EAST/SOUTH ASIAN SECTOR — MASS DENSITY CIVILIAN EVACUATION REQUIRED';
  } else if (isWater) {
    regionalNotes = 'OPEN PELAGIC OCEAN BASIN — TRANS-OCEANIC TSUNAMI RADIAL PROPAGATION';
  } else {
    regionalNotes = 'GENERAL LAND MASS CORRIDOR — AIR SHOCKWAVE & SEISMIC ATTENUATION';
  }

  if (energyMT < 0.05) {
    threatLevel = 'LOW';
    summary = 'Atmospheric bolide fragmentation. Sub-kiloton ground coupling.';
    immediateAction = `Enforce civilian window setback within ${Math.ceil(moderateRadiusKm)} km. Reroute tactical civil aviation.`;
    tacticalIntervention = '[ GROUND SENSOR RADAR MONITORING ONLY ]';
    defenseRecommendation = 'No kinetic planetary intervention required. Monitor terminal descent trajectory.';
  } else if (energyMT < 5) {
    threatLevel = 'MODERATE';
    summary = 'Regional blast wave with severe urban shockwave & thermal ignition.';
    immediateAction = `Full mandatory evacuation of ${Math.ceil(criticalRadiusKm)} km Ground Zero perimeter. Activate emergency medical response triage.`;
    tacticalIntervention = '[ KINETIC IMPACTOR INTERCEPT / DART MISSION ]';
    defenseRecommendation = 'If warning > 2 years: Kinetic impactor deflection. If warning < 30 days: Mass civilian relocation.';
  } else if (energyMT < 500) {
    threatLevel = 'HIGH';
    summary = 'Continental-scale devastation, multi-megaton seismic and airblast rupture.';
    immediateAction = `Emergency relocation of population within ${Math.ceil(moderateRadiusKm)} km. Fortify civil bunker shelters and critical power grids.`;
    tacticalIntervention = '[ DUAL KINETIC IMPACTOR + NUCLEAR STANDOFF DEFLECTION ]';
    defenseRecommendation = 'Rapid deployment of high-energy pulsed nuclear standoff payload (NED). Intercept at heliocentric perihelion.';
  } else {
    threatLevel = 'SEVERE / CATASTROPHIC';
    summary = 'Global biospheric collapse event. Stratospheric dust veil, nuclear-winter analog.';
    immediateAction = 'Global emergency defense mobilization. Deep underground seed vault & societal continuity protocol activation.';
    tacticalIntervention = '[ DEEP-SPACE NUCLEAR EXPLOSIVE DEFLECTION + MULTI-PROBE DISRUPTION ]';
    defenseRecommendation = 'Maximum international strike armada. Standoff ablation detonation minimum 3 AU distance prior to encounter.';
  }

  return {
    threatLevel,
    summary,
    immediateAction,
    regionalNotes,
    tacticalIntervention,
    defenseRecommendation,
    evacuationRadiusKm: Math.ceil(moderateRadiusKm)
  };
}
