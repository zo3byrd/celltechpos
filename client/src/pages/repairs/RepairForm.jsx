import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

const STATUS_OPTIONS = ['received','diagnosing','waiting_parts','in_repair','quality_check','ready','picked_up','cancelled'];
const PRIORITY_OPTIONS = ['low','normal','high','urgent'];
const DEVICE_TYPES = ['phone','tablet','laptop','watch','other'];

const STATUS_BADGE = {
  received:'badge-blue', diagnosing:'badge-yellow', waiting_parts:'badge-orange',
  in_repair:'badge-purple', quality_check:'badge-purple', ready:'badge-green',
  picked_up:'badge-gray', cancelled:'badge-red',
};

export default function RepairForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    customerId: '', deviceType: 'phone', deviceBrand: '', deviceModel: '',
    imei: '', passcode: '', color: '', issueDescription: '',
    diagnosis: '', status: 'received', priority: 'normal',
    estimatedCost: '', finalCost: '', deposit: '0', dueDate: '', notes: '',
  });
  const [ticket, setTicket] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/repairs/${id}`).then(r => {
        setTicket(r.data);
        const t = r.data;
        setForm({
          customerId: t.customerId || '',
          deviceType: t.deviceType || 'phone',
          deviceBrand: t.deviceBrand || '',
          deviceModel: t.deviceModel || '',
          imei: t.imei || '',
          passcode: t.passcode || '',
          color: t.color || '',
          issueDescription: t.issueDescription || '',
          diagnosis: t.diagnosis || '',
          status: t.status || 'received',
          priority: t.priority || 'normal',
          estimatedCost: t.estimatedCost || '',
          finalCost: t.finalCost || '',
          deposit: t.deposit || '0',
          dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
          notes: t.notes || '',
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    api.get(`/customers?search=${custSearch}&limit=20`).then(r => setCustomers(r.data.customers));
  }, [custSearch]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  async function handleSave() {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/repairs/${id}`, form);
        toast.success('Ticket updated');
      } else {
        const { data } = await api.post('/repairs', form);
        toast.success(`Ticket ${data.ticketNumber} created`);
        navigate(`/repairs/${data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/repairs" className="text-gray-400 hover:text-gray-600 text-sm">← Repairs</Link>
        {ticket && <span className="font-mono text-sm text-brand-600">{ticket.ticketNumber}</span>}
        {ticket && <span className={`${STATUS_BADGE[ticket.status]} ml-auto`}>{ticket.status.replace(/_/g,' ')}</span>}
      </div>

      <h1 className="text-2xl font-bold">{isEdit ? 'Edit Repair Ticket' : 'New Repair Ticket'}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Customer</h2>
          <div>
            <label className="label">Search Customer</label>
            <input className="input" placeholder="Name, phone, email…" value={custSearch} onChange={e => setCustSearch(e.target.value)} />
          </div>
          <div>
            <label className="label">Select Customer</label>
            <select className="input" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
              <option value="">— Select —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} · {c.phone}</option>)}
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Device</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.deviceType} onChange={e => set('deviceType', e.target.value)}>
                {DEVICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input" value={form.deviceBrand} onChange={e => set('deviceBrand', e.target.value)} placeholder="Apple, Samsung…" />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" value={form.deviceModel} onChange={e => set('deviceModel', e.target.value)} placeholder="iPhone 14 Pro…" />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Black…" />
            </div>
            <div className="col-span-2">
              <label className="label">IMEI / Serial</label>
              <input className="input font-mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="15-digit IMEI" />
            </div>
            <div>
              <label className="label">Passcode</label>
              <input className="input" value={form.passcode} onChange={e => set('passcode', e.target.value)} placeholder="Device PIN" />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Issue & Diagnosis</h2>
          <div>
            <label className="label">Customer Reports</label>
            <textarea className="input h-20 resize-none" value={form.issueDescription} onChange={e => set('issueDescription', e.target.value)} placeholder="Describe the issue…" />
          </div>
          <div>
            <label className="label">Technician Diagnosis</label>
            <textarea className="input h-20 resize-none" value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="Internal diagnosis notes…" />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">Status & Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estimate ($)</label>
              <input type="number" className="input" value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="label">Final Cost ($)</label>
              <input type="number" className="input" value={form.finalCost} onChange={e => set('finalCost', e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="label">Deposit ($)</label>
              <input type="number" className="input" value={form.deposit} onChange={e => set('deposit', e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Customer Notes</label>
            <textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes visible to customer…" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Ticket')}
        </button>
        <Link to="/repairs" className="btn-secondary">Cancel</Link>
      </div>
    </div>
  );
}
