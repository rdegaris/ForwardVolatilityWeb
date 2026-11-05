import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ArrowUpRightIcon, PlayIcon } from '../components/Icons';

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
  DX: 'DX-Y.NYB',
  ZB: 'ZB=F',
  ZN: 'ZN=F',
};

export default function ScanRunner() {
  const [isRunningCloud, setIsRunningCloud] = useState(false);
  const [githubPat, setGithubPat] = useState<string>(() => localStorage.getItem('ozcta_github_pat') || '');
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [statusText, setStatusText] = useState<string>('Idle');

  const addLog = useCallback((message: string, type: ScanLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, type, message }]);
  }, []);

  const handleSavePat = (val: string) => {
    setGithubPat(val);
    localStorage.setItem('ozcta_github_pat', val);
  };

  const triggerGitHubAction = async () => {
    if (!githubPat.trim()) {
      addLog('GitHub Personal Access Token (PAT) is required to trigger workflow_dispatch from the browser.', 'warning');
      addLog('Opening GitHub Actions workflow page in a new tab.', 'info');
      window.open('https://github.com/rdegaris/ForwardVolatilityWeb/actions/workflows/daily_futures_scan.yml', '_blank');
      return;
    }

    try {
      setIsRunningCloud(true);
      setStatusText('Dispatching workflow…');
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
        addLog('GitHub Actions workflow dispatched. Cloud runner is executing.', 'success');
        addLog('Scans, stop/target evaluation, and deployment complete in ~60–90s.', 'info');
        setStatusText('Running on GitHub Actions');
      } else {
        const text = await res.text();
        addLog(`GitHub API error (${res.status}): ${text}`, 'error');
        setStatusText('Dispatch failed');
      }
    } catch (err: any) {
      addLog(`Network error: ${err?.message || err}`, 'error');
      setStatusText('Network error');
    } finally {
      setIsRunningCloud(false);
    }
  };

  const openGitHubActions = () => {
    window.open('https://github.com/rdegaris/ForwardVolatilityWeb/actions/workflows/daily_futures_scan.yml', '_blank');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <section className="desk-surface rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>Scanner dispatch desk</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
              On-demand scanner runner
            </h1>
            <p className="mt-2 text-sm text-desk-secondary max-w-2xl leading-relaxed">
              Trigger full futures market scans across Trendorama, The Bradman, YouHaveChosenWisely, TooHot TooCold, and The Linda, then refresh stops and execution logs.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              to="/executed-trades"
              className="desk-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <span>Executed trades</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Control Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="desk-surface rounded-2xl p-6 space-y-5">
          <div className="border-b border-hairline pb-4">
            <h2 className="text-base font-semibold text-desk-text">Trigger cloud scan (GitHub Actions)</h2>
            <p className="text-xs text-desk-muted mt-0.5">Executes the full Python pipeline and publishes updated JSON feeds</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                GitHub personal access token (optional for direct browser dispatch)
              </label>
              <input
                type="password"
                placeholder="github_pat_… (leave blank to open GitHub Actions)"
                value={githubPat}
                onChange={(e) => handleSavePat(e.target.value)}
                className="desk-input w-full px-3.5 py-2 text-xs font-mono"
              />
              <p className="mt-1.5 text-[11px] text-desk-muted">
                Stored locally in browser storage (`ozcta_github_pat`).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={triggerGitHubAction}
                disabled={isRunningCloud}
                className="desk-btn-primary px-4 py-2.5 text-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                <span>{isRunningCloud ? 'Sending dispatch…' : 'Run cloud scanner'}</span>
              </button>

              <button
                onClick={openGitHubActions}
                className="desk-btn-secondary px-4 py-2.5 text-xs inline-flex items-center gap-1.5"
              >
                <span>Open GitHub Actions</span>
                <ArrowUpRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="desk-well rounded-xl p-4 space-y-2">
            <div className="text-xs font-medium text-desk-text">Scheduled scan windows</div>
            <ul className="text-xs text-desk-secondary space-y-1 font-mono tabular-nums">
              <li>17:30 ET (21:30 UTC) Mon–Fri · Post-settlement scan</li>
              <li>20:30 ET (00:30 UTC) Mon–Fri · Globex Asia session confirmation</li>
              <li>On-demand · Manual workflow dispatch</li>
            </ul>
          </div>
        </div>

        {/* Status & Console */}
        <div className="desk-surface rounded-2xl p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isRunningCloud ? 'bg-desk-amber' : 'bg-desk-up'}`} />
              <h2 className="text-base font-semibold text-desk-text">Execution console</h2>
            </div>
            <span className="desk-tag font-mono">{statusText}</span>
          </div>

          <div className="flex-1 min-h-[240px] max-h-[320px] overflow-y-auto rounded-xl border border-hairline bg-desk-deep p-4 font-mono text-xs space-y-2 tabular-nums">
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-desk-muted">
                Console idle. Select &ldquo;Run cloud scanner&rdquo; to dispatch.
              </div>
            ) : (
              logs.map((l, i) => {
                const color =
                  l.type === 'success'
                    ? 'text-desk-up'
                    : l.type === 'warning'
                    ? 'text-desk-amber'
                    : l.type === 'error'
                    ? 'text-desk-down'
                    : 'text-desk-secondary';
                return (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-desk-muted shrink-0">[{l.time}]</span>
                    <span className={color}>{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Monitored Futures Contracts */}
      <div className="desk-surface rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-desk-text mb-4">
          Monitored futures universe ({Object.keys(FUTURES_MAP).length} contracts)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Object.entries(FUTURES_MAP).map(([sym, ticker]) => (
            <div key={sym} className="desk-well rounded-xl p-3 text-center">
              <div className="text-sm font-semibold font-mono text-desk-text">{sym}</div>
              <div className="text-[11px] font-mono text-desk-muted mt-0.5">{ticker}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
