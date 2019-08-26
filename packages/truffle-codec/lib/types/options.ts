export interface DecoderOptions {
  permissivePadding?: boolean; //allows incorrect padding on certain data types
  strictAbiMode?: boolean; //throw errors instead of returning; check array & string lengths (crudely)
  abiPointerBase?: number;
  memoryVisited?: number[]; //for the future
}
