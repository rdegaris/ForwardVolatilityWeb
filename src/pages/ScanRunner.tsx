import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface ScanLog {
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const FUTURES_MAP: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  RTY: 'RTY=F',
  YM: 'YM=F',
  GC: 'GC=F',
  SI: 'SI=F',
  CL: 'CL=F',
  NG: 'NG=F',
  '6E': '6E=F',
  '6J': '6J=F',
  '6B': '6B=F',
  ZB: 'ZB=F',
  ZN: 'ZN=F',
};

export default function ScanRunner() {
  const [isRunningCloud, setIsRunningCloud] = useState(false);
  const [githubPat, setGithubPat] = useState<string>(() => localStorage.getItem('ozcta_github_pat') || '');
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [statusText, setStatusText] = useState<string>('Ready');

  const addLog = useCallback((message: string, type: ScanLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, type, message }]);
  }, []);

  const handleSavePat = (val: string) => {
    setGithubPat(val);
    localStorage.setItem('ozcta_github_pat', val);
  };

  // 1. Trigger GitHub Actions Workflow Dispatch
  const triggerGitHubAction = async () => {
    if (!githubPat.trim()) {
      addLog('⚠️ GitHub Personal Access Token (PAT) is required to trigger cloud action directly from browser.', 'warning');
      addLog('💡 You can also trigger it in 1 click at https://github.com/rdegaris/ForwardVolatilityWeb/actions', 'info');
      window.open('https://github.com/rdegaris/ForwardVolatilityWeb/actions/workflows/daily_futures_scan.yml', '_blank');
      return;
    }

    try {
      setIsRunningCloud(true);
      setStatusText('Triggering GitHub Actions Workflow…');
      addLog('Sending workflow_dispatch request to GitHub REST API…', 'info');

      const res = await fetch(
        'https://api.github.com/repos/rdegaris/ForwardVolatilityWeb/actions/workflows/daily_futures_scan.yml/dispatches',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubPat.trim()}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            ref: 'main',
          }),
        }
      );

      if (res.status === 204) {
        addLog('✅ GitHub Actions workflow triggered successfully! Cloud runner is executing.', 'success');
        addLog('⏳ Scans, stop/target monitoring, and deployment will complete in ~60-90s.', 'info');
        setStatusText('Cloud scan running on GitHub Actions');
      } else {
        const text = await res.text();
        addLog(`❌ GitHub API Error (${res.status}): ${text}`, 'error');
        setStatusText('Error triggering cloud workflow');
      }
    } catch (err: any) {
      addLog(`❌ Network error: ${err?.message || err}`, 'error');
      setStatusText('Network error');
    } finally {
      setIsRunningCloud(false);
    }
  };

  // 2. Direct Link to GitHub Actions
  const openGitHubActions = () => {
    window.open('https://github.com/rdegaris/ForwardVolatilityWeb/actions/workflows/daily_futures_scan.yml', '_blank');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 p-6 md:p-10 border border-slate-800 shadow-2xl backdrop-blur">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Scan Command & Control Desk
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
              On-Demand Scanner Runner
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
              Manually trigger full futures market scans, recalculate Trendorama, The Bradman, YouHaveChosenWisely, TooHot TooCold, and The Linda signals, and update the paper trading ledger & stops.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/executed-trades"
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              View Executed Trades →
            </Link>
          </div>
        </div>
      </div>

      {/* Control Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cloud Trigger Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-xl backdrop-blur space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl font-bold">
                ⚡
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-100">Trigger Cloud Scan (GitHub Actions)</h2>
                <p className="text-xs text-slate-400">Runs full scan in GitHub cloud & auto-deploys updated data</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                GitHub Token (Optional - for 1-click in-browser trigger)
              </label>
              <input
                type="password"
                placeholder="github_pat_... (leave empty to open GitHub directly)"
                value={githubPat}
                onChange={(e) => handleSavePat(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Stored safely only in your browser local storage.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={triggerGitHubAction}
                disabled={isRunningCloud}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition"
              >
                {isRunningCloud ? '⏳ Sending Dispatch…' : '⚡ Run Cloud Scanner Now'}
              </button>

              <button
                onClick={openGitHubActions}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Open GitHub Actions Tab ↗
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Automated Scans Schedule</div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• <strong>Scan 1:</strong> 5:30 PM ET (21:30 UTC) Mon–Fri — Post-market settlement run</li>
              <li>• <strong>Scan 2:</strong> 8:30 PM ET (00:30 UTC) Mon–Fri — Finalized daily close confirmation</li>
              <li>• <strong>On-Demand:</strong> Anytime via this page or GitHub Actions tab</li>
            </ul>
          </div>
        </div>

        {/* Status & Terminal Log Output */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-xl backdrop-blur flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-black text-slate-100">Live Execution Console</h2>
            </div>
            <span className="rounded-lg bg-slate-800 px-3 py-1 text-[11px] font-mono font-bold text-slate-300">
              {statusText}
            </span>
          </div>

          <div className="flex-1 min-h-[260px] max-h-[340px] overflow-y-auto rounded-2xl border border-slate-800/90 bg-slate-950 p-4 font-mono text-xs space-y-2">
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-600">
                Console idle. Click "Run Cloud Scanner Now" to trigger.
              </div>
            ) : (
              logs.map((l, i) => {
                const color =
                  l.type === 'success'
                    ? 'text-emerald-400'
                    : l.type === 'warning'
                    ? 'text-amber-400'
                    : l.type === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-300';
                return (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0">[{l.time}]</span>
                    <span className={color}>{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 13 Futures Instruments Monitored */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-xl backdrop-blur">
        <h3 className="text-base font-black text-slate-100 mb-4">Universe of 13 Tracked Futures Contracts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(FUTURES_MAP).map(([sym, ticker]) => (
            <div key={sym} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
              <div className="text-sm font-bold font-mono text-slate-100">{sym}</div>
              <div className="text-[10px] font-mono text-slate-500">{ticker}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
