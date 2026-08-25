export interface ImpactInputs {
  diameter: number; // meters (1 to 50000)
  velocity: number; // m/s (1000 to 100000)
  latitude: number; // degrees -90 to 90
  longitude: number; // degrees -180 to 180
  density?: number; // kg/m^3 (e.g. 2600 for rock, 1500 for porous, 7800 for iron)
  impactAngle?: number; // degrees 10 to 90
  targetType?: 'land' | 'water' | 'sedimentary_rock' | 'crystalline_rock';
}

export interface FlightParameters3D {
  velocity: number; // km/s (11 to 72)
  mass: number; // × 10^12 kg (0.001 to 1000)
  diameter: number; // km (0.01 to 10)
  angle: number; // degrees (10 to 90)
  distance: number; // × 1,000 km (50 to 1000)
}

export interface DamageRadiusTiers {
  // Direct Crater Excavation
  craterRadiusKm: number;
  craterDiameterM: number;
  craterDepthM: number;
  craterRimHeightM: number;

  // Thermal Radiation Radii
  thermalIgnitionRadiusKm: number; // 3rd-degree burns / clothing ignition (approx. 420 kJ/m²)
  thermalFlashRadiusKm: number; // 1st/2nd-degree burns / radiant heat flash

  // Shockwave Overpressure Radii
  overpressure20psiRadiusKm: number; // 20 psi (138 kPa) - reinforced concrete demolition
  overpressure5psiRadiusKm: number; // 5 psi (34.5 kPa) - heavy structural residential collapse
  overpressure1psiRadiusKm: number; // 1 psi (6.9 kPa) - window breakage & flying glass injury

  // Seismic Radii & Magnitude
  seismicMagnitude: number; // Richter scale
  seismicDamageRadiusKm: number; // MMI VII+ structural damage
  seismicFeltRadiusKm: number; // MMI IV+ felt by general public

  // Shockwave Arrival Time
  shockwave5psiArrivalSec: number;
  shockwave1psiArrivalSec: number;

  // Legacy compatibility bounds
  criticalRadiusKm: number;
  moderateRadiusKm: number;
  advisoryRadiusKm: number;
  fireballRadiusKm: number;
  airblastOverpressureRadiusKm: number;
}

export interface SimulationResults {
  id: string;
  timestamp: string;
  inputs: ImpactInputs;
  estimatedCraterDiameterM: number;
  estimatedCraterDepthM: number;
  craterRimHeightM: number;
  impactEnergyJoules: number;
  impactEnergyMegatonsTNT: number;
  energyHiroshimaEquivalent: number;
  estimatedSeismicMagnitude: number;
  atmosphericLossPercent: number;
  effectiveGroundEnergyMegatons: number;
  impactClassification: 'Class I (Airburst)' | 'Class II (Regional Blast)' | 'Class III (Major Devastation)' | 'Class IV (Continental Catastrophe)' | 'Class V (ELE - Extinction Level)';
  damageTiers: DamageRadiusTiers;
  tsunamiRisk: 'NONE' | 'LOW' | 'MODERATE' | 'CRITICAL';
  estimatedCasualtyEstimateRisk: 'MINIMAL' | 'LOCALIZED' | 'REGIONAL' | 'MASS_CASUALTY' | 'GLOBAL_COLLAPSE';
  mitigation: MitigationData;
  targetEnvironment: string;
  affectedCountries?: string[];
}

export interface MitigationData {
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE / CATASTROPHIC';
  summary: string;
  immediateAction: string;
  regionalNotes: string;
  tacticalIntervention: string;
  defenseRecommendation: string;
  evacuationRadiusKm: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  code: string;
  description: string;
  diameter: number;
  velocity: number;
  latitude: number;
  longitude: number;
  density: number;
  angle: number;
  historicalOrProjected: string;
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRIT' | 'SYS';
  code: string;
  message: string;
}

