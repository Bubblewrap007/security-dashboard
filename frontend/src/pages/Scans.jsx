import React, {useEffect, useState, useMemo} from 'react'
import Modal from '../components/Modal'
import { Link } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

function formatScanDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TYPE_LABELS = {
  domain: 'Domain Names',
  url:    'Website URLs',
  email:  'Email Addresses',
  ipv4:   'IP Addresses',
}
const TYPE_ORDER = ['domain', 'url', 'email', 'ipv4']

export default function Scans(){
  const [assets, setAssets] = useState([])
  const [groups, setGroups] = useState([])
  const [scanMode, setScanMode] = useState('asset') // 'asset' | 'group'
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [scans, setScans] = useState([])
  const [breachUsage, setBreachUsage] = useState({count: 0, limit: 2, date: ''})
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [addType, setAddType] = useState('domain')
  const [addValue, setAddValue] = useState('')
  const [addError, setAddError] = useState('')

  async function fetchAssets(){
    const res = await apiFetch(`/api/v1/assets`, {credentials: 'include'})
    if(res.ok){ setAssets(await res.json()) }
  }
  async function fetchGroups(){
    const res = await apiFetch(`/api/v1/asset-groups`, {credentials: 'include'})
    if(res.ok){ setGroups(await res.json()) }
  }
  useEffect(()=>{
    fetchAssets(); fetchGroups(); fetchScans(); fetchBreachUsage();
  },[])

  // Auto-poll every 4 s while any scan is queued or running
  useEffect(() => {
    const hasActive = scans.some(s => s.status === 'queued' || s.status === 'running')
    if (!hasActive) return
    const id = setInterval(fetchScans, 4000)
    return () => clearInterval(id)
  }, [scans])

  async function fetchBreachUsage() {
    const res = await apiFetch('/api/v1/scans/email-breach-usage', {credentials: 'include'})
    if(res.ok) setBreachUsage(await res.json())
  }

  // Asset map for scan list display
  const assetMap = useMemo(() => {
    const map = new Map()
    assets.forEach(a => map.set(a.id, `${a.type}: ${a.value}`))
    return map
  }, [assets])

  // Map sorted asset_ids string → group, so we can resolve the group name for group scans
  const scanGroupMap = useMemo(() => {
    const map = new Map()
    groups.forEach(g => {
      const key = [...(g.asset_ids || [])].sort().join(',')
      if (key) map.set(key, g)
    })
    return map
  }, [groups])

  // Assets grouped by type for the single-asset picker
  const assetsByType = useMemo(() => {
    const grouped = {}
    TYPE_ORDER.forEach(t => { grouped[t] = [] })
    assets.forEach(a => {
      if (grouped[a.type]) grouped[a.type].push(a)
      else grouped[a.type] = [a]
    })
    return grouped
  }, [assets])

  // Selected group object
  const selectedGroup = useMemo(() =>
    groups.find(g => g.id === selectedGroupId) || null
  , [groups, selectedGroupId])

  // Selected asset object (single-asset mode)
  const selectedAsset = assets.find(a => a.id === selectedAssetId)
  const isEmailSelected = selectedAsset && selectedAsset.type === 'email'

  // For group mode: does the selected group contain email assets?
  const groupEmailCount = useMemo(() => {
    if (!selectedGroup) return 0
    return (selectedGroup.asset_ids || []).filter(id => {
      const a = assets.find(x => x.id === id)
      return a && a.type === 'email'
    }).length
  }, [selectedGroup, assets])

  const groupAtEmailLimit = groupEmailCount > 0 && breachUsage.count >= breachUsage.limit

  async function startScan(){
    if (scanMode === 'asset') {
      if(!selectedAssetId) return
      if(isEmailSelected) {
        await fetchBreachUsage()
        if(breachUsage.count >= breachUsage.limit) return
      }
    } else {
      if(!selectedGroupId || !selectedGroup) return
      if(selectedGroup.asset_ids.length === 0) return
    }
    setShowConfirm(true)
  }

  async function confirmScan() {
    setShowConfirm(false)
    const assetIds = scanMode === 'group'
      ? (selectedGroup?.asset_ids || [])
      : [selectedAssetId]

    const res = await apiFetch(`/api/v1/scans`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({asset_ids: assetIds})
    })
    if(res.ok){
      setSelectedAssetId('')
      setSelectedGroupId('')
      fetchScans()
      fetchBreachUsage()
    }
  }

  async function fetchScans(){
    const res = await apiFetch(`/api/v1/scans`, {credentials: 'include'})
    if(res.ok){ setScans(await res.json()) }
  }

  async function handleAddAsset(e) {
    e.preventDefault()
    setAddError('')
    const v = addValue.trim()
    if (!v) { setAddError('Value is required.'); return }
    if (addType === 'email' && !v.includes('@')) { setAddError('Invalid email format.'); return }
    if (addType === 'domain' && v.includes('@')) { setAddError('Use just the domain name, e.g. example.com'); return }
    if (addType === 'ipv4') {
      const ok = /^(\d{1,3}\.){3}\d{1,3}$/.test(v)
      if (!ok || v.split('.').some(p => parseInt(p) > 255)) { setAddError('Invalid IPv4 address.'); return }
    }
    if (addType === 'url') {
      try {
        const u = new URL(v)
        if (!['http:', 'https:'].includes(u.protocol)) { setAddError('URL must start with https://'); return }
      } catch { setAddError('Invalid URL format, e.g. https://example.com'); return }
    }
    const normalized = addType === 'url' ? (v.toLowerCase().startsWith('http://') ? 'https://' + v.slice(7) : v.toLowerCase())
      : ['email', 'domain'].includes(addType) ? v.toLowerCase() : v
    const res = await apiFetch('/api/v1/assets', {
      method: 'POST', credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({type: addType, value: normalized}),
    })
    if (res.ok) {
      setAddValue('')
      setShowAddAsset(false)
      fetchAssets()
    } else if (res.status === 409) {
      setAddError('This asset already exists.')
    } else {
      setAddError('Failed to add asset.')
    }
  }

  async function handleDelete(scanId){
    const ok = window.confirm('Delete this scan and its findings?')
    if(!ok) return
    const res = await apiFetch(`/api/v1/scans/${scanId}`, {method: 'DELETE', credentials: 'include'})
    if(res.ok){ fetchScans() }
  }

  const startDisabled = scanMode === 'asset'
    ? (!selectedAssetId || (isEmailSelected && breachUsage.count >= breachUsage.limit))
    : (!selectedGroupId || !selectedGroup || selectedGroup.asset_ids.length === 0)

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-2 dark:text-white">New Scan</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-3">
        Scans check your assets for common security issues. Pick an asset or a group to review, then start a scan.
      </p>
      <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber mb-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="font-semibold mb-1 dark:text-white">Why this is more than antivirus</div>
        <p>
          Antivirus looks for malware on a single device. These scans review your public‑facing setup—DNS records,
          email protections (SPF/DMARC/DKIM), TLS/SSL configuration, and website security headers—to reduce phishing
          risk and exposed services across your organization.
        </p>
      </div>

      {/* Mode toggle + Add Asset */}
      <div className="flex gap-2 items-center mb-4">
        <button
          onClick={() => setScanMode('asset')}
          className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
            scanMode === 'asset'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Single Asset
        </button>
        <button
          onClick={() => setScanMode('group')}
          className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
            scanMode === 'group'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Group Scan
        </button>
        <button
          type="button"
          onClick={() => { setShowAddAsset(v => !v); setAddError('') }}
          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
            showAddAsset
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700'
          }`}
        >
          {showAddAsset ? '✕ Cancel' : '+ Add Asset'}
        </button>
      </div>

      <div className="mb-4">
        {scanMode === 'asset' ? (
          <>
            <h3 className="font-semibold mb-3 dark:text-white">Select one asset</h3>

            {/* Inline add-asset form */}
            {(showAddAsset || assets.length === 0) && (
              <form onSubmit={handleAddAsset} className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded">
                <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Add a new asset</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={addType}
                    onChange={e => { setAddType(e.target.value); setAddValue(''); setAddError('') }}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded text-sm"
                  >
                    <option value="domain">Domain</option>
                    <option value="url">URL</option>
                    <option value="email">Email</option>
                    <option value="ipv4">IP Address</option>
                  </select>
                  <input
                    value={addValue}
                    onChange={e => setAddValue(e.target.value)}
                    placeholder={
                      addType === 'email' ? 'you@company.com' :
                      addType === 'domain' ? 'example.com' :
                      addType === 'url' ? 'https://example.com' : '192.168.1.1'
                    }
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-2 py-1 rounded text-sm w-52"
                  />
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Add
                  </button>
                </div>
                {addError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{addError}</div>}
              </form>
            )}

            {assets.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No assets yet — add one above to get started.</p>
            ) : (
              <div className="space-y-4">
                {TYPE_ORDER.filter(t => assetsByType[t]?.length > 0).map(t => (
                  <div key={t}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{TYPE_LABELS[t]}</div>
                    <div className="space-y-1 pl-1">
                      {assetsByType[t].map(a => (
                        <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                          <input
                            type="radio"
                            name="scan-asset"
                            value={a.id}
                            checked={selectedAssetId === a.id}
                            onChange={e => setSelectedAssetId(e.target.value)}
                          />
                          {a.value}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="font-semibold mb-3 dark:text-white">Select a group</h3>
            {groups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No groups yet. <Link to="/assets" className="text-blue-600 hover:underline">Create groups in Assets</Link> first.
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map(g => {
                  const resolvedAssets = (g.asset_ids || []).map(id => {
                    const a = assets.find(x => x.id === id)
                    return a ? a.value : null
                  }).filter(Boolean)
                  return (
                    <label key={g.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scan-group"
                        value={g.id}
                        checked={selectedGroupId === g.id}
                        onChange={e => setSelectedGroupId(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium dark:text-white">{g.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {resolvedAssets.length > 0 ? resolvedAssets.join(' · ') : 'No assets assigned'}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            {groupAtEmailLimit && (
              <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-700 rounded p-2">
                This group contains email assets and you have reached your daily email breach scan limit ({breachUsage.limit}).
                Email assets will be skipped; other assets will still be scanned.
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={startScan}
            disabled={startDisabled}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 hover:bg-green-700"
          >
            Start Scan
          </button>
          {scanMode === 'asset' && isEmailSelected && breachUsage.count >= breachUsage.limit && (
            <span className="text-xs text-red-600 dark:text-red-400">Daily email breach scan limit reached ({breachUsage.limit}). Upgrade to unlock more.</span>
          )}

          <Modal
            open={showConfirm}
            onClose={() => setShowConfirm(false)}
            title="Confirm Scan"
            confirmText="Start Scan"
            onConfirm={confirmScan}
          >
            <div>
              {scanMode === 'group' && selectedGroup ? (
                <>
                  <div className="mb-2">Start a group scan for <strong>{selectedGroup.name}</strong>?</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Assets to scan:
                    <ul className="mt-1 ml-3 list-disc">
                      {(selectedGroup.asset_ids || []).map(id => {
                        const a = assets.find(x => x.id === id)
                        return <li key={id}>{a ? `${a.type}: ${a.value}` : id}</li>
                      })}
                    </ul>
                  </div>
                  {groupAtEmailLimit && (
                    <div className="text-xs text-yellow-700 dark:text-yellow-400">Email assets will be skipped due to daily limit.</div>
                  )}
                </>
              ) : isEmailSelected ? (
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

          {scans.some(s => s.status === 'queued' || s.status === 'running') && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">● Auto-updating…</span>
          )}
        </div>
      </div>

      {/* Scan history */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2 dark:text-white">My Scans</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">
          Score is a simple 0–100 summary. Higher is better. Status shows whether a scan is queued, running, or complete.
        </p>
        <ul className="space-y-2">
          {scans.map((s, idx)=>(
            <li key={s.id} className="bg-white dark:bg-cyber-dark p-3 rounded shadow dark:shadow-cyber flex justify-between items-center">
              <div>
                <div className="font-bold dark:text-white">
                  Scan #{scans.length - idx}
                  {s.asset_ids && s.asset_ids.length > 1 && (() => {
                    const matchedGroup = scanGroupMap.get([...s.asset_ids].sort().join(','))
                    return (
                      <span className="ml-2 text-xs font-normal bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                        {matchedGroup ? matchedGroup.name : `Group · ${s.asset_ids.length} assets`}
                      </span>
                    )
                  })()}
                </div>
                <div className="text-sm dark:text-gray-300">
                  <span title="Queued = waiting for worker. Running = in progress. Completed = finished.">Status: {s.status}</span>
                  <span title="Score is a 0–100 summary of findings severity."> | Score: {s.score ?? 'N/A'}</span>
                </div>
                {s.status === 'failed' && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Scan failed. {s.error_message ? `Reason: ${s.error_message}` : 'Please try again or contact support.'}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Assets: {(s.asset_ids || []).map(id => assetMap.get(id) || id).join(', ')}
                </div>
                {formatScanDate(s.completed_at || s.created_at) && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {s.completed_at ? 'Completed' : 'Started'}: {formatScanDate(s.completed_at || s.created_at)}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Link className="text-blue-600 dark:text-cyber-blue" to={`/scans/${s.id}`}>View</Link>
                <button onClick={()=>handleDelete(s.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
