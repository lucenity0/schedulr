import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConceptPanel } from '@/components/ConceptPanel';
import { EventLog } from '@/components/sync/EventLog';
import { ipcExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  IpcMechanism,
  IpcState,
  PCB_FIELDS,
  ProcessState,
  SHARED_SLOTS,
  initialIpc,
  ipcComparison,
  ipcReceive,
  ipcSend,
  processTransitions
} from '@/lib/algorithms/ipc';
import { ArrowLeftRight, Send } from 'lucide-react';

const Ipc = () => {
  const [mechanism, setMechanism] = useState<IpcMechanism>('shared-memory');
  const [state, setState] = useState<IpcState>(() => initialIpc('shared-memory'));
  const [counter, setCounter] = useState(0);

  const switchTo = (next: IpcMechanism) => {
    setMechanism(next);
    setState(initialIpc(next));
    setCounter(0);
  };

  const send = () => {
    setState(prev => ipcSend(prev, `msg${counter + 1}`));
    setCounter(c => c + 1);
  };

  const isShared = mechanism === 'shared-memory';

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              ['shared-memory', 'Shared memory'],
              ['message-passing', 'Message passing'],
              ['pipe', 'Pipe']
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={mechanism === value ? 'default' : 'outline'}
                onClick={() => switchTo(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={send} disabled={state.senderBlocked && !isShared}>
              <Send className="h-4 w-4 mr-2" /> send()
            </Button>
            <Button variant="outline" onClick={() => setState(prev => ipcReceive(prev))}>
              receive()
            </Button>
            <Button variant="outline" onClick={() => switchTo(mechanism)}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isShared ? 'The shared region' : 'The kernel channel'}
            </CardTitle>
            <CardDescription>
              {isShared
                ? 'Both processes map the same physical memory. Reads and writes never enter the kernel.'
                : 'Every message is copied into the kernel and back out again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sender / channel / receiver */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <div
                className={`rounded-lg border-2 p-4 text-center ${state.senderBlocked ? 'border-destructive bg-destructive/10' : 'border-border bg-card'
                  }`}
              >
                <div className="font-medium text-sm">Sender</div>
                {state.senderBlocked && (
                  <Badge variant="destructive" className="mt-1 text-[10px]">
                    blocked
                  </Badge>
                )}
              </div>

              <div className="text-center">
                <div
                  className={`rounded-lg border-2 border-dashed p-3 min-h-[80px] flex flex-col items-center justify-center gap-1 ${isShared ? 'border-primary/60 bg-primary/5' : 'border-muted-foreground/40 bg-muted/20'
                    }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {isShared ? 'shared memory' : 'kernel'}
                  </div>
                  <AnimatePresence mode="popLayout">
                    {isShared
                      ? state.sharedRegion.filter(Boolean).length > 0 && (
                        <motion.div
                          key={state.sharedRegion.filter(Boolean).length}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-xs font-mono"
                        >
                          {state.sharedRegion.filter(Boolean).length} item(s)
                        </motion.div>
                      )
                      : state.queue.map(message => (
                        <motion.div
                          key={message.id}
                          layout
                          initial={{ scale: 0.6, opacity: 0, y: -10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.6, opacity: 0, y: 10 }}
                          transition={spring}
                          className="px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-[10px] font-mono"
                        >
                          {message.body}
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
                {!isShared && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    capacity {state.capacity === 0 ? 'zero (rendezvous)' : state.capacity}
                  </div>
                )}
              </div>

              <div
                className={`rounded-lg border-2 p-4 text-center ${state.receiverBlocked ? 'border-destructive bg-destructive/10' : 'border-border bg-card'
                  }`}
              >
                <div className="font-medium text-sm">Receiver</div>
                {state.receiverBlocked && (
                  <Badge variant="destructive" className="mt-1 text-[10px]">
                    blocked
                  </Badge>
                )}
              </div>
            </div>

            {/* Shared region slots */}
            {isShared && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Region slots
                </div>
                <div className="flex gap-2 justify-center">
                  {Array.from({ length: SHARED_SLOTS }, (_, slot) => (
                    <motion.div
                      key={slot}
                      animate={{
                        borderColor: state.sharedRegion[slot]
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--muted-foreground) / 0.3)'
                      }}
                      className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-[10px] font-mono ${state.sharedRegion[slot] ? 'bg-primary/10' : 'border-dashed bg-muted/20'
                        }`}
                    >
                      {state.sharedRegion[slot] ?? ''}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* The cost counter - the whole point */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                <div className="text-xs text-muted-foreground">Kernel crossings</div>
                <motion.div
                  key={state.kernelCrossings}
                  initial={{ scale: 1.3, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  transition={spring}
                  className="text-3xl font-bold font-mono"
                >
                  {state.kernelCrossings}
                </motion.div>
                <div className="text-[10px] text-muted-foreground">
                  {isShared ? 'setup only — then never again' : 'two per message'}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                <div className="text-xs text-muted-foreground">Messages delivered</div>
                <div className="text-3xl font-bold font-mono">
                  {isShared ? SHARED_SLOTS - state.sharedRegion.filter(s => s === null).length : state.delivered.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Side by side</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ipcComparison.map(row => (
                <div key={row.aspect} className="text-xs">
                  <div className="font-medium text-sm mb-1">{row.aspect}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded p-1.5 ${isShared ? 'bg-primary/10' : 'bg-muted/30'}`}>
                      <span className="text-muted-foreground">{row.shared}</span>
                    </div>
                    <div className={`rounded p-1.5 ${!isShared ? 'bg-primary/10' : 'bg-muted/30'}`}>
                      <span className="text-muted-foreground">{row.message}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <EventLog entries={state.log} />
        </div>
      </div>

      <ConceptPanel
        title={isShared ? 'shared memory' : 'message passing'}
        explanation={ipcExplanations[isShared ? 'shared-memory' : 'message-passing']}
        narration={state.log[state.log.length - 1]}
        alert={
          state.senderBlocked && state.capacity === 0
            ? 'Zero capacity means the sender cannot proceed until the receiver arrives. The two processes are now synchronized purely by the act of communicating.'
            : undefined
        }
      />
    </div>
  );
};

const STATE_POSITIONS: Record<ProcessState, { x: number; y: number }> = {
  new: { x: 8, y: 50 },
  ready: { x: 33, y: 22 },
  running: { x: 66, y: 22 },
  waiting: { x: 50, y: 80 },
  terminated: { x: 91, y: 50 }
};

const STATE_COLORS: Record<ProcessState, string> = {
  new: 'border-muted-foreground/50 bg-muted/30',
  ready: 'border-amber-500 bg-amber-500/15 text-amber-300',
  running: 'border-green-500 bg-green-500/15 text-green-300',
  waiting: 'border-blue-500 bg-blue-500/15 text-blue-300',
  terminated: 'border-destructive bg-destructive/15 text-destructive'
};

const Lifecycle = () => {
  const [current, setCurrent] = useState<ProcessState>('new');
  const [history, setHistory] = useState<string[]>(['Process created — the OS is building its PCB.']);

  const available = useMemo(
    () => processTransitions.filter(t => t.from === current),
    [current]
  );

  const take = (to: ProcessState, trigger: string, detail: string) => {
    setCurrent(to);
    setHistory(prev => [...prev, `${trigger}: ${detail}`].slice(-12));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Process state diagram</CardTitle>
            <CardDescription>
              Click an available transition below to move the process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-[2/1] min-h-[240px]">
              {/* Transition arrows */}
              <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {processTransitions.map(t => {
                  const from = STATE_POSITIONS[t.from];
                  const to = STATE_POSITIONS[t.to];
                  const isAvailable = t.from === current;
                  return (
                    <line
                      key={`${t.from}-${t.to}`}
                      x1={from.x}
                      y1={from.y / 2}
                      x2={to.x}
                      y2={to.y / 2}
                      stroke={isAvailable ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                      strokeWidth={isAvailable ? 0.6 : 0.3}
                      strokeDasharray={isAvailable ? undefined : '1 1'}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>

              {(Object.keys(STATE_POSITIONS) as ProcessState[]).map(state => (
                <motion.div
                  key={state}
                  animate={{
                    scale: state === current ? 1.12 : 1
                  }}
                  transition={spring}
                  style={{
                    left: `${STATE_POSITIONS[state].x}%`,
                    top: `${STATE_POSITIONS[state].y}%`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-lg border-2 text-xs font-medium capitalize ${state === current ? STATE_COLORS[state] : 'border-border bg-card text-muted-foreground'
                    }`}
                >
                  {state}
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {available.map(t => (
                <Button
                  key={`${t.from}-${t.to}`}
                  size="sm"
                  variant="outline"
                  onClick={() => take(t.to, t.trigger, t.detail)}
                >
                  {t.trigger} → {t.to}
                </Button>
              ))}
              {!available.length && (
                <Button size="sm" variant="secondary" onClick={() => { setCurrent('new'); setHistory(['Process created — the OS is building its PCB.']); }}>
                  Start a new process
                </Button>
              )}
            </div>

            {available.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {available.map(t => (
                  <p key={t.trigger} className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{t.trigger}</span> — {t.detail}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Process control block</CardTitle>
            <CardDescription>
              What the OS saves and restores on every context switch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {PCB_FIELDS.map(field => (
              <div key={field.field} className="rounded-lg border border-border/60 bg-muted/20 p-2">
                <div className="text-xs font-medium">{field.field}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">{field.why}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <EventLog entries={history} title="Transitions taken" />

      <Card className="border-border/60 shadow-md bg-background/90">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">The distinction that matters:</span>{' '}
            <em>ready</em> means the process could use the CPU right now and simply has not been
            given it; <em>waiting</em> means it could not use the CPU even if handed one, because it
            is blocked on something else. That is why an I/O completion sends a process to ready
            rather than straight to running — it still has to be scheduled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const InterProcessCommunication = () => (
  <div className="space-y-6 max-w-7xl mx-auto">
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
          <div className="p-2 bg-primary/20 rounded-lg">
            <ArrowLeftRight className="w-8 h-8 text-primary" />
          </div>
          Processes &amp; IPC
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          The life of a process, and the two ways processes talk to each other.
        </p>
      </CardHeader>
    </Card>

    <Tabs defaultValue="ipc" className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
        <TabsTrigger value="ipc" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Inter-process communication
        </TabsTrigger>
        <TabsTrigger value="lifecycle" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Process states &amp; PCB
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ipc">
        <Ipc />
      </TabsContent>
      <TabsContent value="lifecycle">
        <Lifecycle />
      </TabsContent>
    </Tabs>
  </div>
);

export default InterProcessCommunication;
