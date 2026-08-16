import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConceptPanel } from '@/components/ConceptPanel';
import { protectionExplanation } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  Right,
  canSwitch,
  checkAccess,
  defaultAccessMatrix
} from '@/lib/algorithms/ipc';
import { KeyRound, ShieldCheck, ShieldX } from 'lucide-react';

const RIGHTS: Right[] = ['read', 'write', 'execute', 'owner', 'switch'];

const RIGHT_STYLES: Record<string, string> = {
  read: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  write: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  execute: 'bg-green-500/20 text-green-300 border-green-500/40',
  owner: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  copy: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  switch: 'bg-primary/20 text-primary border-primary/40'
};

const Protection = () => {
  const [matrix, setMatrix] = useState(defaultAccessMatrix);
  const [domain, setDomain] = useState(0);
  const [object, setObject] = useState(0);
  const [right, setRight] = useState<Right>('read');
  const [attempts, setAttempts] = useState<{ text: string; allowed: boolean }[]>([]);

  const result = useMemo(
    () => checkAccess(matrix, domain, object, right),
    [matrix, domain, object, right]
  );

  const attempt = () => {
    setAttempts(prev =>
      [{ text: result.narration, allowed: result.allowed }, ...prev].slice(0, 8)
    );
  };

  const toggleRight = (d: number, o: number, r: Right) =>
    setMatrix(prev => ({
      ...prev,
      rights: prev.rights.map((row, i) =>
        i !== d
          ? row
          : row.map((cell, j) =>
            j !== o ? cell : cell.includes(r) ? cell.filter(x => x !== r) : [...cell, r]
          )
      )
    }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            System Protection
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Who may do what to which object. Every access is checked against one cell of a matrix
            &mdash; and nothing outside that cell is permitted.
          </p>
        </CardHeader>
      </Card>

      <Card className="border border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle>Access matrix</CardTitle>
          <CardDescription>
            Rows are protection domains, columns are objects. Click a cell&rsquo;s rights to grant or
            revoke them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs text-muted-foreground border-b border-border/60">
                    domain \ object
                  </th>
                  {matrix.objects.map((name, index) => (
                    <th
                      key={name}
                      className={`p-2 text-xs font-medium border-b border-border/60 ${index === object ? 'text-primary' : ''
                        }`}
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.domains.map((domainName, d) => (
                  <tr key={domainName}>
                    <td
                      className={`p-2 font-mono text-xs border-b border-border/40 ${d === domain ? 'text-primary font-bold' : 'text-muted-foreground'
                        }`}
                    >
                      {domainName}
                    </td>
                    {matrix.objects.map((_, o) => {
                      const cell = matrix.rights[d][o];
                      const isTarget = d === domain && o === object;
                      return (
                        <td
                          key={o}
                          onClick={() => {
                            setDomain(d);
                            setObject(o);
                          }}
                          className={`p-1.5 border-b border-border/40 align-top cursor-pointer transition-colors ${isTarget ? 'bg-primary/10 ring-1 ring-primary/50' : 'hover:bg-muted/30'
                            }`}
                        >
                          <div className="flex flex-wrap gap-1 min-h-[24px] min-w-[80px]">
                            {cell.length === 0 && (
                              <span className="text-[10px] text-muted-foreground/50">—</span>
                            )}
                            {cell.map(r => (
                              <motion.button
                                key={r}
                                layout
                                onClick={event => {
                                  event.stopPropagation();
                                  toggleRight(d, o, r);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${RIGHT_STYLES[r] ?? ''}`}
                              >
                                {r}
                              </motion.button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attempt an access</CardTitle>
            <CardDescription>
              The reference monitor checks the cell for &lt;{matrix.domains[domain]},{' '}
              {matrix.objects[object]}&gt;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {RIGHTS.map(r => (
                <Button
                  key={r}
                  size="sm"
                  variant={right === r ? 'default' : 'outline'}
                  onClick={() => setRight(r)}
                  className="text-xs"
                >
                  {r}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center text-sm">
              <Badge variant="outline" className="font-mono">
                {matrix.domains[domain]}
              </Badge>
              <span className="text-muted-foreground">wants to</span>
              <Badge variant="outline" className={`font-mono ${RIGHT_STYLES[right]}`}>
                {right}
              </Badge>
              <span className="text-muted-foreground">on</span>
              <Badge variant="outline" className="font-mono">
                {matrix.objects[object]}
              </Badge>
            </div>

            <Button onClick={attempt} className="w-full">
              Check access
            </Button>

            <motion.div
              key={result.narration}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${result.allowed
                ? 'border-green-500/40 bg-green-500/10'
                : 'border-destructive/40 bg-destructive/10'
                }`}
            >
              {result.allowed ? (
                <ShieldCheck className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <ShieldX className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              )}
              <span>{result.narration}</span>
            </motion.div>

            {attempts.length > 0 && (
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Audit log
                </div>
                {attempts.map((entry, index) => (
                  <div
                    key={index}
                    className={`text-[11px] ${entry.allowed ? 'text-muted-foreground' : 'text-destructive'
                      }`}
                  >
                    {entry.allowed ? '✓' : '✕'} {entry.text}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Domain switching</CardTitle>
              <CardDescription>
                A domain is itself an object. Entering another one needs the{' '}
                <code className="font-mono">switch</code> right.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {matrix.domains.map((name, index) => {
                  const allowed = index === domain || canSwitch(matrix, domain, index);
                  return (
                    <Button
                      key={name}
                      size="sm"
                      variant={index === domain ? 'default' : 'outline'}
                      disabled={!allowed}
                      onClick={() => setDomain(index)}
                      className="font-mono"
                    >
                      {name}
                      {!allowed && ' 🔒'}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Currently running in{' '}
                <span className="font-mono text-foreground">{matrix.domains[domain]}</span>. Locked
                domains cannot be entered from here — grant a <code className="font-mono">switch</code>{' '}
                right in the matrix above to open one.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Two ways to store the same matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="font-medium text-xs mb-1">By column — access control list</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {matrix.objects[object]}: {matrix.domains
                    .map((d, i) => {
                      const cell = matrix.rights[i][object];
                      return cell.length ? `${d}=(${cell.join(',')})` : null;
                    })
                    .filter(Boolean)
                    .join(', ') || 'no rights granted'}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Stored with the object. This is what a file system does.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="font-medium text-xs mb-1">By row — capability list</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {matrix.domains[domain]}: {matrix.objects
                    .map((o, i) => {
                      const cell = matrix.rights[domain][i];
                      return cell.length ? `${o}=(${cell.join(',')})` : null;
                    })
                    .filter(Boolean)
                    .join(', ') || 'no rights held'}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Stored with the domain, and must itself be protected from forgery.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConceptPanel
        title="the access matrix"
        explanation={protectionExplanation}
        narration={result.narration}
        activeLine={result.allowed ? 2 : 4}
      />
    </div>
  );
};

export default Protection;
