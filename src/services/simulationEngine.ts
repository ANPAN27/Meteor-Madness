import { ImpactInputs, SimulationResults, TelemetryLogEntry } from '../types';
import { calculateImpactPhysics } from '../utils/physics';

class SimulationService {
  private history: SimulationResults[] = [];
  private telemetryLogs: TelemetryLogEntry[] = [
    {
      id: 'log-0',
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
      level: 'SYS',
      code: 'SYS_BOOT',
      message: 'MM-SIM-PRTCL v4.0 INITIALIZED // TELEMETRY LINK ONLINE'
    },
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 10000).toLocaleTimeString(),
      level: 'INFO',
      code: 'RADAR_SYNC',
      message: 'EARTH DEFENSE SENSOR ARRAY LOCKED // CARTOGRAPHIC FEED OK'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 5000).toLocaleTimeString(),
      level: 'SYS',
      code: 'ORBITAL_READY',
      message: 'HOLOGRAPHIC TRAJECTORY ENGINE STANDBY // AWAITING TARGET INPUT'
    }
  ];

  /**
   * Executes an impact simulation.
   * Can be redirected to fetch from `/api/simulate` when backed by a remote server.
   */
  public async runSimulation(inputs: ImpactInputs): Promise<SimulationResults> {
    const result = calculateImpactPhysics(inputs);
    this.history.unshift(result);
    if (this.history.length > 20) this.history.pop();

    this.addLog(
      result.impactEnergyMegatonsTNT > 10 ? 'CRIT' : result.impactEnergyMegatonsTNT > 0.1 ? 'WARN' : 'INFO',
      'SIM_CALC',
      `TARGET [${inputs.latitude.toFixed(2)}°, ${inputs.longitude.toFixed(2)}°] // YIELD: ${result.impactEnergyMegatonsTNT} MT // SEISMIC: MAG ${result.estimatedSeismicMagnitude}`
    );

    return result;
  }

  public getHistory(): SimulationResults[] {
    return [...this.history];
  }

  public getLogs(): TelemetryLogEntry[] {
    return [...this.telemetryLogs];
  }

  public addLog(level: TelemetryLogEntry['level'], code: string, message: string): TelemetryLogEntry {
    const entry: TelemetryLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      code,
      message
    };
    this.telemetryLogs.unshift(entry);
    if (this.telemetryLogs.length > 50) this.telemetryLogs.pop();
    return entry;
  }
}

export const simulationService = new SimulationService();
