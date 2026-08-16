import { motion } from 'framer-motion';
import { PagingStep } from '@/lib/algorithms/paging';
import { swift } from '@/lib/motion';

interface PageMatrixProps {
  steps: PagingStep[];
  frameCount: number;
  /** how many references have been played */
  current: number;
  onSeek: (index: number) => void;
}

/**
 * The exam-style layout: one column per reference, frames stacked down the
 * rows. This is how the problem is worked by hand on paper, so it is the view
 * a student can check their own working against - the box view shows what
 * memory looks like *now*, this shows the whole history at once.
 */
export const PageMatrix = ({ steps, frameCount, current, onSeek }: PageMatrixProps) => {
  if (!steps.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Enter a reference string to build the table.
      </p>
    );
  }

  const cell = 'w-10 h-10 shrink-0 flex items-center justify-center text-sm font-mono border';

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-block min-w-full">
        {/* Reference string */}
        <div className="flex items-center gap-1 mb-1">
          <div className="w-20 shrink-0 text-xs text-muted-foreground text-right pr-2">
            Reference
          </div>
          {steps.map((step, index) => (
            <motion.button
              key={index}
              onClick={() => onSeek(index + 1)}
              animate={{ opacity: index < current ? 1 : 0.45 }}
              transition={swift}
              className={`${cell} rounded-t-md font-semibold ${index === current - 1
                ? 'border-primary bg-primary/20'
                : 'border-border bg-muted/40'
                }`}
              title={`Jump to reference ${index + 1}`}
            >
              {step.page}
            </motion.button>
          ))}
        </div>

        {/* One row per frame */}
        {Array.from({ length: frameCount }, (_, frame) => (
          <div key={frame} className="flex items-center gap-1 mb-1">
            <div className="w-20 shrink-0 text-xs text-muted-foreground text-right pr-2">
              Frame {frame}
            </div>
            {steps.map((step, index) => {
              const page = step.frames[frame]?.page ?? null;
              const played = index < current;
              const previous = index > 0 ? steps[index - 1].frames[frame]?.page ?? null : null;
              // Only mark the frame the fault actually landed in.
              const justChanged = !step.hit && step.frameIndex === frame;
              const isCurrentColumn = index === current - 1;

              return (
                <motion.div
                  key={index}
                  animate={{ opacity: played ? 1 : 0.4 }}
                  transition={swift}
                  className={`${cell} ${justChanged && played
                    ? 'border-destructive bg-destructive/20 text-destructive font-bold'
                    : page !== null
                      ? 'border-border bg-card'
                      : 'border-dashed border-muted-foreground/25 bg-transparent'
                    } ${isCurrentColumn ? 'ring-1 ring-primary/60' : ''}`}
                  title={
                    page === null
                      ? 'empty'
                      : justChanged && previous !== null
                        ? `page ${page} replaced page ${previous}`
                        : `page ${page}`
                  }
                >
                  {page ?? ''}
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Hit / fault row - the line you actually count up at the end */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/60">
          <div className="w-20 shrink-0 text-xs text-muted-foreground text-right pr-2">
            Fault?
          </div>
          {steps.map((step, index) => (
            <motion.div
              key={index}
              animate={{ opacity: index < current ? 1 : 0.4 }}
              transition={swift}
              className={`${cell} rounded-b-md font-bold ${step.hit
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-destructive/50 bg-destructive/10 text-destructive'
                }`}
              title={step.hit ? 'hit' : 'page fault'}
            >
              {step.hit ? 'H' : 'F'}
            </motion.div>
          ))}
        </div>

        {/* Running fault count, so the total can be checked column by column */}
        <div className="flex items-center gap-1 mt-1">
          <div className="w-20 shrink-0 text-xs text-muted-foreground text-right pr-2">
            Faults
          </div>
          {steps.map((step, index) => (
            <motion.div
              key={index}
              animate={{ opacity: index < current ? 1 : 0.4 }}
              transition={swift}
              className="w-10 h-6 shrink-0 flex items-center justify-center text-[11px] font-mono text-muted-foreground"
            >
              {step.faultsSoFar}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
