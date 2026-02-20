import React, {useEffect, useMemo, useState} from 'react'
import { useParams } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

const RADIUS = 38
const CIRC = 2 * Math.PI * RADIUS

function CircularProgress({ progress, status }) {
  const isIndeterminate = status === 'queued' || progress === 0
  const offset = isIndeterminate ? CIRC * 0.78 : CIRC * (1 - Math.min(progress, 100) / 100)

  return (
    <div className="relative flex items-center justify-center" style={{width: 120, height: 120}}>
      <div
        className={isIndeterminate ? 'animate-spin' : ''}
        style={isIndeterminate ? {animationDuration: '1.2s'} : {}}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none" stroke="#6366f1" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{transition: isIndeterminate ? 'none' : 'stroke-dashoffset 0.6s ease'}}
          />
        </svg>
      </div>
      {!isIndeterminate && (
        <span className="absolute text-lg font-bold text-indigo-600 dark:text-indigo-400 select-none">
          {progress}%
        </span>
      )}
    </div>
  )
}

export default function ScanDetails(){
  const { id } = useParams()
  const [scan, setScan] = useState(null)
  const [findings, setFindings] = useState([])
  const [assets, setAssets] = useState([])
  const [encryptPassword, setEncryptPassword] = useState('')
  const [encryptError, setEncryptError] = useState('')
  const [encrypting, setEncrypting] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  const summary = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    findings.forEach(f => {
      if (counts[f.severity] !== undefined) counts[f.severity] += 1
    })
    return counts
  }, [findings])

  const sortedFindings = useMemo(() => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }, [findings])

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#dc2626'
      case 'high': return '#dc2626'
      case 'medium': return '#eab308'
      case 'low': return '#6b7280'
      default: return '#6b7280'
    }
  }

  // Initial load
  useEffect(()=>{
    (async ()=>{
      const s = await apiFetch(`/api/v1/scans/${id}`, {credentials: 'include'})
      if(s.ok){ setScan(await s.json()) }
      const f = await apiFetch(`/api/v1/scans/${id}/findings`, {credentials: 'include'})
      if(f.ok){ setFindings(await f.json()) }
      const a = await apiFetch(`/api/v1/assets`, {credentials: 'include'})
      if(a.ok){ setAssets(await a.json()) }
    })()
  },[id])

  // Poll every 2 s while queued or running
  useEffect(() => {
    if (!scan) return
    if (scan.status !== 'queued' && scan.status !== 'running') return
    const interval = setInterval(async () => {
      const s = await apiFetch(`/api/v1/scans/${id}`, {credentials: 'include'})
      if (!s.ok) return
      const data = await s.json()
      setScan(data)
      if (data.status === 'completed' || data.status === 'failed') {
        const f = await apiFetch(`/api/v1/scans/${id}/findings`, {credentials: 'include'})
        if (f.ok) setFindings(await f.json())
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [scan?.status, id])

  const downloadEncryptedReport = async () => {
    setEncryptError('')
    if (!encryptPassword || encryptPassword.length < 6) {
      setEncryptError('Password must be at least 6 characters')
      return
    }
    try {
      setEncrypting(true)
      const res = await apiFetch(`/api/v1/scans/${id}/report-encrypted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: encryptPassword })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to download encrypted report')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scan-${id}.pdf.enc`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setEncryptError(err.message)
    } finally {
      setEncrypting(false)
    }
  }

  async function fetchAiAnalysis() {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await apiFetch(`/api/v1/scans/${id}/ai-analysis`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiError(data.detail || 'AI analysis failed. Please try again.')
        return
      }
      setAiAnalysis(data.analysis)
    } catch (err) {
      setAiError('Network error. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  if(!scan) return <div className="p-8">Loading...</div>

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const isActive = scan.status === 'queued' || scan.status === 'running'

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-2 dark:text-cyber-blue">Scan Report</h1>
      <div className="mb-2 dark:text-gray-300">
        Status: {scan.status}
        {!isActive && <> | Score: <span className={scan.score != null ? getScoreColor(scan.score) + ' font-bold' : ''}>{scan.score ?? 'N/A'}</span></>}
      </div>

      {scan.asset_ids && scan.asset_ids.length > 0 && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded text-sm dark:text-gray-300">
          <div className="font-semibold text-blue-900 dark:text-blue-300">Scanned Assets:</div>
          <ul className="mt-1 ml-2">
            {scan.asset_ids.map(assetId => {
              const asset = assets.find(a => a.id === assetId)
              const parent = asset?.parent_asset_id ? assets.find(a => a.id === asset.parent_asset_id) : null
              return (
                <li key={assetId}>
                  {asset ? (
                    <>
                      {asset.type}: {asset.value}
                      {parent && <span className="ml-2 text-blue-700 dark:text-blue-400">(child of {parent.type}: {parent.value})</span>}
                    </>
                  ) : (
                    'Unknown asset'
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Scan in-progress panel */}
      {isActive && (
        <div className="flex flex-col items-center justify-center py-10 bg-white dark:bg-cyber-dark rounded shadow dark:shadow-cyber mb-4">
          <CircularProgress progress={scan.progress ?? 0} status={scan.status} />
          <div className="mt-4 text-base font-semibold dark:text-white">
            {scan.status === 'queued' ? 'Waiting to start...' : `Scanning... ${scan.progress ?? 0}%`}
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This page updates automatically every few seconds.
          </div>
          {scan.status === 'running' && (
            <div className="mt-3 w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
                style={{width: `${scan.progress ?? 0}%`}}
              />
            </div>
          )}
        </div>
      )}

      {/* Completed / failed report */}
      {!isActive && (
        <>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This report summarizes security issues found on your selected assets, with clear recommendations to fix them.
          </p>
          <div className="bg-white p-4 rounded shadow mb-4 text-sm text-gray-700">
            <div className="font-semibold mb-1">What this scan covers</div>
            <p>
              This is a public‑facing security review (DNS, email protections, TLS, and web security headers). It is not a
              malware or antivirus scan on devices. It helps reduce phishing and exposure risks across your organization.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 p-3 rounded shadow text-sm dark:text-white">Critical: <span className="font-bold">{summary.critical}</span></div>
            <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 p-3 rounded shadow text-sm dark:text-white">High: <span className="font-bold">{summary.high}</span></div>
            <div className="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-800 p-3 rounded shadow text-sm dark:text-white">Medium: <span className="font-bold">{summary.medium}</span></div>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded shadow text-sm dark:text-white">Low: <span className="font-bold">{summary.low}</span></div>
          </div>
          <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber">
            <h2 className="font-semibold mb-3 dark:text-cyber-blue">Findings</h2>

            <div className="mb-4 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-700 dark:text-indigo-300 font-semibold text-sm">AI Analysis</span>
                  <span className="text-xs text-indigo-500 dark:text-indigo-400">Powered by Gemini</span>
                </div>
                {!aiAnalysis && (
                  <button
                    onClick={fetchAiAnalysis}
                    disabled={aiLoading || findings.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
                  >
                    {aiLoading ? 'Analysing...' : 'Explain findings'}
                  </button>
                )}
                {aiAnalysis && (
                  <button
                    onClick={() => { setAiAnalysis(null); setAiError(null); }}
                    className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              {!aiAnalysis && !aiError && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  Get a plain-English summary of your results and a prioritised action list.
                </p>
              )}
              {aiError && <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}
              {aiAnalysis && (
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
              )}
            </div>

            {findings.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No findings recorded for this scan.</div>
            )}
            <ul>
              {sortedFindings.map(f=>(
                <li key={f.id} className="mb-3 border-l-4 pl-3 dark:bg-gray-800 dark:bg-opacity-50 py-2 rounded-r" style={{borderColor: getSeverityColor(f.severity)}}>
                  <div className="font-bold dark:text-white">[{f.severity.toUpperCase()}] {f.title}</div>
                  <div className="text-sm mt-1 dark:text-gray-300">Why it matters: this item could expose data or services if left unresolved.</div>
                  <div className="text-sm mt-1 dark:text-gray-300">Evidence: <pre className="whitespace-pre-wrap dark:text-gray-400">{JSON.stringify(f.evidence)}</pre></div>
                  <div className="text-sm mt-1 italic dark:text-gray-300">Recommendation: {f.recommendation}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <a href={`/api/v1/scans/${id}/report`} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-3 py-1 rounded">Download PDF Report</a>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-4">
                <div className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">Encrypt report (recommended for sharing)</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Use a strong, unique password and store it safely. This password cannot be recovered.
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Enter a password (min 6 chars)"
                    className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 rounded w-full dark:text-white dark:placeholder-gray-400"
                    value={encryptPassword}
                    onChange={e => setEncryptPassword(e.target.value)}
                    autoComplete="new-password"
                    name="report_password"
                    spellCheck={false}
                  />
                  <button
                    onClick={downloadEncryptedReport}
                    disabled={encrypting}
                    className="bg-emerald-600 text-white px-3 py-2 rounded disabled:opacity-60 hover:bg-emerald-700 whitespace-nowrap"
                  >
                    {encrypting ? 'Encrypting...' : 'Download Encrypted Report'}
                  </button>
                </div>
                {encryptError && <div className="text-sm text-red-600 dark:text-red-400 mt-2">{encryptError}</div>}
                <div className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
                  Keep this password safe. You'll need it to decrypt the file later.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
