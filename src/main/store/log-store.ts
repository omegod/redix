import type { LogEntry } from "../../shared/types";

export class LogStore {
  private readonly items: LogEntry[] = [];

  append(item: LogEntry): void {
    this.items.unshift(item);
    if (this.items.length > 500) {
      this.items.length = 500;
    }
  }

  list(): LogEntry[] {
    return [...this.items];
  }

  clear(): void {
    this.items.length = 0;
  }
}

