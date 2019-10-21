export interface DecoderOptions {
  permissivePadding?: boolean; //allows incorrect padding on certain data types
  strictAbiMode?: boolean; //throw errors instead of returning; check array & string lengths (crudely)
  allowRetry?: boolean; //turns on error-throwing for retry-allowed errors only
  abiPointerBase?: number;
  memoryVisited?: number[]; //for the future
}
