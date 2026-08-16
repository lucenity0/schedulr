import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberField } from './NumberField';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SchedulingAlgorithm } from '@/types/scheduler';
import { cpuExplanations } from '@/lib/explanations';
import { Cpu, RotateCcw } from 'lucide-react';

interface AlgorithmSelectorProps {
  algorithm: SchedulingAlgorithm;
  onAlgorithmChange: (algorithm: SchedulingAlgorithm) => void;
  timeQuantum: number;
  onTimeQuantumChange: (quantum: number) => void;
  onResetScheduler: () => void;
  reversePriority: boolean;
  onReversePriorityChange: (value: boolean) => void;
}

export const ALGORITHM_GROUPS: {
  label: string;
  items: { value: SchedulingAlgorithm; label: string }[];
}[] = [
    {
      label: 'Non-preemptive',
      items: [
        { value: 'FCFS', label: 'First Come First Serve (FCFS)' },
        { value: 'SJF', label: 'Shortest Job First (SJF)' },
        { value: 'LJF', label: 'Longest Job First (LJF)' },
        { value: 'HRRN', label: 'Highest Response Ratio Next (HRRN)' },
        { value: 'Priority', label: 'Priority Scheduling' }
      ]
    },
    {
      label: 'Preemptive',
      items: [
        { value: 'SRTF', label: 'Shortest Remaining Time First (SRTF)' },
        { value: 'PriorityP', label: 'Priority Scheduling (Preemptive)' },
        { value: 'RoundRobin', label: 'Round Robin' }
      ]
    },
    {
      label: 'Multilevel',
      items: [
        { value: 'MLQ', label: 'Multilevel Queue (MLQ)' },
        { value: 'MLFQ', label: 'Multilevel Feedback Queue (MLFQ)' }
      ]
    }
  ];

export const NEEDS_PRIORITY: SchedulingAlgorithm[] = ['Priority', 'PriorityP', 'MLQ'];

export const AlgorithmSelector = ({
  algorithm,
  onAlgorithmChange,
  timeQuantum,
  onTimeQuantumChange,
  onResetScheduler,
  reversePriority,
  onReversePriorityChange
}: AlgorithmSelectorProps) => (
  <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md h-full">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <Cpu className="w-5 h-5 text-primary" />
        Scheduling algorithm
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="algorithm">Algorithm</Label>
        <Select value={algorithm} onValueChange={value => onAlgorithmChange(value as SchedulingAlgorithm)}>
          <SelectTrigger id="algorithm" className="bg-background/50">
            <SelectValue placeholder="Select algorithm" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {ALGORITHM_GROUPS.map(group => (
              <SelectGroup key={group.label}>
                <SelectLabel className="text-xs text-muted-foreground">{group.label}</SelectLabel>
                {group.items.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(algorithm === 'RoundRobin' || algorithm === 'MLQ') && (
        <div className="space-y-2">
          <Label htmlFor="timeQuantum">
            Time quantum{algorithm === 'MLQ' ? ' (system queue)' : ''}
          </Label>
          <NumberField
            id="timeQuantum"
            min={1}
            max={20}
            value={timeQuantum}
            onChange={onTimeQuantumChange}
            className="bg-background/50"
          />
          <p className="text-xs text-muted-foreground">
            Larger quantum → closer to FCFS. Smaller → more switching overhead.
          </p>
        </div>
      )}

      {algorithm === 'MLFQ' && (
        <p className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border/60">
          Three queues with quanta 2, 4 and 8. A job that uses a whole slice drops a level; a job in
          a higher queue preempts immediately.
        </p>
      )}

      {NEEDS_PRIORITY.includes(algorithm) && (
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-normal">
            {reversePriority ? 'Higher number = higher priority' : 'Lower number = higher priority'}
          </Label>
          <button
            onClick={() => onReversePriorityChange(!reversePriority)}
            className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${reversePriority ? 'bg-primary' : 'bg-muted-foreground/40'
              }`}
            role="switch"
            aria-checked={reversePriority}
            aria-label="Priority direction"
          >
            <span
              className={`absolute w-4 h-4 bg-white rounded-full top-0.5 left-0.5 shadow-md transition-transform ${reversePriority ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
          </button>
        </div>
      )}

      <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border/60">
        {cpuExplanations[algorithm]?.idea}
      </div>

      <Button onClick={onResetScheduler} variant="outline" className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset to defaults
      </Button>
    </CardContent>
  </Card>
);
