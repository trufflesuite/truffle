export interface Request {
  id: number;
  payload: {
    jsonrpc: "2.0";
    method: string;
    params: any[];
    id: number;
  };
};
