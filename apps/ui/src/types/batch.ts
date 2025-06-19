export interface BatchRow {
  id: string;
  prompt: string;
  model?: string;
  system?: string;
  developer?: string;
  temperature?: number;
  data?: Record<string, unknown>;
}

export interface BatchResult {
  id: string;
  prompt: string;
  model: string;
  status: 'success' | 'error' | 'error-missing-key' | 'error-api';
  response?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  latency_ms?: number;
  error?: string;
  errorMessage?: string;
  data?: Record<string, unknown>;
  cachingInfo?: string; // Information about prompt caching usage
}

export interface RowError {
  row: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface CostEstimation {
  totalUSD: number;
  perRow: Array<{
    id: string;
    tokens_in: number;
    est_cost: number;
  }>;
}

export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  eta?: number;
}

export interface BatchJobManifest {
  inputFile: string;
  timestamp: string;
  settings: {
    concurrency: number;
    dryRunCost?: number;
  };
  summary: {
    totalRows: number;
    success: number;
    failed: number;
    totalCostUSD: number;
  };
  rows: Array<{
    id: string;
    promptHash: string;
    status: string;
    provider: string;
    latency_ms?: number;
    cost_usd?: number;
  }>;
}
