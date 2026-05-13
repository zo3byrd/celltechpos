import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  XMarkIcon, PaperAirplaneIcon, DevicePhoneMobileIcon,
  EnvelopeIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../api/client';

const TAB_SMS   = 'sms';
const TAB_EMAIL = 'email';

function HistoryItem({ msg }) {
  const isSms = msg.type === 'sms';
  const ok    = msg.status === 'sent';
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className={`mt-0.5 flex-shrink-0 ${ok ? 'text-green-500' : msg.status === 'failed' ? 'text-red-400' : 'text-gray-300'}`}>
        {ok ? <CheckCircleIcon className="w-4 h-4" /> : msg.status === 'failed' ? <XCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isSms ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {isSms ? 'SMS' : 'Email'}
          </span>
          <span className="text-xs text-gray-400">{msg.to}</span>
          {msg.User && <span className="text-xs text-gray-300">· {msg.User.name}</span>}
          <span className="text-xs text-gray-300 ml-auto">{new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        {msg.subject && <div className="text-xs font-semibold text-gray-600 truncate">{msg.subject}</div>}
        <div className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">{msg.body}</div>
        {msg.error && <div className="text-xs text-red-500 mt-0.5">{msg.error}</div>}
      </div>
    </div>
  );
}

export default function MessageModal({ customer, repair, onClose }) {
  const [tab, setTab]           = useState(TAB_SMS);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [to, setTo]             = useState('');
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const [history, setHistory]   = useState([]);
  const [config, setConfig]     = useState({ sms: false, email: false });
  const [showHistory, setShowHistory] = useState(false);

  // Pre-fill contact
  useEffect(() => {
    if (tab === TAB_SMS)   setTo(customer?.phone || '');
    if (tab === TAB_EMAIL) setTo(customer?.email || '');
  }, [tab, customer]);

  // Load templates + config
  useEffect(() => {
    api.get('/messages/templates').then(r => setTemplates(r.data)).catch(() => {});
    api.get('/messages/config/status').then(r => setConfig(r.data)).catch(() => {});
  }, []);

  // Load history
  useEffect(() => {
    if (!showHistory) return;
    const path = repair
      ? `/messages/repair/${repair.id}`
      : customer?.id
        ? `/messages/customer/${customer.id}`
        : `/messages`;
    api.get(path).then(r => {
      const data = r.data;
      setHistory(Array.isArray(data) ? data : data.messages || []);
    }).catch(() => {});
  }, [showHistory, repair, customer]);

  function applyTemplate(tmpl) {
    setTemplateId(tmpl.id);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  }

  async function send() {
    if (!to)   return toast.error('Enter a destination');
    if (!body) return toast.error('Message body is required');
    if (tab === TAB_EMAIL && !subject) return toast.error('Subject is required for email');
    setSending(true);
    try {
      await api.post('/messages/send', {
        type: tab,
        to,
        subject,
        body,
        templateId,
        customerId: customer?.id,
        repairId:   repair?.id,
      });
      toast.success(tab === TAB_SMS ? 'SMS sent!' : 'Email sent!');
      setBody('');
      setSubject('');
      setTemplateId('');
      if (showHistory) {
        const path = repair ? `/messages/repair/${repair.id}` : `/messages/customer/${customer?.id}`;
        api.get(path).then(r => setHistory(r.data)).catch(() => {});
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Send failed';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  const smsReady   = config.sms;
  const emailReady = config.email;
  const canSend    = tab === TAB_SMS ? smsReady : emailReady;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Send Message</h2>
            {customer && (
              <p className="text-xs text-gray-500">
                {customer.firstName} {customer.lastName}
                {repair && <span className="ml-1 font-mono text-green-700">· #{repair.ticketNumber}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* SMS / Email tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setTab(TAB_SMS)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors ${
                tab === TAB_SMS ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <DevicePhoneMobileIcon className="w-4 h-4" />
              SMS
              {!smsReady && <span className="text-xs opacity-60">(not configured)</span>}
            </button>
            <button
              onClick={() => setTab(TAB_EMAIL)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors ${
                tab === TAB_EMAIL ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <EnvelopeIcon className="w-4 h-4" />
              Email
              {!emailReady && <span className="text-xs opacity-60">(not configured)</span>}
            </button>
          </div>

          {/* Template picker */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Template</label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                    templateId === t.id
                      ? 'bg-green-700 text-white border-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* To */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
              {tab === TAB_SMS ? 'Phone Number' : 'Email Address'}
            </label>
            <input
              className="input text-sm"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder={tab === TAB_SMS ? '+1 (555) 000-0000' : 'customer@example.com'}
            />
          </div>

          {/* Subject (email only) */}
          {tab === TAB_EMAIL && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Subject</label>
              <input
                className="input text-sm"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject line…"
              />
            </div>
          )}

          {/* Body */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Message</label>
            <textarea
              className="input text-sm resize-none"
              rows={6}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your message…"
            />
            <p className="text-xs text-gray-400 mt-1">
              Variables: {'{{name}}'} {'{{store}}'} {'{{storePhone}}'} {'{{ticket}}'} {'{{device}}'} {'{{status}}'}
            </p>
          </div>

          {/* Config warning */}
          {!canSend && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              {tab === TAB_SMS
                ? 'SMS not configured. Add TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM to your .env file.'
                : 'Email not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to your .env file.'}
            </div>
          )}

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            {showHistory ? 'Hide' : 'Show'} message history
          </button>

          {showHistory && (
            <div className="border border-gray-100 rounded-lg max-h-48 overflow-y-auto px-3 py-1">
              {history.length === 0
                ? <p className="text-xs text-gray-400 py-3 text-center">No messages sent yet</p>
                : history.map(m => <HistoryItem key={m.id} msg={m} />)
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={send}
            disabled={sending || !body || !to}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 ${
              tab === TAB_SMS ? 'bg-green-700 hover:bg-green-800' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {sending ? 'Sending…' : tab === TAB_SMS ? 'Send SMS' : 'Send Email'}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
