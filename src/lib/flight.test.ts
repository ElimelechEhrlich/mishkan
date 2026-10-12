import { describe, expect, it } from 'vitest';
import { cubicBezier } from './flight';

describe('cubicBezier', () => {
  it('starts at nothing and ends at all of the move', () => {
    const ease = cubicBezier(0, 0, 0.2, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('is the straight line for a linear curve', () => {
    expect(cubicBezier(0.25, 0.25, 0.75, 0.75)(0.4)).toBeCloseTo(0.4, 4);
  });

  it('runs ahead easing out and behind easing in', () => {
    expect(cubicBezier(0, 0, 0.2, 1)(0.5)).toBeGreaterThan(0.75);
    expect(cubicBezier(0.4, 0, 1, 1)(0.5)).toBeLessThan(0.35);
  });

  it('is the same run backwards for a symmetric curve', () => {
    const ease = cubicBezier(0.45, 0, 0.55, 1);
    expect(ease(0.3) + ease(0.7)).toBeCloseTo(1, 4);
  });
});
