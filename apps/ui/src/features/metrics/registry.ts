export type Metric = {
  id: string;
  label: string;
  compute: (expected: string, actual: string) => number | Promise<number>;
};

export const registry: Metric[] = [
  {
    id: 'similarity',
    label: 'Similarity',
    compute: async (expected, actual) => {
      // Use the window.api if available for better similarity calculation
      if (window.api?.similarity) {
        return await window.api.similarity(expected, actual);
      }
      // Fallback to simple string comparison
      const maxLength = Math.max(expected.length, actual.length);
      if (maxLength === 0) return 1;

      let matches = 0;
      const minLength = Math.min(expected.length, actual.length);
      for (let i = 0; i < minLength; i++) {
        if (expected[i] === actual[i]) matches++;
      }
      return matches / maxLength;
    },
  },
  {
    id: 'cost',
    label: 'Cost',
    compute: async () => {
      // Get cost delta from the API
      if (window.api?.costDelta) {
        return await window.api.costDelta();
      }
      return 0;
    },
  },
  {
    id: 'latency',
    label: 'Latency',
    compute: async () => {
      // Get last latency from the API
      if (window.api?.lastLatency) {
        return await window.api.lastLatency();
      }
      return 0;
    },
  },
];
