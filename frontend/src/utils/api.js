/**
 * Get the configured API URL
 * @returns {string} The API base URL
 */
export function getApiUrl() {
  const fallback = 'https://security-dashboard-production.up.railway.app'
  return import.meta.env.VITE_API_URL || fallback
}

/**
 * Make an API request with the correct base URL
 * @param {string} path - The API path (e.g., '/api/v1/auth/login')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const baseUrl = getApiUrl()
  const url = `${baseUrl}${path}`
  return fetch(url, options)
}
