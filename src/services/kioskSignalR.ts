import apiClient from '../api/client';
import * as signalR from '@microsoft/signalr';

const API_BASE_URL = apiClient.defaults.baseURL;

export class KioskSignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentStationId: string | null = null;
  private onDoorChangedCallback: ((event: { stationId: string; lockerId: string; lockerCode: string; doorState: string; occurredAt: string }) => void) | null = null;
  private onUnlockedCallback: ((event: { stationId: string; lockerId: string; lockerCode: string; timestamp: string }) => void) | null = null;

  async connect(
    stationId: string,
    onDoorChanged: (event: { stationId: string; lockerId: string; lockerCode: string; doorState: string; occurredAt: string }) => void,
    onUnlocked: (event: { stationId: string; lockerId: string; lockerCode: string; timestamp: string }) => void
  ) {
    this.onDoorChangedCallback = onDoorChanged;
    this.onUnlockedCallback = onUnlocked;

    if (this.connection && this.currentStationId === stationId) {
      return;
    }

    if (this.connection) {
      await this.disconnect();
    }

    this.currentStationId = stationId;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/locker`, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.onreconnected(async () => {
      if (this.currentStationId) await this.connection?.invoke('JoinStation', this.currentStationId);
    });

    this.connection.on('DoorStatusChanged', (event: any) => {
      this.onDoorChangedCallback?.(event);
    });
    this.connection.on('LockerUnlocked', (event: any) => {
      this.onUnlockedCallback?.(event);
    });

    try {
      await this.connection.start();
      console.log('SignalR: Connected to LockerHub.');
      await this.connection.invoke('JoinStation', stationId);
    } catch (err) {
      console.warn('SignalR: Connection failed, falling back to polling if needed.', err);
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        if (this.currentStationId) {
          await this.connection.invoke('LeaveStation', this.currentStationId);
        }
        await this.connection.stop();
      } catch {}
      this.connection = null;
      this.currentStationId = null;
    }
  }
}

export const kioskSignalR = new KioskSignalRService();
