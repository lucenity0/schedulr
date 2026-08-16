import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ConceptPanel } from '@/components/ConceptPanel';
import { EventLog } from './EventLog';
import { syncExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  DiningState,
  DiningStrategy,
  PHILOSOPHER_COUNT,
  allHungry,
  initialDining,
  makeHungry,
  stepDining
} from '@/lib/algorithms/sync';
import { Pause, Play, RotateCcw, UtensilsCrossed } from 'lucide-react';

const STRATEGIES: { value: DiningStrategy; label: string; blurb: string }[] = [
  {
    value: 'none',
    label: 'None (naive)',
    blurb: 'Everyone reaches for their left fork first. This deadlocks - that is the point.'
  },
  {
    value: 'oddEven',
    label: 'Odd-even ordering',
    blurb: 'Odd philosophers reach right-first, breaking the symmetry that causes the circular wait.'
  },
  {
    value: 'hierarchy',
    label: 'Resource hierarchy',
    blurb: 'Everyone takes the lower-numbered fork first, so no cycle of waiting can form.'
  },
  {
    value: 'waiter',
    label: 'Waiter (limit seating)',
    blurb: 'At most four philosophers sit at once, so at least one can always get both forks.'
  }
];

// Seat and fork positions around the table, in percent.
const SEATS = [
  { x: 50, y: 8 },
  { x: 88, y: 36 },
  { x: 73, y: 82 },
  { x: 27, y: 82 },
  { x: 12, y: 36 }
];

const FORKS = [
  { x: 30, y: 20 },
  { x: 70, y: 20 },
  { x: 84, y: 62 },
  { x: 50, y: 90 },
  { x: 16, y: 62 }
];

export const DiningPhilosophers = () => {
  const [strategy, setStrategy] = useState<DiningStrategy>('none');
  const [state, setState] = useState<DiningState>(() => initialDining('none'));
  const [running, setRunning] = useState(false);

  const reset = useCallback((next: DiningStrategy) => {
    setRunning(false);
    setState(initialDining(next));
  }, []);

  const step = useCallback(() => setState(prev => stepDining(prev)), []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(step, 900);
    return () => window.clearInterval(timer);
  }, [running, step]);

  useEffect(() => {
    if (state.deadlocked) setRunning(false);
  }, [state.deadlocked]);

  const eating = state.philosophers.filter(p => p.state === 'eating').length;
  const meals = state.philosophers.reduce((sum, p) => sum + p.meals, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-1">Dining Philosophers</h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Five philosophers, five forks, and each needs both neighbours&rsquo; forks to eat. They
          pick up <span className="text-foreground font-medium">one fork at a time</span> — which is
          precisely what makes deadlock possible.
        </p>
      </div>

      <Card className="border-border/60 shadow-md bg-background/90">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="strategy">Deadlock prevention</Label>
              <Select
                value={strategy}
                onValueChange={value => {
                  setStrategy(value as DiningStrategy);
                  reset(value as DiningStrategy);
                }}
              >
                <SelectTrigger id="strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRunning(r => !r)} disabled={state.deadlocked}>
                {running ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {running ? 'Pause' : 'Run'}
              </Button>
              <Button variant="outline" onClick={step} disabled={running || state.deadlocked}>
                Step
              </Button>
              <Button variant="outline" onClick={() => setState(allHungry(state))}>
                All hungry
              </Button>
              <Button variant="outline" onClick={() => reset(strategy)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {STRATEGIES.find(s => s.value === strategy)!.blurb}
          </p>
        </CardContent>
      </Card>

      {state.deadlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="rounded-lg border-2 border-destructive bg-destructive/15 p-4 text-center"
        >
          <div className="font-semibold mb-1">Deadlock reached.</div>
          <div className="text-sm">
            All five philosophers hold exactly one fork and are waiting for a neighbour to put down
            the other. No one will ever eat. Switch the strategy above and run it again.
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">The table</CardTitle>
            <CardDescription>Click a philosopher to make them hungry.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="relative w-[min(420px,100%)] aspect-square">
                {/* Table */}
                <div className="absolute inset-[22%] rounded-full border-2 border-border bg-muted/20 flex items-center justify-center">
                  <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                </div>

                {/* Forks - a held fork sits beside its owner */}
                {FORKS.map((position, index) => {
                  const owner = state.forks[index];
                  const target = owner !== null ? SEATS[owner] : position;
                  return (
                    <motion.div
                      key={index}
                      animate={{ left: `${target.x}%`, top: `${target.y}%` }}
                      transition={spring}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    >
                      <div
                        className={`w-7 h-1.5 rounded-full ${owner !== null ? 'bg-primary' : 'bg-muted-foreground/60'
                          }`}
                        style={{ transform: `rotate(${index * 72 + 45}deg)` }}
                      />
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground">
                        {index}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Philosophers */}
                {state.philosophers.map((philosopher, index) => (
                  <motion.button
                    key={philosopher.id}
                    onClick={() => setState(makeHungry(state, philosopher.id))}
                    animate={{
                      scale: philosopher.state === 'eating' ? 1.12 : 1
                    }}
                    transition={spring}
                    style={{ left: `${SEATS[index].x}%`, top: `${SEATS[index].y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center text-xs font-bold z-20 ${philosopher.state === 'thinking'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : philosopher.state === 'hungry'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-green-500/20 border-green-500 text-green-300'
                      }`}
                  >
                    <span>P{philosopher.id}</span>
                    <span className="text-[9px] font-normal opacity-80">
                      {philosopher.holds.length}/2
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
              {[
                ['bg-blue-500', 'thinking'],
                ['bg-amber-500', 'hungry'],
                ['bg-green-500', 'eating']
              ].map(([color, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Eating now</div>
                  <div className="text-2xl font-bold font-mono">{eating}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Meals served</div>
                  <div className="text-2xl font-bold font-mono">{meals}</div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-border/60 pt-3">
                {state.philosophers.map(philosopher => (
                  <div key={philosopher.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono">P{philosopher.id}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono">
                        {philosopher.holds.length ? `forks ${philosopher.holds.join(',')}` : 'no forks'}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${philosopher.state === 'eating'
                          ? 'border-green-500/50 text-green-400'
                          : philosopher.state === 'hungry'
                            ? 'border-amber-500/50 text-amber-400'
                            : 'border-blue-500/50 text-blue-400'
                          }`}
                      >
                        {philosopher.state}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {strategy === 'waiter' && (
                <div className="text-xs text-muted-foreground border-t border-border/60 pt-3">
                  Seats free:{' '}
                  <span className="font-mono text-foreground">{state.seatsAvailable}</span> of{' '}
                  {PHILOSOPHER_COUNT - 1}
                </div>
              )}
            </CardContent>
          </Card>

          <EventLog entries={state.log} />
        </div>
      </div>

      <ConceptPanel
        title="Dining Philosophers"
        explanation={syncExplanations['dining-philosophers']}
        narration={state.log[state.log.length - 1]}
        alert={
          state.deadlocked
            ? 'Circular wait: P0 waits on P1, P1 on P2, and so on back around to P0. Break any one of the four Coffman conditions and this cannot happen.'
            : undefined
        }
      />
    </div>
  );
};
