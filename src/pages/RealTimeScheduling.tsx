import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { realTimeExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  PeriodicTask,
  RealTimeAlgorithm,
  simulateRealTime
} from '@/lib/algorithms/realtime';
import { Plus, Timer, Trash2, TriangleAlert } from 'lucide-react';

const DEFAULT_TASKS: PeriodicTask[] = [
  { id: 'T1', computation: 2, period: 5 },
  { id: 'T2', computation: 4, period: 7 }
];

const TASK_COLORS = ['bg-process-1', 'bg-process-2', 'bg-process-3', 'bg-process-4', 'bg-process-5'];

const RealTimeScheduling = () => {
  const [tasks, setTasks] = useState<PeriodicTask[]>(DEFAULT_TASKS);
  const [algorithm, setAlgorithm] = useState<RealTimeAlgorithm>('RM');

  const result = useMemo(() => simulateRealTime(tasks, algorithm), [tasks, algorithm]);
  const other = useMemo(
    () => simulateRealTime(tasks, algorithm === 'RM' ? 'EDF' : 'RM'),
    [tasks, algorithm]
  );

  const player = useSimulationPlayer(result.slices, { baseInterval: 450 });
  const { current, step } = player;

  const colorFor = (taskId: string) =>
    TASK_COLORS[tasks.findIndex(t => t.id === taskId) % TASK_COLORS.length];

  const updateTask = (index: number, field: keyof PeriodicTask, value: number) =>
    setTasks(prev =>
      prev.map((task, i) => (i === index ? { ...task, [field]: Math.max(1, value) } : task))
    );

  const addTask = () =>
    setTasks(prev => [
      ...prev,
      { id: `T${prev.length + 1}`, computation: 1, period: 10 }
    ]);

  const removeTask = (index: number) =>
    setTasks(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const cellWidth = Math.max(18, Math.min(34, 900 / Math.max(result.hyperperiod, 1)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Timer className="w-8 h-8 text-primary" />
            </div>
            Real-Time Scheduling
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Periodic tasks with hard deadlines. Rate Monotonic fixes priorities up front; EDF
            re-decides them constantly — and only one of them is optimal.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task set */}
        <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Task set</CardTitle>
            <CardDescription>Each task releases a new job every period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Task</span>
              <span className="w-14 text-center">C</span>
              <span className="w-14 text-center">T</span>
              <span className="w-8" />
            </div>
            {tasks.map((task, index) => (
              <div key={task.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-3 h-3 rounded shrink-0 ${colorFor(task.id)}`} />
                  <span className="font-mono text-sm truncate">{task.id}</span>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={task.computation}
                  onChange={e => updateTask(index, 'computation', parseInt(e.target.value) || 1)}
                  className="w-14 h-8 text-center font-mono"
                />
                <Input
                  type="number"
                  min={1}
                  value={task.period}
                  onChange={e => updateTask(index, 'period', parseInt(e.target.value) || 1)}
                  className="w-14 h-8 text-center font-mono"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => removeTask(index)}
                  disabled={tasks.length <= 1}
                  aria-label={`Remove ${task.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addTask} className="w-full">
              <Plus className="h-4 w-4 mr-1.5" /> Add task
            </Button>

            <div className="pt-3 border-t border-border/60 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Utilization</span>
                <span className={`font-mono font-bold ${result.utilization > 1 ? 'text-destructive' : ''}`}>
                  {(result.utilization * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RM bound</span>
                <span className="font-mono">{(result.utilizationBound * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hyperperiod</span>
                <span className="font-mono">{result.hyperperiod}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2 border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Schedule over one hyperperiod</CardTitle>
                <CardDescription>
                  ▼ marks a job release, ▲ marks its deadline.
                </CardDescription>
              </div>
              <div className="flex gap-1">
                {(['RM', 'EDF'] as const).map(value => (
                  <Button
                    key={value}
                    size="sm"
                    variant={algorithm === value ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <div style={{ minWidth: result.hyperperiod * cellWidth }}>
                {tasks.map(task => {
                  const releases = result.releases.filter(r => r.taskId === task.id);
                  return (
                    <div key={task.id} className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-3 h-3 rounded ${colorFor(task.id)}`} />
                        <span className="text-xs font-mono">{task.id}</span>
                        <span className="text-[10px] text-muted-foreground">
                          C={task.computation}, T={task.period}
                        </span>
                      </div>

                      {/* Release and deadline markers */}
                      <div className="relative h-3">
                        {releases.map(release => (
                          <span
                            key={`rel-${release.job}`}
                            className="absolute text-[9px] text-primary"
                            style={{ left: release.time * cellWidth }}
                            title={`Job ${release.job} released at t=${release.time}`}
                          >
                            ▼
                          </span>
                        ))}
                        {releases.map(release => (
                          <span
                            key={`dl-${release.job}`}
                            className={`absolute text-[9px] ${result.misses.some(m => m.taskId === task.id && m.job === release.job)
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                              }`}
                            style={{ left: release.deadline * cellWidth - 4 }}
                            title={`Job ${release.job} deadline at t=${release.deadline}`}
                          >
                            ▲
                          </span>
                        ))}
                      </div>

                      {/* Execution row */}
                      <div className="flex">
                        {result.slices.map((slice, time) => {
                          const isRunning = slice.taskId === task.id;
                          const played = time < current;
                          return (
                            <motion.div
                              key={time}
                              animate={{
                                opacity: played ? 1 : 0.25,
                                scaleY: isRunning && played ? 1 : 0.72
                              }}
                              transition={spring}
                              style={{ width: cellWidth }}
                              className={`h-7 border-r border-background/60 ${isRunning ? colorFor(task.id) : 'bg-muted/30'
                                }`}
                              title={slice.narration}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Time axis */}
                <div className="flex mt-1">
                  {result.slices.map((_, time) => (
                    <div
                      key={time}
                      style={{ width: cellWidth }}
                      className="text-[9px] text-muted-foreground text-center font-mono"
                    >
                      {cellWidth >= 22 || time % 2 === 0 ? time : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SimulationControls player={player} label={`t = ${current} / ${result.hyperperiod}`} />
          </CardContent>
        </Card>
      </div>

      {/* Verdict */}
      <Card
        className={`border-2 shadow-md ${result.schedulable ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/60 bg-destructive/10'
          }`}
      >
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-3">
            {!result.schedulable && <TriangleAlert className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
            <div className="space-y-1">
              <div className="font-semibold">
                {algorithm}: {result.schedulable ? 'every deadline met' : `${result.misses.length} deadline${result.misses.length === 1 ? '' : 's'} missed`}
              </div>
              <p className="text-sm text-muted-foreground">{result.verdict}</p>
            </div>
          </div>

          {result.misses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.misses.map((miss, index) => (
                <Badge key={index} variant="destructive" className="font-mono text-[10px]">
                  {miss.taskId} job {miss.job} missed t={miss.deadline} ({miss.remaining} left)
                </Badge>
              ))}
            </div>
          )}

          {!result.schedulable && other.schedulable && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm rounded-lg border border-primary/40 bg-primary/10 p-3"
            >
              {other.algorithm} schedules this same task set without missing anything — try
              switching. This is the practical meaning of EDF being optimal.
            </motion.p>
          )}
        </CardContent>
      </Card>

      <ConceptPanel
        title={algorithm === 'RM' ? 'Rate Monotonic' : 'Earliest Deadline First'}
        explanation={realTimeExplanations[algorithm]}
        narration={step?.narration}
        activeLine={step ? (step.taskId ? 2 : 1) : undefined}
      />
    </div>
  );
};

export default RealTimeScheduling;
