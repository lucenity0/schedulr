import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NumberField } from '@/components/NumberField';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { multiprocessorExplanations } from '@/lib/explanations';
import { spring, swift } from '@/lib/motion';
import { Process } from '@/types/scheduler';
import {
  QueueOrganisation,
  ThreadModel,
  simulateMultiprocessor,
  threadModels
} from '@/lib/algorithms/multiprocessor';
import { Cpu, Layers } from 'lucide-react';

const PROCESSES: Process[] = [
  { id: 'P1', arrivalTime: 0, burstTime: 5 },
  { id: 'P2', arrivalTime: 0, burstTime: 3 },
  { id: 'P3', arrivalTime: 1, burstTime: 6 },
  { id: 'P4', arrivalTime: 2, burstTime: 2 },
  { id: 'P5', arrivalTime: 3, burstTime: 4 }
];

const COLORS = ['bg-process-1', 'bg-process-2', 'bg-process-3', 'bg-process-4', 'bg-process-5'];

const colorFor = (id: string) => {
  const index = PROCESSES.findIndex(p => p.id === id);
  return COLORS[(index < 0 ? 0 : index) % COLORS.length];
};

const Scheduling = () => {
  const [cores, setCores] = useState(2);
  const [organisation, setOrganisation] = useState<QueueOrganisation>('common');
  const [affinity, setAffinity] = useState(true);
  const [balance, setBalance] = useState(true);

  const result = useMemo(
    () => simulateMultiprocessor(PROCESSES, cores, organisation, { affinity, balance }),
    [cores, organisation, affinity, balance]
  );

  const other = useMemo(
    () =>
      simulateMultiprocessor(
        PROCESSES,
        cores,
        organisation === 'common' ? 'per-cpu' : 'common',
        { affinity, balance }
      ),
    [cores, organisation, affinity, balance]
  );

  const player = useSimulationPlayer(result.ticks, { baseInterval: 650 });
  const { current, step } = player;

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-4">
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Five processes, {PROCESSES.reduce((s, p) => s + p.burstTime, 0)} units of work total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="cores">Cores</Label>
              <NumberField id="cores" min={1} max={6} value={cores} onChange={setCores} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Queue organisation</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={organisation === 'common' ? 'default' : 'outline'}
                  onClick={() => setOrganisation('common')}
                  className="flex-1"
                >
                  Common queue
                </Button>
                <Button
                  size="sm"
                  variant={organisation === 'per-cpu' ? 'default' : 'outline'}
                  onClick={() => setOrganisation('per-cpu')}
                  className="flex-1"
                >
                  Per-CPU queues
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Policies</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={affinity ? 'default' : 'outline'}
                  onClick={() => setAffinity(a => !a)}
                  className="flex-1 text-xs h-8"
                >
                  Affinity
                </Button>
                <Button
                  size="sm"
                  variant={balance ? 'default' : 'outline'}
                  onClick={() => setBalance(b => !b)}
                  className="flex-1 text-xs h-8"
                  disabled={organisation === 'common'}
                >
                  Balance
                </Button>
              </div>
            </div>
          </div>

          <SimulationControls player={player} label={`t = ${current} / ${result.totalTime}`} />
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle>Cores</CardTitle>
          <CardDescription>
            {step?.narration ?? 'Press play to watch work spread across the cores.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Per-core timeline */}
          <div className="space-y-2 overflow-x-auto">
            {Array.from({ length: cores }, (_, core) => (
              <div key={core} className="flex items-center gap-2 min-w-[500px]">
                <div className="w-16 shrink-0 text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> {core}
                </div>
                <div className="flex-1 flex gap-px">
                  {result.ticks.map((tick, time) => {
                    const id = tick.cores[core];
                    return (
                      <motion.div
                        key={time}
                        animate={{ opacity: time < current ? 1 : 0.2 }}
                        transition={swift}
                        className={`h-8 flex-1 min-w-[14px] rounded-sm flex items-center justify-center text-[9px] font-semibold text-white ${id ? colorFor(id) : 'bg-muted/40'
                          }`}
                        title={id ? `t=${time}: ${id}` : `t=${time}: idle`}
                      >
                        {id ?? ''}
                      </motion.div>
                    );
                  })}
                </div>
                <div className="w-12 shrink-0 text-right text-xs font-mono text-muted-foreground">
                  {result.utilization[core].toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {/* Ready queues */}
          <div className="border-t border-border/60 pt-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {organisation === 'common' ? 'Shared ready queue' : 'Per-CPU ready queues'}
            </div>
            <div className="flex flex-wrap gap-4">
              {(step?.queues ?? [[]]).map((queue, index) => (
                <div key={index} className="min-w-[120px]">
                  {organisation === 'per-cpu' && (
                    <div className="text-[10px] text-muted-foreground font-mono mb-1">
                      core {index}
                    </div>
                  )}
                  <div className="flex gap-1.5 min-h-[36px]">
                    {queue.length === 0 && (
                      <span className="text-xs text-muted-foreground self-center">empty</span>
                    )}
                    {queue.map(id => (
                      <motion.div
                        key={id}
                        layout
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring}
                        className={`w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-semibold text-white ${colorFor(id)} opacity-70`}
                      >
                        {id}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {step && step.migrations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              {step.migrations.map(m => (
                <div key={m.process}>
                  <span className="font-mono">{m.process}</span> migrated from core {m.from} to core{' '}
                  {m.to} — the idle core gets work, but the process arrives with a cold cache.
                </div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Makespan" value={`${result.totalTime}`} hint="time to finish everything" />
        <Stat
          label="Avg utilization"
          value={`${(result.utilization.reduce((a, b) => a + b, 0) / cores).toFixed(0)}%`}
          hint="across all cores"
        />
        <Stat
          label="Migrations"
          value={`${result.migrationCount}`}
          hint="each one costs a cold cache"
        />
        <Stat
          label="Affinity breaks"
          value={`${result.affinityBreaks}`}
          hint="resumed on a different core"
        />
      </div>

      <Card className="border border-border/60 shadow-md bg-background/90">
        <CardContent className="pt-6">
          <p className="text-sm">
            <span className="font-medium">
              {organisation === 'common' ? 'Common queue' : 'Per-CPU queues'}
            </span>{' '}
            finishes in <span className="font-mono text-primary">{result.totalTime}</span> with{' '}
            <span className="font-mono">{result.affinityBreaks}</span> affinity break(s).{' '}
            <span className="font-medium">
              {organisation === 'common' ? 'Per-CPU queues' : 'Common queue'}
            </span>{' '}
            finishes in <span className="font-mono">{other.totalTime}</span> with{' '}
            <span className="font-mono">{other.affinityBreaks}</span>.{' '}
            {result.affinityBreaks > other.affinityBreaks
              ? 'The shared queue balances perfectly but keeps moving processes between cores.'
              : 'Private queues keep caches warm, at the risk of one core idling while another has a backlog.'}
          </p>
        </CardContent>
      </Card>

      <ConceptPanel
        title={organisation === 'common' ? 'a common ready queue' : 'per-CPU ready queues'}
        explanation={multiprocessorExplanations[organisation]}
        narration={step?.narration}
        activeLine={step && step.migrations.length ? 4 : 2}
      />
    </div>
  );
};

const Stat = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold font-mono">{value}</div>
    <div className="text-[10px] text-muted-foreground">{hint}</div>
  </div>
);

const Models = () => {
  const [model, setModel] = useState<ThreadModel>('many-to-one');
  const [blocked, setBlocked] = useState<number | null>(null);
  const info = threadModels[model];

  // Under many-to-one, blocking any user thread stalls every other one.
  const isStalled = (userThread: number) => {
    if (blocked === null) return false;
    if (model === 'many-to-one') return true;
    const kernelThread = info.mapping.findIndex(group => group.includes(blocked));
    return info.mapping[kernelThread]?.includes(userThread) && model === 'one-to-one'
      ? userThread === blocked
      : info.mapping[kernelThread]?.includes(userThread) ?? false;
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle>Multithreading models</CardTitle>
          <CardDescription>
            How user threads are mapped onto kernel threads &mdash; and what happens when one
            blocks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(threadModels) as ThreadModel[]).map(key => (
              <Button
                key={key}
                size="sm"
                variant={model === key ? 'default' : 'outline'}
                onClick={() => {
                  setModel(key);
                  setBlocked(null);
                }}
              >
                {threadModels[key].title}
              </Button>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">{info.summary}</p>

          {/* The mapping diagram */}
          <div className="rounded-lg border border-border/60 bg-muted/10 p-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3 text-center">
              User threads — click one to block it on I/O
            </div>
            <div className="flex justify-center gap-3 mb-2">
              {[0, 1, 2, 3].map(userThread => (
                <motion.button
                  key={userThread}
                  onClick={() => setBlocked(blocked === userThread ? null : userThread)}
                  animate={{ scale: blocked === userThread ? 1.1 : 1 }}
                  transition={spring}
                  className={`w-16 h-12 rounded-lg border-2 text-xs font-mono flex items-center justify-center ${blocked === userThread
                    ? 'border-destructive bg-destructive/20 text-destructive'
                    : isStalled(userThread)
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-primary/50 bg-primary/10'
                    }`}
                >
                  U{userThread}
                </motion.button>
              ))}
            </div>

            {/* Mapping lines */}
            <svg viewBox="0 0 400 60" className="w-full h-14" aria-hidden>
              {info.mapping.map((group, kernelThread) =>
                group.map(userThread => {
                  const x1 = 44 + userThread * 104;
                  const x2 =
                    (400 / (info.kernelThreads + 1)) * (kernelThread + 1);
                  return (
                    <motion.line
                      key={`${kernelThread}-${userThread}`}
                      x1={x1}
                      y1={0}
                      x2={x2}
                      y2={60}
                      stroke={
                        blocked !== null && isStalled(userThread)
                          ? 'hsl(var(--destructive))'
                          : 'hsl(var(--primary))'
                      }
                      strokeWidth={1.5}
                      opacity={0.6}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                  );
                })
              )}
            </svg>

            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3 text-center">
              Kernel threads ({info.kernelThreads})
            </div>
            <div className="flex justify-center gap-3">
              {Array.from({ length: info.kernelThreads }, (_, k) => (
                <div
                  key={k}
                  className="w-16 h-12 rounded-lg border-2 border-border bg-card text-xs font-mono flex items-center justify-center"
                >
                  K{k}
                </div>
              ))}
            </div>
          </div>

          {blocked !== null && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-3 text-sm ${model === 'many-to-one'
                ? 'border-destructive/40 bg-destructive/10'
                : 'border-green-500/40 bg-green-500/10'
                }`}
            >
              <span className="font-medium">U{blocked} blocks on I/O. </span>
              {info.blockingBehaviour}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Badge variant="outline" className="border-green-500/40 text-green-500 mb-2">
                Good at
              </Badge>
              <ul className="text-xs text-muted-foreground space-y-1">
                {info.strengths.map(item => (
                  <li key={item} className="flex gap-1.5">
                    <span className="text-green-500">+</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Badge variant="outline" className="border-destructive/40 text-destructive mb-2">
                Costs you
              </Badge>
              <ul className="text-xs text-muted-foreground space-y-1">
                {info.weaknesses.map(item => (
                  <li key={item} className="flex gap-1.5">
                    <span className="text-destructive">−</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
            <span className="font-medium text-foreground">In practice:</span> {info.example}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Multiprocessor = () => (
  <div className="space-y-6 max-w-7xl mx-auto">
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Layers className="w-8 h-8 text-primary" />
          </div>
          Multiprocessor &amp; Thread Scheduling
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          With more than one CPU the question is not just who runs next, but where &mdash; and
          keeping a cache warm pulls against keeping the cores busy.
        </p>
      </CardHeader>
    </Card>

    <Tabs defaultValue="scheduling" className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
        <TabsTrigger value="scheduling" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Multiple-processor scheduling
        </TabsTrigger>
        <TabsTrigger value="models" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Multithreading models
        </TabsTrigger>
      </TabsList>

      <TabsContent value="scheduling">
        <Scheduling />
      </TabsContent>
      <TabsContent value="models">
        <Models />
      </TabsContent>
    </Tabs>
  </div>
);

export default Multiprocessor;
