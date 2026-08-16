import { describe, expect, it } from 'vitest';
import {
  accessCost,
  describeFreeSpace,
  emptyDisk,
  freeRuns,
  simulateFileSystem
} from './filesystem';

const create = (name: string, blocks: number) => ({ name, blocks });
const remove = (name: string) => ({ name, blocks: 0, action: 'delete' as const });

describe('contiguous allocation', () => {
  it('places a file in consecutive blocks', () => {
    const result = simulateFileSystem(16, [create('a.txt', 3)], 'contiguous');
    const file = result.files[0];
    expect(file.blocks).toEqual([0, 1, 2]);
    expect(file.start).toBe(0);
  });

  it('fails on external fragmentation even when enough blocks are free', () => {
    // Fill the disk, free two non-adjacent files, then ask for a run of 4.
    const result = simulateFileSystem(
      12,
      [
        create('a', 3),
        create('b', 3),
        create('c', 3),
        create('d', 3),
        remove('a'),
        remove('c'),
        create('big', 4)
      ],
      'contiguous'
    );
    const last = result.steps[result.steps.length - 1];
    expect(last.success).toBe(false);
    expect(last.narration).toContain('external fragmentation');
  });
});

describe('linked allocation', () => {
  it('uses scattered blocks and chains them together', () => {
    const result = simulateFileSystem(
      12,
      [create('a', 2), create('b', 2), remove('a'), create('c', 4)],
      'linked'
    );
    const c = result.files.find(f => f.name === 'c')!;
    // c reuses the freed blocks 0,1 plus fresh ones - not necessarily contiguous.
    expect(c.blocks).toHaveLength(4);

    // Every block except the last must point at its successor.
    const disk = result.disk;
    c.blocks.slice(0, -1).forEach((block, i) => {
      expect(disk[block].next).toBe(c.blocks[i + 1]);
    });
    expect(disk[c.blocks[c.blocks.length - 1]].next).toBeNull();
  });

  it('succeeds where contiguous fails, because it needs no run', () => {
    const requests = [
      create('a', 3),
      create('b', 3),
      create('c', 3),
      create('d', 3),
      remove('a'),
      remove('c'),
      create('big', 4)
    ];
    expect(simulateFileSystem(12, requests, 'contiguous').files.find(f => f.name === 'big')).toBeUndefined();
    expect(simulateFileSystem(12, requests, 'linked').files.find(f => f.name === 'big')).toBeDefined();
  });
});

describe('indexed allocation', () => {
  it('spends one extra block on the index', () => {
    const result = simulateFileSystem(16, [create('a', 3)], 'indexed');
    const file = result.files[0];
    expect(file.blocks).toHaveLength(3);
    expect(result.disk[file.start!].isIndex).toBe(true);
    // 3 data blocks + 1 index block are in use.
    expect(result.disk.filter(b => b.file !== null)).toHaveLength(4);
  });

  it('fails when there is no room for the index block', () => {
    const result = simulateFileSystem(3, [create('a', 3)], 'indexed');
    expect(result.steps[0].success).toBe(false);
  });
});

describe('access cost', () => {
  it('is constant for contiguous and indexed, linear for linked', () => {
    expect(accessCost('contiguous', 9).accesses).toBe(1);
    expect(accessCost('indexed', 9).accesses).toBe(2);
    expect(accessCost('linked', 9).accesses).toBe(10);
  });

  it('shows linked allocation getting worse further into the file', () => {
    expect(accessCost('linked', 0).accesses).toBeLessThan(accessCost('linked', 5).accesses);
  });
});

describe('free-space management', () => {
  const disk = () => {
    const d = emptyDisk(10);
    [2, 3, 7].forEach(i => {
      d[i] = { ...d[i], file: 'x' };
    });
    return d;
  };

  it('bit vector marks one bit per block', () => {
    const view = describeFreeSpace(disk(), 'bit-vector');
    expect(view.representation).toBe('1100111011');
    expect(view.overheadBits).toBe(10);
  });

  it('linked list chains every free block', () => {
    const view = describeFreeSpace(disk(), 'linked-list');
    expect(view.representation).toBe('0 → 1 → 4 → 5 → 6 → 8 → 9');
  });

  it('counting collapses runs into (start, length) pairs', () => {
    const view = describeFreeSpace(disk(), 'counting');
    expect(view.representation).toBe('(0, 2)  (4, 3)  (8, 2)');
    // Three entries describe seven free blocks.
    expect(view.narration).toContain('7 free block');
  });

  it('finds the contiguous free runs', () => {
    expect(freeRuns(disk())).toEqual([
      { start: 0, length: 2 },
      { start: 4, length: 3 },
      { start: 8, length: 2 }
    ]);
  });
});
