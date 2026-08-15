import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TriangleAlert } from 'lucide-react';
import { fadeUp, swift } from '@/lib/motion';

export interface AlgorithmExplanation {
  /** one sentence: what rule does this algorithm follow? */
  idea: string;
  pseudocode: string[];
  /** why you would choose it */
  strengths: string[];
  /** where it falls down */
  weaknesses: string[];
  /** optional closing note, e.g. "this is why Belady's anomaly happens" */
  note?: string;
}

interface ConceptPanelProps {
  title: string;
  explanation: AlgorithmExplanation;
  /** plain-English description of the step that just happened */
  narration?: string;
  /** index into `pseudocode` to highlight */
  activeLine?: number;
  /** shown as a warning strip, e.g. a deadline miss or a deadlock */
  alert?: string;
}

/**
 * The teaching half of every module. The visualization shows *what* happened;
 * this explains *why*, line by line, so a reader who has never seen the
 * algorithm can follow along without a textbook open beside them.
 */
export const ConceptPanel = ({
  title,
  explanation,
  narration,
  activeLine,
  alert
}: ConceptPanelProps) => (
  <Card className="border-border/60 shadow-md bg-background/90 backdrop-blur-md">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Lightbulb className="w-5 h-5 text-primary" />
        How {title} decides
      </CardTitle>
      <p className="text-sm text-muted-foreground">{explanation.idea}</p>
    </CardHeader>

    <CardContent className="space-y-4">
      {/* What just happened */}
      <div className="min-h-[68px] rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="text-xs uppercase tracking-wide text-primary/80 mb-1">
          This step
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={narration ?? 'idle'}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8, transition: swift }}
            className="text-sm leading-relaxed"
          >
            {narration ?? 'Press Play, or step forward, to walk through the run one decision at a time.'}
          </motion.p>
        </AnimatePresence>
      </div>

      {alert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <TriangleAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <span>{alert}</span>
        </motion.div>
      )}

      {/* Pseudocode with the live line highlighted */}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          The rule, in code
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs leading-relaxed overflow-x-auto">
          {explanation.pseudocode.map((line, index) => {
            const isActive = index === activeLine;
            const indent = line.length - line.trimStart().length;
            return (
              <motion.div
                key={index}
                animate={{
                  backgroundColor: isActive ? 'hsl(var(--primary) / 0.18)' : 'transparent'
                }}
                transition={swift}
                className={`rounded px-2 py-0.5 whitespace-pre ${isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                style={{ paddingLeft: `${8 + indent * 6}px` }}
              >
                {line.trimStart()}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Trade-offs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Badge variant="outline" className="border-green-500/40 text-green-500">
            Good at
          </Badge>
          <ul className="text-xs text-muted-foreground space-y-1">
            {explanation.strengths.map(item => (
              <li key={item} className="flex gap-1.5">
                <span className="text-green-500 shrink-0">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5">
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Costs you
          </Badge>
          <ul className="text-xs text-muted-foreground space-y-1">
            {explanation.weaknesses.map(item => (
              <li key={item} className="flex gap-1.5">
                <span className="text-destructive shrink-0">−</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {explanation.note && (
        <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
          {explanation.note}
        </p>
      )}
    </CardContent>
  </Card>
);
