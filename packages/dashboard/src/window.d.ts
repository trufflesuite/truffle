declare global {
  interface Window {
    devLog: (...data: any[]) => void;
  }
}

export {};
