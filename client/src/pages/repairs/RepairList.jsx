import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import MessageModal from '../../components/MessageModal';

function exportCSV(params) {
  const p = new URLSearchParams();
  if (params.status) p.set('status', params.status);
  api.get(`/repairs/export/csv?${p}`, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = 'repairs.csv'; a.click();
    URL.revokeObjectURL(url);
  }).catch(() => toast.error('Export failed'));
}

const STATUS_BADGE = {
  received:       'badge-blue',
  diagnosing:     'badge-yellow',
  waiting_parts:  'badge-orange',
  in_repair:      'badge-purple',
  quality_check:  'badge-purple',
  ready:          'badge-green',
  picked_up:      'badge-gray',
  cancelled:      'badge-red',
};

const STATUSES = ['received','diagnosing','waiting_parts','in_repair','quality_check','ready','picked_up','cancelled'];

export default function RepairList() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgTarget, setMsgTarget] = useState(null); // { repair, customer }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get(`/repairs?${params}`)
      .then(r => { setTickets(r.data.tickets); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page, search, status]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Tickets</h1>
          <p className="text-sm text-gray-500">{total} total tickets</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => exportCSV({ status })}>
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
          <Link to="/app/repairs/new" className="btn-primary">+ New Ticket</Link>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search ticket, IMEI, device…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Ticket #','Customer','Device','Status','Tech','Est. Cost','Created',''].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="table-td"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : tickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="table-td">
                  <Link to={`/repairs/${t.id}`} className="font-mono text-brand-600 hover:underline">{t.ticketNumber}</Link>
                </td>
                <td className="table-td">{t.Customer ? `${t.Customer.firstName} ${t.Customer.lastName}` : '—'}</td>
                <td className="table-td">{[t.deviceBrand, t.deviceModel].filter(Boolean).join(' ') || t.deviceType}</td>
                <td className="table-td">
                  <span className={STATUS_BADGE[t.status] || 'badge-gray'}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="table-td">{t.technician?.name || '—'}</td>
                <td className="table-td">{t.estimatedCost ? `$${parseFloat(t.estimatedCost).toFixed(2)}` : '—'}</td>
                <td className="table-td text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="table-td">
                  <button
                    className="text-xs text-green-700 font-semibold hover:underline"
                    onClick={() => setMsgTarget({ repair: t, customer: t.Customer })}
                  >
                    Message
                  </button>
                </td>
              </tr>
            ))}
            {!loading && tickets.length === 0 && (
              <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">No tickets found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {Math.ceil(total / 20)}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>Next</button>
          </div>
        </div>
      )}

      {msgTarget && (
        <MessageModal
          customer={msgTarget.customer}
          repair={msgTarget.repair}
          onClose={() => setMsgTarget(null)}
        />
      )}
    </div>
  );
}
