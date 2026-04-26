/// <reference types="vite/client" />

import type { RedixApi } from "../../preload";

declare global {
  interface Window {
    api: RedixApi;
  }
}

export {};
