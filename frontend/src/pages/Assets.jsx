import React, {useEffect, useState} from 'react'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { apiFetch } from '../utils/api'

const TYPE_LABELS = {
  email: 'Email Address',
  domain: 'Domain Name',
  url: 'Website URL',
  ipv4: 'IP Address',
}

export default function Assets(){
  const [assets, setAssets] = useState([])
  const [type, setType] = useState('email')
  const [value, setValue] = useState('')

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, value, type }
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Group delete modal state
  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null) // { id, name }

  // Groups state
  const [groups, setGroups] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupAssetIds, setNewGroupAssetIds] = useState([])
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAssetIds, setEditAssetIds] = useState([])
  const [groupError, setGroupError] = useState('')
  const [newGroupAssetsOpen, setNewGroupAssetsOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)

  const normalizeValue = (assetType, rawValue) => {
    const trimmed = rawValue.trim()
    if (assetType === 'url') {
      // Auto-upgrade http:// to https:// so users don't get false HTTPS warnings
      if (trimmed.toLowerCase().startsWith('http://')) {
        return 'https://' + trimmed.slice(7)
      }
      return trimmed.toLowerCase()
    }
    if (['email', 'domain'].includes(assetType)) {
      return trimmed.toLowerCase()
    }
    return trimmed
  }

  async function fetchAssets(){
    const res = await apiFetch(`/api/v1/assets`, {credentials: 'include'})
    if(res.ok){
      const data = await res.json()
      setAssets(data)
    }
  }

  async function fetchGroups(){
    const res = await apiFetch(`/api/v1/asset-groups`, {credentials: 'include'})
    if(res.ok){
      setGroups(await res.json())
    }
  }

  useEffect(()=>{fetchAssets(); fetchGroups()},[])

  async function handleAdd(e){
    e.preventDefault()

    // Validation
    if (type === 'email' && !value.includes('@')) {
      alert('Invalid email format')
      return
    }
    if (type === 'domain' && value.includes('@')) {
      alert('Invalid domain format (remove @ and email prefix)')
      return
    }
    if (type === 'ipv4') {
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
      if (!ipPattern.test(value)) {
        alert('Invalid IPv4 format (e.g., 192.168.1.1)')
        return
      }
      const parts = value.split('.')
      if (parts.some(p => parseInt(p) > 255)) {
        alert('IPv4 octets must be 0-255')
        return
      }
    }
    if (type === 'url') {
      try {
        const urlObj = new URL(value)
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          alert('URL must use http:// or https://')
          return
        }
      } catch {
        alert('Invalid URL format (e.g., https://example.com)')
        return
      }
    }

    const normalizedValue = normalizeValue(type, value)
    const isDuplicate = assets.some(a => a.type === type && normalizeValue(a.type, a.value) === normalizedValue)
    if (isDuplicate) {
      alert('This asset already exists.')
      return
    }

    const res = await apiFetch(`/api/v1/assets`, {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, value: normalizedValue})})
    if(res.ok){ setValue(''); fetchAssets() }
    else if (res.status === 409) {
      alert('This asset already exists.')
    }
  }

  function handleDelete(id) {
    const asset = assets.find(a => a.id === id)
    setDeleteTarget(asset || { id })
    setDeletePassword('')
    setDeleteError('')
  }

  async function confirmDelete() {
    if (!deletePassword) { setDeleteError('Password is required.'); return }
    setDeleting(true)
    setDeleteError('')
    try {
      const verifyRes = await apiFetch('/api/v1/auth/verify-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (!verifyRes.ok) {
        setDeleteError('Incorrect password. Please try again.')
        setDeleting(false)
        return
      }
      const res = await apiFetch(`/api/v1/assets/${deleteTarget.id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setDeleteTarget(null)
        setDeletePassword('')
        fetchAssets()
      }
    } catch {
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // --- Group helpers ---
  function toggleAsset(id, current, setCurrent) {
    setCurrent(current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    setGroupError('')
    if (!newGroupName.trim()) { setGroupError('Group name is required.'); return }
    const res = await apiFetch('/api/v1/asset-groups', {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: newGroupName.trim(), asset_ids: newGroupAssetIds}),
    })
    if (res.ok) {
      setNewGroupName('')
      setNewGroupAssetIds([])
      setNewGroupAssetsOpen(false)
      setCreateGroupOpen(false)
      fetchGroups()
    } else {
      const d = await res.json().catch(() => ({}))
      setGroupError(d.detail || 'Failed to create group.')
    }
  }

  function startEdit(group) {
    setEditingGroupId(group.id)
    setEditName(group.name)
    setEditAssetIds(group.asset_ids || [])
    setGroupError('')
  }

  function cancelEdit() {
    setEditingGroupId(null)
    setEditName('')
    setEditAssetIds([])
    setGroupError('')
  }

  async function handleSaveEdit(groupId) {
    setGroupError('')
    if (!editName.trim()) { setGroupError('Group name is required.'); return }
    const res = await apiFetch(`/api/v1/asset-groups/${groupId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: editName.trim(), asset_ids: editAssetIds}),
    })
    if (res.ok) {
      cancelEdit()
      fetchGroups()
    } else {
      const d = await res.json().catch(() => ({}))
      setGroupError(d.detail || 'Failed to update group.')
    }
  }

  function handleDeleteGroup(group) {
    setDeleteGroupTarget({ id: group.id, name: group.name })
  }

  async function confirmDeleteGroup() {
    if (!deleteGroupTarget) return
    const res = await apiFetch(`/api/v1/asset-groups/${deleteGroupTarget.id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) fetchGroups()
    setDeleteGroupTarget(null)
  }

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-4">Assets</h1>
      <p className="text-sm text-gray-600 mb-3 dark:text-gray-400">
        Add your digital assets to scan: emails, domains, IP addresses, or URLs. Scans check for security issues, misconfigurations, and vulnerabilities.
      </p>
      <form onSubmit={handleAdd} className="mb-2">
        <select value={type} onChange={e=>{setType(e.target.value); setValue('')}} className="border px-2 py-1 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="email">Email Address</option>
          <option value="domain">Domain Name</option>
          <option value="url">Website URL</option>
          <option value="ipv4">IP Address</option>
        </select>
        <input value={value} onChange={e=>setValue(e.target.value)}
          placeholder={
            type === 'email' ? 'you@yourcompany.com' :
            type === 'domain' ? 'yourcompany.com' :
            type === 'url' ? 'https://yourcompany.com' :
            '192.168.1.1'
          }
          className="border px-2 py-1 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white w-64"
        />
        <button className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
      </form>
      <div className="text-xs text-gray-500 mb-4 dark:text-gray-400 mt-2">
        {type === 'email' && 'Checks if this email address appears in known data breaches.'}
        {type === 'domain' && 'Checks your domain\'s email protections (SPF, DMARC, DKIM), TLS certificate, and security headers. Use just the domain name, e.g. yourcompany.com'}
        {type === 'url' && 'Checks a specific webpage for HTTPS, security headers, and SSL. Use the full address, e.g. https://shop.yourcompany.com'}
        {type === 'ipv4' && 'Checks network connectivity and open ports on this IP address.'}
      </div>
      <ul className="space-y-2 mb-10">
        {assets.map(a=>(
          <li key={a.id} className="bg-white dark:bg-cyber-dark p-3 rounded shadow dark:shadow-cyber flex items-center justify-between">
            <div className="dark:text-gray-300">
              <div className="font-semibold">{TYPE_LABELS[a.type] ?? a.type}: {a.value}</div>
              {a.parent_asset_id && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  🔗 Child of: {assets.find(asset => asset.id === a.parent_asset_id)?.value}
                </div>
              )}
            </div>
            <button onClick={()=>handleDelete(a.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium">Remove</button>
          </li>
        ))}
      </ul>

      {/* ── Asset Groups ── */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-xl font-bold mb-1 dark:text-cyber-blue">Asset Groups</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Group related assets together to track their security posture as a unit on the Dashboard.
          An asset can belong to multiple groups.
        </p>

        {/* Create new group */}
        <button
          type="button"
          onClick={() => setCreateGroupOpen(v => !v)}
          className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium"
        >
          {createGroupOpen ? '✕ Cancel' : '+ New Group'}
        </button>
        {createGroupOpen && (
        <form onSubmit={handleCreateGroup} className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber mb-6">
          <div className="font-semibold text-sm mb-3 dark:text-white">Create New Group</div>
          <div className="mb-3">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Group Name</label>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="e.g. Web Properties, Email Infrastructure"
              className="border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white w-72"
            />
          </div>
          {assets.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setNewGroupAssetsOpen(v => !v)}
                className="inline-flex items-center justify-between gap-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition-colors select-none mb-1"
              >
                <span className="flex items-center gap-2">
                  <span>Assets in this group</span>
                  {newGroupAssetIds.length > 0 && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded-full font-medium">
                      {newGroupAssetIds.length} selected
                    </span>
                  )}
                </span>
                <svg className={`w-4 h-4 text-gray-600 dark:text-gray-200 transition-transform duration-200 ${newGroupAssetsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {newGroupAssetsOpen && (
                <div className="space-y-1 max-h-40 overflow-y-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                  {assets.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={newGroupAssetIds.includes(a.id)}
                        onChange={() => toggleAsset(a.id, newGroupAssetIds, setNewGroupAssetIds)}
                      />
                      {TYPE_LABELS[a.type] ?? a.type}: {a.value}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {groupError && <div className="text-xs text-red-600 dark:text-red-400 mb-2">{groupError}</div>}
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
            Create Group
          </button>
        </form>
        )}

        {/* Existing groups */}
        {groups.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No groups yet. Create one above.</div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="bg-white dark:bg-cyber-dark p-4 rounded shadow dark:shadow-cyber">
                {editingGroupId === group.id ? (
                  /* Edit mode */
                  <div>
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Group Name</label>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white w-72"
                      />
                    </div>
                    {assets.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Assets</label>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {assets.map(a => (
                            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={editAssetIds.includes(a.id)}
                                onChange={() => toggleAsset(a.id, editAssetIds, setEditAssetIds)}
                              />
                              {TYPE_LABELS[a.type] ?? a.type}: {a.value}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {groupError && <div className="text-xs text-red-600 dark:text-red-400 mb-2">{groupError}</div>}
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(group.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Save</button>
                      <button onClick={cancelEdit} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold dark:text-white">{group.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {group.asset_ids && group.asset_ids.length > 0
                          ? group.asset_ids.map(id => {
                              const a = assets.find(x => x.id === id)
                              return a ? `${TYPE_LABELS[a.type] ?? a.type}: ${a.value}` : id
                            }).join(' · ')
                          : 'No assets assigned'}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button onClick={() => startEdit(group)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium">Edit</button>
                      <button onClick={() => handleDeleteGroup(group)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete asset confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-1 text-red-600 dark:text-red-400">Remove Asset</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You are about to permanently remove{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {TYPE_LABELS[deleteTarget.type] ?? deleteTarget.type}: {deleteTarget.value}
              </span>.
              This cannot be undone.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
              onKeyDown={e => e.key === 'Enter' && confirmDelete()}
              placeholder="Your password"
              autoFocus
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 mb-2 dark:bg-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {deleteError && (
              <div className="text-xs text-red-600 dark:text-red-400 mb-3">{deleteError}</div>
            )}
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError('') }}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Removing…' : 'Remove Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete group confirmation modal */}
      {deleteGroupTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-1 text-red-600 dark:text-red-400">Remove Group</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Remove group{' '}
              <span className="font-semibold text-gray-900 dark:text-white">"{deleteGroupTarget.name}"</span>?
              Your assets will not be affected and you can recreate the group at any time.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteGroupTarget(null)}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Remove Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
