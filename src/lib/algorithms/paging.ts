/**
 * Page replacement. Each algorithm evicts on a *different* piece of bookkeeping,
 * and mixing them up is the classic way a simulator ends up teaching the wrong
 * thing - FIFO evicting by last use is just LRU wearing a FIFO label.
 *
 *   FIFO    - oldest loadedAt   (set once, when the page is brought in)
 *   LRU     - oldest lastUsed   (refreshed on every hit)
 *   LFU     - lowest frequency  (ties broken by LRU)
 *   Clock   - first frame whose reference bit is already clear
 *   Optimal - the page whose *next* use is farthest ahead of the current index
 */

export type PagingAlgorithm = 'FIFO' | 'LRU' | 'LFU' | 'Clock' | 'Optimal';

export interface Frame {
  page: number | null;
  loadedAt: number;
  lastUsed: number;
  frequency: number;
  referenceBit: boolean;
}

export interface PagingStep {
  /** position in the reference string */
  index: number;
  page: number;
  frames: Frame[];
  hit: boolean;
  /** frame the requested page occupies after this step */
  frameIndex: number;
  evicted: number | null;
  faultsSoFar: number;
  /** clock hand position after this step, for the Clock algorithm */
  hand?: number;
  narration: string;
}

export interface PagingResult {
  algorithm: PagingAlgorithm;
  steps: PagingStep[];
  faults: number;
  hits: number;
  faultRate: number;
}

const emptyFrame = (): Frame => ({
  page: null,
  loadedAt: -1,
  lastUsed: -1,
  frequency: 0,
  referenceBit: false
});

const clone = (frames: Frame[]) => frames.map(f => ({ ...f }));

/** Index of the next use of `page` strictly after `from`, or Infinity. */
const nextUse = (pages: number[], page: number, from: number) => {
  for (let i = from + 1; i < pages.length; i++) {
    if (pages[i] === page) return i;
  }
  return Infinity;
};

const ordinal = (n: number) => `frame ${n}`;

export const simulatePaging = (
  pages: number[],
  frameCount: number,
  algorithm: PagingAlgorithm
): PagingResult => {
  const frames: Frame[] = Array.from({ length: Math.max(1, frameCount) }, emptyFrame);
  const steps: PagingStep[] = [];
  let faults = 0;
  let hand = 0;

  pages.forEach((page, index) => {
    const time = index;
    const existing = frames.findIndex(f => f.page === page);

    if (existing !== -1) {
      const frame = frames[existing];
      frame.lastUsed = time;
      frame.frequency += 1;
      frame.referenceBit = true;

      steps.push({
        index,
        page,
        frames: clone(frames),
        hit: true,
        frameIndex: existing,
        evicted: null,
        faultsSoFar: faults,
        hand,
        narration: `Page ${page} is already in ${ordinal(existing)} - a hit, so nothing is loaded or evicted.`
      });
      return;
    }

    faults += 1;

    const emptyIndex = frames.findIndex(f => f.page === null);
    let victimIndex: number;
    let reason: string;

    if (emptyIndex !== -1) {
      victimIndex = emptyIndex;
      reason = `${ordinal(emptyIndex)} is still empty, so no page has to be evicted`;
    } else {
      switch (algorithm) {
        case 'FIFO': {
          victimIndex = frames.reduce(
            (best, f, i) => (f.loadedAt < frames[best].loadedAt ? i : best),
            0
          );
          reason = `FIFO evicts page ${frames[victimIndex].page}, the page that has been resident longest (loaded at step ${frames[victimIndex].loadedAt})`;
          break;
        }
        case 'LRU': {
          victimIndex = frames.reduce(
            (best, f, i) => (f.lastUsed < frames[best].lastUsed ? i : best),
            0
          );
          reason = `LRU evicts page ${frames[victimIndex].page}, unused since step ${frames[victimIndex].lastUsed}`;
          break;
        }
        case 'LFU': {
          victimIndex = frames.reduce((best, f, i) => {
            const b = frames[best];
            if (f.frequency !== b.frequency) return f.frequency < b.frequency ? i : best;
            // Documented tie-break: least recently used among the least frequent.
            return f.lastUsed < b.lastUsed ? i : best;
          }, 0);
          reason = `LFU evicts page ${frames[victimIndex].page}, referenced only ${frames[victimIndex].frequency} time(s)`;
          break;
        }
        case 'Clock': {
          // Sweep, clearing reference bits, until a frame is found with bit 0.
          let scanned = 0;
          while (frames[hand].referenceBit && scanned < frames.length * 2) {
            frames[hand].referenceBit = false;
            hand = (hand + 1) % frames.length;
            scanned++;
          }
          victimIndex = hand;
          reason = `Clock sweeps past recently used pages, clearing their reference bits, and evicts page ${frames[victimIndex].page} - the first it finds with the bit already clear`;
          hand = (hand + 1) % frames.length;
          break;
        }
        case 'Optimal': {
          victimIndex = frames.reduce((best, f, i) => {
            const a = nextUse(pages, f.page as number, index);
            const b = nextUse(pages, frames[best].page as number, index);
            return a > b ? i : best;
          }, 0);
          const when = nextUse(pages, frames[victimIndex].page as number, index);
          reason =
            when === Infinity
              ? `Optimal evicts page ${frames[victimIndex].page}, which is never referenced again`
              : `Optimal looks ahead and evicts page ${frames[victimIndex].page}, not needed again until step ${when}`;
          break;
        }
      }
    }

    const evicted = frames[victimIndex].page;
    frames[victimIndex] = {
      page,
      loadedAt: time,
      lastUsed: time,
      frequency: 1,
      referenceBit: true
    };

    steps.push({
      index,
      page,
      frames: clone(frames),
      hit: false,
      frameIndex: victimIndex,
      evicted,
      faultsSoFar: faults,
      hand,
      narration: `Page ${page} is not resident - page fault. ${reason}. Page ${page} is loaded into ${ordinal(victimIndex)}.`
    });
  });

  const hits = steps.length - faults;
  return {
    algorithm,
    steps,
    faults,
    hits,
    faultRate: steps.length ? (faults / steps.length) * 100 : 0
  };
};

export const parseReferenceString = (input: string): number[] =>
  input
    .split(/[,\s]+/)
    .map(token => parseInt(token.trim(), 10))
    .filter(n => Number.isFinite(n) && n >= 0);

/**
 * Belady's anomaly: for some reference strings FIFO faults *more* with more
 * frames. Used by the UI to point it out when it happens.
 */
export const detectBeladyAnomaly = (pages: number[], algorithm: PagingAlgorithm, maxFrames = 7) => {
  const counts: number[] = [];
  for (let f = 1; f <= maxFrames; f++) {
    counts.push(simulatePaging(pages, f, algorithm).faults);
  }
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[i - 1]) {
      return { anomaly: true, frames: [i, i + 1] as const, faults: [counts[i - 1], counts[i]] as const };
    }
  }
  return { anomaly: false } as const;
};
