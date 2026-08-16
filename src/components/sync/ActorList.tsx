import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Actor, Instruction } from '@/lib/algorithms/sync';
import { spring } from '@/lib/motion';

interface ActorListProps {
  actors: Actor[];
  programFor: (actor: Actor) => Instruction[];
  onStep: (actorId: string) => void;
  disabled?: boolean;
}

/**
 * Shows each process parked on its current instruction. Seeing *where* a
 * process is stopped is the whole point - a blocked wait() should look
 * different from a process that simply has not been scheduled yet.
 */
export const ActorList = ({ actors, programFor, onStep, disabled }: ActorListProps) => (
  <div className="space-y-2">
    {actors.map(actor => {
      const program = programFor(actor);
      const instruction = program[actor.pc];
      const blocked = actor.blockedOn !== null;

      return (
        <motion.div
          key={actor.id}
          layout
          transition={spring}
          className={`rounded-lg border p-3 ${blocked ? 'border-destructive/40 bg-destructive/5' : 'border-border/60 bg-muted/20'
            }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${blocked ? 'bg-destructive' : 'bg-green-500'
                  }`}
              />
              <span className="text-sm font-medium truncate">{actor.id}</span>
              {blocked && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                  blocked on {actor.blockedOn}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs shrink-0"
              onClick={() => onStep(actor.id)}
              disabled={disabled}
            >
              Step
            </Button>
          </div>

          {/* Program counter */}
          <div className="font-mono text-[11px] space-y-0.5">
            {program.map((line, index) => (
              <div
                key={index}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1.5 ${index === actor.pc
                  ? blocked
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-primary/20 text-foreground'
                  : 'text-muted-foreground'
                  }`}
              >
                <span className="opacity-50 w-3">{index === actor.pc ? '▸' : ''}</span>
                {line.label}
              </div>
            ))}
          </div>

          <div className="text-[10px] text-muted-foreground mt-1.5">
            {actor.cycles} completed cycle{actor.cycles === 1 ? '' : 's'}
            {instruction && ` · next: ${instruction.label}`}
          </div>
        </motion.div>
      );
    })}
  </div>
);

interface SemaphoreBarProps {
  semaphores: Record<string, number>;
}

export const SemaphoreBar = ({ semaphores }: SemaphoreBarProps) => (
  <div className="flex flex-wrap gap-3">
    {Object.entries(semaphores).map(([name, value]) => (
      <div
        key={name}
        className="flex-1 min-w-[92px] rounded-lg border border-border/60 bg-muted/20 p-3 text-center"
      >
        <div className="text-xs text-muted-foreground font-mono">{name}</div>
        <motion.div
          key={value}
          initial={{ scale: 1.3, color: 'hsl(var(--primary))' }}
          animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
          transition={spring}
          className="text-2xl font-bold font-mono"
        >
          {value}
        </motion.div>
        {(name === 'mutex' || name === 'rw') && (
          <div className={`text-[10px] ${value ? 'text-green-500' : 'text-destructive'}`}>
            {value ? 'free' : 'held'}
          </div>
        )}
      </div>
    ))}
  </div>
);
