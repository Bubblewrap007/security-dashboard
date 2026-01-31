import React, {useEffect, useState} from 'react'
import BackendStatusBanner from '../components/BackendStatusBanner'

export default function Admin(){
  const [users, setUsers] = useState([])

  async function fetchUsers(){
    const res = await fetch(`/api/v1/admin/users`, {credentials: 'include'})
    if(res.ok) setUsers(await res.json())
  }

  useEffect(()=>{fetchUsers()},[])

  async function promote(id){
    const res = await fetch(`/api/v1/admin/users/${id}/promote`, {method: 'POST', credentials: 'include'})
    if(res.ok) fetchUsers()
  }
  async function demote(id){
    const res = await fetch(`/api/v1/admin/users/${id}/demote`, {method: 'POST', credentials: 'include'})
    if(res.ok) fetchUsers()
  }

  return (
    <div className="p-8">
      <BackendStatusBanner />
      <h1 className="text-2xl font-bold mb-4">Admin — Users</h1>
      <table className="w-full bg-white rounded shadow">
        <thead className="text-left">
          <tr><th className="p-3">Username</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {users.map(u=>(
            <tr key={u.id} className="border-t">
              <td className="p-3">{u.username}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.is_superuser ? 'Admin' : 'User'}</td>
              <td className="p-3">
                {!u.is_superuser && <button onClick={()=>promote(u.id)} className="bg-green-600 text-white px-3 py-1 rounded mr-2">Promote</button>}
                {u.is_superuser && <button onClick={()=>demote(u.id)} className="bg-red-600 text-white px-3 py-1 rounded">Demote</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
