import { useState, useEffect } from 'react';
import { ProcessForm } from './ProcessForm';
import { AlgorithmSelector } from './AlgorithmSelector';
import { GanttChart } from './GanttChart';
import { MetricsPanel } from './MetricsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Process, SchedulingAlgorithm, SchedulingResult } from '@/types/scheduler';
import { scheduleFCFS, scheduleSJF, schedulePriority, scheduleRoundRobin, scheduleSRTF, schedulePriorityPreemptive } from '@/utils/schedulingAlgorithms';
import { Play, RotateCcw, Cpu } from 'lucide-react';
import { toast } from '@/hooks/use-toast';



export const CPUScheduler = () => {
  const [reversePriority, setReversePriority] = useState(false);
  const [processes, setProcesses] = useState<Process[]>([
    { id: 'P1', arrivalTime: 0, burstTime: 4, priority: 2 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: 'P3', arrivalTime: 2, burstTime: 1, priority: 3 },
  ]);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>('FCFS');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [result, setResult] = useState<SchedulingResult>({
    executionOrder: [],
    processMetrics: [],
    averageWaitingTime: 0,
    averageTurnaroundTime: 0
  });
  const [isCalculating, setIsCalculating] = useState(false);

  const needsPriority = algorithm === 'Priority' || algorithm === 'PriorityP';

  const runScheduler = async () => {
    if (processes.length === 0) {
      toast({
        title: "No Processes",
        description: "Please add at least one process to schedule.",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);

    // Add a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      let schedulingResult: SchedulingResult;

      switch (algorithm) {
        case 'FCFS':
          schedulingResult = scheduleFCFS(processes);
          break;
        case 'SJF':
          schedulingResult = scheduleSJF(processes);
          break;
        case 'SRTF':
          schedulingResult = scheduleSRTF(processes);
          break;
        case 'Priority':
          if (processes.some(p => p.priority === undefined)) {
            toast({
              title: "Missing Priority",
              description: "Please set priority for all processes when using Priority Scheduling.",
              variant: "destructive"
            });
            setIsCalculating(false);
            return;
          }
          schedulingResult = schedulePriority(processes, reversePriority);
          break;
        case 'PriorityP':
          if (processes.some(p => p.priority === undefined)) {
            toast({
              title: "Missing Priority",
              description: "Please set priority for all processes when using Preemptive Priority Scheduling.",
              variant: "destructive"
            });
            setIsCalculating(false);
            return;
          }
          schedulingResult = schedulePriorityPreemptive(processes, reversePriority);
          break;
        case 'RoundRobin':
          schedulingResult = scheduleRoundRobin(processes, timeQuantum);
          break;
        default:
          throw new Error('Unknown algorithm');
      }

      setResult(schedulingResult);
      toast({
        title: "Scheduling Complete",
        description: `Successfully scheduled ${processes.length} processes using ${algorithm}.`
      });
    } catch (error) {
      toast({
        title: "Scheduling Error",
        description: "An error occurred while scheduling processes.",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const resetScheduler = () => {
    setProcesses([
      { id: 'P1', arrivalTime: 0, burstTime: 4, priority: 2 },
      { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 1, priority: 3 },
    ]);
    setAlgorithm('FCFS');
    setTimeQuantum(2);
    setResult({
      executionOrder: [],
      processMetrics: [],
      averageWaitingTime: 0,
      averageTurnaroundTime: 0
    });
    toast({
      title: "Reset Complete",
      description: "Scheduler has been reset to default values."
    });
  };

  useEffect(() => {
    setResult({
      executionOrder: [],
      processMetrics: [],
      averageWaitingTime: 0,
      averageTurnaroundTime: 0,
    });
  }, [algorithm, timeQuantum, reversePriority]);
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Cpu className="w-8 h-8 text-primary" />
              </div>
              CPU Scheduling Simulator
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Visualize and analyze different CPU scheduling algorithms with interactive Gantt charts and performance metrics.
            </p>
          </CardHeader>
        </Card>

        {/* Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <ProcessForm
              processes={processes}
              onProcessesChange={setProcesses}
              needsPriority={needsPriority}
            />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-6">
            <AlgorithmSelector
              algorithm={algorithm}
              onAlgorithmChange={setAlgorithm}
              timeQuantum={timeQuantum}
              onTimeQuantumChange={setTimeQuantum}
              onRunScheduler={runScheduler}
              onResetScheduler={resetScheduler}
              isCalculating={isCalculating}
              reversePriority={reversePriority}
              onReversePriorityChange={setReversePriority}
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <GanttChart executionOrder={result.executionOrder} />
          <MetricsPanel
            processMetrics={result.processMetrics}
            averageWaitingTime={result.averageWaitingTime}
            averageTurnaroundTime={result.averageTurnaroundTime}
          />
        </div>
      </div>
    </div>
  );
};