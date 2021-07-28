import WebSocket from "ws";

export interface UnfulfilledRequest {
  socket: WebSocket;
  data: WebSocket.Data;
}

export interface Message {
  id: number;
  type: string;
  payload: any;
}
