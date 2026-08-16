# Schedulr — The OS Concepts Simulator

Interactive, step-by-step simulations of core operating system concepts. Everything runs
client-side, plays back one decision at a time, and explains each decision as it makes it.

**Live:** https://srikrishna-ps.github.io/schedulr/

## Modules

Fifteen modules covering all five units of the OS syllabus (23CS4PCOPS).

**Unit 1 — Introduction, System Structures & Process Concept**

| Module | Covers |
| --- | --- |
| System Calls | `fork()`, `exec()`, `wait()`, `exit()` as an execution-flow graph |
| Processes & IPC | Process states, PCB, context switch, shared memory vs message passing, pipes |

**Unit 2 — Multithreaded Programming & Process Scheduling**

| Module | Covers |
| --- | --- |
| CPU Scheduling | FCFS, SJF, SRTF, LJF, HRRN, Priority (preemptive & not), Round Robin, MLQ, MLFQ |
| Multiprocessor & Threads | Common vs per-CPU queues, load balancing, processor affinity, multithreading models |
| Real-Time Scheduling | Rate Monotonic, EDF, utilization bound, deadline misses |

**Unit 3 — Synchronization & Deadlocks**

| Module | Covers |
| --- | --- |
| Critical Section | Race conditions, Peterson's solution, mutex locks, TestAndSet |
| Synchronization | Semaphores, Producer-Consumer, Readers-Writers, Dining Philosophers |
| Deadlock | Coffman conditions, prevention, Banker's algorithm, detection, recovery |

**Unit 4 — Memory & Virtual Memory Management**

| Module | Covers |
| --- | --- |
| Address Translation | Paging, page tables, TLB, segmentation, effective access time |
| Page Replacement | FIFO, LRU, LFU, Clock, Optimal, Belady's anomaly |
| Virtual Memory | Demand paging, copy-on-write, thrashing, working set, frame allocation |
| Memory Allocation | First / Best / Worst / Next Fit, fragmentation, compaction |

**Unit 5 — File Systems, Mass Storage & Protection**

| Module | Covers |
| --- | --- |
| File Systems | Contiguous / linked / indexed allocation, bit vector, grouping, counting |
| Disk Scheduling | FCFS, SSTF, SCAN, LOOK, C-SCAN, C-LOOK |
| Protection | Access matrix, domains, capability lists, access control lists |

The home page can be browsed by topic or straight down the syllabus unit by unit.

## What makes it a teaching tool

- **Real playback.** Every algorithm is simulated up front and played back, so you can pause,
  step forward, rewind and scrub. Stepping backwards shows the state that actually produced the
  result rather than re-running from scratch.
- **Narration beside pseudocode.** Each step is explained in plain English next to the
  algorithm's pseudocode, with the executing line highlighted, plus what the algorithm is good
  and bad at.
- **The failures are reachable.** Dining Philosophers genuinely deadlocks when philosophers take
  one fork at a time, and four prevention strategies genuinely prevent it. Two threads stepped
  alternately really do lose an increment, and Peterson's solution really does stop it.
  Producer-Consumer has a toggle that swaps the two `wait()` calls to reproduce the classic
  mutex-ordering deadlock. Rate Monotonic really does miss deadlines at 97% utilization where EDF
  does not.
- **Two views of the same run.** Page replacement can be read as animated memory frames or as
  the column-per-reference table the problem is worked out in by hand, so you can check your own
  working against it.
- **Checked against textbook answers.** The algorithms are pure functions covered by 194 tests
  pinned to worked examples: the Silberschatz disk, Banker's, segment-table and page-table
  exercises, the standard page reference strings, and the Liu & Layland bound.

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
