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
    
    const res = await apiFetch(`/api/v1/assets`, {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, value: normalizedValue})})
    if(res.ok){ setValue(''); fetchAssets() }
    else if (res.status === 409) {
      alert('This asset already exists.')
    }
  }

  async function handleDelete(id){
    const ok = window.confirm('Remove this asset?')
    if(!ok) return
    const res = await apiFetch(`/api/v1/assets/${id}`, {method: 'DELETE', credentials: 'include'})
    if(res.ok){ fetchAssets() }
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
      <ul className="space-y-2">
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
            <button onClick={()=>handleDelete(a.id)} className="text-sm text-red-600 dark:text-red-500 hover:underline font-semibold">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
