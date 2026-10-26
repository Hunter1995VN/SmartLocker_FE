import * as signalR from '@microsoft/signalr';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

class KioskSignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentStationId: string | null = null;

  async connect(
    stationId: string,
    onDoorChanged: (event: { stationId: string; lockerId: string; lockerCode: string; doorState: string; occurredAt: string }) => void,
    onUnlocked: (event: { stationId: string; lockerId: string; lockerCode: string; timestamp: string }) => void
  ) {
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

    this.connection.on('DoorStatusChanged', onDoorChanged);
    this.connection.on('LockerUnlocked', onUnlocked);

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
