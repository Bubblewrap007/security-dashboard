import React, {useEffect, useMemo, useState} from 'react'
import { useParams } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'

export default function ScanDetails(){
  const { id } = useParams()
  const [scan, setScan] = useState(null)
  const [findings, setFindings] = useState([])
  const [assets, setAssets] = useState([])
  const [encryptPassword, setEncryptPassword] = useState('')
  const [encryptError, setEncryptError] = useState('')
  const [encrypting, setEncrypting] = useState(false)

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

  useEffect(()=>{
    (async ()=>{
      const s = await fetch(`/api/v1/scans/${id}`, {credentials: 'include'})
      if(s.ok){ setScan(await s.json()) }
      const f = await fetch(`/api/v1/scans/${id}/findings`, {credentials: 'include'})
      if(f.ok){ setFindings(await f.json()) }
      const a = await fetch(`/api/v1/assets`, {credentials: 'include'})
      if(a.ok){ setAssets(await a.json()) }
    })()
  },[id])

  const downloadEncryptedReport = async () => {
    setEncryptError('')
    if (!encryptPassword || encryptPassword.length < 6) {
      setEncryptError('Password must be at least 6 characters')
      return
    }
    try {
      setEncrypting(true)
      const res = await fetch(`/api/v1/scans/${id}/report-encrypted`, {
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

  if(!scan) return <div className="p-8">Loading...</div>

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-2 dark:text-cyber-blue">Scan Report</h1>
      <div className="mb-2 dark:text-gray-300">Status: {scan.status} | Score: <span className={scan.score != null ? getScoreColor(scan.score) + ' font-bold' : ''}>{scan.score ?? 'N/A'}</span></div>
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
                      {parent && <span className="ml-2 text-blue-700 dark:text-blue-400">🔗 (child of {parent.type}: {parent.value})</span>}
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
        <h2 className="font-semibold mb-2 dark:text-cyber-blue">Findings</h2>
        {findings.length === 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">No findings yet. If a scan is still running, check back in a few minutes.</div>
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
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="password"
                placeholder="Enter a password (min 6 chars)"
                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 rounded w-full dark:text-white dark:placeholder-gray-400"
                value={encryptPassword}
                onChange={e => setEncryptPassword(e.target.value)}
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
              Keep this password safe. You’ll need it to decrypt the file later.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
