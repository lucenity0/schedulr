import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { bankerExplanation } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  BankerInput,
  checkSafety,
  computeAvailable,
  computeNeed,
  detectDeadlock,
  requestResources
} from '@/lib/algorithms/deadlock';
import { CircleAlert, ShieldCheck, Workflow } from 'lucide-react';

const DEFAULT: BankerInput = {
  resources: ['A', 'B', 'C'],
  processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
  total: [10, 5, 7],
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
  ],
  max: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
  ]
};

/** Editable numeric matrix. */
const Matrix = ({
  title,
  rows,
  columns,
  values,
  onChange,
  readOnly,
  tone
}: {
  title: string;
  rows: string[];
  columns: string[];
  values: number[][];
  onChange?: (row: number, col: number, value: number) => void;
  readOnly?: boolean;
  tone?: 'muted';
}) => (
  <div>
    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{title}</div>
    <div className="inline-block rounded-lg border border-border/60 overflow-hidden">
      <table className="text-sm">
        <thead>
          <tr className="bg-muted/30">
            <th className="px-2 py-1 text-xs font-normal text-muted-foreground" />
            {columns.map(col => (
              <th key={col} className="px-2 py-1 text-xs font-mono w-12">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row} className="border-t border-border/40">
              <td className="px-2 py-1 text-xs font-mono text-muted-foreground">{row}</td>
              {columns.map((col, j) => (
                <td key={col} className="p-0.5">
                  {readOnly ? (
                    <div
                      className={`w-11 h-7 flex items-center justify-center font-mono text-sm rounded ${tone === 'muted' ? 'text-muted-foreground' : ''
                        }`}
                    >
                      {values[i][j]}
                    </div>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={values[i][j]}
                      onChange={e => onChange?.(i, j, Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-11 h-7 px-1 text-center font-mono text-sm"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Banker = () => {
  const [state, setState] = useState<BankerInput>(DEFAULT);
  const [requestPid, setRequestPid] = useState('P1');
  const [request, setRequest] = useState<number[]>([1, 0, 2]);
  const [verdict, setVerdict] = useState<string | null>(null);

  const need = useMemo(() => computeNeed(state.max, state.allocation), [state]);
  const available = useMemo(
    () => computeAvailable(state.total, state.allocation),
    [state]
  );
  const safety = useMemo(() => checkSafety(state), [state]);

  const player = useSimulationPlayer(safety.steps, { baseInterval: 1200 });
  const { step, current } = player;

  const update = (field: 'allocation' | 'max') => (row: number, col: number, value: number) =>
    setState(prev => ({
      ...prev,
      [field]: prev[field].map((r, i) => (i === row ? r.map((v, j) => (j === col ? value : v)) : r))
    }));

  const submitRequest = () => {
    const result = requestResources(state, requestPid, request);
    setVerdict(result.reason);
    if (result.granted && result.next) setState(result.next);
  };

  const finished = step?.finished ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System state</CardTitle>
            <CardDescription>
              Edit Allocation or Max and the safety check re-runs. Need is always Max − Allocation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <Matrix
                title="Allocation"
                rows={state.processes}
                columns={state.resources}
                values={state.allocation}
                onChange={update('allocation')}
              />
              <Matrix
                title="Max"
                rows={state.processes}
                columns={state.resources}
                values={state.max}
                onChange={update('max')}
              />
              <Matrix
                title="Need"
                rows={state.processes}
                columns={state.resources}
                values={need}
                readOnly
                tone="muted"
              />
            </div>

            <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-border/60">
              <Matrix
                title="Total"
                rows={['']}
                columns={state.resources}
                values={[state.total]}
                onChange={(_, col, value) =>
                  setState(prev => ({
                    ...prev,
                    total: prev.total.map((v, j) => (j === col ? value : v))
                  }))
                }
              />
              <Matrix
                title="Available"
                rows={['']}
                columns={state.resources}
                values={[available]}
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card
            className={`border-2 shadow-md ${safety.safe ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/60 bg-destructive/10'
              }`}
          >
            <CardContent className="pt-6 text-center space-y-2">
              {safety.safe ? (
                <ShieldCheck className="w-8 h-8 text-green-500 mx-auto" />
              ) : (
                <CircleAlert className="w-8 h-8 text-destructive mx-auto" />
              )}
              <div className="text-xl font-bold">
                {safety.safe ? 'Safe state' : 'Unsafe state'}
              </div>
              <p className="text-sm text-muted-foreground">
                {safety.safe
                  ? 'At least one order exists in which every process can finish.'
                  : 'No order exists in which every process can finish. Banker’s would refuse any request leading here.'}
              </p>
              {safety.safe && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  {safety.sequence.map((id, index) => (
                    <motion.span
                      key={id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: index < finished.length ? 1 : 0.35,
                        scale: index < finished.length ? 1 : 0.95
                      }}
                      transition={spring}
                      className="px-2 py-1 rounded-md border border-green-500/40 bg-green-500/10 text-xs font-mono"
                    >
                      {id}
                    </motion.span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Make a request</CardTitle>
              <CardDescription>
                A request is granted only if it also leaves a safe state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={requestPid}
                  onChange={e => setRequestPid(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {state.processes.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">requests</span>
                {state.resources.map((resource, index) => (
                  <Input
                    key={resource}
                    type="number"
                    min={0}
                    value={request[index]}
                    onChange={e =>
                      setRequest(prev =>
                        prev.map((v, i) => (i === index ? Math.max(0, parseInt(e.target.value) || 0) : v))
                      )
                    }
                    className="w-14 h-9 text-center font-mono"
                  />
                ))}
              </div>
              <Button onClick={submitRequest} className="w-full">
                Submit request
              </Button>
              {verdict && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs rounded-lg p-3 border ${verdict.startsWith('Granted')
                    ? 'border-green-500/40 bg-green-500/10'
                    : 'border-destructive/40 bg-destructive/10'
                    }`}
                >
                  {verdict}
                </motion.p>
              )}
              <Button variant="outline" className="w-full" onClick={() => { setState(DEFAULT); setVerdict(null); }}>
                Reset to the textbook example
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Safety algorithm, step by step</CardTitle>
          <CardDescription>
            Work starts at Available and grows as each process is retired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimulationControls player={player} label={`Step ${current} / ${safety.steps.length}`} />

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-muted-foreground">Work =</span>
            {(step?.work ?? available).map((value, index) => (
              <motion.div
                key={index}
                animate={{ scale: 1 }}
                initial={{ scale: 1.2 }}
                className="px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 font-mono text-sm"
              >
                {state.resources[index]}: {value}
              </motion.div>
            ))}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm min-h-[52px]">
            {step?.narration ?? 'Press play to walk through the safety check.'}
          </div>
        </CardContent>
      </Card>

      <ConceptPanel
        title="Banker's algorithm"
        explanation={bankerExplanation}
        narration={step?.narration}
        activeLine={step ? (step.processId ? 3 : 1) : undefined}
        alert={!safety.safe ? 'This state is unsafe. Note that unsafe does not mean deadlocked - it means no guarantee remains.' : undefined}
      />
    </div>
  );
};

const Detection = () => {
  const [processes] = useState(['P0', 'P1', 'P2', 'P3', 'P4']);
  const [resources] = useState(['A', 'B', 'C']);
  const [total, setTotal] = useState([7, 2, 6]);
  const [allocation, setAllocation] = useState([
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 3],
    [2, 1, 1],
    [0, 0, 2]
  ]);
  const [request, setRequest] = useState([
    [0, 0, 0],
    [2, 0, 2],
    [0, 0, 0],
    [1, 0, 0],
    [0, 0, 2]
  ]);

  const result = useMemo(
    () => detectDeadlock({ resources, processes, total, allocation, request }),
    [resources, processes, total, allocation, request]
  );

  const available = useMemo(() => computeAvailable(total, allocation), [total, allocation]);

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current state</CardTitle>
          <CardDescription>
            Detection uses what each process is <em>actually</em> waiting for, not its declared
            maximum. Try raising P2&rsquo;s request for C to 1.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <Matrix
              title="Allocation"
              rows={processes}
              columns={resources}
              values={allocation}
              onChange={(row, col, value) =>
                setAllocation(prev =>
                  prev.map((r, i) => (i === row ? r.map((v, j) => (j === col ? value : v)) : r))
                )
              }
            />
            <Matrix
              title="Request"
              rows={processes}
              columns={resources}
              values={request}
              onChange={(row, col, value) =>
                setRequest(prev =>
                  prev.map((r, i) => (i === row ? r.map((v, j) => (j === col ? value : v)) : r))
                )
              }
            />
            <Matrix
              title="Total"
              rows={['']}
              columns={resources}
              values={[total]}
              onChange={(_, col, value) =>
                setTotal(prev => prev.map((v, j) => (j === col ? value : v)))
              }
            />
            <Matrix title="Available" rows={['']} columns={resources} values={[available]} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card
        className={`border-2 shadow-md ${result.deadlocked ? 'border-destructive/60 bg-destructive/10' : 'border-green-500/50 bg-green-500/5'
          }`}
      >
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-3">
            {result.deadlocked ? (
              <CircleAlert className="w-6 h-6 text-destructive" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-green-500" />
            )}
            <span className="text-lg font-bold">
              {result.deadlocked ? 'Deadlock detected' : 'No deadlock'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{result.narration}</p>
          {result.deadlocked && (
            <div className="flex flex-wrap gap-1.5">
              {result.processes.map(id => (
                <Badge key={id} variant="destructive" className="font-mono">
                  {id}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource-allocation graph */}
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resource-allocation graph</CardTitle>
          <CardDescription>
            Solid arrows point from a resource to the process holding it; dashed arrows point from a
            process to a resource it is waiting for. A cycle through single-instance resources means
            deadlock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 620 300" className="w-full min-w-[520px]" role="img" aria-label="Resource allocation graph">
            {processes.map((id, index) => {
              const y = 40 + index * 55;
              const stuck = result.processes.includes(id);
              return (
                <g key={id}>
                  <circle
                    cx={90}
                    cy={y}
                    r={20}
                    fill={stuck ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--muted))'}
                    stroke={stuck ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}
                    strokeWidth={2}
                  />
                  <text x={90} y={y + 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {id}
                  </text>
                </g>
              );
            })}

            {resources.map((id, index) => {
              const y = 70 + index * 80;
              return (
                <g key={id}>
                  <rect x={470} y={y - 24} width={60} height={48} rx={4} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={2} />
                  <text x={500} y={y - 6} textAnchor="middle" className="fill-foreground" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {id}
                  </text>
                  {/* One dot per instance */}
                  {Array.from({ length: Math.min(total[index], 10) }, (_, i) => (
                    <circle key={i} cx={480 + (i % 5) * 10} cy={y + 6 + Math.floor(i / 5) * 10} r={2.5} fill="hsl(var(--foreground))" />
                  ))}
                </g>
              );
            })}

            {processes.map((process, i) =>
              resources.map((resource, j) => {
                const py = 40 + i * 55;
                const ry = 70 + j * 80;
                const held = allocation[i][j] > 0;
                const wanted = request[i][j] > 0;
                const stuck = result.processes.includes(process);
                return (
                  <g key={`${process}-${resource}`}>
                    {held && (
                      <line
                        x1={468} y1={ry} x2={112} y2={py}
                        stroke={stuck ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                        strokeWidth={1.5}
                        opacity={0.6}
                        markerEnd="url(#arrow)"
                      />
                    )}
                    {wanted && (
                      <line
                        x1={112} y1={py} x2={468} y2={ry}
                        stroke={stuck ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        opacity={0.7}
                        markerEnd="url(#arrow)"
                      />
                    )}
                  </g>
                );
              })
            )}

            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>
          </svg>
        </CardContent>
      </Card>
    </div>
  );
};

const COFFMAN = [
  {
    condition: 'Mutual exclusion',
    holds: 'At least one resource is non-sharable - only one process may use it at a time.',
    breakIt: 'Make resources sharable where possible. A read-only file needs no exclusion at all.',
    practical: 'Rarely deniable - you cannot make a printer sharable.'
  },
  {
    condition: 'Hold and wait',
    holds: 'A process holding one resource is waiting to acquire another.',
    breakIt: 'Require a process to request every resource it needs at once, before it starts - or to release everything before requesting more.',
    practical: 'Possible, but resource utilization drops and long jobs can starve.'
  },
  {
    condition: 'No preemption',
    holds: 'A resource can only be released voluntarily by the process holding it.',
    breakIt: 'If a process requests something unavailable, preempt everything it already holds and make it start again.',
    practical: 'Works for resources whose state is easy to save - CPU registers, memory. Useless for a printer mid-page.'
  },
  {
    condition: 'Circular wait',
    holds: 'A cycle of processes exists, each waiting on a resource held by the next.',
    breakIt: 'Impose a total ordering on resource types and require requests in increasing order.',
    practical: 'The one that is actually used. This is the resource hierarchy that fixes Dining Philosophers.'
  }
];

const RECOVERY = [
  {
    method: 'Abort all deadlocked processes',
    detail: 'Breaks the cycle immediately and definitively.',
    cost: 'Every partial computation is thrown away, possibly hours of work.'
  },
  {
    method: 'Abort one process at a time',
    detail: 'Kill one, re-run detection, repeat until the cycle breaks.',
    cost: 'Detection runs after every abort, which is expensive.'
  },
  {
    method: 'Resource preemption',
    detail: 'Take a resource from one process and give it to another.',
    cost: 'Needs a victim policy, a rollback point, and a guard against starving the same victim forever.'
  }
];

const Prevention = () => {
  const [broken, setBroken] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">The four Coffman conditions</CardTitle>
          <CardDescription>
            All four must hold simultaneously for a deadlock to be possible. Break any single one
            and deadlock becomes impossible - that is what prevention means.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COFFMAN.map((item, index) => {
            const isBroken = broken === index;
            return (
              <motion.button
                key={item.condition}
                onClick={() => setBroken(isBroken ? null : index)}
                animate={{ opacity: broken !== null && !isBroken ? 0.5 : 1 }}
                className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${isBroken
                  ? 'border-green-500/60 bg-green-500/10'
                  : 'border-border/60 bg-muted/20 hover:border-primary/40'
                  }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={`font-medium ${isBroken ? 'line-through text-green-400' : ''}`}>
                    {index + 1}. {item.condition}
                  </span>
                  <Badge variant={isBroken ? 'outline' : 'secondary'} className="text-[10px] shrink-0">
                    {isBroken ? 'broken' : 'holds'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{item.holds}</p>
                {isBroken && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 border-t border-green-500/30 pt-2"
                  >
                    <p className="text-xs">
                      <span className="font-medium text-green-400">How to break it: </span>
                      {item.breakIt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">In practice: </span>
                      {item.practical}
                    </p>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </CardContent>
      </Card>

      <motion.div
        animate={{ scale: broken !== null ? 1 : 1 }}
        className={`rounded-xl border-2 p-4 text-center ${broken !== null
          ? 'border-green-500/50 bg-green-500/5'
          : 'border-destructive/50 bg-destructive/10'
          }`}
      >
        <div className="font-semibold mb-1">
          {broken !== null ? 'Deadlock is now impossible' : 'All four conditions hold'}
        </div>
        <p className="text-sm text-muted-foreground">
          {broken !== null
            ? `With ${COFFMAN[broken].condition.toLowerCase()} broken, no deadlock can form - at the cost described above. Prevention always trades utilization for the guarantee.`
            : 'Deadlock is possible. Click a condition above to see how breaking it prevents deadlock, and what it costs you.'}
        </p>
      </motion.div>

      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recovery, once it has already happened</CardTitle>
          <CardDescription>
            Detection tells you a deadlock exists. Something still has to break it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RECOVERY.map(item => (
            <div key={item.method} className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="font-medium text-sm">{item.method}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              <p className="text-xs text-destructive/80 mt-1">{item.cost}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
            Most general-purpose systems - Linux and Windows included - do none of this. They ignore
            deadlock entirely and leave it to the programmer, on the grounds that it happens rarely
            and the machinery to prevent it costs more than the occasional reboot.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Deadlock = () => (
  <div className="space-y-6 max-w-7xl mx-auto">
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Workflow className="w-8 h-8 text-primary" />
          </div>
          Deadlock
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          Avoid it with Banker&rsquo;s algorithm, or detect it once it has already happened.
        </p>
      </CardHeader>
    </Card>

    <Tabs defaultValue="prevention" className="space-y-6">
      <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
        <TabsTrigger value="prevention" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Prevention
        </TabsTrigger>
        <TabsTrigger value="banker" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Avoidance — Banker&rsquo;s
        </TabsTrigger>
        <TabsTrigger value="detection" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Detection &amp; recovery
        </TabsTrigger>
      </TabsList>

      <TabsContent value="prevention">
        <Prevention />
      </TabsContent>

      <TabsContent value="banker">
        <Banker />
      </TabsContent>
      <TabsContent value="detection">
        <Detection />
      </TabsContent>
    </Tabs>
  </div>
);

export default Deadlock;
