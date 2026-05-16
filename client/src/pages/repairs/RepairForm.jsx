import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PaperClipIcon, TrashIcon, PhotoIcon,
  DocumentIcon, ClockIcon, PlayIcon, StopIcon, PrinterIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUS_OPTIONS = ['received','diagnosing','waiting_parts','in_repair','quality_check','ready','picked_up','cancelled'];
const PRIORITY_OPTIONS = ['low','normal','high','urgent'];
const DEVICE_TYPES = ['phone','tablet','laptop','watch','other'];

const STATUS_BADGE = {
  received:'badge-blue', diagnosing:'badge-yellow', waiting_parts:'badge-orange',
  in_repair:'badge-purple', quality_check:'badge-purple', ready:'badge-green',
  picked_up:'badge-gray', cancelled:'badge-red',
};

function FileThumb({ att, onDelete }) {
  const isImage = att.mimeType?.startsWith('image/');
  const isPdf = att.mimeType === 'application/pdf';
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
  const src = base + att.url;

  return (
    <div style={{ position: 'relative', width: 80, flexShrink: 0 }}>
      <a href={src} target="_blank" rel="noreferrer" title={att.originalName}>
        {isImage ? (
          <img src={src} alt={att.originalName}
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {isPdf ? <DocumentIcon style={{ width: 28, height: 28, color: '#ef4444' }} /> : <PaperClipIcon style={{ width: 28, height: 28, color: '#6b7280' }} />}
            <span style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', padding: '0 4px', lineHeight: 1.2, wordBreak: 'break-all' }}>
              {att.originalName?.split('.').pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </a>
      <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }} title={att.originalName}>
        {att.originalName}
      </p>
      <button onClick={() => onDelete(att.id)}
        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TrashIcon style={{ width: 10, height: 10 }} />
      </button>
    </div>
  );
}

function AttachmentsPanel({ repairId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const loadAttachments = useCallback(async () => {
    if (!repairId) return;
    try {
      const r = await api.get(`/uploads/repairs/${repairId}/attachments`);
      setAttachments(r.data || []);
    } catch { /* ignore */ }
  }, [repairId]);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  async function upload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      await api.post(`/uploads/repairs/${repairId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
      loadAttachments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function deleteAtt(attId) {
    if (!confirm('Remove this attachment?')) return;
    await api.delete(`/uploads/attachments/${attId}`).catch(() => null);
    toast.success('Removed');
    loadAttachments();
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files);
  }

  const fmt = n => {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
        <PaperClipIcon className="w-4 h-4" /> Attachments
        {attachments.length > 0 && <span className="ml-auto text-xs text-gray-400">{attachments.length} file{attachments.length !== 1 ? 's' : ''}</span>}
      </h2>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#e5e7eb'}`,
          borderRadius: 10,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#f0f0ff' : '#fafafa',
          transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <div className="text-sm text-gray-500">Uploading…</div>
        ) : (
          <>
            <PhotoIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
            <p className="text-sm font-medium text-gray-500">Drop photos or files here</p>
            <p className="text-xs text-gray-300 mt-0.5">JPG, PNG, PDF — up to 10 MB each, 10 files max</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => upload(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {attachments.map(att => (
            <FileThumb key={att.id} att={att} onDelete={deleteAtt} />
          ))}
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-xs text-gray-400 text-center">No attachments yet. Upload photos of the device condition, damage, or repair before/after.</p>
      )}
    </div>
  );
}

function fmtDuration(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function TimerPanel({ repairId }) {
  const [logs, setLogs] = useState([]);
  const [active, setActive] = useState(null); // running log entry
  const [elapsed, setElapsed] = useState(0);  // seconds since start
  const [loading, setLoading] = useState(false);
  const tickRef = useRef(null);

  const loadLogs = useCallback(async () => {
    if (!repairId) return;
    try {
      const r = await api.get(`/uploads/repairs/${repairId}/timelogs`);
      const all = r.data || [];
      setLogs(all);
      const running = all.find(l => l.startedAt && !l.endedAt);
      if (running) {
        setActive(running);
        setElapsed(Math.floor((Date.now() - new Date(running.startedAt)) / 1000));
      } else {
        setActive(null);
        setElapsed(0);
      }
    } catch { /* ignore */ }
  }, [repairId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Live tick while timer is running
  useEffect(() => {
    if (active) {
      tickRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [active]);

  async function startTimer() {
    setLoading(true);
    try {
      await api.post(`/uploads/repairs/${repairId}/timer/start`);
      toast.success('Timer started');
      loadLogs();
    } catch { toast.error('Failed to start timer'); }
    finally { setLoading(false); }
  }

  async function stopTimer() {
    if (!active) return;
    setLoading(true);
    try {
      await api.post(`/uploads/timer/${active.id}/stop`);
      toast.success('Timer stopped');
      loadLogs();
    } catch { toast.error('Failed to stop timer'); }
    finally { setLoading(false); }
  }

  const totalMins = logs.filter(l => l.endedAt).reduce((s, l) => s + (l.minutes || 0), 0);
  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;
  const displaySecs = String(elapsedSecs).padStart(2, '0');

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
        <ClockIcon className="w-4 h-4" /> Job Timer
        {totalMins > 0 && (
          <span className="ml-auto text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
            Total: {fmtDuration(totalMins + (active ? elapsedMins : 0))}
          </span>
        )}
      </h2>

      {/* Active timer display */}
      {active ? (
        <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Timer Running
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.05em', lineHeight: 1 }}>
              {elapsedMins}:{displaySecs}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              Started at {fmtTime(active.startedAt)}
            </div>
          </div>
          <button
            onClick={stopTimer}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <StopIcon style={{ width: 16, height: 16 }} />
            Stop
          </button>
        </div>
      ) : (
        <button
          onClick={startTimer}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, background: '#f0fdf4', border: '2px dashed #86efac', color: '#15803d', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#4ade80'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}
        >
          <PlayIcon style={{ width: 16, height: 16 }} />
          Start Timer
        </button>
      )}

      {/* Log entries */}
      {logs.filter(l => l.endedAt).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time Log</p>
          <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
            {logs.filter(l => l.endedAt).map((log, i) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                    {fmtDate(log.startedAt)} · {fmtTime(log.startedAt)} → {fmtTime(log.endedAt)}
                  </span>
                  {log.notes && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{log.notes}</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', minWidth: 40, textAlign: 'right' }}>
                  {fmtDuration(log.minutes)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>Total time logged</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>{fmtDuration(totalMins)}</span>
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 && !active && (
        <p className="text-xs text-gray-400 text-center">No time logged yet. Hit Start Timer when work begins.</p>
      )}
    </div>
  );
}

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
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => { api.get('/admin/store').then(r => setStoreInfo(r.data)).catch(() => {}); }, []);

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

  function printRepairTicket() {
    if (!ticket) return;
    const s = storeInfo || {};
    const storeName = s.name || 'Repair Shop';
    const storeAddr = [s.address, s.city, s.state, s.zip].filter(Boolean).join(', ');
    const cust = ticket.Customer;
    const custName = cust ? `${cust.firstName} ${cust.lastName}` : '—';
    const custPhone = cust?.phone || '';
    const custEmail = cust?.email || '';
    const fmt$ = n => n ? '$' + parseFloat(n).toFixed(2) : '—';
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—';
    const logoHtml = s.logoUrl
      ? `<div style="text-align:center;margin-bottom:8px"><img src="${s.logoUrl}" style="max-height:64px;max-width:160px;object-fit:contain"/></div>`
      : '';
    const policy = s.receiptPolicy || 'We are not responsible for data loss. Pre-existing damage noted above. 90-day warranty on parts and labor unless otherwise stated.';

    const existing = document.getElementById('__repair_frame__');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__repair_frame__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:1100px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Repair Ticket</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#111}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
  .store-info{flex:1}
  .store-name{font-size:20px;font-weight:bold}
  .store-sub{font-size:11px;color:#555;margin-top:2px}
  .ticket-info{text-align:right}
  .ticket-num{font-size:22px;font-weight:bold;font-family:monospace}
  .ticket-date{font-size:11px;color:#555}
  .section{margin-bottom:14px}
  .section-title{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
  .field label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em}
  .field p{font-size:13px;font-weight:500;min-height:16px}
  .issue-box{background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:8px;font-size:13px;min-height:48px;white-space:pre-wrap}
  .cost-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}
  .cost-row:last-child{border-bottom:none;font-weight:bold;font-size:14px}
  .terms{font-size:10px;color:#555;line-height:1.5;margin-top:8px;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:4px}
  .sig-grid{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-top:24px}
  .sig-line{border-top:1px solid #111;padding-top:4px;font-size:10px;color:#888}
  @media print{body{padding:16px}}
</style></head><body>
<div class="header">
  <div class="store-info">
    ${logoHtml}
    <div class="store-name">${storeName}</div>
    ${storeAddr ? `<div class="store-sub">${storeAddr}</div>` : ''}
    ${s.phone ? `<div class="store-sub">${s.phone}</div>` : ''}
    ${s.email ? `<div class="store-sub">${s.email}</div>` : ''}
  </div>
  <div class="ticket-info">
    <div class="ticket-num">${ticket.ticketNumber}</div>
    <div class="ticket-date">Date: ${fmtDate(ticket.createdAt)}</div>
    <div class="ticket-date">Status: ${(ticket.status || '').replace(/_/g,' ').toUpperCase()}</div>
    <div class="ticket-date">Priority: ${(ticket.priority || '').toUpperCase()}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Customer Information</div>
  <div class="grid">
    <div class="field"><label>Name</label><p>${custName}</p></div>
    <div class="field"><label>Phone</label><p>${custPhone || '—'}</p></div>
    <div class="field"><label>Email</label><p>${custEmail || '—'}</p></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Device Information</div>
  <div class="grid">
    <div class="field"><label>Brand / Model</label><p>${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}</p></div>
    <div class="field"><label>Type</label><p>${ticket.deviceType || '—'}</p></div>
    ${ticket.color ? `<div class="field"><label>Color</label><p>${ticket.color}</p></div>` : ''}
    ${ticket.imei ? `<div class="field"><label>IMEI / Serial</label><p>${ticket.imei}</p></div>` : ''}
  </div>
</div>

<div class="section">
  <div class="section-title">Issue Description</div>
  <div class="issue-box">${ticket.issueDescription || '—'}</div>
</div>

<div class="section">
  <div class="section-title">Cost &amp; Timeline</div>
  <div style="max-width:280px">
    ${ticket.estimatedCost ? `<div class="cost-row"><span>Estimated Cost</span><span>${fmt$(ticket.estimatedCost)}</span></div>` : ''}
    ${ticket.deposit && parseFloat(ticket.deposit) > 0 ? `<div class="cost-row"><span>Deposit Paid</span><span>${fmt$(ticket.deposit)}</span></div>` : ''}
    ${ticket.finalCost ? `<div class="cost-row"><span>Final Cost</span><span>${fmt$(ticket.finalCost)}</span></div>` : ''}
    ${ticket.dueDate ? `<div class="cost-row"><span>Est. Ready Date</span><span>${fmtDate(ticket.dueDate)}</span></div>` : ''}
    ${ticket.warrantyDays ? `<div class="cost-row"><span>Warranty</span><span>${ticket.warrantyDays} days</span></div>` : ''}
  </div>
</div>

<div class="terms">${policy}</div>

<div class="sig-grid">
  <div>
    <div style="height:40px"></div>
    <div class="sig-line">Customer Signature</div>
  </div>
  <div>
    <div style="height:40px"></div>
    <div class="sig-line">Date</div>
  </div>
</div>
</body></html>`);
    doc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/repairs/${id}`, form);
        toast.success('Ticket updated');
      } else {
        const { data } = await api.post('/repairs', form);
        toast.success(`Ticket ${data.ticketNumber} created`);
        navigate(`/app/repairs/${data.id}`);
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
        <Link to="/app/repairs" className="text-gray-400 hover:text-gray-600 text-sm">← Repairs</Link>
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

        {/* Attachments & Timer — only shown on existing tickets */}
        {isEdit && (
          <>
            <div className="md:col-span-1">
              <TimerPanel repairId={id} />
            </div>
            <div className="md:col-span-1">
              <AttachmentsPanel repairId={id} />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Ticket')}
        </button>
        {isEdit && ticket && (
          <button className="btn-secondary flex items-center gap-1.5" onClick={printRepairTicket}>
            <PrinterIcon className="w-4 h-4" /> Print Ticket
          </button>
        )}
        {isEdit && ticket && (
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() => {
              const base = window.location.origin;
              const url = `${base}/portal?ticket=${ticket.ticketNumber}&storeId=${storeInfo?.id || ticket.storeId}`;
              navigator.clipboard.writeText(url).then(() => toast.success('Tracking link copied!'));
            }}
          >
            <LinkIcon className="w-4 h-4" /> Copy Tracking Link
          </button>
        )}
        <Link to="/app/repairs" className="btn-secondary">Cancel</Link>
        {!isEdit && <p className="text-xs text-gray-400 self-center">Save the ticket first, then you can add photos & attachments.</p>}
      </div>
    </div>
  );
}
