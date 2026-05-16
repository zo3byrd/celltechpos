import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import MessageModal from '../../components/MessageModal';

function printRepairLabel(t) {
  const custName = t.Customer ? `${t.Customer.firstName} ${t.Customer.lastName}` : '—';
  const custPhone = t.Customer?.phone || '';
  const device = [t.deviceBrand, t.deviceModel].filter(Boolean).join(' ') || t.deviceType || '—';
  const date = new Date(t.createdAt).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'2-digit' });
  const status = (t.status || '').replace(/_/g, ' ').toUpperCase();
  const existing = document.getElementById('__label_frame__');
  if (existing) existing.remove();
  const iframe = document.createElement('iframe');
  iframe.id = '__label_frame__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:400px;height:200px;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label</title>
<style>
  @page{size:2.25in 4in;margin:0.12in}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:9pt;width:2.01in;overflow:hidden;background:#fff;color:#000}
  .store{font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px}
  .divider{border:none;border-top:1.5px solid #000;margin:4px 0}
  .type-badge{font-size:7pt;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;color:#555;margin-bottom:3px}
  .tnum{font-family:'Courier New',monospace;font-size:16pt;font-weight:900;letter-spacing:1px;text-align:center;margin:4px 0}
  .barcode{font-family:'Courier New',monospace;font-size:9pt;font-weight:bold;letter-spacing:2px;text-align:center;background:#000;color:#fff;padding:3px 2px;margin:4px 0;word-break:break-all}
  .row{font-size:8pt;margin-bottom:3px;line-height:1.3}
  .lbl{font-size:6.5pt;font-weight:bold;text-transform:uppercase;color:#666;display:block}
  .val{font-weight:600;display:block}
  @media print{@page{size:2.25in 4in;margin:0.12in}body{margin:0}}
</style></head><body>
<div class="store">Repair Ticket</div>
<hr class="divider">
<div class="type-badge">Repair Ticket</div>
<div class="tnum">${t.ticketNumber}</div>
<div class="barcode">${t.ticketNumber}</div>
<hr class="divider">
<div class="row"><span class="lbl">Customer</span><span class="val">${custName}</span></div>
${custPhone ? `<div class="row"><span class="lbl">Phone</span><span class="val">${custPhone}</span></div>` : ''}
<div class="row"><span class="lbl">Device</span><span class="val">${device}</span></div>
${t.imei ? `<div class="row"><span class="lbl">IMEI / Serial</span><span class="val">${t.imei}</span></div>` : ''}
<div class="row"><span class="lbl">Date In</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Status</span><span class="val">${status}</span></div>
</body></html>`);
  doc.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}

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
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs text-green-700 font-semibold hover:underline"
                      onClick={() => setMsgTarget({ repair: t, customer: t.Customer })}
                    >
                      Message
                    </button>
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      title="Print Label"
                      onClick={() => printRepairLabel(t)}
                    >
                      <PrinterIcon className="w-4 h-4" />
                    </button>
                  </div>
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
