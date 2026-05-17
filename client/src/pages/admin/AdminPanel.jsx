import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const TABS = ['Overview', 'Store Settings', 'Users', 'Notifications', 'Integrations'];

const ROLES = ['superadmin','admin','technician','sales_rep','cashier'];
const ROLE_COLOR = {
  superadmin: 'bg-red-100 text-red-800',
  admin: 'bg-purple-100 text-purple-800',
  technician: 'bg-blue-100 text-blue-800',
  sales_rep: 'bg-green-100 text-green-800',
  cashier: 'bg-gray-100 text-gray-700',
};

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    gray:   'bg-gray-50 text-gray-700 border-gray-100',
  };
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function IntegrationCard({ name, status, fields }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status === 'Configured' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {status}
        </span>
      </div>
      <div className="space-y-1.5">
        {fields.map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-mono text-gray-700 text-xs bg-gray-50 px-2 py-0.5 rounded">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function Overview({ sys, store }) {
  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Store</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap gap-4">
          <div className="flex-1 min-w-40">
            <p className="text-xs text-gray-400">Store Name</p>
            <p className="font-semibold text-gray-800">{store?.name || '—'}</p>
          </div>
          <div className="flex-1 min-w-40">
            <p className="text-xs text-gray-400">Address</p>
            <p className="text-gray-700 text-sm">{store ? [store.address, store.city, store.state, store.zip].filter(Boolean).join(', ') || '—' : '—'}</p>
          </div>
          <div className="flex-1 min-w-40">
            <p className="text-xs text-gray-400">Phone</p>
            <p className="text-gray-700 text-sm">{store?.phone || '—'}</p>
          </div>
          <div className="flex-1 min-w-40">
            <p className="text-xs text-gray-400">Tax Rate</p>
            <p className="font-semibold text-gray-800">{store ? `${(parseFloat(store.taxRate) * 100).toFixed(2)}%` : '—'}</p>
          </div>
          <div className="flex-1 min-w-40">
            <p className="text-xs text-gray-400">Store ID</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1 select-all">{store?.id || '—'}</p>
              {store?.id && (
                <button
                  onClick={() => { navigator.clipboard.writeText(store.id); toast.success('Store ID copied!'); }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >Copy</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {store?.id && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Public Links</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[
              { label: 'Shop Display Board', desc: 'TV/monitor display showing repair ticket statuses', path: 'display' },
              { label: 'Customer Portal', desc: 'Customers can look up their repair ticket status', path: 'portal' },
            ].map(({ label, desc, path }) => {
              const url = `${window.location.origin}/${path}?storeId=${store.id}`;
              return (
                <div key={path} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                    <p className="font-mono text-xs text-gray-500 mt-0.5">{url}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied!'); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
                    >Copy Link</button>
                    <a href={url} target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                    >Open</a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Database Counts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Inventory"    value={sys?.inventory   ?? '…'} color="blue" />
          <StatCard label="Repair Tickets" value={sys?.repairs   ?? '…'} color="orange" />
          <StatCard label="Customers"    value={sys?.customers   ?? '…'} color="green" />
          <StatCard label="Transactions" value={sys?.transactions ?? '…'} color="purple" />
          <StatCard label="Activations"  value={sys?.activations ?? '…'} color="red" />
          <StatCard label="Staff"        value={sys?.staff       ?? '…'} color="gray" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">System</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {[
            ['API Version', sys?.version ?? '—'],
            ['Database',    sys?.db      ?? '—'],
            ['Server Uptime', sys ? fmt(sys.uptime) : '—'],
            ['Environment', 'Development'],
            ['Node.js',     'v20+'],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TAX_CATEGORIES = ['part','accessory','device','service','plan','other'];

// ── Store Settings tab ────────────────────────────────────────────────────────
function StoreSettings({ store, onSaved }) {
  const [form, setForm] = useState(null);
  const [taxables, setTaxables] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store) {
      setForm({
        name:             store.name    || '',
        address:          store.address || '',
        city:             store.city    || '',
        state:            store.state   || '',
        zip:              store.zip     || '',
        phone:            store.phone   || '',
        email:            store.email   || '',
        taxRate:          store.taxRate ? (parseFloat(store.taxRate) * 100).toFixed(2) : '8.75',
        logoUrl:          store.logoUrl          || '',
        receiptPolicy:    store.receiptPolicy    || '',
        googleReviewUrl:  store.googleReviewUrl  || '',
      });
      const config = store.taxConfigJson ? JSON.parse(store.taxConfigJson) : {};
      const t = {};
      for (const cat of TAX_CATEGORIES) t[cat] = config[cat] !== false;
      setTaxables(t);
    }
  }, [store]);

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 512000) { toast.error('Logo must be under 500 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(p => ({ ...p, logoUrl: reader.result }));
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      const taxConfigObj = {};
      for (const cat of TAX_CATEGORIES) { if (!taxables[cat]) taxConfigObj[cat] = false; }
      await api.put('/admin/store', {
        ...form,
        taxRate: parseFloat(form.taxRate) / 100,
        taxConfigJson: Object.keys(taxConfigObj).length > 0 ? JSON.stringify(taxConfigObj) : null,
      });
      toast.success('Store settings saved');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  if (!form) return <div className="text-gray-400 text-sm">Loading…</div>;

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Business Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">{field('name',    'Store Name',         'text', 'My Wireless Store')}</div>
          <div className="col-span-2">{field('address', 'Street Address',     'text', '123 Main St')}</div>
          {field('city',  'City',    'text', 'Miami')}
          {field('state', 'State',   'text', 'FL')}
          {field('zip',   'ZIP Code','text', '33101')}
          {field('phone', 'Phone',   'tel',  '(305) 555-0100')}
          <div className="col-span-2">{field('email', 'Business Email', 'email', 'store@example.com')}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Tax & Billing</h3>
        <div className="max-w-xs">
          <label className="label">Sales Tax Rate (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="20"
            className="input"
            value={form.taxRate}
            onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">Applied to all taxable sales transactions</p>
        </div>
        <div>
          <label className="label mb-2">Taxable Categories</label>
          <p className="text-xs text-gray-400 mb-2">Uncheck a category to make it tax-exempt</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TAX_CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={taxables[cat] ?? true}
                  onChange={e => setTaxables(t => ({ ...t, [cat]: e.target.checked }))}
                  className="rounded"
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Reviews & Growth</h3>
        <div>
          <label className="label">Google Review URL</label>
          <input
            type="url"
            className="input"
            placeholder="https://g.page/r/..."
            value={form.googleReviewUrl}
            onChange={e => setForm(p => ({ ...p, googleReviewUrl: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">Sent to customers automatically after they pick up a completed repair</p>
        </div>
      </div>

      {/* Receipt Customization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Receipt Customization</h3>

        {/* Logo upload */}
        <div>
          <label className="label">Store Logo</label>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
              {form.logoUrl
                ? <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                : <span className="text-gray-300 text-xs text-center px-2">No logo</span>
              }
            </div>
            <div className="space-y-2 flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={handleLogoChange}
                className="block text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-xs file:font-semibold file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
              />
              <p className="text-xs text-gray-400">PNG, JPG, or GIF · Max 500 KB · Displays at the top of printed and emailed receipts</p>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, logoUrl: '' }))}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Receipt policy */}
        <div>
          <label className="label">Receipt Policy / Footer</label>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder={`All sales are final. No refunds on opened accessories.\nRepair work carries a 30-day parts & labor warranty.\nThank you for choosing us!`}
            value={form.receiptPolicy}
            onChange={e => setForm(p => ({ ...p, receiptPolicy: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">Printed at the bottom of every customer receipt — printed, texted, and emailed</p>
        </div>
      </div>

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function Users({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier', active: true });

  function load() { api.get('/admin/users').then(r => setUsers(r.data)); }
  useEffect(load, []);

  function openAdd()  { setEditing(null); setForm({ name: '', email: '', password: '', role: 'cashier', active: true }); setModal(true); }
  function openEdit(u){ setEditing(u);    setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active }); setModal(true); }

  async function save() {
    try {
      if (editing) {
        const p = { name: form.name, role: form.role, active: form.active };
        if (form.password) p.password = form.password;
        await api.put(`/admin/users/${editing.id}`, p);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', form);
        toast.success('User created');
      }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function deactivate(id) {
    if (!confirm('Deactivate this user?')) return;
    await api.delete(`/admin/users/${id}`);
    toast.success('User deactivated');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={openAdd}>+ Add User</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>{['Name','Email','Role','Status','PIN','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="table-td text-gray-500">{u.email}</td>
                <td className="table-td">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-700'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="table-td">
                  {u.active
                    ? <span className="badge badge-green">Active</span>
                    : <span className="badge badge-red">Inactive</span>}
                </td>
                <td className="table-td font-mono text-xs text-gray-400">{u.pin ? '••••' : '—'}</td>
                <td className="table-td">
                  <div className="flex gap-3">
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => openEdit(u)}>Edit</button>
                    {u.id !== currentUserId && u.active && (
                      <button className="text-xs text-red-500 hover:underline" onClick={() => deactivate(u.id)}>Deactivate</button>
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
              {[['name','Full Name','text'],['email','Email','email']].map(([f,l,t]) => (
                <div key={f}>
                  <label className="label">{l}</label>
                  <input type={t} className="input" value={form[f]} disabled={!!editing && f==='email'} onChange={e => setForm(p => ({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="label">{editing ? 'New Password (blank = keep)' : 'Password'}</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm(p => ({...p,password:e.target.value}))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({...p,active:e.target.checked}))} className="rounded" />
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

// ── Integrations tab ──────────────────────────────────────────────────────────
function Integrations() {
  const integrations = [
    {
      name: 'Epay',
      status: 'Configured',
      fields: [
        ['API URL',      'https://api.epay.com/v1'],
        ['API Key',      'stub_epay_key'],
        ['Merchant ID',  'stub_merchant_id'],
        ['Mode',         'Sandbox / Stub'],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <strong>Sandbox mode active.</strong> All integrations are running with stub credentials. Replace the keys in <code className="bg-yellow-100 px-1 rounded">server/.env</code> with your real Epay credentials to go live.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map(i => <IntegrationCard key={i.name} {...i} />)}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Carrier Platforms</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Boost Mobile',  color: 'bg-yellow-400' },
            { name: 'T-Mobile',      color: 'bg-pink-500' },
            { name: 'AT&T',          color: 'bg-blue-500' },
            { name: 'Verizon',       color: 'bg-red-500' },
            { name: 'Metro by T-Mobile', color: 'bg-pink-400' },
            { name: 'Cricket',       color: 'bg-green-500' },
            { name: 'Visible',       color: 'bg-purple-500' },
            { name: 'Other',         color: 'bg-gray-400' },
          ].map(c => (
            <div key={c.name} className="flex items-center gap-2 text-sm text-gray-700">
              <div className={`w-3 h-3 rounded-full ${c.color} shrink-0`} />
              {c.name}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h3 className="font-semibold text-gray-800">Payment Methods</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['Cash','Card','Epay','Check','Split Payment'].map(m => (
            <div key={m} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Notifications tab ─────────────────────────────────────────────────────────
function Notifications() {
  const [config, setConfig] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/messages/config/status').then(r => setConfig(r.data)),
      api.get('/messages?limit=30').then(r => setMsgs(r.data.messages || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const AUTOMATIONS = [
    {
      label: 'Appointment Booking Confirmation',
      desc: 'SMS + email sent immediately when an appointment is created',
      trigger: 'On appointment create',
      icon: '📅',
    },
    {
      label: 'Appointment Reminders',
      desc: 'SMS + email sent the day before each appointment at 9am',
      trigger: 'Daily at 9:00 AM',
      icon: '⏰',
    },
    {
      label: 'Repair Status Updates',
      desc: 'SMS + email when repair status changes to Diagnosed, Ready, or Cancelled',
      trigger: 'On status change',
      icon: '🔧',
    },
    {
      label: 'Pickup Follow-Up',
      desc: 'SMS + email sent when a repair has been "Ready for Pickup" for 2+ days',
      trigger: 'Daily at 10:00 AM',
      icon: '📦',
    },
  ];

  if (loading) return <div className="text-gray-400 text-sm p-4">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Channel status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'SMS (Twilio)', active: config?.sms, detail: config?.twilioFrom },
          { label: 'Email (SendGrid / SMTP)', active: config?.email, detail: config?.smtpFrom },
        ].map(ch => (
          <div key={ch.label} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${ch.active ? 'bg-green-100' : 'bg-gray-100'}`}>
              {ch.active ? '✅' : '⚠️'}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{ch.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {ch.active ? (ch.detail ? `Sending from ${ch.detail}` : 'Configured') : 'Not configured — add credentials to .env'}
              </p>
            </div>
            <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${ch.active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {ch.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>

      {/* Automated workflows */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Automated Notifications</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {AUTOMATIONS.map(a => (
            <div key={a.label} className="flex items-start gap-4 px-5 py-4">
              <span className="text-2xl mt-0.5">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{a.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">{a.trigger}</span>
                <p className="text-xs text-green-600 font-medium mt-1">● Enabled</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent messages log */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Messages Sent</h2>
        {msgs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">No messages sent yet</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Type','To','Subject / Body','Status','Sent'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {msgs.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${m.type === 'sms' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {m.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-td font-mono text-xs text-gray-500 max-w-[120px] truncate">{m.to}</td>
                    <td className="table-td text-gray-600 max-w-[240px] truncate text-xs">{m.subject || m.body?.slice(0, 80)}</td>
                    <td className="table-td">
                      <span className={`text-xs font-medium ${m.status === 'sent' ? 'text-green-600' : m.status === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
import { useAuthStore } from '../../store/authStore';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('Overview');
  const [sys, setSys] = useState(null);
  const [store, setStore] = useState(null);

  function loadStore() { api.get('/admin/store').then(r => setStore(r.data)).catch(() => {}); }

  useEffect(() => {
    api.get('/admin/system').then(r => setSys(r.data)).catch(() => {});
    loadStore();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage your store, staff, and integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview'       && <Overview sys={sys} store={store} />}
      {tab === 'Store Settings' && <StoreSettings store={store} onSaved={loadStore} />}
      {tab === 'Users'          && <Users currentUserId={user?.id} />}
      {tab === 'Notifications'  && <Notifications />}
      {tab === 'Integrations'   && <Integrations />}
    </div>
  );
}
