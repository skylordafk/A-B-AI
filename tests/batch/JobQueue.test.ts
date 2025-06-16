import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobQueue } from '../../apps/ui/src/lib/batch/JobQueue';
import type { BatchRow, BatchResult } from '../../apps/ui/src/types/batch';

// Mock runRow function
vi.mock('../../apps/ui/src/lib/batch/runRow', () => ({
  runRow: vi.fn(async (row: BatchRow): Promise<BatchResult> => {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      id: row.id,
      prompt: row.prompt,
      model: row.model || 'default',
      status: 'success',
      response: 'Mocked response',
      tokens_in: 10,
      tokens_out: 20,
      cost_usd: 0.001,
      latency_ms: 10,
    };
  }),
}));

describe('JobQueue', () => {
  let queue: JobQueue;

  // Mock API for testing
  const mockApi = {
    getEnablePromptCaching: vi.fn(async () => false),
    getPromptCacheTTL: vi.fn(async () => '5m' as const),
    saveJobQueueState: vi.fn(async () => {}),
    loadJobQueueState: vi.fn(async () => null),
    clearJobQueueState: vi.fn(async () => {}),
    getStateDirectory: vi.fn(async () => '/tmp'),
    listFiles: vi.fn(async () => []),
  };

  beforeEach(() => {
    queue = new JobQueue(3, undefined, mockApi);
  });

  it('should respect maxInFlight limit', async () => {
    const rows: BatchRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: `row-${i}`,
      prompt: `Prompt ${i}`,
    }));

    // Enqueue all rows
    rows.forEach((row) => queue.enqueue(row));

    let maxConcurrent = 0;
    let currentConcurrent = 0;

    queue.on('row-done', () => {
      currentConcurrent--;
    });

    queue.on('progress', () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
    });

    await queue.start();

    // Should never exceed maxInFlight
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('should process rows in FIFO order', async () => {
    const rows: BatchRow[] = [
      { id: 'first', prompt: 'First prompt' },
      { id: 'second', prompt: 'Second prompt' },
      { id: 'third', prompt: 'Third prompt' },
    ];

    const processedOrder: string[] = [];

    queue.on('row-done', (result: BatchResult) => {
      processedOrder.push(result.id);
    });

    rows.forEach((row) => queue.enqueue(row));
    await queue.start();

    // Should process in the order they were enqueued
    expect(processedOrder).toEqual(['first', 'second', 'third']);
  });

  it('should emit progress events', async () => {
    const rows: BatchRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: `row-${i}`,
      prompt: `Prompt ${i}`,
    }));

    const progressUpdates: number[] = [];

    queue.on('progress', (progress) => {
      progressUpdates.push(progress.percentage);
    });

    rows.forEach((row) => queue.enqueue(row));
    await queue.start();

    // Should have received progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });

  it('should calculate ETA', async () => {
    const rows: BatchRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: `row-${i}`,
      prompt: `Prompt ${i}`,
    }));

    let lastEta: number | undefined;

    queue.on('progress', (progress) => {
      if (progress.eta !== undefined) {
        lastEta = progress.eta;
      }
    });

    rows.forEach((row) => queue.enqueue(row));
    await queue.start();

    // Should have calculated an ETA at some point
    expect(lastEta).toBeDefined();
  });

  it('should emit complete event when finished', async () => {
    const rows: BatchRow[] = [{ id: 'row-1', prompt: 'Test prompt' }];

    let completed = false;

    queue.on('complete', () => {
      completed = true;
    });

    rows.forEach((row) => queue.enqueue(row));
    await queue.start();

    expect(completed).toBe(true);
  });

  it('should return all results', async () => {
    const rows: BatchRow[] = [
      { id: 'row-1', prompt: 'Prompt 1' },
      { id: 'row-2', prompt: 'Prompt 2' },
      { id: 'row-3', prompt: 'Prompt 3' },
    ];

    rows.forEach((row) => queue.enqueue(row));
    const results = await queue.start();

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(['row-1', 'row-2', 'row-3']);
  });
});
