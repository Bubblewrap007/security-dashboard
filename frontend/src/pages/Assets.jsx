import React, {useEffect, useState} from 'react'
import BackendStatusBanner from '../components/BackendStatusBanner'

export default function Assets(){
  const [assets, setAssets] = useState([])
  const [type, setType] = useState('email')
  const [value, setValue] = useState('')

  const normalizeValue = (assetType, rawValue) => {
    const trimmed = rawValue.trim()
    if (['email', 'domain', 'url'].includes(assetType)) {
      return trimmed.toLowerCase()
    }
    return trimmed
  }

  async function fetchAssets(){
    const res = await fetch(`/api/v1/assets`, {credentials: 'include'})
    if(res.ok){
      const data = await res.json()
      setAssets(data)
    }
  }

  useEffect(()=>{fetchAssets()},[])

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
    
    const res = await fetch(`/api/v1/assets`, {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, value: normalizedValue})})
    if(res.ok){ setValue(''); fetchAssets() }
    else if (res.status === 409) {
      alert('This asset already exists.')
    }
  }

  async function handleDelete(id){
    const ok = window.confirm('Remove this asset?')
    if(!ok) return
    const res = await fetch(`/api/v1/assets/${id}`, {method: 'DELETE', credentials: 'include'})
    if(res.ok){ fetchAssets() }
  }

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-4">Assets</h1>
      <p className="text-sm text-gray-600 mb-3 dark:text-gray-400">
        Add your digital assets to scan: emails, domains, IP addresses, or URLs. Scans check for security issues, misconfigurations, and vulnerabilities.
      </p>
      <form onSubmit={handleAdd} className="mb-4">
        <select value={type} onChange={e=>setType(e.target.value)} className="border px-2 py-1 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="email">Email</option>
          <option value="domain">Domain</option>
          <option value="ipv4">IPv4 Address</option>
          <option value="url">URL</option>
        </select>
        <input value={value} onChange={e=>setValue(e.target.value)} placeholder={type === 'email' ? 'user@example.com' : type === 'domain' ? 'example.com' : type === 'ipv4' ? '192.168.1.1' : type === 'url' ? 'https://example.com' : 'Enter value'} className="border px-2 py-1 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        <button className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
      </form>
      <div className="text-xs text-gray-500 mb-4 dark:text-gray-400">
        Tip: Email for breach checks, Domain for DNS/TLS/headers, IPv4 for network scans, URL for web app security.
      </div>
      <ul className="space-y-2">
        {assets.map(a=>(
          <li key={a.id} className="bg-white dark:bg-cyber-dark p-3 rounded shadow dark:shadow-cyber flex items-center justify-between">
            <div className="dark:text-gray-300">
              <div className="font-semibold">{a.type}: {a.value}</div>
              {a.parent_asset_id && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  🔗 Child of: {assets.find(asset => asset.id === a.parent_asset_id)?.value}
                </div>
              )}
            </div>
            <button onClick={()=>handleDelete(a.id)} className="text-sm text-red-600 dark:text-red-500 hover:underline font-semibold">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
