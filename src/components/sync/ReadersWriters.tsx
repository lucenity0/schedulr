import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConceptPanel } from '@/components/ConceptPanel';
import { ActorList, SemaphoreBar } from './ActorList';
import { EventLog } from './EventLog';
import { syncExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  ReadersWritersState,
  initialReadersWriters,
  readerProgram,
  stepReadersWriters,
  writerProgram
} from '@/lib/algorithms/sync';
import { Book, Pause, PenLine, Play, RotateCcw } from 'lucide-react';

export const ReadersWriters = () => {
  const [state, setState] = useState<ReadersWritersState>(() => initialReadersWriters(3, 2));
  const [running, setRunning] = useState(false);
  const turn = useRef(0);

  const step = useCallback((actorId?: string) => {
    setState(prev => {
      const id = actorId ?? prev.actors[turn.current % prev.actors.length].id;
      turn.current += 1;
      return stepReadersWriters(prev, id);
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => step(), 650);
    return () => window.clearInterval(timer);
  }, [running, step]);

  const reset = () => {
    setRunning(false);
    turn.current = 0;
    setState(initialReadersWriters(3, 2));
  };

  const writerHasLock = state.semaphores.rw === 0 && state.readCount === 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-1">Readers-Writers</h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Any number of readers can share the data at once, but a writer needs it entirely to
          itself. The first reader in takes the lock for everyone; the last one out releases it.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => setRunning(r => !r)}>
          {running ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {running ? 'Pause' : 'Run'}
        </Button>
        <Button variant="outline" onClick={() => step()} disabled={running}>
          Step once
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Semaphores</CardTitle>
              <CardDescription>
                <code className="font-mono">rw</code> guards the data itself;{' '}
                <code className="font-mono">mutex</code> guards the reader counter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SemaphoreBar semaphores={state.semaphores} />
              <div className="text-center text-sm">
                <span className="text-muted-foreground">readCount = </span>
                <motion.span
                  key={state.readCount}
                  initial={{ scale: 1.4, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  transition={spring}
                  className="font-mono font-bold text-lg"
                >
                  {state.readCount}
                </motion.span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">The shared data</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                animate={{
                  borderColor: writerHasLock
                    ? 'hsl(var(--destructive))'
                    : state.readCount > 0
                      ? 'hsl(217 91% 60%)'
                      : 'hsl(var(--border))'
                }}
                className="rounded-xl border-2 p-6 text-center min-h-[140px] flex flex-col items-center justify-center gap-3"
              >
                {writerHasLock ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2 text-destructive"
                  >
                    <PenLine className="w-8 h-8" />
                    <span className="font-medium">{state.activeWriter} is writing</span>
                    <span className="text-xs text-muted-foreground">
                      Exclusive access — every reader is locked out
                    </span>
                  </motion.div>
                ) : state.readCount > 0 ? (
                  <>
                    <div className="flex gap-2 flex-wrap justify-center">
                      <AnimatePresence>
                        {state.activeReaders.map(id => (
                          <motion.div
                            key={id}
                            layout
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={spring}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500 text-blue-300 text-xs"
                          >
                            <Book className="w-3 h-3" /> {id}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {state.readCount} reader{state.readCount === 1 ? '' : 's'} sharing the data
                      concurrently
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">Idle — nobody holds the data</span>
                )}
              </motion.div>

              <div className="flex justify-center gap-6 text-sm mt-4">
                <span className="text-muted-foreground">
                  Reads completed <span className="font-mono text-foreground">{state.reads}</span>
                </span>
                <span className="text-muted-foreground">
                  Writes completed <span className="font-mono text-foreground">{state.writes}</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <EventLog entries={state.log} />
        </div>

        <Card className="border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Processes</CardTitle>
            <CardDescription>Step one by hand to control the interleaving.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActorList
              actors={state.actors}
              programFor={actor => (actor.kind === 'reader' ? readerProgram : writerProgram)}
              onStep={id => step(id)}
              disabled={running}
            />
          </CardContent>
        </Card>
      </div>

      <ConceptPanel
        title="the Readers-Writers solution"
        explanation={syncExplanations['readers-writers']}
        narration={state.log[state.log.length - 1]}
        alert={
          state.readCount > 0 && state.actors.some(a => a.kind === 'writer' && a.blockedOn === 'rw')
            ? 'A writer is blocked while readers keep arriving. Keep running and watch it wait - this is writer starvation, the known weakness of the reader-preference solution.'
            : undefined
        }
      />
    </div>
  );
};
