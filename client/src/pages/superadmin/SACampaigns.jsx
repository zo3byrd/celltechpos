import { useState, useEffect, useCallback } from 'react';
import {
  MegaphoneIcon, PlusIcon, PaperAirplaneIcon,
  TrashIcon, PencilSquareIcon, UsersIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

const API = '/api/admin-campaigns';

const TARGET_LABELS = {
  all:          'All Subscribers',
  active:       'Active Only',
  expiring_30:  'Expiring in 30 Days',
  expired:      'Expired',
  monthly:      'Monthly Plan',
  yearly:       'Annual Plan',
  trial:        'Trial',
};

const STATUS_STYLES = {
  draft:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Draft' },
  sending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Sending…' },
  sent:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Sent' },
  failed:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Failed' },
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
      style={{ color: s.color, background: s.bg }}>
      {status === 'sent' && <CheckCircleIcon className="w-3 h-3" />}
      {status === 'failed' && <XCircleIcon className="w-3 h-3" />}
      {status === 'sending' && <ArrowPathIcon className="w-3 h-3 animate-spin" />}
      {s.label}
    </span>
  );
}

const TEMPLATE_VARS = [
  { var: '{{storeName}}',  desc: 'Store name' },
  { var: '{{ownerEmail}}', desc: 'Owner email' },
  { var: '{{plan}}',       desc: 'Current plan' },
  { var: '{{expiresAt}}',  desc: 'Expiry date' },
];

const EMPTY_FORM = { subject: '', fromName: 'CellTechPOS', body: '', target: 'all' };

export default function SACampaigns() {
  const { token } = useAuthStore();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [editing, setEditing] = useState(null);   // campaign being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);   // { count, sample }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);   // id being sent
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  function notify(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(API, { headers });
    const data = await r.json();
    setCampaigns(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function loadPreview(target) {
    setPreviewLoading(true);
    setPreview(null);
    const r = await fetch(`${API}/preview?target=${target}`, { headers });
    const data = await r.json();
    setPreview(data);
    setPreviewLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview(null);
    setCompose(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ subject: c.subject, fromName: c.fromName, body: c.body, target: c.target });
    setPreview(null);
    setCompose(true);
  }

  function insertVar(v) {
    setForm(f => ({ ...f, body: f.body + v }));
  }

  async function handleSave(sendNow = false) {
    if (!form.subject.trim() || !form.body.trim()) {
      notify('Subject and body are required', 'error');
      return;
    }
    setSaving(true);
    try {
      let campaign;
      if (editing) {
        const r = await fetch(`${API}/${editing.id}`, {
          method: 'PUT', headers, body: JSON.stringify(form),
        });
        campaign = await r.json();
        if (!r.ok) throw new Error(campaign.error);
      } else {
        const r = await fetch(API, {
          method: 'POST', headers, body: JSON.stringify(form),
        });
        campaign = await r.json();
        if (!r.ok) throw new Error(campaign.error);
      }

      if (sendNow) {
        const sr = await fetch(`${API}/${campaign.id}/send`, { method: 'POST', headers });
        if (!sr.ok) {
          const e = await sr.json();
          throw new Error(e.error);
        }
        notify('Campaign is being sent!');
      } else {
        notify('Draft saved');
      }

      setCompose(false);
      load();
    } catch (e) {
      notify(e.message || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(id) {
    if (!confirm('Send this campaign now to all matching subscribers?')) return;
    setSending(id);
    const r = await fetch(`${API}/${id}/send`, { method: 'POST', headers });
    const data = await r.json();
    setSending(null);
    if (r.ok) { notify('Campaign is being sent!'); load(); }
    else notify(data.error || 'Error', 'error');
  }

  async function handleDelete(id) {
    if (!confirm('Delete this draft?')) return;
    setDeleting(id);
    await fetch(`${API}/${id}`, { method: 'DELETE', headers });
    setDeleting(null);
    load();
  }

  const card = { background: '#181b2e', border: '1px solid #1e2240', borderRadius: 10, padding: '20px 24px' };

  return (
    <div style={{ padding: 28, minHeight: '100vh', background: '#0f1117', color: '#e2e8f0' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#7f1d1d' : '#14532d',
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          border: `1px solid ${toast.type === 'error' ? '#dc2626' : '#16a34a'}`,
          padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <MegaphoneIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Campaigns</h1>
            <p className="text-xs" style={{ color: '#6b7280' }}>Send emails to your subscribers</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <PlusIcon className="w-4 h-4" />New Campaign
        </button>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div style={{ ...card }}>
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse h-16 rounded mb-3" style={{ background: '#1e2240' }} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <MegaphoneIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#374151' }} />
          <p style={{ color: '#4b5563' }} className="font-medium">No campaigns yet</p>
          <p style={{ color: '#374151', fontSize: 13 }}>Create your first campaign to email your subscribers</p>
          <button onClick={openNew}
            className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            Create Campaign
          </button>
        </div>
      ) : (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2240' }}>
                {['Subject', 'Audience', 'Status', 'Recipients', 'Sent At', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#3d4270', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1a1d30' }}>
                  <td style={{ padding: '12px', color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                    {c.subject}
                    <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 400, marginTop: 2 }}>From: {c.fromName}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>
                      {TARGET_LABELS[c.target] || c.target}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '12px', fontSize: 13, color: '#94a3b8' }}>
                    {c.status === 'sent' || c.status === 'failed' ? (
                      <span>
                        <span style={{ color: '#10b981' }}>{c.successCount}</span>
                        <span style={{ color: '#4b5563' }}> / </span>
                        <span style={{ color: '#e2e8f0' }}>{c.recipientCount}</span>
                        {c.failCount > 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>({c.failCount} failed)</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px', fontSize: 12, color: '#6b7280' }}>
                    {fmt(c.sentAt)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div className="flex items-center gap-2">
                      {c.status === 'draft' && (
                        <>
                          <button onClick={() => openEdit(c)} title="Edit"
                            className="p-1.5 rounded transition-colors hover:text-indigo-400"
                            style={{ color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleSend(c.id)}
                            disabled={sending === c.id}
                            title="Send Now"
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                            {sending === c.id
                              ? <ArrowPathIcon className="w-3 h-3 animate-spin" />
                              : <PaperAirplaneIcon className="w-3 h-3" />}
                            Send
                          </button>
                          <button onClick={() => handleDelete(c.id)}
                            disabled={deleting === c.id}
                            title="Delete"
                            className="p-1.5 rounded transition-colors hover:text-red-400"
                            style={{ color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compose Modal */}
      {compose && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '40px 16px', overflowY: 'auto',
        }}>
          <div style={{
            background: '#13162a', border: '1px solid #1e2240', borderRadius: 14,
            width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1e2240' }}>
              <h2 className="text-base font-bold text-white">
                {editing ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button onClick={() => setCompose(false)}
                style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* From Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>From Name</label>
                <input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2240', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="CellTechPOS" />
              </div>

              {/* Audience + preview */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>Target Audience</label>
                <div className="flex gap-2">
                  <select value={form.target} onChange={e => { setForm(f => ({ ...f, target: e.target.value })); setPreview(null); }}
                    style={{ flex: 1, background: '#0f1117', border: '1px solid #1e2240', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none' }}>
                    {Object.entries(TARGET_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button onClick={() => loadPreview(form.target)}
                    disabled={previewLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: '#1e2240', color: '#a5b4fc', border: '1px solid #2d3260', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    {previewLoading ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <UsersIcon className="w-3 h-3" />}
                    Preview
                  </button>
                </div>
                {preview && (
                  <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: '#0f1117', border: '1px solid #1e2240' }}>
                    <p style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>
                      {preview.count} recipient{preview.count !== 1 ? 's' : ''} will receive this email
                    </p>
                    {preview.sample.length > 0 && (
                      <p style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                        e.g. {preview.sample.map(s => s.storeName).join(', ')}{preview.count > 5 ? '…' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>Subject</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2240', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Important update from CellTechPOS" />
              </div>

              {/* Template vars */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>Template Variables <span style={{ color: '#3d4270', fontWeight: 400 }}>(click to insert)</span></label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_VARS.map(v => (
                    <button key={v.var} onClick={() => insertVar(v.var)}
                      title={v.desc}
                      style={{ background: '#1e2240', border: '1px solid #2d3260', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#a5b4fc', fontFamily: 'monospace', cursor: 'pointer' }}>
                      {v.var}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94a3b8' }}>Message Body</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={10}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2240', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                  placeholder="Hi {{storeName}},&#10;&#10;Thank you for subscribing to CellTechPOS!&#10;&#10;Your current plan is {{plan}} and it expires on {{expiresAt}}.&#10;&#10;Best regards,&#10;The CellTechPOS Team" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #1e2240' }}>
              <button onClick={() => setCompose(false)}
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid #1e2240', color: '#94a3b8', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleSave(false)} disabled={saving}
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#1e2240', border: '1px solid #2d3260', color: '#a5b4fc', cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex items-center gap-2"
                style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <PaperAirplaneIcon className="w-4 h-4" />
                {saving ? 'Sending…' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
