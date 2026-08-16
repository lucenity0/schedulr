import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConceptPanel } from '@/components/ConceptPanel';
import { EventLog } from '@/components/sync/EventLog';
import { criticalSectionExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  CsState,
  Solution,
  expectedCounter,
  initialCriticalSection,
  isCorrect,
  programFor,
  stepThread
} from '@/lib/algorithms/criticalsection';
import { Pause, Play, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';

const SOLUTIONS: { value: Solution; label: string; blurb: string }[] = [
  {
    value: 'none',
    label: 'No protection',
    blurb: 'counter++ is three instructions. Alternate the threads and an increment vanishes.'
  },
  {
    value: 'peterson',
    label: "Peterson's solution",
    blurb: 'Software only: announce interest, then hand the turn to the other thread.'
  },
  {
    value: 'mutex',
    label: 'Mutex lock',
    blurb: 'acquire() before, release() after. Everyone else waits.'
  },
  {
    value: 'test-and-set',
    label: 'TestAndSet (hardware)',
    blurb: 'One atomic instruction reads and sets the lock together.'
  }
];

const REQUIREMENTS = [
  {
    name: 'Mutual exclusion',
    detail: 'If one process is in its critical section, no other may be.'
  },
  {
    name: 'Progress',
    detail: 'If nobody is inside and some processes want in, only those processes decide who goes, and the choice cannot be postponed forever.'
  },
  {
    name: 'Bounded waiting',
    detail: 'There is a limit on how many times others may enter after you have asked, before you get your turn.'
  }
];

const CriticalSection = () => {
  const [solution, setSolution] = useState<Solution>('none');
  const [state, setState] = useState<CsState>(() => initialCriticalSection('none'));
  const [running, setRunning] = useState(false);
  const turn = useRef(0);

  const program = programFor(solution);

  const step = useCallback((threadId?: number) => {
    setState(prev => {
      const id = threadId ?? turn.current % 2;
      turn.current += 1;
      return stepThread(prev, id);
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => step(), 600);
    return () => window.clearInterval(timer);
  }, [running, step]);

  const reset = (next: Solution) => {
    setRunning(false);
    turn.current = 0;
    setState(initialCriticalSection(next));
  };

  const correct = isCorrect(state);
  const expected = expectedCounter(state);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            The Critical Section Problem
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Two threads increment one shared counter. Step them alternately with no protection and
            watch an increment disappear &mdash; that lost update is what every lock exists to stop.
          </p>
        </CardHeader>
      </Card>

      <Card className="border border-border/60 shadow-md bg-background/90">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="solution">Solution</Label>
              <Select
                value={solution}
                onValueChange={value => {
                  setSolution(value as Solution);
                  reset(value as Solution);
                }}
              >
                <SelectTrigger id="solution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLUTIONS.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRunning(r => !r)}>
                {running ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {running ? 'Pause' : 'Run alternating'}
              </Button>
              <Button variant="outline" onClick={() => step()} disabled={running}>
                Step next
              </Button>
              <Button variant="outline" onClick={() => reset(solution)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {SOLUTIONS.find(s => s.value === solution)!.blurb}
          </p>
        </CardContent>
      </Card>

      {/* The verdict */}
      <motion.div
        animate={{ scale: state.raceDetected ? [1, 1.01, 1] : 1 }}
        className={`rounded-xl border-2 p-4 ${!correct || state.raceDetected
          ? 'border-destructive bg-destructive/10'
          : 'border-green-500/50 bg-green-500/5'
          }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!correct || state.raceDetected ? (
              <ShieldAlert className="w-6 h-6 text-destructive shrink-0" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-green-500 shrink-0" />
            )}
            <div>
              <div className="font-semibold">
                {state.raceDetected
                  ? 'Race condition detected'
                  : correct
                    ? 'Consistent so far'
                    : 'Counter is wrong'}
              </div>
              <div className="text-sm text-muted-foreground">
                {state.raceDetected
                  ? 'An increment was lost, or both threads were inside the critical section at once.'
                  : 'Every increment so far has been accounted for.'}
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">counter</div>
              <motion.div
                key={state.counter}
                initial={{ scale: 1.4, color: 'hsl(var(--primary))' }}
                animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                transition={spring}
                className="text-3xl font-bold font-mono"
              >
                {state.counter}
              </motion.div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">should be</div>
              <div
                className={`text-3xl font-bold font-mono ${correct ? 'text-muted-foreground' : 'text-destructive'
                  }`}
              >
                {expected}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threads */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {state.threads.map(thread => (
            <Card
              key={thread.id}
              className={`border-2 shadow-md ${thread.inCritical
                ? 'border-green-500/60 bg-green-500/5'
                : thread.blocked
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-border/60 bg-background/90'
                }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{thread.name}</CardTitle>
                  <div className="flex gap-1.5">
                    {thread.inCritical && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-[10px]">
                        in critical section
                      </Badge>
                    )}
                    {thread.blocked && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px]">
                        waiting
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="font-mono text-xs">
                  register ={' '}
                  <span className="text-foreground">
                    {thread.register === null ? '—' : thread.register}
                  </span>
                  {' · '}
                  {thread.completed} increment{thread.completed === 1 ? '' : 's'} done
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-mono text-xs space-y-0.5">
                  {program.map((instruction, index) => (
                    <motion.div
                      key={index}
                      animate={{
                        backgroundColor:
                          index === thread.pc
                            ? thread.blocked
                              ? 'hsl(var(--destructive) / 0.2)'
                              : 'hsl(var(--primary) / 0.2)'
                            : 'transparent'
                      }}
                      className={`px-2 py-1 rounded flex gap-2 ${index === thread.pc ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      <span className="opacity-50 w-3 shrink-0">
                        {index === thread.pc ? '▸' : ''}
                      </span>
                      <span className="break-all">{instruction.label}</span>
                    </motion.div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  onClick={() => step(thread.id)}
                  disabled={running}
                >
                  Step {thread.name}
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Shared state */}
          <Card className="sm:col-span-2 border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shared state</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[100px] rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                  <div className="text-xs text-muted-foreground font-mono">counter</div>
                  <div className="text-2xl font-bold font-mono">{state.counter}</div>
                </div>
                {solution === 'peterson' && (
                  <>
                    <div className="flex-1 min-w-[100px] rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                      <div className="text-xs text-muted-foreground font-mono">flag[]</div>
                      <div className="text-lg font-bold font-mono">
                        [{state.flag.map(f => (f ? 'T' : 'F')).join(', ')}]
                      </div>
                    </div>
                    <div className="flex-1 min-w-[100px] rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                      <div className="text-xs text-muted-foreground font-mono">turn</div>
                      <div className="text-2xl font-bold font-mono">{state.turn}</div>
                    </div>
                  </>
                )}
                {(solution === 'mutex' || solution === 'test-and-set') && (
                  <div className="flex-1 min-w-[100px] rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
                    <div className="text-xs text-muted-foreground font-mono">lock</div>
                    <div
                      className={`text-2xl font-bold font-mono ${state.lock ? 'text-destructive' : 'text-green-500'
                        }`}
                    >
                      {state.lock ? 'held' : 'free'}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">The three requirements</CardTitle>
              <CardDescription>Any correct solution must satisfy all three.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {REQUIREMENTS.map(item => (
                <div key={item.name} className="text-sm">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{item.detail}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <EventLog entries={state.log} title="Execution trace" />
        </div>
      </div>

      <ConceptPanel
        title={SOLUTIONS.find(s => s.value === solution)!.label}
        explanation={criticalSectionExplanations[solution]}
        narration={state.log[state.log.length - 1]}
        alert={
          state.raceDetected
            ? 'Both threads read the counter before either wrote it back, so the second write overwrote the first. Two increments produced one. Switch the solution above and run the identical interleaving again.'
            : undefined
        }
      />
    </div>
  );
};

export default CriticalSection;
