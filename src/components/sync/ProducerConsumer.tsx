import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConceptPanel } from '@/components/ConceptPanel';
import { ActorList, SemaphoreBar } from './ActorList';
import { EventLog } from './EventLog';
import { syncExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  BUFFER_SIZE,
  ProducerConsumerState,
  consumerProgram,
  initialProducerConsumer,
  producerProgram,
  stepProducerConsumer
} from '@/lib/algorithms/sync';
import { Pause, Play, RotateCcw } from 'lucide-react';

export const ProducerConsumer = () => {
  const [swapped, setSwapped] = useState(false);
  const [state, setState] = useState<ProducerConsumerState>(() => initialProducerConsumer(2, 2));
  const [running, setRunning] = useState(false);
  const turn = useRef(0);

  const reset = useCallback(
    (swapWaits: boolean) => {
      setRunning(false);
      turn.current = 0;
      setState(initialProducerConsumer(2, 2, swapWaits));
    },
    []
  );

  const step = useCallback((actorId?: string) => {
    setState(prev => {
      // Round-robin the actors so no single process monopolises the run.
      const id = actorId ?? prev.actors[turn.current % prev.actors.length].id;
      turn.current += 1;
      return stepProducerConsumer(prev, id);
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => step(), 700);
    return () => window.clearInterval(timer);
  }, [running, step]);

  // Nothing will ever change again, so stop burning cycles.
  useEffect(() => {
    if (state.deadlocked) setRunning(false);
  }, [state.deadlocked]);

  const programFor = (actor: { kind: string }) =>
    actor.kind === 'producer' ? producerProgram(swapped) : consumerProgram(swapped);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-1">Producer-Consumer</h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Producers fill a bounded buffer, consumers drain it. Two counting semaphores track free
          and filled slots; a mutex protects the buffer itself.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => setRunning(r => !r)} disabled={state.deadlocked}>
          {running ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {running ? 'Pause' : 'Run'}
        </Button>
        <Button variant="outline" onClick={() => step()} disabled={running || state.deadlocked}>
          Step once
        </Button>
        <Button variant="outline" onClick={() => reset(swapped)}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset
        </Button>
        <Button
          variant={swapped ? 'destructive' : 'secondary'}
          onClick={() => {
            const next = !swapped;
            setSwapped(next);
            reset(next);
          }}
        >
          {swapped ? 'Using the broken wait order' : 'Break it: swap the waits'}
        </Button>
      </div>

      {swapped && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-center">
          Each process now takes <code className="font-mono">mutex</code> before the counting
          semaphore. Run it and watch the system wedge: a producer holds the mutex while blocked on{' '}
          <code className="font-mono">empty</code>, so no consumer can ever get in to free a slot.
        </div>
      )}

      {state.deadlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border-2 border-destructive bg-destructive/15 p-4 text-center font-medium"
        >
          Deadlock. Every process is blocked on a semaphore that only another blocked process could
          signal.
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Semaphores</CardTitle>
              <CardDescription>
                empty + full always equals the buffer size when no process is mid-update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SemaphoreBar semaphores={state.semaphores} />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bounded buffer</CardTitle>
              <CardDescription>
                A circular buffer: <code className="font-mono">in</code> is where the next item is
                written, <code className="font-mono">out</code> is where the next is read.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-3">
                {Array.from({ length: BUFFER_SIZE }, (_, slot) => {
                  const item = state.buffer[slot];
                  return (
                    <div key={slot} className="flex flex-col items-center gap-1.5">
                      <motion.div
                        animate={{
                          borderColor:
                            item !== null ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'
                        }}
                        className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center ${item !== null ? 'bg-primary/10' : 'border-dashed bg-muted/20'
                          }`}
                      >
                        <AnimatePresence mode="popLayout">
                          {item !== null && (
                            <motion.span
                              key={item}
                              initial={{ y: -30, opacity: 0, scale: 0.5 }}
                              animate={{ y: 0, opacity: 1, scale: 1 }}
                              exit={{ y: 30, opacity: 0, scale: 0.5 }}
                              transition={spring}
                              className="font-mono font-bold"
                            >
                              {item}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <div className="flex gap-1 h-4">
                        {state.in === slot && (
                          <motion.span layoutId="pc-in" className="text-[10px] font-mono text-green-500">
                            in
                          </motion.span>
                        )}
                        {state.out === slot && (
                          <motion.span layoutId="pc-out" className="text-[10px] font-mono text-blue-400">
                            out
                          </motion.span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-6 text-sm">
                <span>
                  Produced <Badge variant="outline" className="font-mono ml-1">{state.produced}</Badge>
                </span>
                <span>
                  Consumed <Badge variant="outline" className="font-mono ml-1">{state.consumed}</Badge>
                </span>
                <span>
                  In buffer{' '}
                  <Badge variant="outline" className="font-mono ml-1">
                    {state.buffer.filter(v => v !== null).length}/{BUFFER_SIZE}
                  </Badge>
                </span>
              </div>
            </CardContent>
          </Card>

          <EventLog entries={state.log} />
        </div>

        <Card className="border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Processes</CardTitle>
            <CardDescription>The highlighted line is where each one is parked.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActorList
              actors={state.actors}
              programFor={programFor}
              onStep={id => step(id)}
              disabled={running}
            />
          </CardContent>
        </Card>
      </div>

      <ConceptPanel
        title="the Producer-Consumer solution"
        explanation={syncExplanations['producer-consumer']}
        narration={state.log[state.log.length - 1]}
        alert={
          state.deadlocked
            ? 'This is exactly why the order of the two wait() calls matters: never acquire the mutex before the semaphore you might block on.'
            : undefined
        }
      />
    </div>
  );
};
