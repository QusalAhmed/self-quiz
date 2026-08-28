import { runEvaluation } from './evaluation-dataset';

describe('Benchmark Evaluation Dataset', () => {
  it('achieves high accuracy, precision, and recall on gold standard benchmark dataset', () => {
    const report = runEvaluation();

    expect(report.failures).toEqual([]);
    expect(report.accuracy).toBe(1.0);
    expect(report.precision).toBeGreaterThanOrEqual(0.95);
    expect(report.recall).toBeGreaterThanOrEqual(0.95);
    expect(report.falsePositives).toBe(0);
    expect(report.falseNegatives).toBe(0);
  });
});
