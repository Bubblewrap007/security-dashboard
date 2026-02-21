import React, {useEffect, useMemo, useState} from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Scatter, ScatterChart } from 'recharts'
import { Link, Navigate } from 'react-router-dom'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-cyber-dark border border-gray-300 dark:border-cyber-blue p-3 rounded shadow-lg dark:shadow-cyber">
        <p className="text-sm font-semibold text-gray-900 dark:text-cyber-blue">{payload[0].payload.name}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">Score: <span className="font-bold dark:text-cyber-blue">{payload[0].payload.score || payload[0].value}</span></p>
      </div>
    )
  }
  return null
}

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const getScoreBgColor = (score) => {
  if (score >= 80) return 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border-green-200 dark:border-green-800'
  if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border-yellow-200 dark:border-yellow-800'
  return 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-red-200 dark:border-red-800'
}

export default function Dashboard(){
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [scans, setScans] = useState([])
  const [assets, setAssets] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedAsset, setSelectedAsset] = useState('all')
  const [allFindings, setAllFindings] = useState([])

  useEffect(()=>{
    (async ()=>{
      const res = await apiFetch(`/api/v1/auth/me`, { credentials: 'include' })
      if(!res.ok){
        setIsAuthenticated(false)
        setError('Not authenticated')
        return
      }
      const d = await res.json()
      setIsAuthenticated(true)
      const scansRes = await apiFetch(`/api/v1/scans`, { credentials: 'include' })
      if (scansRes.ok) {
        const scansData = await scansRes.json()
        setScans(scansData)
        

        const completedWithScores = scansData.filter(s => s.status === 'completed' && typeof s.score === 'number')
        if (completedWithScores.length > 0) {
          const sorted = completedWithScores
            .sort((a, b) => new Date(a.completed_at || a.created_at || 0) - new Date(b.completed_at || b.created_at || 0))
          
          // Calculate average
          const avg = sorted.reduce((sum, s) => sum + s.score, 0) / sorted.length
          
          // Calculate trendline
          const n = sorted.length
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
          sorted.forEach((s, i) => {
            sumX += i
            sumY += s.score
            sumXY += i * s.score
            sumXX += i * i
          })
          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
          const intercept = (sumY - slope * sumX) / n
          
          // Build chart data with all values
          const chart = sorted.map((s, idx) => ({ 
            name: `Scan ${idx + 1}`, 
            score: s.score,
            trend: slope * idx + intercept,
            average: avg
          }))
          setData(chart)
        } else {
          setData(null)
        }
      }
      const assetsRes = await apiFetch(`/api/v1/assets`, { credentials: 'include' })
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        setAssets(assetsData)
      }
      const groupsRes = await apiFetch(`/api/v1/asset-groups`, { credentials: 'include' })
      if (groupsRes.ok) {
        setGroups(await groupsRes.json())
      }
    })()
  },[])

  const completedScans = useMemo(() => scans.filter(s => s.status === 'completed'), [scans])
  
  const openIssuesTotal = useMemo(() => {
    if (completedScans.length === 0) return 0
    
    // Group scans by asset combination, keep only the most recent for each
    const assetGroupMap = new Map()
    
    // Sort by date descending so most recent comes first
    const sorted = [...completedScans].sort((a, b) => 
      new Date(b.completed_at || b.created_at || 0) - new Date(a.completed_at || a.created_at || 0)
    )
    
    sorted.forEach(scan => {
      const assetKey = (scan.asset_ids || []).sort().join(',')
      if (!assetGroupMap.has(assetKey)) {
        assetGroupMap.set(assetKey, scan)
      }
    })
    
    // Sum issues only from the most recent scan of each asset group
    let total = 0
    assetGroupMap.forEach(scan => {
      const counts = scan.summary_counts || {}
      total += (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0)
    })
    
    return total
  }, [completedScans])

  const openIssuesByScan = useMemo(() => {
    const withTotals = completedScans.map(s => {
      const counts = s.summary_counts || {}
      const total = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0)
      const assetCount = typeof s.assetCount === 'number' && s.assetCount > 0
        ? s.assetCount
        : Array.isArray(s.asset_ids)
          ? new Set(s.asset_ids).size
          : 0
      return { id: s.id, created_at: s.created_at, score: s.score, total, assetCount }
    })
    return withTotals.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [completedScans])

  const latestCompletedScan = useMemo(() => {
    if (completedScans.length === 0) return null
    return [...completedScans].sort((a, b) => new Date(b.completed_at || b.created_at || 0) - new Date(a.completed_at || a.created_at || 0))[0]
  }, [completedScans])

  // Scan number map: scanId -> scan number consistent with Scans page (newest = highest number)
  const scanNumberMap = useMemo(() => {
    const map = new Map()
    scans.forEach((s, idx) => map.set(s.id, scans.length - idx))
    return map
  }, [scans])

  // Per-group posture scores: for each asset in the group take the most recent completed
  // scan score, then average them across all assets that have been scanned.
  const groupScores = useMemo(() => {
    return groups.map(group => {
      const assetScores = []
      ;(group.asset_ids || []).forEach(assetId => {
        const scansForAsset = completedScans.filter(s =>
          Array.isArray(s.asset_ids) && s.asset_ids.includes(assetId)
        )
        if (scansForAsset.length > 0) {
          const mostRecent = [...scansForAsset].sort((a, b) =>
            new Date(b.completed_at || b.created_at || 0) -
            new Date(a.completed_at || a.created_at || 0)
          )[0]
          if (typeof mostRecent.score === 'number') assetScores.push(mostRecent.score)
        }
      })
      const score = assetScores.length > 0
        ? Math.round(assetScores.reduce((sum, v) => sum + v, 0) / assetScores.length)
        : null
      return { id: group.id, name: group.name, score, assetCount: (group.asset_ids || []).length }
    })
  }, [groups, completedScans])

  const latestAssetCount = useMemo(() => {
    if (!latestCompletedScan) return 0
    if (typeof latestCompletedScan.assetCount === 'number' && latestCompletedScan.assetCount > 0) {
      return latestCompletedScan.assetCount
    }
    if (Array.isArray(latestCompletedScan.asset_ids)) {
      return new Set(latestCompletedScan.asset_ids).size
    }
    return 0
  }, [latestCompletedScan])

  const severityTotals = useMemo(() => {
    return completedScans.reduce((acc, s) => {
      const counts = s.summary_counts || {}
      acc.critical += counts.critical || 0
      acc.high += counts.high || 0
      acc.medium += counts.medium || 0
      acc.low += counts.low || 0
      return acc
    }, { critical: 0, high: 0, medium: 0, low: 0 })
  }, [completedScans])

  const assetMap = useMemo(() => {
    const map = new Map()
    assets.forEach(a => map.set(a.id, `${a.type}: ${a.value}`))
    return map
  }, [assets])

  // Recalculate chart data based on selected asset
  const chartData = useMemo(() => {
    if (!data) return null
    
    if (selectedAsset === 'all') {
      return data
    }
    
    // Filter to scans that included this asset, keep original scores
    const completedWithAsset = completedScans.filter(s => 
      typeof s.score === 'number' && 
      Array.isArray(s.asset_ids) && 
      s.asset_ids.includes(selectedAsset)
    )
    
    if (completedWithAsset.length === 0) return null
    
    const sorted = completedWithAsset.sort((a, b) => 
      new Date(a.completed_at || a.created_at || 0) - new Date(b.completed_at || b.created_at || 0)
    )
    
    // Use original scan scores, just filter to this asset
    const assetScores = sorted.map((scan, idx) => ({
      name: `Scan ${idx + 1}`,
      score: scan.score
    }))
    
    // Calculate trend and average
    const avg = assetScores.reduce((sum, s) => sum + s.score, 0) / assetScores.length
    const n = assetScores.length
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
    assetScores.forEach((s, i) => {
      sumX += i
      sumY += s.score
      sumXY += i * s.score
      sumXX += i * i
    })
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0
    const intercept = (sumY - slope * sumX) / n
    
    return assetScores.map((s, idx) => ({
      ...s,
      trend: slope * idx + intercept,
      average: avg
    }))
  }, [data, selectedAsset, completedScans])

  const averageScore = useMemo(() => {
    if (completedScans.length === 0) return null
    const total = completedScans.reduce((sum, s) => sum + (s.score || 0), 0)
    return Math.round(total / completedScans.length)
  }, [completedScans])

  const riskLevel = useMemo(() => {
    if (!latestCompletedScan || typeof latestCompletedScan.score !== 'number') return 'Unknown'
    const score = latestCompletedScan.score
    if (score >= 80) return 'Low'
    if (score >= 60) return 'Moderate'
    if (score >= 40) return 'High'
    return 'Critical'
  }, [latestCompletedScan])

  const lastScanText = useMemo(() => {
    if (!latestCompletedScan?.created_at) return 'No completed scans yet'
    const dt = new Date(latestCompletedScan.created_at)
    if (Number.isNaN(dt.getTime())) return 'Recently'
    const diffMs = Date.now() - dt.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays <= 0 && diffHours <= 0) return 'Just now'
    if (diffDays <= 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }, [latestCompletedScan])

  if(isAuthenticated === false) return <Navigate to="/login" />

  if(error) return <div className="p-8">{error}</div>

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-2 dark:text-cyber-blue">Security Posture</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        This score summarizes how protected your organization is. Higher is better. It’s based on recent scan results and findings.
      </p>
      <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber mb-6 text-sm text-gray-700 dark:text-gray-300">
        <div className="font-semibold mb-1 dark:text-cyber-blue">What you're seeing</div>
        <p>
          The Dashboard is a quick summary of your scans. Open Issues are the total findings across completed scans.
          Click a scan to see exactly which assets and checks produced those issues.
        </p>
      </div>
      <div className="bg-gradient-to-r from-green-50 via-yellow-50 to-red-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border border-gray-300 dark:border-gray-700 p-4 rounded shadow dark:shadow-cyber mb-6">
        <div className="font-semibold mb-2 text-gray-900 dark:text-white">📊 Score Guide</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 font-bold">80-100:</span>
            <span className="text-gray-700 dark:text-gray-300">Strong security posture</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 font-bold">60-79:</span>
            <span className="text-gray-700 dark:text-gray-300">Moderate risk, needs attention</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400 font-bold">0-59:</span>
            <span className="text-gray-700 dark:text-gray-300">Critical issues require action</span>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber">
          <div className="text-sm text-gray-500 dark:text-gray-400" title="Based on recent completed scans and the severity of findings. Fixing high/critical issues lowers risk.">Current Risk Level</div>
          <div className="text-2xl font-bold dark:text-cyber-blue">{riskLevel}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">From your most recent completed scan.</div>
          {averageScore !== null && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              Average Score: <span className={`font-semibold ${getScoreColor(averageScore)}`}>{averageScore}</span>/100
            </div>
          )}
          {completedScans.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Min: {Math.min(...completedScans.map(s => s.score || 100))}/100 · Max: {Math.max(...completedScans.map(s => s.score || 0))}/100
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber">
          <div className="text-sm text-gray-500 dark:text-gray-400" title="Counts come from completed scans and their findings.">Open Issues</div>
          <div className="text-2xl font-bold dark:text-cyber-blue">{openIssuesTotal}</div>
          <div className="text-sm text-gray-500">
            {completedScans.length > 0 ? (
              <>
                From {completedScans.length} completed scan{completedScans.length > 1 ? 's' : ''}. <Link to="/scans" className="text-blue-600 hover:underline">View scans</Link>
              </>
            ) : (
              <>No completed scans yet.</>
            )}
          </div>
          {openIssuesTotal > 0 && (
            <div className="mt-2 text-xs text-gray-600" title="Severity breakdown across completed scans">
              Critical: {severityTotals.critical} · High: {severityTotals.high} · Medium: {severityTotals.medium} · Low: {severityTotals.low}
            </div>
          )}
          {openIssuesByScan.length > 0 && (
            <div className="mt-2 text-xs text-gray-500" title="Issue totals by scan">
              {openIssuesByScan.slice(0, 3).map((s, idx) => {
                const scan = completedScans.find(cs => cs.id === s.id)
                const assetList = scan ? (scan.asset_ids || []).map(id => assetMap.get(id) || id).join(', ') : 'Unknown'
                return (
                  <div key={s.id}>
                    <Link to={`/scans/${s.id}`} className="text-blue-600 hover:underline">Scan #{scanNumberMap.get(s.id)}</Link>: {s.total} issue{s.total !== 1 ? 's' : ''} · {assetList}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber">
          <div className="text-sm text-gray-500 dark:text-gray-400" title="Most recent completed scan.">Last Scan</div>
          <div className="text-2xl font-bold">
            {latestCompletedScan ? (
              <Link to={`/scans/${latestCompletedScan.id}`} className="text-blue-600 hover:underline">Scan #{scanNumberMap.get(latestCompletedScan.id)}</Link>
            ) : (
              'No scans yet'
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{lastScanText}. Run a new scan to update.</div>
          {latestCompletedScan && latestCompletedScan.score != null && (
            <div className="text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              Score: <span className={`font-bold ${getScoreColor(latestCompletedScan.score)}`}>{latestCompletedScan.score}</span>/100
            </div>
          )}
        </div>
      </div>
      {/* Group Posture Scores */}
      <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold dark:text-cyber-blue">Group Posture</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Score per group based on the most recent scan for each asset in the group.</p>
          </div>
          <Link to="/assets" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Manage groups</Link>
        </div>
        {groupScores.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No groups yet. <Link to="/assets" className="text-blue-600 hover:underline">Create groups in Assets</Link> to track posture by team or service.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {groupScores.map(g => (
              <div key={g.id} className={`p-3 rounded border ${g.score !== null ? getScoreBgColor(g.score) : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate mb-1" title={g.name}>{g.name}</div>
                {g.score !== null ? (
                  <div className={`text-2xl font-bold ${getScoreColor(g.score)}`}>{g.score}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/100</span></div>
                ) : (
                  <div className="text-sm text-gray-400 dark:text-gray-500 italic">No scan data</div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{g.assetCount} asset{g.assetCount !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber mb-6">
        <h2 className="text-lg font-semibold mb-2 dark:text-cyber-blue">Recent Scans</h2>
        {scans.length === 0 ? (
          <div className="text-sm text-gray-500">No scans yet. Start your first scan from the Scans page.</div>
        ) : (
          <ul className="text-sm text-gray-700 space-y-2">
            {scans.slice(0, 5).map((s, idx) => (
              <li key={s.id} className="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Scan #{scans.length - idx}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({s.id})</span>
                  </div>
                  <span className="text-xs text-gray-500" title="Queued = waiting for worker. Running = in progress. Completed = finished.">{s.status}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Assets: {(s.asset_ids || []).map(id => assetMap.get(id) || id).join(', ')} · Score: {s.score ?? 'N/A'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-white dark:bg-cyber-dark p-6 rounded shadow dark:shadow-cyber">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold dark:text-cyber-blue">Posture Trend</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dots show actual scan scores. Dashed line shows trend direction. Solid line shows your average score.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">View:</label>
            <select 
              value={selectedAsset} 
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-1 rounded text-sm"
            >
              <option value="all">All Assets</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.type}: {a.value}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{height: 300}}>
          {!chartData ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No scan data available for this selection
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={chartData}>
              {/* Scatter points for actual scores */}
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="transparent" 
                strokeWidth={0}
                dot={{ fill: '#00D9FF', r: 6, strokeWidth: 2, stroke: '#0ea5e9' }}
                name="Actual Score"
              />
              {/* Trendline (regression) */}
              <Line 
                type="monotone" 
                dataKey="trend"
                stroke="#f59e0b" 
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={false}
                name="Trend"
              />
              {/* Average line */}
              <Line 
                type="monotone" 
                dataKey="average"
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Average"
              />
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
            </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-cyan-600"></div>
            <span>Actual Scores</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-amber-500" style={{borderTop: '2px dashed #f59e0b'}}></div>
            <span>Trend Direction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-green-500"></div>
            <span>Average Score</span>
          </div>
        </div>
      </div>
    </div>
  )
}
