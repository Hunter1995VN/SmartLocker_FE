import apiClient from '../api/client';
import * as signalR from '@microsoft/signalr';

const API_BASE_URL = apiClient.defaults.baseURL;

export class KioskSignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentStationId: string | null = null;
  private onDoorChangedCallback: ((event: { stationId: string; lockerId: string; lockerCode: string; doorState: string; occurredAt: string }) => void) | null = null;
  private onUnlockedCallback: ((event: { stationId: string; lockerId: string; lockerCode: string; timestamp: string }) => void) | null = null;
  private onStationChanged: (() => void) | null = null;

  async connect(
    stationId: string,
    onDoorChanged: (event: { stationId: string; lockerId: string; lockerCode: string; doorState: string; occurredAt: string }) => void,
    onUnlocked: (event: { stationId: string; lockerId: string; lockerCode: string; timestamp: string }) => void,
    onStationChanged?: () => void
  ) {
    this.onDoorChangedCallback = onDoorChanged;
    this.onUnlockedCallback = onUnlocked;
    this.onStationChanged = onStationChanged ?? null;

    if (this.connection && this.currentStationId === stationId) {
      return;
    }

    if (this.connection) {
      await this.disconnect();
    }

    this.currentStationId = stationId;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/locker`, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    this.connection = connection;

    connection.onreconnected(async () => {
      if (this.connection === connection && this.currentStationId) await connection.invoke('JoinStation', this.currentStationId);
      this.onStationChanged?.();
    });

    connection.on('DoorStatusChanged', (event: any) => {
      this.onDoorChangedCallback?.(event);
    });
    connection.on('LockerUnlocked', (event: any) => {
      this.onUnlockedCallback?.(event);
    });
    connection.on('StationStatusChanged', () => this.onStationChanged?.());

    try {
      await connection.start();
      if (this.connection !== connection) { await connection.stop(); return; }
      console.log('SignalR: Connected to LockerHub.');
      await connection.invoke('JoinStation', stationId);
    } catch (err) {
      console.warn('SignalR: Connection failed, falling back to polling if needed.', err);
    }
  }

  async disconnect() {
    const connection = this.connection;
    const stationId = this.currentStationId;
    this.connection = null;
    this.currentStationId = null;
    if (!connection) return;
    if (stationId && connection.state === signalR.HubConnectionState.Connected) {
      try { await connection.invoke('LeaveStation', stationId); } catch { /* Stop still runs. */ }
    }
    try { await connection.stop(); } catch { /* A superseded connection may already be stopped. */ }
  }
}

export const kioskSignalR = new KioskSignalRService();
