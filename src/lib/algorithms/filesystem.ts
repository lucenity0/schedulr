/**
 * File-system implementation: how a file's blocks are laid out on disk, and
 * how the free list is tracked.
 *
 * The three allocation methods differ in what they cost you: contiguous is
 * fastest to read but suffers external fragmentation, linked kills random
 * access, indexed pays a block up front to get both back.
 */

export type AllocationMethod = 'contiguous' | 'linked' | 'indexed';

export interface DiskBlock {
  index: number;
  /** file occupying this block, or null when free */
  file: string | null;
  /** linked allocation: the next block of the same file */
  next: number | null;
  /** true when the block holds an index block rather than data */
  isIndex: boolean;
}

export interface FileEntry {
  name: string;
  method: AllocationMethod;
  /** contiguous: first block; indexed: the index block */
  start: number | null;
  length: number;
  /** data blocks in file order */
  blocks: number[];
}

export interface FsStep {
  label: string;
  disk: DiskBlock[];
  files: FileEntry[];
  success: boolean;
  narration: string;
}

export interface FsResult {
  method: AllocationMethod;
  steps: FsStep[];
  files: FileEntry[];
  disk: DiskBlock[];
}

export const emptyDisk = (size: number): DiskBlock[] =>
  Array.from({ length: size }, (_, index) => ({
    index,
    file: null,
    next: null,
    isIndex: false
  }));

const freeBlocks = (disk: DiskBlock[]) => disk.filter(b => b.file === null);

/** Contiguous allocation needs `count` blocks in a row - first fit. */
const findRun = (disk: DiskBlock[], count: number): number | null => {
  let run = 0;
  for (let i = 0; i < disk.length; i++) {
    run = disk[i].file === null ? run + 1 : 0;
    if (run === count) return i - count + 1;
  }
  return null;
};

export interface FsRequest {
  name: string;
  blocks: number;
  action?: 'create' | 'delete';
}

export const simulateFileSystem = (
  diskSize: number,
  requests: FsRequest[],
  method: AllocationMethod
): FsResult => {
  let disk = emptyDisk(diskSize);
  let files: FileEntry[] = [];
  const steps: FsStep[] = [];

  const snapshot = (label: string, success: boolean, narration: string) =>
    steps.push({
      label,
      disk: disk.map(b => ({ ...b })),
      files: files.map(f => ({ ...f, blocks: [...f.blocks] })),
      success,
      narration
    });

  for (const request of requests) {
    if (request.action === 'delete') {
      const file = files.find(f => f.name === request.name);
      if (!file) {
        snapshot(`delete ${request.name}`, false, `${request.name} does not exist.`);
        continue;
      }
      const owned = new Set([...file.blocks, ...(method === 'indexed' && file.start !== null ? [file.start] : [])]);
      disk = disk.map(b =>
        owned.has(b.index) ? { ...b, file: null, next: null, isIndex: false } : b
      );
      files = files.filter(f => f.name !== request.name);
      snapshot(
        `delete ${request.name}`,
        true,
        `${request.name} is deleted and its ${owned.size} block(s) return to the free list.`
      );
      continue;
    }

    // Indexed allocation spends one extra block on the index itself.
    const needed = method === 'indexed' ? request.blocks + 1 : request.blocks;
    const available = freeBlocks(disk).length;

    if (available < needed) {
      snapshot(
        `create ${request.name}`,
        false,
        `${request.name} needs ${needed} block(s) but only ${available} are free.`
      );
      continue;
    }

    if (method === 'contiguous') {
      const start = findRun(disk, request.blocks);
      if (start === null) {
        snapshot(
          `create ${request.name}`,
          false,
          `${request.name} needs ${request.blocks} consecutive blocks. ${available} blocks are free but never ${request.blocks} in a row - this is external fragmentation, and it is the weakness of contiguous allocation.`
        );
        continue;
      }
      const blocks = Array.from({ length: request.blocks }, (_, i) => start + i);
      disk = disk.map(b => (blocks.includes(b.index) ? { ...b, file: request.name } : b));
      files = [...files, { name: request.name, method, start, length: request.blocks, blocks }];
      snapshot(
        `create ${request.name}`,
        true,
        `${request.name} is stored in blocks ${start}–${start + request.blocks - 1}. The directory only needs to remember the start block and the length, and reading block i is a single seek.`
      );
      continue;
    }

    if (method === 'linked') {
      const chosen = freeBlocks(disk).slice(0, request.blocks).map(b => b.index);
      disk = disk.map(b => {
        const position = chosen.indexOf(b.index);
        if (position === -1) return b;
        return { ...b, file: request.name, next: chosen[position + 1] ?? null };
      });
      files = [...files, { name: request.name, method, start: chosen[0], length: request.blocks, blocks: chosen }];
      snapshot(
        `create ${request.name}`,
        true,
        `${request.name} is scattered across blocks ${chosen.join(' → ')}, each pointing to the next. No external fragmentation, but reading block ${request.blocks - 1} means following ${request.blocks - 1} pointer(s) first.`
      );
      continue;
    }

    // indexed
    const free = freeBlocks(disk).map(b => b.index);
    const indexBlock = free[0];
    const chosen = free.slice(1, request.blocks + 1);
    disk = disk.map(b => {
      if (b.index === indexBlock) return { ...b, file: request.name, isIndex: true };
      if (chosen.includes(b.index)) return { ...b, file: request.name };
      return b;
    });
    files = [...files, { name: request.name, method, start: indexBlock, length: request.blocks, blocks: chosen }];
    snapshot(
      `create ${request.name}`,
      true,
      `Block ${indexBlock} becomes ${request.name}'s index block, holding pointers to ${chosen.join(', ')}. Random access is one lookup, at the cost of a whole block of overhead.`
    );
  }

  return { method, steps, files, disk };
};

/**
 * Disk accesses needed to read the i-th block of a file. This is the number
 * that actually separates the three methods.
 */
export const accessCost = (method: AllocationMethod, blockIndex: number) => {
  switch (method) {
    case 'contiguous':
      return { accesses: 1, why: 'start + i is computed directly, so one seek reaches any block.' };
    case 'linked':
      return {
        accesses: blockIndex + 1,
        why: `every block from 0 to ${blockIndex} must be read to follow the chain of pointers.`
      };
    case 'indexed':
      return {
        accesses: 2,
        why: 'one read for the index block, one for the data block - the same for any i.'
      };
  }
};

/* ------------------------------------------------------------------ */
/* Free-space management                                               */
/* ------------------------------------------------------------------ */

export type FreeSpaceMethod = 'bit-vector' | 'linked-list' | 'grouping' | 'counting';

export interface FreeSpaceView {
  method: FreeSpaceMethod;
  /** rendered representation of the free list */
  representation: string;
  /** bytes of bookkeeping this representation costs */
  overheadBits: number;
  narration: string;
}

/** Contiguous runs of free blocks, used by grouping and counting. */
export const freeRuns = (disk: DiskBlock[]) => {
  const runs: { start: number; length: number }[] = [];
  let start: number | null = null;

  disk.forEach((block, index) => {
    if (block.file === null) {
      if (start === null) start = index;
    } else if (start !== null) {
      runs.push({ start, length: index - start });
      start = null;
    }
  });
  if (start !== null) runs.push({ start, length: disk.length - start });

  return runs;
};

export const describeFreeSpace = (
  disk: DiskBlock[],
  method: FreeSpaceMethod
): FreeSpaceView => {
  const free = disk.filter(b => b.file === null).map(b => b.index);
  const runs = freeRuns(disk);

  switch (method) {
    case 'bit-vector': {
      const bits = disk.map(b => (b.file === null ? '1' : '0')).join('');
      return {
        method,
        representation: bits,
        overheadBits: disk.length,
        narration: `One bit per block: 1 = free, 0 = in use. Finding the first free block is a fast word scan, but the map costs ${disk.length} bits and must be kept in memory to be worth anything.`
      };
    }
    case 'linked-list': {
      return {
        method,
        representation: free.length ? free.join(' → ') : '(none)',
        overheadBits: free.length * 32,
        narration: `Each free block stores a pointer to the next. Costs no extra space - the pointers live in blocks that are free anyway - but walking the list to find n contiguous blocks means reading every one of them.`
      };
    }
    case 'grouping': {
      const groups: string[] = [];
      for (let i = 0; i < free.length; i += 4) {
        groups.push(`[${free.slice(i, i + 4).join(', ')}]`);
      }
      return {
        method,
        representation: groups.length ? groups.join(' → ') : '(none)',
        overheadBits: free.length * 32,
        narration: `The first free block stores the addresses of the next n free blocks. Finding a batch of free blocks takes one read instead of n, which is the whole point over a plain linked list.`
      };
    }
    case 'counting': {
      return {
        method,
        representation: runs.length
          ? runs.map(run => `(${run.start}, ${run.length})`).join('  ')
          : '(none)',
        overheadBits: runs.length * 64,
        narration: `Each entry is a starting block plus a run length, because free blocks usually cluster. ${runs.length} entr${runs.length === 1 ? 'y' : 'ies'} describe all ${free.length} free block(s) - far shorter than listing them individually.`
      };
    }
  }
};
