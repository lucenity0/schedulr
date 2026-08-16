import { describe, expect, it } from 'vitest';
import {
  PageTableEntry,
  effectiveAccessTime,
  pageTableSize,
  translatePaged,
  translateSegmented,
  updateTlb
} from './addressing';

const table = (frames: (number | null)[]): PageTableEntry[] =>
  frames.map(frame => ({
    frame,
    valid: frame !== null,
    dirty: false,
    referenced: false
  }));

const config = (frames: (number | null)[], pageSize = 4) => ({
  logicalSize: frames.length * pageSize,
  physicalSize: 64,
  pageSize,
  pageTable: table(frames),
  tlbSize: 2
});

describe('paged translation', () => {
  it('splits an address into page number and offset', () => {
    // Silberschatz: page size 4, logical address 13 -> page 3, offset 1.
    const result = translatePaged(13, config([5, 6, 1, 2]), []);
    expect(result.pageNumber).toBe(3);
    expect(result.offset).toBe(1);
  });

  it('maps through the page table to a physical address', () => {
    // page 3 -> frame 2, so physical = 2*4 + 1 = 9.
    const result = translatePaged(13, config([5, 6, 1, 2]), []);
    expect(result.frame).toBe(2);
    expect(result.physicalAddress).toBe(9);
    expect(result.pageFault).toBe(false);
  });

  it('leaves the offset untouched', () => {
    // Address 6 -> page 1, offset 2. Page 1 maps to frame 6, so the physical
    // address is 6*4 + 2 = 26: the frame replaces the page, the offset rides along.
    const result = translatePaged(6, config([5, 6, 1, 2]), []);
    expect(result.pageNumber).toBe(1);
    expect(result.offset).toBe(2);
    expect(result.physicalAddress).toBe(26);
  });

  it('reports a page fault when the valid bit is clear', () => {
    const result = translatePaged(4, config([5, null, 1, 2]), []);
    expect(result.pageFault).toBe(true);
    expect(result.physicalAddress).toBeNull();
    expect(result.narration).toContain('Page fault');
  });

  it('rejects an address outside the logical address space', () => {
    const result = translatePaged(99, config([5, 6, 1, 2]), []);
    expect(result.invalid).toBe(true);
    expect(result.physicalAddress).toBeNull();
  });

  it('uses the TLB and skips the page table walk on a hit', () => {
    const tlb = [{ page: 3, frame: 2, lastUsed: 0 }];
    const result = translatePaged(13, config([5, 6, 1, 2]), tlb);
    expect(result.tlbHit).toBe(true);
    expect(result.physicalAddress).toBe(9);
    expect(result.steps.some(s => s.label === 'Page table lookup')).toBe(false);
  });

  it('walks the page table on a TLB miss', () => {
    const tlb = [{ page: 0, frame: 5, lastUsed: 0 }];
    const result = translatePaged(13, config([5, 6, 1, 2]), tlb);
    expect(result.tlbHit).toBe(false);
    expect(result.steps.some(s => s.label === 'TLB miss')).toBe(true);
    expect(result.steps.some(s => s.label === 'Page table lookup')).toBe(true);
  });
});

describe('TLB replacement', () => {
  it('evicts the least recently used entry when full', () => {
    let tlb = updateTlb([], 1, 10, 2, 1);
    tlb = updateTlb(tlb, 2, 20, 2, 2);
    tlb = updateTlb(tlb, 3, 30, 2, 3);

    expect(tlb).toHaveLength(2);
    expect(tlb.map(e => e.page).sort()).toEqual([2, 3]);
  });

  it('refreshes an existing entry rather than duplicating it', () => {
    let tlb = updateTlb([], 1, 10, 2, 1);
    tlb = updateTlb(tlb, 1, 10, 2, 5);
    expect(tlb).toHaveLength(1);
    expect(tlb[0].lastUsed).toBe(5);
  });
});

describe('effective access time', () => {
  it('matches the standard worked example', () => {
    // 80% hit ratio, 100 ns memory, 20 ns TLB
    // 0.8*(120) + 0.2*(220) = 96 + 44 = 140
    expect(effectiveAccessTime(0.8, 100, 20)).toBeCloseTo(140);
  });

  it('improves as the hit ratio rises', () => {
    expect(effectiveAccessTime(0.99, 100, 20)).toBeLessThan(effectiveAccessTime(0.5, 100, 20));
  });
});

describe('segmented translation', () => {
  // The Silberschatz segment table.
  const segments = [
    { name: 'segment 0', base: 1400, limit: 1000 },
    { name: 'segment 1', base: 6300, limit: 400 },
    { name: 'segment 2', base: 4300, limit: 400 },
    { name: 'segment 3', base: 3200, limit: 1100 },
    { name: 'segment 4', base: 4700, limit: 1000 }
  ];

  it('adds the base to a valid offset', () => {
    // Segment 2, byte 53 -> 4300 + 53 = 4353.
    const result = translateSegmented(2, 53, segments);
    expect(result.physicalAddress).toBe(4353);
    expect(result.trapped).toBe(false);
  });

  it('resolves the last legal byte of a segment', () => {
    // Segment 3, byte 852 -> 3200 + 852 = 4052.
    expect(translateSegmented(3, 852, segments).physicalAddress).toBe(4052);
  });

  it('traps on an offset past the limit', () => {
    // Segment 0 is only 1000 bytes, so byte 1222 is an addressing error.
    const result = translateSegmented(0, 1222, segments);
    expect(result.trapped).toBe(true);
    expect(result.physicalAddress).toBeNull();
    expect(result.narration).toContain('exceeds');
  });

  it('traps on a segment that does not exist', () => {
    expect(translateSegmented(9, 0, segments).trapped).toBe(true);
  });
});

describe('page table size', () => {
  it('shows why a flat table for a 32-bit space is impractical', () => {
    // 4 GB space, 4 KB pages -> 1M entries at 4 bytes = 4 MB per process.
    const result = pageTableSize(2 ** 32, 4096, 4);
    expect(result.entries).toBe(1048576);
    expect(result.bytes).toBe(4194304);
  });
});
