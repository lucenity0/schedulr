# Schedulr — The OS Concepts Simulator

Interactive, step-by-step simulations of core operating system concepts. Everything runs
client-side, plays back one decision at a time, and explains each decision as it makes it.

**Live:** https://srikrishna-ps.github.io/schedulr/

## Modules

**Processes**

| Module | Covers |
| --- | --- |
| CPU Scheduling | FCFS, SJF, SRTF, LJF, HRRN, Priority (preemptive & not), Round Robin, MLQ, MLFQ |
| System Calls | `fork()`, `exec()`, `wait()`, `exit()` as an execution-flow graph |
| Real-Time Scheduling | Rate Monotonic, EDF, utilization bound, deadline misses |

**Concurrency**

| Module | Covers |
| --- | --- |
| Synchronization | Semaphores, Producer-Consumer, Readers-Writers, Dining Philosophers |
| Deadlock | Banker's algorithm, safe sequences, detection, resource-allocation graph |

**Memory**

| Module | Covers |
| --- | --- |
| Page Replacement | FIFO, LRU, LFU, Clock, Optimal, Belady's anomaly |
| Memory Allocation | First / Best / Worst / Next Fit, fragmentation, compaction |

**Storage**

| Module | Covers |
| --- | --- |
| Disk Scheduling | FCFS, SSTF, SCAN, LOOK, C-SCAN, C-LOOK |

## What makes it a teaching tool

- **Real playback.** Every algorithm is simulated up front and played back, so you can pause,
  step forward, rewind and scrub. Stepping backwards shows the state that actually produced the
  result rather than re-running from scratch.
- **Narration beside pseudocode.** Each step is explained in plain English next to the
  algorithm's pseudocode, with the executing line highlighted, plus what the algorithm is good
  and bad at.
- **The failures are reachable.** Dining Philosophers genuinely deadlocks when philosophers take
  one fork at a time, and four prevention strategies genuinely prevent it. Producer-Consumer has
  a toggle that swaps the two `wait()` calls to reproduce the classic mutex-ordering deadlock.
  Rate Monotonic really does miss deadlines at 97% utilization where EDF does not.
- **Checked against textbook answers.** The algorithms are pure functions covered by 102 tests
  pinned to worked examples: the Silberschatz disk and Banker's exercises, the standard page
  reference strings, and the Liu & Layland bound.

## Tech stack

React (TypeScript) · Vite · Tailwind CSS · shadcn-ui · framer-motion · vitest

## Getting started

Requires Node.js 18+.

```bash
git clone https://github.com/srikrishna-ps/schedulr.git
cd schedulr
npm install
npm run dev
```

The app runs at `http://localhost:8080/schedulr/`.

| Command | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite |
| `npm run lint` | Lint |
| `npm run build` | Production build into `dist/` |

## Project layout

```
src/
  lib/algorithms/   pure, tested algorithm implementations (one file per domain)
  lib/explanations  the plain-English text and pseudocode shown in each module
  lib/modules.ts    module registry shared by the router, nav and home page
  hooks/            useSimulationPlayer - shared play/pause/step/scrub playback
  components/       shared UI, including SimulationControls and ConceptPanel
  pages/            one page per module
```

Algorithms never touch React. Each exports a pure function returning the full sequence of steps,
which is what makes them testable and what the playback engine renders.

## Contributing

Contributions are welcome. If you change an algorithm, please add or update a test in
`src/lib/algorithms/*.test.ts` with the worked example you checked it against — the point of this
project is that the output can be trusted.

## License

Provided for educational purposes.

---

*Developed by SriKrishna Pejathaya P S and Nafees S*
