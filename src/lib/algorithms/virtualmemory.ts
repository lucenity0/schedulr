/**
 * Virtual memory: demand paging, copy-on-write, frame allocation, thrashing.
 *
 * The number that matters here is effective access time. A page fault is
 * roughly a hundred thousand times slower than a memory reference, which is
 * why a fault rate that looks negligible - one in a thousand - still slows a
 * program down by a factor of forty.
 */

export interface DemandPagingConfig {
  /** nanoseconds for a normal memory access */
  memoryAccessTime: number;
  /** microseconds to service a page fault */
  pageFaultTime: number;
  faultRate: number;
}

export interface EatResult {
  effectiveAccessTime: number;
  slowdownFactor: number;
  /** fault rate that would keep the slowdown under 10% */
  faultRateForTenPercent: number;
  narration: string;
}

/** EAT = (1 − p) × memory access + p × page fault service time. */
export const demandPagingEat = ({
  memoryAccessTime,
  pageFaultTime,
  faultRate
}: DemandPagingConfig): EatResult => {
  const faultNs = pageFaultTime * 1000;
  const eat = (1 - faultRate) * memoryAccessTime + faultRate * faultNs;
  const slowdown = eat / memoryAccessTime;
  // Solve (1-p)·m + p·f = 1.1·m for p.
  const pFor10 = (0.1 * memoryAccessTime) / (faultNs - memoryAccessTime);

  return {
    effectiveAccessTime: eat,
    slowdownFactor: slowdown,
    faultRateForTenPercent: pFor10,
    narration:
      faultRate === 0
        ? `With no page faults, every access costs the full ${memoryAccessTime} ns and nothing more.`
        : `A fault rate of ${(faultRate * 100).toFixed(3)}% raises the effective access time to ${eat.toFixed(0)} ns - ${slowdown.toFixed(1)}× slower than memory alone. To stay within 10% of raw memory speed the fault rate must be below ${(pFor10 * 100).toExponential(2)}%.`
  };
};

/* ------------------------------------------------------------------ */
/* Copy-on-write                                                       */
/* ------------------------------------------------------------------ */

export interface CowPage {
  id: number;
  /** processes currently mapping this frame */
  sharedBy: string[];
  /** marked read-only so the first write traps */
  copyOnWrite: boolean;
  /** the frame this page was copied from, once it has been duplicated */
  copiedFrom: number | null;
}

export interface CowStep {
  pages: CowPage[];
  framesUsed: number;
  narration: string;
}

/**
 * fork() with copy-on-write: the child shares every frame until one of them
 * writes, and only the written page is duplicated.
 */
export const simulateCopyOnWrite = (
  pageCount: number,
  writes: { process: string; page: number }[]
): CowStep[] => {
  let pages: CowPage[] = Array.from({ length: pageCount }, (_, id) => ({
    id,
    sharedBy: ['Parent'],
    copyOnWrite: false,
    copiedFrom: null
  }));

  const steps: CowStep[] = [];
  const snapshot = (narration: string) =>
    steps.push({
      pages: pages.map(p => ({ ...p, sharedBy: [...p.sharedBy] })),
      framesUsed: pages.length,
      narration
    });

  snapshot(`Parent has ${pageCount} pages in ${pageCount} frames.`);

  // fork(): share everything, mark it all copy-on-write.
  pages = pages.map(p => ({ ...p, sharedBy: [...p.sharedBy, 'Child'], copyOnWrite: true }));
  snapshot(
    `fork(): the child maps the same ${pageCount} frames instead of copying them. Still ${pageCount} frames - a fork costs almost nothing until somebody writes.`
  );

  for (const write of writes) {
    const page = pages.find(p => p.id === write.page);
    if (!page) continue;

    if (!page.copyOnWrite || page.sharedBy.length < 2) {
      snapshot(`${write.process} writes to page ${write.page}, which it already owns outright - no copy needed.`);
      continue;
    }

    const newId = pages.length;
    pages = [
      ...pages.map(p =>
        p.id === write.page
          ? { ...p, sharedBy: p.sharedBy.filter(name => name !== write.process), copyOnWrite: false }
          : p
      ),
      { id: newId, sharedBy: [write.process], copyOnWrite: false, copiedFrom: write.page }
    ];

    snapshot(
      `${write.process} writes to page ${write.page}. The page is read-only, so the write traps: the kernel copies it into a new frame, gives ${write.process} the copy, and lets the write proceed. Frames in use: ${pages.length}.`
    );
  }

  return steps;
};

/* ------------------------------------------------------------------ */
/* Frame allocation                                                    */
/* ------------------------------------------------------------------ */

export type AllocationPolicy = 'equal' | 'proportional';

export interface FrameAllocation {
  process: string;
  size: number;
  frames: number;
  share: number;
}

export const allocateFrames = (
  processes: { name: string; size: number }[],
  totalFrames: number,
  policy: AllocationPolicy
): FrameAllocation[] => {
  const totalSize = processes.reduce((sum, p) => sum + p.size, 0);

  if (policy === 'equal') {
    const each = Math.floor(totalFrames / processes.length);
    return processes.map(p => ({
      process: p.name,
      size: p.size,
      frames: each,
      share: 1 / processes.length
    }));
  }

  // Proportional: frames in the ratio of each process's virtual memory size.
  return processes.map(p => ({
    process: p.name,
    size: p.size,
    frames: Math.max(1, Math.floor((p.size / totalSize) * totalFrames)),
    share: p.size / totalSize
  }));
};

/* ------------------------------------------------------------------ */
/* Thrashing                                                           */
/* ------------------------------------------------------------------ */

export interface ThrashingPoint {
  degree: number;
  cpuUtilization: number;
  framesPerProcess: number;
  faultRate: number;
  thrashing: boolean;
}

/**
 * CPU utilization against the degree of multiprogramming. Adding processes
 * helps until each one drops below its working-set size; past that point the
 * fault rate explodes and utilization collapses even though more processes
 * are "running". That collapse is thrashing.
 */
export const thrashingCurve = (
  totalFrames: number,
  workingSetSize: number,
  maxDegree = 20
): ThrashingPoint[] => {
  const points: ThrashingPoint[] = [];

  for (let degree = 1; degree <= maxDegree; degree++) {
    const framesPerProcess = totalFrames / degree;
    const ratio = framesPerProcess / workingSetSize;

    // Above its working set a process faults rarely; below it, the fault rate
    // climbs steeply as the ratio falls.
    const faultRate = ratio >= 1 ? 0.001 : Math.min(1, 0.001 + Math.pow(1 - ratio, 3) * 1.6);

    // Utilization rises with the degree but is destroyed by faulting.
    const raw = 1 - Math.exp(-degree / 3);
    const utilization = Math.max(0, raw * (1 - Math.min(1, faultRate * 1.8))) * 100;

    points.push({
      degree,
      cpuUtilization: utilization,
      framesPerProcess,
      faultRate,
      thrashing: ratio < 1 && faultRate > 0.1
    });
  }

  return points;
};

/** The degree of multiprogramming that maximises CPU utilization. */
export const optimalDegree = (curve: ThrashingPoint[]) =>
  curve.reduce((best, point) => (point.cpuUtilization > best.cpuUtilization ? point : best), curve[0]);

/**
 * Working set: the pages referenced in the last Δ references. Its size is the
 * frame demand of the process at that instant.
 */
export const workingSet = (references: number[], windowSize: number, at: number) => {
  const start = Math.max(0, at - windowSize + 1);
  const window = references.slice(start, at + 1);
  return { pages: Array.from(new Set(window)).sort((a, b) => a - b), window };
};

export const workingSetSeries = (references: number[], windowSize: number) =>
  references.map((_, index) => {
    const { pages } = workingSet(references, windowSize, index);
    return { index, size: pages.length, pages };
  });
