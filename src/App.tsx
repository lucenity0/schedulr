import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import CPUScheduling from "./pages/CPUScheduling";
import SystemCalls from "./pages/SystemCalls";
import Synchronization from "./pages/Synchronization";
import PageReplacement from "./pages/PageReplacement";
import DiskScheduling from "./pages/DiskScheduling";
import MemoryAllocation from "./pages/MemoryAllocation";
import Deadlock from "./pages/Deadlock";
import RealTimeScheduling from "./pages/RealTimeScheduling";
import NotFound from "./pages/NotFound";
import { Github, Linkedin, Heart } from 'lucide-react';

const queryClient = new QueryClient();

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/schedulr">
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/cpu-scheduling" element={<CPUScheduling />} />
                <Route path="/system-calls" element={<SystemCalls />} />
                <Route path="/synchronization" element={<Synchronization />} />
                <Route path="/page-replacement" element={<PageReplacement />} />
                <Route path="/disk-scheduling" element={<DiskScheduling />} />
                <Route path="/memory-allocation" element={<MemoryAllocation />} />
                <Route path="/deadlock" element={<Deadlock />} />
                <Route path="/real-time" element={<RealTimeScheduling />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      {/* Footer */}
      <footer className="w-full px-4 pt-0 pb-6">
        <div className="max-w-7xl mx-auto rounded-2xl border border-border/60 shadow-md bg-background/90 backdrop-blur-md px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-between gap-y-2 gap-x-4 text-sm text-center md:text-left">
            {/* GitHub Contribution */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-muted-foreground whitespace-nowrap">
              <div className="flex items-center gap-2">
                <Github className="w-[clamp(20px,1.2vw,20px)] h-[clamp(20px,1.2vw,20px)] text-primary" />
                <span>Contribute on</span>
              </div>
              <a
                href="https://github.com/srikrishna-ps/schedulr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                GitHub
              </a>
            </div>

            {/* Contributors */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground whitespace-nowrap">
              <span className="flex items-center gap-1">
                <Github className="w-[clamp(16px,1vw,16px)] h-[clamp(16px,1vw,16px)]" />
                <span className="relative inline-block group">
                  <a
                    href="https://github.com/srikrishna-ps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    srikrishna-ps
                    <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-primary rounded transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </span>
              </span>

              <span className="flex items-center gap-1">
                <Github className="w-[clamp(16px,1vw,16px)] h-[clamp(16px,1vw,16px)]" />
                <span className="relative inline-block group">
                  <a
                    href="https://github.com/lucenity0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    lucenity0
                    <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-primary rounded transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </span>
              </span>

              <span className="flex items-center gap-1">
                <Linkedin className="w-[clamp(16px,1vw,16px)] h-[clamp(16px,1vw,16px)]" />
                <span className="relative inline-block group">
                  <a
                    href="https://www.linkedin.com/in/nafees-s-6770712b0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    Nafees S
                    <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-primary rounded transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </span>
              </span>

              <span className="flex items-center gap-1">
                <Linkedin className="w-[clamp(16px,1vw,16px)] h-[clamp(16px,1vw,16px)]" />
                <span className="relative inline-block group">
                  <a
                    href="https://www.linkedin.com/in/srikrishna-pejathaya-p-s/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    SriKrishna P S
                    <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-primary rounded transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </span>
              </span>
            </div>

            {/* Made with Love */}
            <div className="flex items-center justify-center gap-1 text-muted-foreground whitespace-nowrap text-xs">
              <span>Made with</span>
              <Heart className="text-red-500 animate-pulse w-[clamp(16px,1vw,16px)] h-[clamp(16px,1vw,16px)]" />
              <span>by the Schedulr team</span>
            </div>

          </div>
        </div>
      </footer>
    </>
  );
}


export default App;
