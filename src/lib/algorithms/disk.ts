/**
 * Disk scheduling. The distinction that usually gets blurred:
 *
 *   SCAN   - runs to the physical end of the disk before reversing
 *   LOOK   - reverses at the last *request*, never touching the end
 *   C-SCAN - runs to the end, jumps back to track 0, sweeps one way only
 *   C-LOOK - runs to the last request, jumps to the first request, one way only
 *
 * The jump a circular algorithm makes is reported separately, because
 * textbooks disagree on whether it counts toward total head movement.
 */

export type DiskAlgorithm = 'FCFS' | 'SSTF' | 'SCAN' | 'C-SCAN' | 'LOOK' | 'C-LOOK';
export type Direction = 'left' | 'right';

export interface DiskMove {
  from: number;
  to: number;
  distance: number;
  totalSoFar: number;
  /** false for a boundary touch or a circular jump - no request lives there */
  serviced: boolean;
  /** true for the wrap of a circular algorithm */
  wrap: boolean;
  narration: string;
}

export interface DiskResult {
  algorithm: DiskAlgorithm;
  sequence: number[];
  moves: DiskMove[];
  totalSeek: number;
  /** portion of totalSeek spent on the circular jump, if any */
  wrapSeek: number;
  averageSeek: number;
}

export const parseRequests = (input: string, diskSize: number): number[] =>
  input
    .split(/[,\s]+/)
    .map(token => parseInt(token.trim(), 10))
    .filter(n => Number.isFinite(n) && n >= 0 && n < diskSize);

interface Options {
  head: number;
  requests: number[];
  diskSize: number;
  direction: Direction;
}

/** Turn an ordered list of stops into moves with running totals and narration. */
const toMoves = (
  head: number,
  stops: { track: number; serviced: boolean; wrap?: boolean; why?: string }[]
): { moves: DiskMove[]; totalSeek: number; wrapSeek: number } => {
  const moves: DiskMove[] = [];
  let current = head;
  let total = 0;
  let wrapSeek = 0;

  for (const stop of stops) {
    const distance = Math.abs(stop.track - current);
    total += distance;
    if (stop.wrap) wrapSeek += distance;

    moves.push({
      from: current,
      to: stop.track,
      distance,
      totalSoFar: total,
      serviced: stop.serviced,
      wrap: Boolean(stop.wrap),
      narration:
        stop.why ??
        `Head moves ${current} → ${stop.track} (${distance} track${distance === 1 ? '' : 's'}), servicing request ${stop.track}. Total so far: ${total}.`
    });
    current = stop.track;
  }

  return { moves, totalSeek: total, wrapSeek };
};

export const simulateDisk = (
  algorithm: DiskAlgorithm,
  { head, requests, diskSize, direction }: Options
): DiskResult => {
  const max = diskSize - 1;
  const sorted = [...requests].sort((a, b) => a - b);
  // A request exactly at the head counts as ahead of it, so it is serviced now.
  const ahead = sorted.filter(r => r >= head);
  const behind = sorted.filter(r => r < head);

  const stops: { track: number; serviced: boolean; wrap?: boolean; why?: string }[] = [];

  const boundary = (track: number, why: string) =>
    stops.push({ track, serviced: false, why });

  /**
   * A circular jump. C-SCAN lands on a bare disk edge, but C-LOOK lands
   * directly on the next pending request - so that arrival is a real service.
   */
  const jump = (track: number, why: string, serviced = false) =>
    stops.push({ track, serviced, wrap: true, why });

  const service = (tracks: number[]) =>
    tracks.forEach(track => stops.push({ track, serviced: true }));

  switch (algorithm) {
    case 'FCFS':
      service(requests);
      break;

    case 'SSTF': {
      const remaining = [...requests];
      let current = head;
      while (remaining.length) {
        let bestIndex = 0;
        remaining.forEach((track, i) => {
          const d = Math.abs(track - current);
          const best = Math.abs(remaining[bestIndex] - current);
          // Tie -> prefer the lower track, so the result is reproducible.
          if (d < best || (d === best && track < remaining[bestIndex])) bestIndex = i;
        });
        const [next] = remaining.splice(bestIndex, 1);
        stops.push({ track: next, serviced: true });
        current = next;
      }
      break;
    }

    case 'SCAN':
      if (direction === 'right') {
        service(ahead);
        if (behind.length) {
          boundary(max, `Head continues to the end of the disk (track ${max}) before reversing - SCAN always reaches the edge.`);
          service([...behind].reverse());
        }
      } else {
        service([...behind].reverse());
        if (ahead.length) {
          boundary(0, 'Head continues to track 0 before reversing - SCAN always reaches the edge.');
          service(ahead);
        }
      }
      break;

    case 'LOOK':
      // Same order as SCAN, but it never travels past the last request.
      if (direction === 'right') {
        service(ahead);
        service([...behind].reverse());
      } else {
        service([...behind].reverse());
        service(ahead);
      }
      break;

    case 'C-SCAN':
      if (direction === 'right') {
        service(ahead);
        if (behind.length) {
          boundary(max, `Head runs to the end of the disk (track ${max}).`);
          jump(0, 'Head jumps back to track 0 without servicing anything - C-SCAN only ever sweeps in one direction.');
          service(behind);
        }
      } else {
        service([...behind].reverse());
        if (ahead.length) {
          boundary(0, 'Head runs down to track 0.');
          jump(max, `Head jumps back to track ${max} without servicing anything - C-SCAN only ever sweeps in one direction.`);
          service([...ahead].reverse());
        }
      }
      break;

    case 'C-LOOK':
      if (direction === 'right') {
        service(ahead);
        if (behind.length) {
          jump(behind[0], `Head jumps straight to the lowest pending request (track ${behind[0]}) - C-LOOK skips the empty edge that C-SCAN would visit.`, true);
          service(behind.slice(1));
        }
      } else {
        service([...behind].reverse());
        if (ahead.length) {
          const start = ahead[ahead.length - 1];
          jump(start, `Head jumps straight to the highest pending request (track ${start}) - C-LOOK skips the empty edge that C-SCAN would visit.`, true);
          service([...ahead].reverse().slice(1));
        }
      }
      break;
  }

  const { moves, totalSeek, wrapSeek } = toMoves(head, stops);

  return {
    algorithm,
    sequence: [head, ...stops.map(s => s.track)],
    moves,
    totalSeek,
    wrapSeek,
    averageSeek: requests.length ? totalSeek / requests.length : 0
  };
};

/** Every algorithm on the same input, for the comparison view. */
export const compareDisk = (options: Options): DiskResult[] =>
  (['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'] as const).map(algorithm =>
    simulateDisk(algorithm, options)
  );
