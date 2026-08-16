import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { filesystemExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  AllocationMethod,
  FreeSpaceMethod,
  FsRequest,
  accessCost,
  describeFreeSpace,
  emptyDisk,
  simulateFileSystem
} from '@/lib/algorithms/filesystem';
import { FolderTree } from 'lucide-react';

const DISK_SIZE = 24;

const METHODS: { value: AllocationMethod; label: string }[] = [
  { value: 'contiguous', label: 'Contiguous' },
  { value: 'linked', label: 'Linked' },
  { value: 'indexed', label: 'Indexed' }
];

const FREE_METHODS: { value: FreeSpaceMethod; label: string }[] = [
  { value: 'bit-vector', label: 'Bit vector' },
  { value: 'linked-list', label: 'Linked list' },
  { value: 'grouping', label: 'Grouping' },
  { value: 'counting', label: 'Counting' }
];

const FILE_COLORS = [
  'bg-process-1', 'bg-process-2', 'bg-process-3', 'bg-process-4',
  'bg-process-5', 'bg-process-6', 'bg-process-7', 'bg-process-8'
];

const parseRequests = (input: string): FsRequest[] =>
  input
    .split(',')
    .map(token => token.trim())
    .filter(Boolean)
    .map((token): FsRequest | null => {
      const del = token.match(/^delete\s+(\S+)$/i);
      if (del) return { name: del[1], blocks: 0, action: 'delete' };
      const create = token.match(/^(\S+)\s*:\s*(\d+)$/);
      if (create) return { name: create[1], blocks: parseInt(create[2], 10) };
      return null;
    })
    .filter((r): r is FsRequest => r !== null);

const FileSystems = () => {
  const [method, setMethod] = useState<AllocationMethod>('contiguous');
  const [freeMethod, setFreeMethod] = useState<FreeSpaceMethod>('bit-vector');
  const [input, setInput] = useState('a.txt:4, b.log:3, c.dat:5, delete b.log, big.iso:5');
  const [accessBlock, setAccessBlock] = useState(4);

  const requests = useMemo(() => parseRequests(input), [input]);
  const result = useMemo(
    () => simulateFileSystem(DISK_SIZE, requests, method),
    [requests, method]
  );

  const player = useSimulationPlayer(result.steps, { baseInterval: 1200 });
  const { step, current } = player;

  const disk = step ? step.disk : emptyDisk(DISK_SIZE);
  const files = step ? step.files : [];

  const freeView = useMemo(() => describeFreeSpace(disk, freeMethod), [disk, freeMethod]);
  const cost = accessCost(method, accessBlock);

  const colorFor = (name: string) => {
    const index = files.findIndex(f => f.name === name);
    return FILE_COLORS[(index < 0 ? 0 : index) % FILE_COLORS.length];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <FolderTree className="w-8 h-8 text-primary" />
            </div>
            File System Implementation
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Where a file&rsquo;s blocks actually go on disk, and how the free list keeps track of
            what is left.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="allocation" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
          <TabsTrigger value="allocation" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
            Allocation methods
          </TabsTrigger>
          <TabsTrigger value="free-space" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
            Free-space management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocation" className="space-y-6">
          <Card className="border border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-4">
              <CardTitle>Configuration</CardTitle>
              <CardDescription>A {DISK_SIZE}-block disk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Allocation method</Label>
                  <div className="flex gap-2">
                    {METHODS.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant={method === item.value ? 'default' : 'outline'}
                        onClick={() => setMethod(item.value)}
                        className="flex-1"
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="requests">Operations</Label>
                  <Input id="requests" value={input} onChange={e => setInput(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    <code className="font-mono">name:blocks</code> to create,{' '}
                    <code className="font-mono">delete name</code> to remove.
                  </p>
                </div>
              </div>

              <SimulationControls player={player} label={`Step ${current} / ${result.steps.length}`} />
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle>Disk blocks</CardTitle>
              <CardDescription>
                {step?.narration ?? 'Press play to run the operations against an empty disk.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
                {disk.map(block => (
                  <motion.div
                    key={block.index}
                    layout
                    transition={spring}
                    className={`aspect-square rounded-md border-2 flex flex-col items-center justify-center text-[10px] ${block.file
                      ? block.isIndex
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : `border-transparent ${colorFor(block.file)} text-white`
                      : 'border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground'
                      }`}
                    title={
                      block.file
                        ? `block ${block.index}: ${block.file}${block.isIndex ? ' (index)' : ''}${block.next !== null ? ` → ${block.next}` : ''}`
                        : `block ${block.index}: free`
                    }
                  >
                    <span className="font-mono opacity-70">{block.index}</span>
                    {block.isIndex && <span className="font-bold">idx</span>}
                    {!block.isIndex && block.next !== null && (
                      <span className="font-mono">→{block.next}</span>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                {files.map(file => (
                  <div key={file.name} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded ${colorFor(file.name)}`} />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-muted-foreground font-mono">
                      {method === 'contiguous'
                        ? `start ${file.start}, len ${file.length}`
                        : method === 'indexed'
                          ? `index ${file.start}`
                          : `first ${file.start}`}
                    </span>
                  </div>
                ))}
                {method === 'indexed' && files.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500" />
                    <span className="text-muted-foreground">index block</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cost of reading block i</CardTitle>
              <CardDescription>
                This is the number that actually separates the three methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessBlock">Read block {accessBlock} of a 10-block file</Label>
                <input
                  id="accessBlock"
                  type="range"
                  min={0}
                  max={9}
                  value={accessBlock}
                  onChange={e => setAccessBlock(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {METHODS.map(item => {
                  const c = accessCost(item.value, accessBlock);
                  return (
                    <div
                      key={item.value}
                      className={`rounded-lg border p-3 ${item.value === method ? 'border-primary bg-primary/10' : 'border-border/60 bg-muted/20'
                        }`}
                    >
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <motion.div
                        key={c.accesses}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold font-mono"
                      >
                        {c.accesses}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          disk read{c.accesses === 1 ? '' : 's'}
                        </span>
                      </motion.div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.why}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <ConceptPanel
            title={METHODS.find(m => m.value === method)!.label + ' allocation'}
            explanation={filesystemExplanations[method]}
            narration={step?.narration}
            activeLine={step ? (step.success ? 2 : 1) : undefined}
            alert={
              step && !step.success && step.narration.includes('external fragmentation')
                ? 'Enough total space, but not in one run. Linked and indexed allocation both place this file without difficulty — that is precisely the trade-off they buy.'
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="free-space" className="space-y-6">
          <Card className="border border-border/60 shadow-md bg-background/90">
            <CardHeader className="pb-3">
              <CardTitle>How the free list is stored</CardTitle>
              <CardDescription>
                Same disk state as the allocation tab — step it there and come back to see the
                representation change.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {FREE_METHODS.map(item => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={freeMethod === item.value ? 'default' : 'outline'}
                    onClick={() => setFreeMethod(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
                {disk.map(block => (
                  <div
                    key={block.index}
                    className={`aspect-square rounded-md border flex items-center justify-center text-[10px] font-mono ${block.file
                      ? 'border-border bg-muted/60 text-muted-foreground'
                      : 'border-green-500/50 bg-green-500/15 text-green-400'
                      }`}
                  >
                    {block.file ? '0' : '1'}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {FREE_METHODS.find(f => f.value === freeMethod)!.label} representation
                </div>
                <motion.div
                  key={freeView.representation}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-sm break-all"
                >
                  {freeView.representation}
                </motion.div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {freeView.overheadBits} bits of bookkeeping
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {disk.filter(b => b.file === null).length} free blocks
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground pt-1">{freeView.narration}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {FREE_METHODS.map(item => {
                  const view = describeFreeSpace(disk, item.value);
                  return (
                    <button
                      key={item.value}
                      onClick={() => setFreeMethod(item.value)}
                      className={`text-left rounded-lg border p-3 transition-colors ${item.value === freeMethod
                        ? 'border-primary bg-primary/10'
                        : 'border-border/60 hover:bg-muted/30'
                        }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {view.overheadBits} bits
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FileSystems;
