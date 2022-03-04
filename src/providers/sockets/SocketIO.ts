import { appEnv } from "@providers/config/env";
import { provide } from "inversify-binding-decorators";
import { Server as SocketIOServer, Socket } from "socket.io";
import { ISocket } from "./SocketsTypes";

@provide(SocketIO)
export class SocketIO implements ISocket {
  constructor() {}

  private socket: SocketIOServer;
  public channel: Socket;

  public init(): void {
    this.socket = new SocketIOServer();
    this.socket.listen(appEnv.socket.port.SOCKET);
  }

  public emitToUser<T>(channel: string, eventName: string, data?: T): void {
    this.socket.to(channel).emit(eventName, data || {});
  }

  public emitToAllUsers<T>(eventName: string, data?: T): void {
    this.socket.emit(eventName, data || {});
  }
}
