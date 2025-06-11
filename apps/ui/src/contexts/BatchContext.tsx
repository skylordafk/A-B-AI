import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type {
  BatchRow,
  BatchResult,
  RowError,
  CostEstimation,
  BatchProgress,
} from '../types/batch';

interface BatchState {
  file: File | null;
  rows: BatchRow[] | null;
  errors: RowError[] | null;
  results: BatchResult[];
  progress: BatchProgress | null;
  estimation: CostEstimation | null;
  isComplete: boolean;
  totalTime?: number;
  totalCost?: number;
}

type BatchAction =
  | { type: 'SET_FILE'; payload: File }
  | { type: 'SET_ROWS'; payload: { rows: BatchRow[]; errors: RowError[] } }
  | { type: 'SET_ESTIMATION'; payload: CostEstimation }
  | { type: 'UPDATE_PROGRESS'; payload: BatchProgress }
  | { type: 'ADD_RESULT'; payload: BatchResult }
  | { type: 'ADD_ERROR'; payload: RowError }
  | { type: 'COMPLETE'; payload: { totalTime: number; totalCost: number } }
  | { type: 'RESET' };

const initialState: BatchState = {
  file: null,
  rows: null,
  errors: null,
  results: [],
  progress: null,
  estimation: null,
  isComplete: false,
};

function batchReducer(state: BatchState, action: BatchAction): BatchState {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, file: action.payload };

    case 'SET_ROWS':
      return {
        ...state,
        rows: action.payload.rows,
        errors: action.payload.errors,
      };

    case 'SET_ESTIMATION':
      return { ...state, estimation: action.payload };

    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload };

    case 'ADD_RESULT':
      return {
        ...state,
        results: [...state.results, action.payload],
      };

    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...(state.errors || []), action.payload],
      };

    case 'COMPLETE':
      return {
        ...state,
        isComplete: true,
        totalTime: action.payload.totalTime,
        totalCost: action.payload.totalCost,
        progress: null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface BatchContextType {
  state: BatchState;
  dispatch: React.Dispatch<BatchAction>;
}

const BatchContext = createContext<BatchContextType | null>(null);

export function BatchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(batchReducer, initialState);

  return <BatchContext.Provider value={{ state, dispatch }}>{children}</BatchContext.Provider>;
}

export function useBatch() {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
}
