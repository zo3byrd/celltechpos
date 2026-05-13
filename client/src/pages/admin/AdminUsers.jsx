import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const ROLES = ['superadmin','admin','technician','sales_rep','cashier'];
const ROLE_BADGE = { superadmin:'badge-red', admin:'badge-purple', technician:'badge-blue', sales_rep:'badge-green', cashier:'badge-gray' };

export default function AdminUsers() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'cashier', active:true });

  function load() {
    api.get('/admin/users').then(r => setUsers(r.data));
  }
  useEffect(load, []);

  function openAdd() { setEditing(null); setForm({ name:'', email:'', password:'', role:'cashier', active:true }); setModal(true); }
  function openEdit(u) { setEditing(u); setForm({ name:u.name, email:u.email, password:'', role:u.role, active:u.active }); setModal(true); }

  async function save() {
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role, active: form.active };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/users/${editing.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', form);
        toast.success('User created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  async function deactivate(id) {
    await api.delete(`/admin/users/${id}`);
    toast.success('User deactivated');
    load();
  }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">Manage store staff accounts</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add User</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>{['Name','Email','Role','Store','Status',''].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{u.name}</td>
                <td className="table-td">{u.email}</td>
                <td className="table-td"><span className={ROLE_BADGE[u.role] || 'badge-gray'}>{u.role.replace('_',' ')}</span></td>
                <td className="table-td">{u.Store?.name || '—'}</td>
                <td className="table-td">
                  {u.active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}
                </td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => openEdit(u)}>Edit</button>
                    {u.id !== me.id && u.active && (
                      <button className="text-xs text-red-500 hover:underline" onClick={() => { if (confirm(`Deactivate ${u.name}?`)) deactivate(u.id); }}>Deactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit User' : 'Add User'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} disabled={!!editing} />
              </div>
              <div>
                <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded" />
                  Active account
                </label>
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={save}>Save</button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
