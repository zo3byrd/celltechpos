import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  PencilSquareIcon, MegaphoneIcon, EnvelopeIcon,
  PlusIcon, TrashIcon, XMarkIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const CARD = { background: '#13162a', border: '1px solid #1e2240', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' };
const INP = { background: '#1a1f35', border: '1px solid #2a2f50', color: 'white', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', width: '100%', outline: 'none', fontSize: '0.875rem' };
const LBL = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const BTN_PRIMARY = { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' };

const TYPE_COLORS = {
  info:    { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa',  border: 'rgba(59,130,246,0.3)'  },
  success: { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80',  border: 'rgba(34,197,94,0.3)'   },
  warning: { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24',  border: 'rgba(245,158,11,0.3)'  },
  error:   { bg: 'rgba(239,68,68,0.12)',   text: '#f87171',  border: 'rgba(239,68,68,0.3)'   },
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.info;
  return (
    <span style={{ ...c, padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block', border: `1px solid ${c.border}` }}>
      {type}
    </span>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '2.5rem', height: '1.375rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
        background: value ? '#6366f1' : '#374151', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
      <span style={{
        display: 'block', width: '1rem', height: '1rem', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '0.1875rem',
        left: value ? '1.25rem' : '0.1875rem', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={LBL}>{label}</label>
      {children}
    </div>
  );
}

const EMPTY_FORM = {
  title: '', body: '', type: 'info', active: true, dismissible: true, expiresAt: '',
};

export default function SAContentEditor() {
  const [tab, setTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Email template state
  const [welcomeSettings, setWelcomeSettings] = useState(null);
  const [welcome, setWelcome] = useState({ welcomeEmailSubject: '', welcomeEmailBody: '' });
  const [savingWelcome, setSavingWelcome] = useState(false);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  async function loadEmailSettings() {
    try {
      const { data } = await api.get('/settings');
      setWelcomeSettings(data);
      setWelcome({
        welcomeEmailSubject: data.welcomeEmailSubject || '',
        welcomeEmailBody:    data.welcomeEmailBody    || '',
      });
    } catch {
      toast.error('Failed to load email templates');
    }
  }

  useEffect(() => {
    loadAnnouncements();
    loadEmailSettings();
  }, []);

  async function submitAnnouncement() {
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null,
      };
      if (editId) {
        await api.put(`/announcements/${editId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement created');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      loadAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ann) {
    try {
      await api.put(`/announcements/${ann.id}`, { active: !ann.active });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, active: !a.active } : a));
    } catch {
      toast.error('Failed to update');
    }
  }

  async function deleteAnn(ann) {
    if (!window.confirm(`Delete "${ann.title}"?`)) return;
    try {
      await api.delete(`/announcements/${ann.id}`);
      toast.success('Deleted');
      setAnnouncements(prev => prev.filter(a => a.id !== ann.id));
    } catch {
      toast.error('Failed to delete');
    }
  }

  function openEdit(ann) {
    setEditId(ann.id);
    setForm({
      title: ann.title || '',
      body: ann.body || '',
      type: ann.type || 'info',
      active: ann.active !== false,
      dismissible: ann.dismissible !== false,
      expiresAt: ann.expiresAt ? ann.expiresAt.slice(0, 10) : '',
    });
    setShowForm(true);
  }

  async function saveWelcome() {
    setSavingWelcome(true);
    try {
      await api.put('/settings', welcome);
      toast.success('Welcome email template saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingWelcome(false);
    }
  }

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const TAB_ACTIVE = { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderBottom: '2px solid #6366f1' };
  const TAB_IDLE = { background: 'transparent', color: '#6b7280', borderBottom: '2px solid transparent' };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <PencilSquareIcon className="w-6 h-6" style={{ color: '#6366f1' }} />
        <div>
          <h1 className="text-2xl font-bold text-white">Content Editor</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Manage announcements and email templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: '1px solid #1e2240' }}>
        {[
          { key: 'announcements', label: 'Announcements', icon: MegaphoneIcon },
          { key: 'email',         label: 'Email Templates', icon: EnvelopeIcon },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all"
            style={tab === t.key ? TAB_ACTIVE : TAB_IDLE}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Announcements Tab ── */}
      {tab === 'announcements' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">All Announcements</h2>
            <button style={BTN_PRIMARY} onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}>
              <PlusIcon className="w-4 h-4" />New Announcement
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div style={{ ...CARD, border: '1px solid rgba(99,102,241,0.4)' }} className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-white text-sm">{editId ? 'Edit Announcement' : 'New Announcement'}</span>
                <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null); }} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <Field label="Title">
                    <input style={INP} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Scheduled maintenance tonight" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Body (optional)">
                    <textarea style={{ ...INP, minHeight: '80px', resize: 'vertical' }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Additional details…" />
                  </Field>
                </div>
                <Field label="Type">
                  <select style={INP} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </Field>
                <Field label="Expires At (optional)">
                  <input type="date" style={INP} value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </Field>
                <Field label="Active">
                  <div className="flex items-center gap-2 h-9">
                    <Toggle value={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} />
                    <span className="text-sm" style={{ color: '#9ca3af' }}>{form.active ? 'Visible to users' : 'Hidden'}</span>
                  </div>
                </Field>
                <Field label="Dismissible">
                  <div className="flex items-center gap-2 h-9">
                    <Toggle value={form.dismissible} onChange={v => setForm(f => ({ ...f, dismissible: v }))} />
                    <span className="text-sm" style={{ color: '#9ca3af' }}>{form.dismissible ? 'Users can dismiss' : 'Persistent'}</span>
                  </div>
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null); }}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button style={BTN_PRIMARY} onClick={submitAnnouncement} disabled={saving}>
                  <CheckIcon className="w-4 h-4" />
                  {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ border: '1px solid #1e2240', borderRadius: '0.75rem', overflow: 'hidden' }}>
            {loading ? (
              <div className="p-10 text-center animate-pulse" style={{ color: '#374151' }}>Loading…</div>
            ) : announcements.length === 0 ? (
              <div className="p-10 text-center" style={{ color: '#4b5563' }}>No announcements yet. Create one above.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e2240' }}>
                    {['Title', 'Type', 'Active', 'Expires', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((ann, i) => (
                    <tr key={ann.id} style={{ borderBottom: i < announcements.length - 1 ? '1px solid #1a1f35' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-white">{ann.title}</div>
                        {ann.body && <div className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#4b5563' }}>{ann.body}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={ann.type} />
                      </td>
                      <td className="px-4 py-3">
                        <Toggle value={ann.active} onChange={() => toggleActive(ann)} />
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>
                        {ann.expiresAt ? fmtDate(ann.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(ann)}
                            style={{ padding: '0.375rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteAnn(ann)}
                            style={{ padding: '0.375rem', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Email Templates Tab ── */}
      {tab === 'email' && (
        <div>
          <h2 className="text-base font-bold text-white mb-4">Email Templates</h2>

          {/* Welcome Email Card */}
          <div style={CARD}>
            <div className="flex items-center gap-2 mb-4">
              <EnvelopeIcon className="w-4 h-4" style={{ color: '#6366f1' }} />
              <h3 className="font-bold text-white text-sm">Welcome Email</h3>
              <span style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '999px' }}>Sent on store onboard</span>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              {['{{adminName}}', '{{storeName}}', '{{adminEmail}}'].map(v => (
                <button key={v}
                  onClick={() => setWelcome(w => ({ ...w, welcomeEmailBody: w.welcomeEmailBody + v }))}
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace' }}>
                  + {v}
                </button>
              ))}
            </div>

            <div className="space-y-3 mb-4">
              <Field label="Subject Line">
                <input style={INP} value={welcome.welcomeEmailSubject} onChange={e => setWelcome(w => ({ ...w, welcomeEmailSubject: e.target.value }))} placeholder="Welcome to CellTechPOS!" />
              </Field>
              <Field label="Email Body">
                <textarea
                  style={{ ...INP, minHeight: '200px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.5' }}
                  value={welcome.welcomeEmailBody}
                  onChange={e => setWelcome(w => ({ ...w, welcomeEmailBody: e.target.value }))}
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <button style={BTN_PRIMARY} onClick={saveWelcome} disabled={savingWelcome}>
                <CheckIcon className="w-4 h-4" />
                {savingWelcome ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>

          {/* Campaign Base Template placeholder */}
          <div style={{ ...CARD, opacity: 0.6 }}>
            <div className="flex items-center gap-2 mb-2">
              <MegaphoneIcon className="w-4 h-4" style={{ color: '#9ca3af' }} />
              <h3 className="font-bold text-white text-sm">Campaign Base Template</h3>
              <span style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '999px' }}>Coming soon</span>
            </div>
            <p className="text-sm" style={{ color: '#4b5563' }}>Customize the wrapper HTML used for all outgoing marketing campaigns.</p>
          </div>
        </div>
      )}
    </div>
  );
}
