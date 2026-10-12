import {
  formatAddress,
  formatBlockNumber,
  formatDuration,
  formatFundingRate,
  formatLeverage,
  formatPercent,
  formatPnL,
  formatTimeAgo,
  formatUSD,
  getMonadScanAddressUrl,
  getMonadScanTxUrl,
  isValidAddress,
} from '@/lib/utils/format';

describe('formatAddress', () => {
  it('returns 0x1234...cdef format', () => {
    expect(formatAddress('0x1234567890abcdef1234567890abcdef1234cdef')).toBe('0x1234...cdef');
  });

  it('returns short strings unchanged', () => {
    expect(formatAddress('0xabc')).toBe('0xabc');
  });
});

describe('formatUSD', () => {
  it('formats millions', () => {
    expect(formatUSD(1_500_000)).toBe('$1.5M');
    expect(formatUSD(1_234_567)).toBe('$1.2M');
  });

  it('formats thousands', () => {
    expect(formatUSD(142_400)).toBe('$142.4K');
    expect(formatUSD(50_000)).toBe('$50.0K');
  });

  it('formats small values', () => {
    expect(formatUSD(500)).toBe('$500');
    expect(formatUSD(890)).toBe('$890');
  });

  it('supports full expansion when compact=false', () => {
    expect(formatUSD(1_234_567, false)).toBe('$1,234,567');
  });
});

describe('formatPnL', () => {
  it('prefixes positive values with +', () => {
    expect(formatPnL(50_000)).toBe('+$50.0K');
    expect(formatPnL(142_400)).toBe('+$142.4K');
  });

  it('prefixes negative values with -', () => {
    expect(formatPnL(-12_000)).toBe('-$12.0K');
  });

  it('formats zero as $0', () => {
    expect(formatPnL(0)).toBe('$0');
  });
});

describe('formatPercent', () => {
  it('converts fractions to percent strings', () => {
    expect(formatPercent(0.784)).toBe('78.4%');
    expect(formatPercent(0.7845)).toBe('78.5%');
    expect(formatPercent(-0.234)).toBe('-23.4%');
  });
});

describe('formatLeverage', () => {
  it('formats integer leverage without decimals', () => {
    expect(formatLeverage(20)).toBe('20x');
  });

  it('formats fractional leverage with one decimal', () => {
    expect(formatLeverage(12.5)).toBe('12.5x');
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(1800)).toBe('30m');
  });

  it('formats days, hours, minutes', () => {
    expect(formatDuration(90061)).toBe('1d 1h 1m');
  });
});

describe('formatFundingRate', () => {
  it('formats signed funding percentages', () => {
    expect(formatFundingRate(0.0003)).toBe('+0.030%');
    expect(formatFundingRate(-0.0001)).toBe('-0.010%');
  });
});

describe('formatBlockNumber', () => {
  it('separates thousands', () => {
    expect(formatBlockNumber(12453211n)).toBe('12,453,211');
  });
});

describe('formatTimeAgo', () => {
  it('formats seconds, minutes, hours, days', () => {
    const now = Date.now();
    expect(formatTimeAgo(new Date(now - 2_000).toISOString())).toBe('2s ago');
    expect(formatTimeAgo(new Date(now - 900_000).toISOString())).toBe('15m ago');
    expect(formatTimeAgo(new Date(now - 10_800_000).toISOString())).toBe('3h ago');
    expect(formatTimeAgo(new Date(now - 172_800_000).toISOString())).toBe('2d ago');
  });
});

describe('monad explorer urls', () => {
  it('builds tx and address urls', () => {
    expect(getMonadScanTxUrl('0xabc')).toBe('https://monadexplorer.com/tx/0xabc');
    expect(getMonadScanAddressUrl('0xdef')).toBe('https://monadexplorer.com/address/0xdef');
  });
});

describe('isValidAddress', () => {
  it('validates EVM addresses', () => {
    expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isValidAddress('0x123')).toBe(false);
    expect(isValidAddress('not-an-address')).toBe(false);
  });
});
