import WebSocket from "ws";

export interface Request {
  socket: WebSocket;
  data: WebSocket.Data;
}
