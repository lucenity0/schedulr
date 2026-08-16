/**
 * Contiguous memory allocation.
 *
 * All four strategies answer the same question - which free hole does this
 * request go into - and differ only in how they rank the candidates:
 *
 *   First Fit - the first hole large enough (fastest, drifts toward the front)
 *   Best Fit  - the smallest hole large enough (least waste per request,
 *               but shreds memory into slivers)
 *   Worst Fit - the largest hole (leaves a big usable remainder, in theory)
 *   Next Fit  - First Fit, but resuming from where the last search stopped
 */

export type FitStrategy = 'First Fit' | 'Best Fit' | 'Worst Fit' | 'Next Fit';

export interface Block {
  id: number;
  start: number;
  size: number;
  /** process occupying this block, or null when it is a free hole */
  processId: string | null;
  /** size of the original request; the rest is internal fragmentation */
  requestedSize?: number;
}

export interface MemoryRequest {
  processId: string;
  size: number;
  /** 'free' releases a previously allocated process instead of allocating */
  action?: 'allocate' | 'free';
}

export interface MemoryStep {
  index: number;
  request: MemoryRequest;
  blocks: Block[];
  success: boolean;
  /** block the request landed in */
  blockId: number | null;
  externalFragmentation: number;
  internalFragmentation: number;
  largestFreeHole: number;
  narration: string;
}

export interface MemoryResult {
  strategy: FitStrategy;
  steps: MemoryStep[];
  allocated: number;
  failed: number;
}

const freeHoles = (blocks: Block[]) => blocks.filter(b => b.processId === null);

const externalFragmentation = (blocks: Block[], requestSize: number) => {
  const holes = freeHoles(blocks);
  const total = holes.reduce((s, h) => s + h.size, 0);
  const largest = holes.reduce((m, h) => Math.max(m, h.size), 0);
  // Free space that cannot satisfy the request because it is scattered.
  return total >= requestSize && largest < requestSize ? total : 0;
};

/** Merge neighbouring free holes so a freed block can be reused as one piece. */
const coalesce = (blocks: Block[]): Block[] => {
  const merged: Block[] = [];
  for (const block of [...blocks].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && last.processId === null && block.processId === null) {
      last.size += block.size;
    } else {
      merged.push({ ...block });
    }
  }
  return merged.map((b, i) => ({ ...b, id: i }));
};

export const simulateMemory = (
  totalSize: number,
  requests: MemoryRequest[],
  strategy: FitStrategy,
  initialBlocks?: Block[]
): MemoryResult => {
  let blocks: Block[] = initialBlocks
    ? initialBlocks.map(b => ({ ...b }))
    : [{ id: 0, start: 0, size: totalSize, processId: null }];

  const steps: MemoryStep[] = [];
  let allocated = 0;
  let failed = 0;
  // Next Fit remembers where the previous search finished.
  let cursor = 0;

  requests.forEach((request, index) => {
    if (request.action === 'free') {
      const target = blocks.find(b => b.processId === request.processId);
      if (!target) {
        failed += 1;
        steps.push({
          index,
          request,
          blocks: blocks.map(b => ({ ...b })),
          success: false,
          blockId: null,
          externalFragmentation: 0,
          internalFragmentation: internalTotal(blocks),
          largestFreeHole: largestHole(blocks),
          narration: `${request.processId} is not resident, so there is nothing to free.`
        });
        return;
      }
      blocks = coalesce(
        blocks.map(b =>
          b.id === target.id ? { ...b, processId: null, requestedSize: undefined } : b
        )
      );
      steps.push({
        index,
        request,
        blocks: blocks.map(b => ({ ...b })),
        success: true,
        blockId: null,
        externalFragmentation: 0,
        internalFragmentation: internalTotal(blocks),
        largestFreeHole: largestHole(blocks),
        narration: `${request.processId} is freed; its block returns to the free list and merges with any neighbouring hole.`
      });
      return;
    }

    const candidates = blocks
      .map((block, position) => ({ block, position }))
      .filter(({ block }) => block.processId === null && block.size >= request.size);

    let chosen: { block: Block; position: number } | undefined;
    let reason = '';

    if (candidates.length) {
      switch (strategy) {
        case 'First Fit':
          chosen = candidates[0];
          reason = `First Fit takes the first hole big enough - block at ${chosen.block.start}`;
          break;
        case 'Best Fit':
          chosen = candidates.reduce((best, c) => (c.block.size < best.block.size ? c : best));
          reason = `Best Fit takes the tightest hole - ${chosen.block.size} units at ${chosen.block.start}, leaving only ${chosen.block.size - request.size}`;
          break;
        case 'Worst Fit':
          chosen = candidates.reduce((best, c) => (c.block.size > best.block.size ? c : best));
          reason = `Worst Fit takes the largest hole - ${chosen.block.size} units at ${chosen.block.start}, leaving ${chosen.block.size - request.size} behind`;
          break;
        case 'Next Fit': {
          chosen =
            candidates.find(c => c.position >= cursor) ?? candidates[0];
          reason = `Next Fit resumes searching from block ${cursor} and takes the hole at ${chosen.block.start}`;
          break;
        }
      }
    }

    if (!chosen) {
      failed += 1;
      const external = externalFragmentation(blocks, request.size);
      steps.push({
        index,
        request,
        blocks: blocks.map(b => ({ ...b })),
        success: false,
        blockId: null,
        externalFragmentation: external,
        internalFragmentation: internalTotal(blocks),
        largestFreeHole: largestHole(blocks),
        narration: external
          ? `${request.processId} needs ${request.size} units. ${external} units are free, but the largest single hole is only ${largestHole(blocks)} - this is external fragmentation.`
          : `${request.processId} needs ${request.size} units, but only ${largestHole(blocks)} are free. The request fails.`
      });
      return;
    }

    const { block, position } = chosen;
    const remainder = block.size - request.size;

    const replacement: Block[] = [
      {
        id: block.id,
        start: block.start,
        size: request.size,
        processId: request.processId,
        requestedSize: request.size
      }
    ];
    if (remainder > 0) {
      replacement.push({
        id: -1,
        start: block.start + request.size,
        size: remainder,
        processId: null
      });
    }

    blocks = [...blocks.slice(0, position), ...replacement, ...blocks.slice(position + 1)].map(
      (b, i) => ({ ...b, id: i })
    );
    cursor = position + replacement.length - 1;
    allocated += 1;

    steps.push({
      index,
      request,
      blocks: blocks.map(b => ({ ...b })),
      success: true,
      blockId: position,
      externalFragmentation: 0,
      internalFragmentation: internalTotal(blocks),
      largestFreeHole: largestHole(blocks),
      narration: `${request.processId} asks for ${request.size} units. ${reason}. ${remainder > 0 ? `A ${remainder}-unit hole is left over.` : 'The hole is consumed exactly.'}`
    });
  });

  return { strategy, steps, allocated, failed };
};

const largestHole = (blocks: Block[]) =>
  freeHoles(blocks).reduce((m, h) => Math.max(m, h.size), 0);

const internalTotal = (blocks: Block[]) =>
  blocks.reduce(
    (sum, b) => sum + (b.processId && b.requestedSize ? b.size - b.requestedSize : 0),
    0
  );

/** Slide every allocated block to the front, gathering all free space at the end. */
export const compact = (blocks: Block[], totalSize: number): Block[] => {
  const used = blocks.filter(b => b.processId !== null);
  const result: Block[] = [];
  let start = 0;

  used.forEach((block, i) => {
    result.push({ ...block, id: i, start });
    start += block.size;
  });

  if (start < totalSize) {
    result.push({ id: result.length, start, size: totalSize - start, processId: null });
  }
  return result;
};

export const compareFits = (
  totalSize: number,
  requests: MemoryRequest[],
  initialBlocks?: Block[]
): MemoryResult[] =>
  (['First Fit', 'Best Fit', 'Worst Fit', 'Next Fit'] as const).map(strategy =>
    simulateMemory(totalSize, requests, strategy, initialBlocks)
  );
