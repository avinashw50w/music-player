
import React, { useState } from 'react';
import { FolderSearch, Square, Loader2 } from 'lucide-react';
import { ScanStatus, scanLibrary, stopScan } from '../services/api';

interface LibraryScannerProps {
  scanStatus: ScanStatus | null;
  isScanning: boolean;
  scanError: string | null;
  onScanStart: (scanning: boolean) => void;
  onScanError: (err: string | null) => void;
}

export const LibraryScanner: React.FC<LibraryScannerProps> = ({ 
  scanStatus, isScanning, scanError, onScanStart, onScanError 
}) => {
  const [scanPath, setScanPath] = useState('');
  const [isStopping, setIsStopping] = useState(false);

  const handleScan = async () => {
    if (!scanPath.trim()) return;
    try {
      onScanStart(true);
      onScanError(null);
      await scanLibrary(scanPath);
    } catch (e: any) {
      onScanError(e.message || 'Failed to start scan');
      onScanStart(false);
    }
  };

  const handleStop = async () => {
      setIsStopping(true);
      try {
          await stopScan();
          // The SSE 'scan:complete' event will eventually set isScanning to false
      } catch (e) {
          console.error(e);
      } finally {
          setIsStopping(false);
      }
  };

  return (
    <div className="mb-14 bg-gradient-to-br from-[#1e1e24] to-[#151518] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden animate-fade-in-up delay-100">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="relative z-10">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <FolderSearch className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-white">Scan Local Library</h2>
                  <p className="text-slate-400">Enter the absolute path to your music folder</p>
              </div>
           </div>

           {!isScanning ? (
               <div className="flex gap-4">
                  <div className="flex-1">
                      <input 
                          type="text" 
                          value={scanPath}
                          onChange={(e) => setScanPath(e.target.value)}
                          placeholder="Enter path (e.g. C:\Music)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                      />
                  </div>
                  <button 
                      onClick={handleScan}
                      disabled={!scanPath.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  >
                      Start Scan
                  </button>
               </div>
           ) : (
               <div className="bg-black/40 rounded-xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                           <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                           <span className="text-indigo-300 font-bold text-sm uppercase tracking-wider">Scanning...</span>
                       </div>
                       <div className="flex items-center gap-4">
                           <span className="text-white font-bold tabular-nums">{scanStatus?.progress || 0}%</span>
                           <button 
                                onClick={handleStop}
                                disabled={isStopping}
                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-rose-500/20 disabled:opacity-50 cursor-pointer"
                           >
                                {isStopping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3 fill-current" />}
                                Stop
                           </button>
                       </div>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                      <div 
                          className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                          style={{ width: `${scanStatus?.progress || 0}%` }}
                      ></div>
                  </div>
                  <p className="text-slate-400 text-sm font-mono truncate">
                      {scanStatus?.currentFile || 'Initializing...'}
                  </p>
               </div>
           )}

           {scanError && (
               <div className="mt-4 text-rose-400 text-sm font-medium bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">
                   {scanError}
               </div>
           )}
      </div>
    </div>
  );
};
