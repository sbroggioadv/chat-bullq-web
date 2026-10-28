import { describe, expect, it } from 'vitest';
import { mockupAvatarHue } from '@/components/ui/avatar-hue';

describe('mockupAvatarHue', () => {
  it('shifts both ends of the excluded orange/brown range, but not its neighbors', () => {
    expect([14, 15, 85, 86].map((code) => mockupAvatarHue(String.fromCharCode(code))))
      .toEqual([14, 155, 225, 86]);
  });

  it('keeps the reference hash for accented names, surrogate pairs and empty input', () => {
    expect(mockupAvatarHue('José')).toBe(203);
    expect(mockupAvatarHue('😀')).toBe(277);
    expect(mockupAvatarHue('')).toBe(0);
  });
});
