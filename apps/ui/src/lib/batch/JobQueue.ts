import { EventEmitter } from 'eventemitter3';
import type { BatchRow, BatchResult, BatchProgress } from '../../types/batch';
import { runRow } from './runRow';

export interface JobQueueState {
  queue: BatchRow[];
  results: BatchResult[];
  processedRows: number;
  totalRows: number;
  startTime: number;
  batchId: string;
  timestamp: string;
}

interface JobQueueAPI {
  getEnablePromptCaching?: () => Promise<boolean>;
  getPromptCacheTTL?: () => Promise<string>;
  saveJobQueueState?: (batchId: string, state: JobQueueState) => Promise<void>;
  loadJobQueueState?: (batchId: string) => Promise<JobQueueState | null>;
  clearJobQueueState?: (batchId: string) => Promise<void>;
  getStateDirectory?: () => Promise<string>;
  listFiles?: (dir: string) => Promise<string[]>;
}

export class JobQueue extends EventEmitter {
  private queue: BatchRow[] = [];
  private inFlight = 0;
  private maxInFlight: number;
  private totalRows = 0;
  private processedRows = 0;
  private results: BatchResult[] = [];
  private startTime: number | null = null;
  private isRunning = false;
  private isStopping = false;
  private batchId: string;
  private stateFile: string | null = null;
  private api: JobQueueAPI;

  constructor(maxInFlight: number = 3, batchId?: string, api?: JobQueueAPI) {
    super();
    this.maxInFlight = Math.max(1, Math.min(10, maxInFlight));
    this.batchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.api = api || (typeof window !== 'undefined' ? window.api : {});
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
    this.isStopping = false;
    this.startTime = this.startTime || Date.now(); // Preserve start time on resume

    // Save initial state
    await this.saveState();

    try {
      // Start processing
      await this.processNext();

      // Wait for all in-flight jobs to complete
      while (this.inFlight > 0 && !this.isStopping) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.isRunning = false;

      if (!this.isStopping) {
        // Check if batch should be considered failed due to critical errors
        const criticalErrors = this.results.filter(
          (r) =>
            r.status === 'error-missing-key' ||
            (r.status === 'error' && r.errorMessage?.includes('Missing API key'))
        );

        if (criticalErrors.length > 0) {
          this.emitBatchSummary('failed');
          this.emit('failed', {
            reason: 'Critical errors detected',
            criticalErrors: criticalErrors.length,
            totalRows: this.totalRows,
          });
        } else {
          this.emitBatchSummary('completed');
          this.emit('complete');
        }

        await this.clearState(); // Clean up state file on completion
      }

      return this.results;
    } catch (error) {
      this.isRunning = false;
      this.emitBatchSummary('failed');
      this.emit('failed', {
        reason: error instanceof Error ? error.message : 'Unknown error',
        error,
      });
      throw error;
    }
  }

  // Graceful shutdown - stops accepting new work but completes in-flight jobs
  async stop(saveState: boolean = true): Promise<void> {
    console.warn('[JobQueue] Initiating graceful shutdown...');
    this.isStopping = true;
    this.isRunning = false;
    this.queue = []; // Clear pending queue

    // Wait for in-flight jobs to complete
    while (this.inFlight > 0) {
      console.warn(`[JobQueue] Waiting for ${this.inFlight} in-flight jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (saveState) {
      await this.saveState();
      console.warn(`[JobQueue] Batch state saved. You can resume with batch ID: ${this.batchId}`);
    }

    this.emit('stopped', {
      batchId: this.batchId,
      processedRows: this.processedRows,
      totalRows: this.totalRows,
    });
    console.warn('[JobQueue] Graceful shutdown complete');
  }

  // Resume from saved state
  static async resume(
    batchId: string,
    maxInFlight: number = 3,
    api?: JobQueueAPI
  ): Promise<JobQueue> {
    const queue = new JobQueue(maxInFlight, batchId, api);
    const state = await queue.loadState();

    if (!state) {
      throw new Error(`No saved state found for batch ID: ${batchId}`);
    }

    queue.queue = state.queue;
    queue.results = state.results;
    queue.processedRows = state.processedRows;
    queue.totalRows = state.totalRows;
    queue.startTime = state.startTime;

    console.warn(
      `[JobQueue] Resumed batch ${batchId}: ${state.processedRows}/${state.totalRows} rows completed`
    );
    return queue;
  }

  // Get list of resumable batches
  static async getResumableBatches(api?: JobQueueAPI): Promise<string[]> {
    try {
      const jobQueueAPI = api || (typeof window !== 'undefined' ? window.api : {});
      const stateDir = await jobQueueAPI.getStateDirectory?.();
      if (!stateDir) return [];

      const files = await jobQueueAPI.listFiles?.(stateDir);
      return (
        files
          ?.filter((f: string) => f.endsWith('.jobqueue'))
          .map((f: string) => f.replace('.jobqueue', '')) || []
      );
    } catch (error) {
      console.error('Error getting resumable batches:', error);
      return [];
    }
  }

  private async processNext(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.inFlight < this.maxInFlight &&
      this.isRunning &&
      !this.isStopping
    ) {
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
        .finally(async () => {
          this.inFlight--;
          this.processedRows++;
          this.updateProgress();

          // Save state periodically (every 10 rows or when stopped)
          if (this.processedRows % 10 === 0 || this.isStopping) {
            await this.saveState();
          }

          // Process next item if available and not stopping
          if (this.queue.length > 0 && this.isRunning && !this.isStopping) {
            this.processNext();
          }
        });
    }
  }

  private async processRow(row: BatchRow): Promise<void> {
    try {
      // Get caching settings
      const enablePromptCaching = (await this.api.getEnablePromptCaching?.()) ?? false;
      const cacheTTL = ((await this.api.getPromptCacheTTL?.()) as '5m' | '1h') ?? '5m';

      const result = await runRow(row, {
        enablePromptCaching,
        cacheTTL,
        cacheSystemPrompt: true, // Cache system prompts by default
      });
      this.results.push(result);
      this.emit('row-done', result);

      // Check for critical errors that should fail the entire batch
      if (result.status === 'error-missing-key') {
        throw new Error(`Critical error: ${result.errorMessage}`);
      }
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

  private emitBatchSummary(status: 'failed' | 'completed'): void {
    const endTime = Date.now();
    const duration = this.startTime ? endTime - this.startTime : 0;

    // Calculate summary statistics
    const successCount = this.results.filter((r) => r.status === 'success').length;
    const errorCount = this.results.filter((r) => r.status !== 'success').length;
    const totalCost = this.results.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    const averageLatency =
      this.results.length > 0
        ? this.results.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / this.results.length
        : 0;

    // Get unique models used
    const modelsUsed = [...new Set(this.results.map((r) => r.model))];

    const summary = {
      batchId: this.batchId,
      totalRows: this.totalRows,
      successCount,
      errorCount,
      totalCost,
      averageLatency,
      duration,
      modelsUsed,
      timestamp: new Date().toISOString(),
    };

    this.emit('batch-summary', { ...summary, status });
  }

  private async saveState(): Promise<void> {
    if (!this.startTime) return;

    const state: JobQueueState = {
      queue: this.queue,
      results: this.results,
      processedRows: this.processedRows,
      totalRows: this.totalRows,
      startTime: this.startTime,
      batchId: this.batchId,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.api.saveJobQueueState?.(this.batchId, state);
    } catch (error) {
      console.error('Error saving job queue state:', error);
    }
  }

  private async loadState(): Promise<JobQueueState | null> {
    try {
      return (await window.api.loadJobQueueState?.(this.batchId)) || null;
    } catch (error) {
      console.error('Error loading job queue state:', error);
      return null;
    }
  }

  private async clearState(): Promise<void> {
    try {
      await this.api.clearJobQueueState?.(this.batchId);
    } catch (error) {
      console.error('Error clearing job queue state:', error);
    }
  }

  // Getters for monitoring
  get id(): string {
    return this.batchId;
  }
  get running(): boolean {
    return this.isRunning;
  }
  get stopping(): boolean {
    return this.isStopping;
  }
  get progress(): { processed: number; total: number; percentage: number } {
    return {
      processed: this.processedRows,
      total: this.totalRows,
      percentage: this.totalRows > 0 ? Math.round((this.processedRows / this.totalRows) * 100) : 0,
    };
  }
}
