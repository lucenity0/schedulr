/**
 * Address translation - how a logical address becomes a physical one.
 *
 * This is the "Paging" of the syllabus, which is a different topic from page
 * *replacement*: replacement decides what to evict, translation decides where
 * an address actually lands. Both a paged and a segmented MMU are modelled,
 * plus the TLB that makes paging affordable.
 */

export type MemoryScheme = 'paging' | 'segmentation';

/* ------------------------------------------------------------------ */
/* Paging                                                              */
/* ------------------------------------------------------------------ */

export interface PageTableEntry {
  /** frame this page maps to, or null when not resident */
  frame: number | null;
  valid: boolean;
  /** set once the page has been written to */
  dirty: boolean;
  referenced: boolean;
}

export interface TlbEntry {
  page: number;
  frame: number;
  /** for LRU replacement inside the TLB */
  lastUsed: number;
}

export interface PagingConfig {
  /** logical address space, in bytes */
  logicalSize: number;
  /** physical memory, in bytes */
  physicalSize: number;
  pageSize: number;
  pageTable: PageTableEntry[];
  tlbSize: number;
}

export interface TranslationStep {
  label: string;
  detail: string;
  /** highlighted value at this step */
  value?: string;
}

export interface TranslationResult {
  logicalAddress: number;
  /** null when the access faults */
  physicalAddress: number | null;
  pageNumber: number;
  offset: number;
  frame: number | null;
  tlbHit: boolean;
  pageFault: boolean;
  /** address outside the logical address space */
  invalid: boolean;
  steps: TranslationStep[];
  narration: string;
}

export const bitsFor = (size: number) => Math.ceil(Math.log2(Math.max(size, 1)));

export const toBinary = (value: number, bits: number) =>
  value.toString(2).padStart(bits, '0');

/**
 * Translate one logical address. The TLB is consulted first; only on a miss
 * does the MMU walk the page table, which is the entire reason a TLB exists.
 */
export const translatePaged = (
  address: number,
  config: PagingConfig,
  tlb: TlbEntry[]
): TranslationResult => {
  const { pageSize, logicalSize, pageTable } = config;
  const offsetBits = bitsFor(pageSize);
  const pageNumber = Math.floor(address / pageSize);
  const offset = address % pageSize;

  const steps: TranslationStep[] = [];

  if (address < 0 || address >= logicalSize) {
    return {
      logicalAddress: address,
      physicalAddress: null,
      pageNumber,
      offset,
      frame: null,
      tlbHit: false,
      pageFault: false,
      invalid: true,
      steps: [
        {
          label: 'Bounds check',
          detail: `Address ${address} is outside the ${logicalSize}-byte logical address space.`
        }
      ],
      narration: `Address ${address} is not a valid logical address - the process would be trapped.`
    };
  }

  steps.push({
    label: 'Split the address',
    detail: `The low ${offsetBits} bits are the offset within a page; everything above is the page number.`,
    value: `${address} = page ${pageNumber} × ${pageSize} + offset ${offset}`
  });

  const hit = tlb.find(entry => entry.page === pageNumber);

  if (hit) {
    steps.push({
      label: 'TLB hit',
      detail: `Page ${pageNumber} is cached in the TLB, so the page table is not consulted at all.`,
      value: `page ${pageNumber} → frame ${hit.frame}`
    });
    const physical = hit.frame * pageSize + offset;
    steps.push({
      label: 'Build the physical address',
      detail: 'Frame number replaces the page number; the offset is copied through unchanged.',
      value: `${hit.frame} × ${pageSize} + ${offset} = ${physical}`
    });

    return {
      logicalAddress: address,
      physicalAddress: physical,
      pageNumber,
      offset,
      frame: hit.frame,
      tlbHit: true,
      pageFault: false,
      invalid: false,
      steps,
      narration: `TLB hit on page ${pageNumber}. One memory access instead of two: physical address ${physical}.`
    };
  }

  steps.push({
    label: 'TLB miss',
    detail: `Page ${pageNumber} is not in the TLB, so the MMU has to read the page table in memory - this access now costs two memory references.`
  });

  const entry = pageTable[pageNumber];

  if (!entry || !entry.valid || entry.frame === null) {
    steps.push({
      label: 'Page fault',
      detail: `The valid bit for page ${pageNumber} is 0, so the page is not in physical memory. The OS must fetch it from disk.`
    });
    return {
      logicalAddress: address,
      physicalAddress: null,
      pageNumber,
      offset,
      frame: null,
      tlbHit: false,
      pageFault: true,
      invalid: false,
      steps,
      narration: `Page fault on page ${pageNumber}: it is not resident, so the OS traps, loads it from disk, and restarts the instruction.`
    };
  }

  steps.push({
    label: 'Page table lookup',
    detail: `Entry ${pageNumber} is valid and maps to frame ${entry.frame}.`,
    value: `page ${pageNumber} → frame ${entry.frame}`
  });

  const physical = entry.frame * pageSize + offset;

  steps.push({
    label: 'Build the physical address',
    detail: 'Frame number replaces the page number; the offset is copied through unchanged.',
    value: `${entry.frame} × ${pageSize} + ${offset} = ${physical}`
  });

  return {
    logicalAddress: address,
    physicalAddress: physical,
    pageNumber,
    offset,
    frame: entry.frame,
    tlbHit: false,
    pageFault: false,
    invalid: false,
    steps,
    narration: `TLB miss, then a page table walk: page ${pageNumber} lives in frame ${entry.frame}, so the physical address is ${physical}.`
  };
};

/** Insert a page→frame mapping into the TLB, evicting the least recently used. */
export const updateTlb = (
  tlb: TlbEntry[],
  page: number,
  frame: number,
  size: number,
  clock: number
): TlbEntry[] => {
  const existing = tlb.findIndex(entry => entry.page === page);
  if (existing !== -1) {
    return tlb.map((entry, i) => (i === existing ? { ...entry, lastUsed: clock } : entry));
  }

  const next = [...tlb, { page, frame, lastUsed: clock }];
  if (next.length <= size) return next;

  // Evict the least recently used entry.
  const victim = next.reduce((oldest, entry, i, all) =>
    entry.lastUsed < all[oldest].lastUsed ? i : oldest, 0);
  return next.filter((_, i) => i !== victim);
};

/**
 * Effective access time with a TLB.
 * EAT = hitRatio × (tlbTime + memTime) + (1 − hitRatio) × (tlbTime + 2 × memTime)
 */
export const effectiveAccessTime = (
  hitRatio: number,
  memoryTime: number,
  tlbTime: number
) => hitRatio * (tlbTime + memoryTime) + (1 - hitRatio) * (tlbTime + 2 * memoryTime);

/* ------------------------------------------------------------------ */
/* Segmentation                                                        */
/* ------------------------------------------------------------------ */

export interface Segment {
  name: string;
  base: number;
  limit: number;
}

export interface SegmentResult {
  segment: number;
  offset: number;
  physicalAddress: number | null;
  trapped: boolean;
  steps: TranslationStep[];
  narration: string;
}

/**
 * Segmentation splits an address into <segment, offset>. Unlike paging the
 * offset is bounds-checked against that segment's limit, which is what makes
 * segmentation able to catch an array overrun that paging would not.
 */
export const translateSegmented = (
  segmentNumber: number,
  offset: number,
  table: Segment[]
): SegmentResult => {
  const steps: TranslationStep[] = [];
  const segment = table[segmentNumber];

  if (!segment) {
    return {
      segment: segmentNumber,
      offset,
      physicalAddress: null,
      trapped: true,
      steps: [
        {
          label: 'Invalid segment',
          detail: `There is no segment ${segmentNumber} in the segment table.`
        }
      ],
      narration: `Segment ${segmentNumber} does not exist - the reference traps to the operating system.`
    };
  }

  steps.push({
    label: 'Look up the segment',
    detail: `Segment ${segmentNumber} (${segment.name}) has base ${segment.base} and limit ${segment.limit}.`,
    value: `base ${segment.base}, limit ${segment.limit}`
  });

  if (offset < 0 || offset >= segment.limit) {
    steps.push({
      label: 'Limit check fails',
      detail: `Offset ${offset} is not less than the limit ${segment.limit}, so the address is outside this segment.`
    });
    return {
      segment: segmentNumber,
      offset,
      physicalAddress: null,
      trapped: true,
      steps,
      narration: `Offset ${offset} exceeds segment ${segmentNumber}'s limit of ${segment.limit} - addressing error, trap to the OS. This is the protection paging cannot give you.`
    };
  }

  steps.push({
    label: 'Limit check passes',
    detail: `Offset ${offset} < limit ${segment.limit}, so the reference is inside the segment.`
  });

  const physical = segment.base + offset;

  steps.push({
    label: 'Add the base',
    detail: 'The physical address is the segment base plus the offset.',
    value: `${segment.base} + ${offset} = ${physical}`
  });

  return {
    segment: segmentNumber,
    offset,
    physicalAddress: physical,
    trapped: false,
    steps,
    narration: `Segment ${segmentNumber} (${segment.name}) + offset ${offset} → physical address ${physical}.`
  };
};

/** Bytes of page table needed, to show why multi-level tables exist. */
export const pageTableSize = (logicalSize: number, pageSize: number, entryBytes = 4) => {
  const entries = Math.ceil(logicalSize / pageSize);
  return { entries, bytes: entries * entryBytes };
};
