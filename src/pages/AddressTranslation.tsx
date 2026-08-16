import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NumberField } from '@/components/NumberField';
import { ConceptPanel } from '@/components/ConceptPanel';
import { addressingExplanations } from '@/lib/explanations';
import { spring, swift } from '@/lib/motion';
import {
  PageTableEntry,
  Segment,
  TlbEntry,
  effectiveAccessTime,
  pageTableSize,
  translatePaged,
  translateSegmented,
  updateTlb
} from '@/lib/algorithms/addressing';
import { MemoryStick, MoveRight } from 'lucide-react';

const DEFAULT_FRAMES = [5, 6, 1, 2, 9, 11, 7, 3];

const Paging = () => {
  const [pageSize, setPageSize] = useState(4);
  const [address, setAddress] = useState(13);
  const [tlbSize] = useState(2);
  const [tlb, setTlb] = useState<TlbEntry[]>([]);
  const [clock, setClock] = useState(0);
  const [pageTable, setPageTable] = useState<PageTableEntry[]>(
    DEFAULT_FRAMES.map(frame => ({ frame, valid: true, dirty: false, referenced: false }))
  );
  const [hitRatio, setHitRatio] = useState(80);

  const config = useMemo(
    () => ({
      logicalSize: pageTable.length * pageSize,
      physicalSize: 64,
      pageSize,
      pageTable,
      tlbSize
    }),
    [pageTable, pageSize, tlbSize]
  );

  const result = useMemo(() => translatePaged(address, config, tlb), [address, config, tlb]);

  const translate = () => {
    if (result.frame !== null) {
      setTlb(prev => updateTlb(prev, result.pageNumber, result.frame!, tlbSize, clock));
      setClock(c => c + 1);
    }
  };

  const toggleValid = (index: number) =>
    setPageTable(prev =>
      prev.map((entry, i) => (i === index ? { ...entry, valid: !entry.valid } : entry))
    );

  const eat = effectiveAccessTime(hitRatio / 100, 100, 20);
  const tableCost = pageTableSize(2 ** 32, 4096);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>
              {pageTable.length} pages of {pageSize} bytes = {config.logicalSize}-byte logical space.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pageSize">Page size (bytes)</Label>
              <NumberField id="pageSize" min={1} max={64} value={pageSize} onChange={setPageSize} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Logical address</Label>
              <NumberField
                id="address"
                min={0}
                max={config.logicalSize - 1}
                value={address}
                onChange={setAddress}
              />
            </div>
            <Button onClick={translate} className="w-full" disabled={result.frame === null}>
              Translate and cache in TLB
            </Button>

            <div className="border-t border-border/60 pt-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                TLB ({tlb.length}/{tlbSize})
              </div>
              <div className="space-y-1.5 min-h-[52px]">
                <AnimatePresence mode="popLayout">
                  {tlb.map(entry => (
                    <motion.div
                      key={entry.page}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={spring}
                      className={`flex justify-between px-2 py-1 rounded-md text-xs font-mono border ${entry.page === result.pageNumber
                        ? 'border-primary bg-primary/15'
                        : 'border-border bg-muted/30'
                        }`}
                    >
                      <span>page {entry.page}</span>
                      <span className="text-primary">frame {entry.frame}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!tlb.length && (
                  <p className="text-xs text-muted-foreground">
                    Empty — the first access to any page must walk the page table.
                  </p>
                )}
              </div>
              {tlb.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => setTlb([])}>
                  Flush TLB
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Translation walkthrough */}
        <Card className="lg:col-span-2 border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Translating {address}</CardTitle>
            <CardDescription>{result.narration}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address split */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Logical address</div>
                <div className="px-4 py-3 rounded-lg border-2 border-border bg-card font-mono text-xl">
                  {address}
                </div>
              </div>
              <MoveRight className="w-5 h-5 text-muted-foreground" />
              <div className="flex gap-1">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">page</div>
                  <div className="px-4 py-3 rounded-l-lg border-2 border-primary/60 bg-primary/10 font-mono text-xl">
                    {result.pageNumber}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">offset</div>
                  <div className="px-4 py-3 rounded-r-lg border-2 border-border bg-muted/40 font-mono text-xl">
                    {result.offset}
                  </div>
                </div>
              </div>
              <MoveRight className="w-5 h-5 text-muted-foreground" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Physical address</div>
                <motion.div
                  key={String(result.physicalAddress)}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                  className={`px-4 py-3 rounded-lg border-2 font-mono text-xl ${result.physicalAddress === null
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-green-500/60 bg-green-500/10 text-green-400'
                    }`}
                >
                  {result.physicalAddress ?? 'trap'}
                </motion.div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {result.tlbHit && <Badge className="bg-green-500/20 text-green-400 border-green-500/40">TLB hit — 1 memory access</Badge>}
              {!result.tlbHit && !result.invalid && !result.pageFault && (
                <Badge variant="outline">TLB miss — 2 memory accesses</Badge>
              )}
              {result.pageFault && <Badge variant="destructive">Page fault</Badge>}
              {result.invalid && <Badge variant="destructive">Invalid address</Badge>}
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {result.steps.map((step, index) => (
                <motion.div
                  key={`${step.label}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...swift, delay: index * 0.06 }}
                  className="flex gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20"
                >
                  <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-mono">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.detail}</div>
                    {step.value && (
                      <div className="text-xs font-mono text-primary mt-0.5">{step.value}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page table */}
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Page table</CardTitle>
          <CardDescription>
            Click a valid bit to clear it and watch that page fault instead of translating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {pageTable.map((entry, index) => (
              <motion.button
                key={index}
                onClick={() => toggleValid(index)}
                animate={{
                  scale: index === result.pageNumber ? 1.06 : 1
                }}
                transition={spring}
                className={`w-24 rounded-lg border-2 p-2 text-center ${index === result.pageNumber
                  ? 'border-primary bg-primary/10'
                  : entry.valid
                    ? 'border-border bg-card hover:border-primary/40'
                    : 'border-destructive/40 bg-destructive/5'
                  }`}
              >
                <div className="text-[10px] text-muted-foreground font-mono">page {index}</div>
                <div className="font-mono font-bold">
                  {entry.valid ? `f${entry.frame}` : '—'}
                </div>
                <div className={`text-[10px] font-mono ${entry.valid ? 'text-green-500' : 'text-destructive'}`}>
                  valid {entry.valid ? 1 : 0}
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Why a TLB */}
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Why the TLB matters</CardTitle>
          <CardDescription>
            Assuming 100 ns memory and a 20 ns TLB lookup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hitRatio">TLB hit ratio: {hitRatio}%</Label>
            <input
              id="hitRatio"
              type="range"
              min={0}
              max={100}
              value={hitRatio}
              onChange={e => setHitRatio(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Effective access time</div>
              <motion.div
                key={eat.toFixed(0)}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold font-mono text-primary"
              >
                {eat.toFixed(0)} ns
              </motion.div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Slowdown vs raw memory</div>
              <div className="text-2xl font-bold font-mono">{(eat / 100).toFixed(2)}×</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Flat page table, 32-bit space</div>
              <div className="text-2xl font-bold font-mono">
                {(tableCost.bytes / 1024 / 1024).toFixed(0)} MB
              </div>
              <div className="text-[10px] text-muted-foreground">per process — hence multi-level tables</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConceptPanel
        title="paging"
        explanation={addressingExplanations.paging}
        narration={result.narration}
        activeLine={result.tlbHit ? 3 : result.pageFault ? 6 : 5}
        alert={
          result.pageFault
            ? 'A page fault is not an error — it is the normal mechanism of demand paging. The OS loads the page and restarts the instruction as if nothing happened.'
            : undefined
        }
      />
    </div>
  );
};

const Segmentation = () => {
  const [segments] = useState<Segment[]>([
    { name: 'subroutine', base: 1400, limit: 1000 },
    { name: 'sqrt', base: 6300, limit: 400 },
    { name: 'main', base: 4300, limit: 400 },
    { name: 'stack', base: 3200, limit: 1100 },
    { name: 'symbol table', base: 4700, limit: 1000 }
  ]);
  const [segment, setSegment] = useState(2);
  const [offset, setOffset] = useState(53);

  const result = useMemo(
    () => translateSegmented(segment, offset, segments),
    [segment, offset, segments]
  );

  const maxAddress = Math.max(...segments.map(s => s.base + s.limit));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reference</CardTitle>
            <CardDescription>An address is a &lt;segment, offset&gt; pair.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="segment">Segment number</Label>
              <NumberField
                id="segment"
                min={0}
                max={segments.length - 1}
                value={segment}
                onChange={setSegment}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offset">Offset</Label>
              <NumberField id="offset" min={0} max={2000} value={offset} onChange={setOffset} />
              <p className="text-xs text-muted-foreground">
                Push this past the segment&rsquo;s limit to trigger a trap.
              </p>
            </div>
            <div
              className={`rounded-lg border-2 p-3 text-center ${result.trapped
                ? 'border-destructive bg-destructive/10'
                : 'border-green-500/50 bg-green-500/10'
                }`}
            >
              <div className="text-xs text-muted-foreground">Physical address</div>
              <div className={`text-2xl font-bold font-mono ${result.trapped ? 'text-destructive' : 'text-green-400'}`}>
                {result.physicalAddress ?? 'TRAP'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/60 shadow-md bg-background/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Segment table</CardTitle>
            <CardDescription>{result.narration}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/60">
                    <th className="text-left py-1.5 px-2">#</th>
                    <th className="text-left py-1.5 px-2">Segment</th>
                    <th className="text-right py-1.5 px-2">Base</th>
                    <th className="text-right py-1.5 px-2">Limit</th>
                    <th className="text-right py-1.5 px-2">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((item, index) => (
                    <motion.tr
                      key={item.name}
                      animate={{
                        backgroundColor:
                          index === segment ? 'hsl(var(--primary) / 0.12)' : 'transparent'
                      }}
                      className="border-b border-border/40"
                    >
                      <td className="py-1.5 px-2 font-mono">{index}</td>
                      <td className="py-1.5 px-2">{item.name}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{item.base}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{item.limit}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">
                        {item.base}–{item.base + item.limit - 1}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Physical memory map */}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Physical memory
              </div>
              <div className="relative h-16 rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                {segments.map((item, index) => (
                  <div
                    key={item.name}
                    className={`absolute top-0 h-full border-r border-background/40 flex items-center justify-center text-[10px] ${index === segment ? 'bg-primary/40' : 'bg-muted-foreground/20'
                      }`}
                    style={{
                      left: `${(item.base / maxAddress) * 100}%`,
                      width: `${(item.limit / maxAddress) * 100}%`
                    }}
                    title={`${item.name}: ${item.base}–${item.base + item.limit - 1}`}
                  >
                    {index}
                  </div>
                ))}
                {!result.trapped && result.physicalAddress !== null && (
                  <motion.div
                    animate={{ left: `${(result.physicalAddress / maxAddress) * 100}%` }}
                    transition={spring}
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground z-10"
                  />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Segments vary in size and sit at arbitrary addresses — which is why segmentation
                brings back the external fragmentation that paging eliminated.
              </p>
            </div>

            <div className="space-y-2">
              {result.steps.map((step, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20"
                >
                  <span className="w-5 h-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-mono">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.detail}</div>
                    {step.value && (
                      <div className="text-xs font-mono text-primary mt-0.5">{step.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ConceptPanel
        title="segmentation"
        explanation={addressingExplanations.segmentation}
        narration={result.narration}
        activeLine={result.trapped ? 3 : 4}
        alert={
          result.trapped
            ? 'The hardware caught this before the memory was touched. Under pure paging the same overrun would have landed in a neighbouring page and corrupted it silently.'
            : undefined
        }
      />
    </div>
  );
};

const AddressTranslation = () => (
  <div className="space-y-6 max-w-7xl mx-auto">
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
          <div className="p-2 bg-primary/20 rounded-lg">
            <MemoryStick className="w-8 h-8 text-primary" />
          </div>
          Address Translation
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          How a logical address becomes a physical one. This is the &ldquo;paging&rdquo; of memory
          management &mdash; a different question from page <em>replacement</em>, which decides what
          to evict.
        </p>
      </CardHeader>
    </Card>

    <Tabs defaultValue="paging" className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
        <TabsTrigger value="paging" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Paging &amp; TLB
        </TabsTrigger>
        <TabsTrigger value="segmentation" className="py-2.5 font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
          Segmentation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="paging">
        <Paging />
      </TabsContent>
      <TabsContent value="segmentation">
        <Segmentation />
      </TabsContent>
    </Tabs>
  </div>
);

export default AddressTranslation;
