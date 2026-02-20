import React, {useEffect, useState} from 'react'
import Modal from '../components/Modal'
import { Link } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

export default function Scans(){
  const [assets, setAssets] = useState([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [scans, setScans] = useState([])
  const [breachUsage, setBreachUsage] = useState({count: 0, limit: 2, date: ''})
  const [showConfirm, setShowConfirm] = useState(false)

  async function fetchAssets(){
    const res = await apiFetch(`/api/v1/assets`, {credentials: 'include'})
    if(res.ok){ setAssets(await res.json()) }
  }
  useEffect(()=>{
    fetchAssets(); fetchScans(); fetchBreachUsage();
  },[])

  async function fetchBreachUsage() {
    const res = await apiFetch('/api/v1/scans/email-breach-usage', {credentials: 'include'})
    if(res.ok) setBreachUsage(await res.json())
  }

  const assetMap = React.useMemo(() => {
    const map = new Map()
    assets.forEach(a => map.set(a.id, `${a.type}: ${a.value}`))
    return map
  }, [assets])

  async function startScan(){
    if(!selectedAssetId) return
    if(isEmailSelected) {
      await fetchBreachUsage();
      if(breachUsage.count >= breachUsage.limit) return;
    }
    setShowConfirm(true);
  }

  async function confirmScan() {
    setShowConfirm(false);
    const res = await apiFetch(`/api/v1/scans`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({asset_ids: [selectedAssetId]})
    })
    if(res.ok){
      setSelectedAssetId('')
      fetchScans()
      fetchBreachUsage()
    }
  }

  async function fetchScans(){
      const res = await apiFetch(`/api/v1/scans`, {credentials: 'include'})
    if(res.ok){ setScans(await res.json()) }
  }

  async function handleDelete(scanId){
    const ok = window.confirm('Delete this scan and its findings?')
    if(!ok) return
    const res = await apiFetch(`/api/v1/scans/${scanId}`, {method: 'DELETE', credentials: 'include'})
    if(res.ok){ fetchScans() }
  }

  // Find the selected asset type
  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const isEmailSelected = selectedAsset && selectedAsset.type === 'email';

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-2">New Scan</h1>
      <p className="text-gray-600 mb-3">
        Scans check your assets for common security issues. Pick the assets you want to review, then start a scan.
      </p>
      <div className="bg-white p-4 rounded shadow mb-4 text-sm text-gray-700">
        <div className="font-semibold mb-1">Why this is more than antivirus</div>
        <p>
          Antivirus looks for malware on a single device. These scans review your public‑facing setup—DNS records,
          email protections (SPF/DMARC/DKIM), TLS/SSL configuration, and website security headers—to reduce phishing
          risk and exposed services across your organization.
        </p>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold" title="Scans run one asset at a time for clearer results.">Select one asset</h3>
        <div className="space-y-2">
          {assets.map(a=> (
            <label key={a.id} className="block">
              <input type="radio" name="scan-asset" value={a.id} checked={selectedAssetId===a.id} onChange={e=>setSelectedAssetId(e.target.value)} /> {a.type}: {a.value}
            </label>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">Tip: Run separate scans if you want results per asset.</div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={startScan}
            disabled={
              !selectedAssetId ||
              (isEmailSelected && breachUsage.count >= breachUsage.limit)
            }
            className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-green-700"
          >
            Start Scan
          </button>
          {isEmailSelected && breachUsage.count >= breachUsage.limit && (
            <span className="text-xs text-red-600 ml-2">You have reached your daily email breach scan limit ({breachUsage.limit}). Upgrade your plan to unlock more scans.</span>
          )}
                <Modal
                  open={showConfirm}
                  onClose={()=>setShowConfirm(false)}
                  title="Confirm Scan"
                  confirmText="Start Scan"
                  onConfirm={confirmScan}
                >
                  <div>
                    {isEmailSelected ? (
                      <>
                        <div className="mb-2">You have a limit of {breachUsage.limit} email breach scans per day on the free plan.</div>
                        <div className="mb-2">You have used {breachUsage.count} out of {breachUsage.limit} scans today.</div>
                        <div>Upgrade your plan to unlock unlimited scans.</div>
                      </>
                    ) : (
                      <div>Start a security scan for <strong>{selectedAsset?.value}</strong>?</div>
                    )}
                  </div>
                </Modal>
          <button onClick={fetchScans} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" title="Refresh scan list">🔄 Refresh</button>
          {scans.some(s => s.status === 'queued') && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">💡 Scans queued - refresh to check status</span>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">My Scans</h2>
        <p className="text-gray-600 mb-3 text-sm">
          Score is a simple 0–100 summary. Higher is better. Status shows whether a scan is queued, running, or complete.
          If a scan stays queued, the background worker may still be processing it.
        </p>
        <ul className="space-y-2">
          {scans.map((s, idx)=>(
            <li key={s.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
              <div>
                <div className="font-bold">Scan #{scans.length - idx}</div>
                <div className="text-sm">
                  <span title="Queued = waiting for worker. Running = in progress. Completed = finished.">Status: {s.status}</span>
                  <span title="Score is a 0–100 summary of findings severity."> | Score: {s.score ?? 'N/A'}</span>
                </div>
                {s.status === 'failed' && (
                  <div className="text-xs text-red-600 mt-1">
                    Scan failed to start. {s.error_message ? `Reason: ${s.error_message}` : 'Please try again or contact support.'}
                  </div>
                )}
                <div className="text-xs text-gray-500">Assets: {(s.asset_ids || []).map(id => assetMap.get(id) || id).join(', ')}</div>
              </div>
              <div className="flex items-center space-x-3">
                <Link className="text-blue-600 dark:text-cyber-blue" to={`/scans/${s.id}`}>View</Link>
                <button onClick={()=>handleDelete(s.id)} className="text-sm text-red-600 dark:text-red-500 hover:underline font-semibold">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
