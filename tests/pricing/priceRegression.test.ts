import { getModel } from '../../shared/utils/loadPricing';
import { calcCost } from '../../apps/ui/src/lib/batch/estimateCost';

describe('Canonical pricing regression tests', () => {
  // The provided example calculation was incorrect.
  // gpt-4o:
  // prompt: $5.0 / 1M tokens
  // completion: $20.0 / 1M tokens
  // 1000 prompt tokens = 1000/1,000,000 * 5 = $0.005
  // 2000 completion tokens = 2000/1,000,000 * 20 = $0.04
  // Total = $0.045
  //
  // claude-4-opus:
  // prompt: $15.0 / 1M tokens
  // completion: $75.0 / 1M tokens
  // 500 prompt tokens = 500/1,000,000 * 15 = $0.0075
  // 500 completion tokens = 500/1,000,000 * 75 = $0.0375
  // Total = $0.045
  //
  // models/gemini-2.5-flash-preview:
  // prompt: $0.15 / 1M tokens
  // completion: $0.60 / 1M tokens
  // 250 prompt tokens = 250/1,000,000 * 0.15 = $0.0000375
  // 750 completion tokens = 750/1,000,000 * 0.60 = $0.00045
  // Total = $0.0004875

  test.each([
    ['gpt-4o', 1000, 2000, 0.045],
    ['claude-4-opus', 500, 500, 0.045],
    ['models/gemini-2.5-flash-preview', 250, 750, 0.0004875],
  ])('should calculate cost correctly for %s', (id, pT, cT, expected) => {
    const { pricing } = getModel(id);
    expect(calcCost(pT, cT, pricing)).toBeCloseTo(expected);
  });
});
