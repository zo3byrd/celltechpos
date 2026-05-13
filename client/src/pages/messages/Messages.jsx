import { useEffect, useState } from 'react';
import {
  ChatBubbleLeftRightIcon, DevicePhoneMobileIcon, EnvelopeIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import MessageModal from '../../components/MessageModal';

const STATUS_COLORS = {
  sent:    'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-600',
  pending: 'bg-gray-100 text-gray-500',
};

const STATUS_ICON = {
  sent:    CheckCircleIcon,
  failed:  XCircleIcon,
  pending: ClockIcon,
};

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [config, setConfig]     = useState({ sms: false, email: false });
  const [showCompose, setShowCompose] = useState(false);

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ limit: 25, offset: (page - 1) * 25 });
    if (typeFilter)   p.set('type', typeFilter);
    if (statusFilter) p.set('status', statusFilter);
    api.get(`/messages?${p}`)
      .then(r => { setMessages(r.data.messages); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, typeFilter, statusFilter]);

  useEffect(() => {
    api.get('/messages/config/status').then(r => setConfig(r.data)).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-700" />
            Messages
          </h1>
          <p className="text-sm text-gray-500">{total} sent messages</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCompose(true)}>
          + Compose
        </button>
      </div>

      {/* Config status */}
      <div className="flex gap-3">
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${config.sms ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
          <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
          SMS {config.sms ? 'Active' : 'Not configured'}
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${config.email ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
          <EnvelopeIcon className="w-3.5 h-3.5" />
          Email {config.email ? 'Active' : 'Not configured'}
        </div>
        {config.twilioFrom && <div className="text-xs text-gray-400 flex items-center">From: {config.twilioFrom}</div>}
        {config.smtpFrom   && <div className="text-xs text-gray-400 flex items-center">From: {config.smtpFrom}</div>}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select className="input w-36 text-sm" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
        <select className="input w-36 text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Type', 'Status', 'To', 'Customer', 'Subject / Preview', 'Sent By', 'Date'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="table-td"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : messages.length === 0 ? (
              <tr><td colSpan={7} className="table-td text-center text-gray-400 py-10">No messages yet</td></tr>
            ) : messages.map(m => {
              const StatusIcon = STATUS_ICON[m.status] || ClockIcon;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${m.type === 'sms' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {m.type === 'sms' ? <DevicePhoneMobileIcon className="w-3 h-3" /> : <EnvelopeIcon className="w-3 h-3" />}
                      {m.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${STATUS_COLORS[m.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {m.status}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-600 font-mono">{m.to}</td>
                  <td className="table-td text-xs">
                    {m.Customer ? `${m.Customer.firstName} ${m.Customer.lastName}` : '—'}
                  </td>
                  <td className="table-td max-w-xs">
                    {m.subject && <div className="text-xs font-semibold text-gray-700 truncate">{m.subject}</div>}
                    <div className="text-xs text-gray-400 truncate">{m.body}</div>
                    {m.error && <div className="text-xs text-red-500 truncate">{m.error}</div>}
                  </td>
                  <td className="table-td text-xs text-gray-400">{m.User?.name || '—'}</td>
                  <td className="table-td text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 25 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {Math.ceil(total / 25)}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 25)}>Next</button>
          </div>
        </div>
      )}

      {showCompose && (
        <MessageModal onClose={() => { setShowCompose(false); load(); }} />
      )}
    </div>
  );
}
