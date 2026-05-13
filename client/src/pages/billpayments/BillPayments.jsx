import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BanknotesIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const TYPES = ['prepaid_pin', 'bill_payment', 'mobile_topup', 'money_order'];
const PAYMENT_METHODS = ['cash', 'card', 'check', 'other'];

const CARRIERS = {
  boost: 'Boost Mobile', tmobile: 'T-Mobile', att: 'AT&T Prepaid',
  cricket: 'Cricket', metro: 'Metro by T-Mobile', verizon: 'Verizon Prepaid',
  h2o: 'H2O Wireless', tracfone: 'Tracfone', visible: 'Visible', other: 'Other',
};

const CARRIER_BRAND = {
  boost:    { bg: '#FF6B00', text: '#fff', abbr: 'BST' },
  tmobile:  { bg: '#E20074', text: '#fff', abbr: 'TMO' },
  att:      { bg: '#00A8E0', text: '#fff', abbr: 'AT&T' },
  cricket:  { bg: '#007D40', text: '#fff', abbr: 'CKT' },
  metro:    { bg: '#9B1FE8', text: '#fff', abbr: 'MTR' },
  verizon:  { bg: '#CD040B', text: '#fff', abbr: 'VZW' },
  h2o:      { bg: '#0057B8', text: '#fff', abbr: 'H2O' },
  tracfone: { bg: '#1DA462', text: '#fff', abbr: 'TRF' },
  visible:  { bg: '#6B21A8', text: '#fff', abbr: 'VSB' },
  other:    { bg: '#6b7280', text: '#fff', abbr: 'OTH' },
};

function CarrierLogo({ carrier, size = 'sm' }) {
  const b = CARRIER_BRAND[carrier] || CARRIER_BRAND.other;
  const dim = size === 'lg' ? 44 : size === 'md' ? 32 : 24;
  const fs  = size === 'lg' ? 11 : size === 'md' ? 9 : 8;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: dim, height: dim, borderRadius: 4, background: b.bg, color: b.text,
      fontSize: fs, fontWeight: 700, letterSpacing: '0.02em', flexShrink: 0 }}>
      {b.abbr}
    </span>
  );
}

const AMOUNTS_BY_CARRIER = {
  boost: ['25', '35', '50', '60', '80', '100'],
  tmobile: ['25', '40', '50', '70', '90'],
  att: ['25', '30', '45', '65', '75'],
  cricket: ['25', '30', '40', '55', '60'],
  metro: ['25', '40', '50', '60'],
  verizon: ['30', '40', '50', '65', '80'],
  h2o: ['10', '20', '30', '40', '60'],
  tracfone: ['10', '20', '25', '35', '50'],
  visible: ['25', '45'],
  other: [],
};

const empty = { type: 'prepaid_pin', carrier: 'boost', amount: '', fee: '0', phoneNumber: '', pinCode: '', accountNumber: '', paymentMethod: 'cash', notes: '' };

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function BillPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filterType) params.set('type', filterType);
      if (filterCarrier) params.set('carrier', filterCarrier);
      const { data } = await api.get(`/bill-payments?${params}`);
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterType, filterCarrier]);

  const suggestedAmounts = AMOUNTS_BY_CARRIER[form.carrier] || [];
  const totalAmt = (parseFloat(form.amount) || 0) + (parseFloat(form.fee) || 0);

  async function save() {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Amount required');
    setSaving(true);
    try {
      await api.post('/bill-payments', form);
      toast.success('Payment recorded');
      setModal(false);
      setForm(empty);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  const todayTotal = payments
    .filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + parseFloat(p.total || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Bill Payments & Prepaid</h1>
          <p className="page-sub">Prepaid PIN sales, bill payments, mobile top-ups</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(empty); setModal(true); }}><PlusIcon className="w-4 h-4" />New Payment</button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-2xl font-bold text-slate-900">{fmt$(todayTotal)}</div>
          <div className="text-sm text-slate-500">Today's total</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-slate-900">{payments.filter(p => p.type === 'prepaid_pin').length}</div>
          <div className="text-sm text-slate-500">Prepaid PINs today</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-sm text-slate-500">Total transactions</div>
        </div>
      </div>

      {/* Carrier quick-select */}
      <div className="card py-3">
        <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wide">Quick Process by Carrier</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CARRIERS).map(([key, name]) => (
            <button key={key}
              onClick={() => { setForm(f => ({ ...f, carrier: key, type: 'prepaid_pin' })); setModal(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-white hover:border-green-600 hover:bg-green-50 transition-colors text-sm font-semibold text-gray-700">
              <CarrierLogo carrier={key} size="sm" />
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <select className="input w-44 text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select className="input w-44 text-sm" value={filterCarrier} onChange={e => setFilterCarrier(e.target.value)}>
            <option value="">All carriers</option>
            {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : payments.length === 0 ? (
          <div className="p-10 text-center">
            <BanknotesIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No bill payments yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-th">Bill #</th>
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Carrier</th>
                <th className="table-th">Phone #</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Fee</th>
                <th className="table-th">Total</th>
                <th className="table-th">Payment</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-td font-mono text-xs">{p.billNumber}</td>
                  <td className="table-td">{fmtDate(p.createdAt)}</td>
                  <td className="table-td"><span className="badge-blue badge capitalize">{p.type?.replace('_', ' ')}</span></td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <CarrierLogo carrier={p.carrier} size="sm" />
                      <span>{CARRIERS[p.carrier] || p.carrier}</span>
                    </div>
                  </td>
                  <td className="table-td">{p.phoneNumber || '—'}</td>
                  <td className="table-td">{fmt$(p.amount)}</td>
                  <td className="table-td">{fmt$(p.fee)}</td>
                  <td className="table-td font-semibold">{fmt$(p.total)}</td>
                  <td className="table-td capitalize">{p.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold">Process Payment</h2>
              <button onClick={() => setModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Carrier</label>
                  <div className="flex items-center gap-2">
                    <CarrierLogo carrier={form.carrier} size="md" />
                    <select className="input flex-1" value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value, amount: '' }))}>
                      {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                {suggestedAmounts.length > 0 && (
                  <div className="col-span-2">
                    <label className="label">Quick Amount</label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedAmounts.map(a => (
                        <button key={a} onClick={() => setForm(f => ({ ...f, amount: a }))}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.amount === a ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-700 hover:border-brand-400'}`}>
                          ${a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Amount ($)</label>
                  <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">Fee ($)</label>
                  <input type="number" className="input" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} min="0" step="0.25" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select className="input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {form.type === 'prepaid_pin' && (
                  <div className="col-span-2">
                    <label className="label">PIN Code (optional)</label>
                    <input className="input font-mono" value={form.pinCode} onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))} placeholder="Enter PIN if processing manually" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Amount</span><span>{fmt$(form.amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Fee</span><span>{fmt$(form.fee)}</span></div>
                <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2"><span>Total</span><span>{fmt$(totalAmt)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Processing…' : `Charge ${fmt$(totalAmt)}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
