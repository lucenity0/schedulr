import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ProcessForm } from './ProcessForm';
import { AlgorithmSelector, NEEDS_PRIORITY } from './AlgorithmSelector';
import { GanttChart } from './GanttChart';
import { MetricsPanel } from './MetricsPanel';
import { SimulationControls } from './SimulationControls';
import { ConceptPanel } from './ConceptPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Process, SchedulingAlgorithm } from '@/types/scheduler';
import {
  CpuResult,
  scheduleFCFS,
  scheduleHRRN,
  scheduleLJF,
  scheduleMLFQ,
  scheduleMLQ,
  schedulePriority,
  schedulePriorityPreemptive,
  scheduleRoundRobin,
  scheduleSJF,
  scheduleSRTF
} from '@/lib/algorithms/cpu';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { cpuExplanations } from '@/lib/explanations';
import { Cpu } from 'lucide-react';

const DEFAULT_PROCESSES: Process[] = [
  { id: 'P1', arrivalTime: 0, burstTime: 7, priority: 3 },
  { id: 'P2', arrivalTime: 2, burstTime: 4, priority: 1 },
  { id: 'P3', arrivalTime: 4, burstTime: 1, priority: 4 },
  { id: 'P4', arrivalTime: 5, burstTime: 4, priority: 2 }
];

const runAlgorithm = (
  algorithm: SchedulingAlgorithm,
  processes: Process[],
  quantum: number,
  reversePriority: boolean
): CpuResult => {
  switch (algorithm) {
    case 'FCFS': return scheduleFCFS(processes);
    case 'SJF': return scheduleSJF(processes);
    case 'LJF': return scheduleLJF(processes);
    case 'SRTF': return scheduleSRTF(processes);
    case 'HRRN': return scheduleHRRN(processes);
    case 'Priority': return schedulePriority(processes, reversePriority);
    case 'PriorityP': return schedulePriorityPreemptive(processes, reversePriority);
    case 'RoundRobin': return scheduleRoundRobin(processes, quantum);
    case 'MLQ': return scheduleMLQ(processes, quantum);
    case 'MLFQ': return scheduleMLFQ(processes);
  }
};

/** Which pseudocode line the current event corresponds to. */
const activeLineFor = (algorithm: SchedulingAlgorithm, event?: string) => {
  if (!event) return undefined;
  if (algorithm === 'RoundRobin') return event === 'quantum' ? 5 : event === 'dispatch' ? 2 : 3;
  if (algorithm === 'MLFQ') return event === 'quantum' ? 4 : event === 'preempt' ? 6 : 2;
  if (algorithm === 'SRTF' || algorithm === 'PriorityP') {
    return event === 'preempt' ? 4 : 2;
  }
  return event === 'dispatch' ? 1 : 2;
};

export const CPUScheduler = () => {
  const [processes, setProcesses] = useState<Process[]>(DEFAULT_PROCESSES);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>('FCFS');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [reversePriority, setReversePriority] = useState(false);

  const result = useMemo(
    () =>
      processes.length
        ? runAlgorithm(algorithm, processes, timeQuantum, reversePriority)
        : null,
    [algorithm, processes, timeQuantum, reversePriority]
  );

  const ticks = result?.ticks ?? [];
  const player = useSimulationPlayer(ticks, { baseInterval: 700 });
  const { current, step } = player;

  const reset = () => {
    setProcesses(DEFAULT_PROCESSES);
    setAlgorithm('FCFS');
    setTimeQuantum(2);
    setReversePriority(false);
  };

  // Metrics only mean anything once every process has finished.
  const metrics = player.isComplete || current === 0 ? result : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Cpu className="w-8 h-8 text-primary" />
              </div>
              CPU Scheduling Simulator
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Ten algorithms, one timeline. Step through each decision and see exactly why the
              scheduler picked the process it did.
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ProcessForm
              processes={processes}
              onProcessesChange={setProcesses}
              needsPriority={NEEDS_PRIORITY.includes(algorithm)}
            />
          </div>
          <div className="lg:col-span-5">
            <AlgorithmSelector
              algorithm={algorithm}
              onAlgorithmChange={setAlgorithm}
              timeQuantum={timeQuantum}
              onTimeQuantumChange={setTimeQuantum}
              onResetScheduler={reset}
              reversePriority={reversePriority}
              onReversePriorityChange={setReversePriority}
            />
          </div>
        </div>

        {result && (
          <>
            <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
              <CardContent className="pt-6">
                <SimulationControls
                  player={player}
                  label={`t = ${current} / ${result.totalTime}`}
                />
              </CardContent>
            </Card>

            <GanttChart
              blocks={result.executionOrder}
              totalTime={result.totalTime}
              currentTime={current}
              readyQueue={step?.ready ?? []}
              running={step?.running ?? null}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConceptPanel
                title={algorithm}
                explanation={cpuExplanations[algorithm]}
                narration={step?.note}
                activeLine={activeLineFor(algorithm, step?.event)}
              />

              <motion.div
                animate={{ opacity: metrics ? 1 : 0.55 }}
                className="relative"
              >
                {!metrics && current > 0 && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px]">
                    <span className="text-sm text-muted-foreground text-center px-6">
                      Metrics appear once every process has finished — skip to the result to see
                      them.
                    </span>
                  </div>
                )}
                <MetricsPanel
                  processMetrics={result.processMetrics}
                  averageWaitingTime={result.averageWaitingTime}
                  averageTurnaroundTime={result.averageTurnaroundTime}
                  averageResponseTime={result.averageResponseTime}
                  cpuUtilization={result.cpuUtilization}
                  throughput={result.throughput}
                />
              </motion.div>
            </div>
          </>
        )}

        {!result && (
          <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
            <CardContent className="py-12 text-center text-muted-foreground">
              Add at least one process to run the scheduler.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
