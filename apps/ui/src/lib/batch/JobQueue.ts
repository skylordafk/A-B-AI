import { EventEmitter } from 'eventemitter3';
import type { BatchRow, BatchResult, BatchProgress } from '../../types/batch';
import { runRow } from './runRow';

export class JobQueue extends EventEmitter {
  private queue: BatchRow[] = [];
  private inFlight = 0;
  private maxInFlight: number;
  private totalRows = 0;
  private processedRows = 0;
  private results: BatchResult[] = [];
  private startTime: number | null = null;
  private isRunning = false;

  constructor(maxInFlight: number = 3) {
    super();
    this.maxInFlight = Math.max(1, Math.min(10, maxInFlight));
  }

  enqueue(row: BatchRow): void {
    this.queue.push(row);
    this.totalRows++;
  }

  async start(): Promise<BatchResult[]> {
    if (this.isRunning) {
      throw new Error('Queue is already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.processedRows = 0;
    this.results = [];

    // Start processing
    await this.processNext();

    // Wait for all in-flight jobs to complete
    while (this.inFlight > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isRunning = false;
    this.emit('complete');
    return this.results;
  }

  private async processNext(): Promise<void> {
    while (this.queue.length > 0 && this.inFlight < this.maxInFlight && this.isRunning) {
      const row = this.queue.shift();
      if (!row) continue;

      this.inFlight++;
      this.processRow(row)
        .catch((err) => {
          console.error('Error processing row:', err);
          this.emit('row-error', {
            row: row.id,
            message: err.message || 'Unknown error',
            data: row,
          });
        })
        .finally(() => {
          this.inFlight--;
          this.processedRows++;
          this.updateProgress();

          // Process next item if available
          if (this.queue.length > 0 && this.isRunning) {
            this.processNext();
          }
        });
    }
  }

  private async processRow(row: BatchRow): Promise<void> {
    try {
      const result = await runRow(row);
      this.results.push(result);
      this.emit('row-done', result);
    } catch (error) {
      const errorResult: BatchResult = {
        id: row.id,
        prompt: row.prompt,
        model: row.model || 'unknown',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
      this.results.push(errorResult);
      this.emit('row-done', errorResult);
      throw error;
    }
  }

  private updateProgress(): void {
    const progress: BatchProgress = {
      current: this.processedRows,
      total: this.totalRows,
      percentage: Math.round((this.processedRows / this.totalRows) * 100),
    };

    // Calculate ETA based on average time per row
    if (this.startTime && this.processedRows > 0) {
      const elapsedMs = Date.now() - this.startTime;
      const avgTimePerRow = elapsedMs / this.processedRows;
      const remainingRows = this.totalRows - this.processedRows;
      progress.eta = Math.round((remainingRows * avgTimePerRow) / 1000); // in seconds
    }

    this.emit('progress', progress);
  }

  stop(): void {
    this.isRunning = false;
    this.queue = [];
  }
}
