import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MegaphoneIcon, PlusIcon, XMarkIcon, CheckCircleIcon,
  ExclamationCircleIcon, ArrowTopRightOnSquareIcon, Cog6ToothIcon,
  EnvelopeIcon, DevicePhoneMobileIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

// ── Campaigns data ────────────────────────────────────────────────────────────
const STATUS_COLORS = { draft: 'badge-gray', scheduled: 'badge-blue', sent: 'badge-green', cancelled: 'badge-red' };
const TARGETS = [
  { value: 'all',              label: 'All Customers' },
  { value: 'has_repairs',      label: 'Customers with Repairs' },
  { value: 'loyalty_members',  label: 'Loyalty Members' },
  { value: 'inactive_90days',  label: 'Inactive 90+ Days' },
];
const empty = { name: '', type: 'email', subject: '', message: '', target: 'all', scheduledAt: '' };

// ── Third-party integrations catalog ─────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'twilio',
    name: 'Twilio SMS',
    category: 'SMS',
    icon: '📱',
    description: 'Send bulk SMS campaigns and transactional messages to customers.',
    pricing: '$0.0079 / message · No monthly fee',
    pricingColor: 'text-green-700',
    envKeys: ['TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM'],
    setupSteps: [
      'Sign up at twilio.com',
      'Get a phone number (~$1/mo)',
      'Copy Account SID and Auth Token from console',
      'Add TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM to your .env',
    ],
    signupUrl: 'https://www.twilio.com/try-twilio',
    configFields: [
      { key: 'TWILIO_SID', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'TWILIO_TOKEN', label: 'Auth Token', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
      { key: 'TWILIO_FROM', label: 'From Number', placeholder: '+15005550006' },
    ],
  },
  {
    id: 'smtp',
    name: 'SMTP Email',
    category: 'Email',
    icon: '✉️',
    description: 'Send email campaigns through your own SMTP server or a provider like Gmail, Outlook, or Zoho.',
    pricing: 'Free with own server · Gmail free up to 500/day',
    pricingColor: 'text-green-700',
    envKeys: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
    setupSteps: [
      'Use your email provider SMTP settings',
      'Gmail: enable "App Password" in Google Account settings',
      'Add SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT to .env',
    ],
    signupUrl: null,
    configFields: [
      { key: 'SMTP_HOST', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { key: 'SMTP_PORT', label: 'SMTP Port', placeholder: '587' },
      { key: 'SMTP_USER', label: 'Username / Email', placeholder: 'you@example.com' },
      { key: 'SMTP_PASS', label: 'Password / App Password', placeholder: '••••••••••••', secret: true },
      { key: 'SMTP_FROM', label: 'From Name/Email', placeholder: 'Your Store <you@example.com>' },
    ],
  },
  {
    id: 'boostmyrepair',
    name: 'BoostMyRepair',
    category: 'Repair Shop Marketing',
    icon: '🚀',
    description: 'Marketing platform built specifically for repair shops. Automated review requests, customer follow-ups, reputation management, and local SEO — all in one place.',
    pricing: 'Subscription-based · Visit site for current pricing',
    pricingColor: 'text-blue-700',
    envKeys: [],
    setupSteps: [
      'Go to boostmyrepair.com and create an account',
      'Connect your repair shop profile and location',
      'Enable automated review requests sent after each repair',
      'Set up follow-up SMS/email sequences for past customers',
      'Use the dashboard to monitor reviews, leads, and rankings',
    ],
    signupUrl: 'https://boostmyrepair.com',
    configFields: [],
    external: true,
    badge: 'Built for repair shops',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Email',
    icon: '📧',
    description: 'High-deliverability email platform. Better inbox rates than SMTP. Includes analytics, open rates, and click tracking.',
    pricing: 'Free · 100 emails/day  |  Essentials $19.95/mo · 50k emails',
    pricingColor: 'text-blue-700',
    envKeys: ['SENDGRID_API_KEY'],
    setupSteps: [
      'Sign up at sendgrid.com (free plan available)',
      'Create an API Key with "Mail Send" permission',
      'Verify your sender domain',
      'Add SENDGRID_API_KEY and SENDGRID_FROM to your .env',
      'Switch email integration to SendGrid in Admin settings',
    ],
    signupUrl: 'https://signup.sendgrid.com',
    configFields: [
      { key: 'SENDGRID_API_KEY', label: 'API Key', placeholder: 'SG.xxxxxxxxxxxxxxxx', secret: true },
      { key: 'SENDGRID_FROM', label: 'Verified Sender Email', placeholder: 'noreply@yourdomain.com' },
    ],
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'Email Marketing',
    icon: '🐒',
    description: 'Full-featured email marketing platform with templates, automations, and detailed analytics. Great for newsletters and promotions.',
    pricing: 'Free · up to 500 contacts  |  Essentials from $13/mo',
    pricingColor: 'text-yellow-700',
    envKeys: ['MAILCHIMP_API_KEY'],
    setupSteps: [
      'Sign up at mailchimp.com',
      'Go to Account → Extras → API Keys',
      'Generate an API Key and copy your audience list ID',
      'Add MAILCHIMP_API_KEY and MAILCHIMP_LIST_ID to .env',
    ],
    signupUrl: 'https://login.mailchimp.com/signup',
    configFields: [
      { key: 'MAILCHIMP_API_KEY', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21', secret: true },
      { key: 'MAILCHIMP_LIST_ID', label: 'Audience List ID', placeholder: 'abc123def' },
    ],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    category: 'Paid Advertising',
    icon: '🔍',
    description: 'Reach customers searching for phone repair, accessories, or wireless plans near your store. Pay only when someone clicks.',
    pricing: 'Pay-per-click · Suggested budget $300–$1,000/mo for local',
    pricingColor: 'text-orange-600',
    envKeys: [],
    setupSteps: [
      'Go to ads.google.com and create an account',
      'Set your daily budget and target location (your city/zip)',
      'Choose keywords: "phone repair near me", "iPhone screen fix", etc.',
      'Google gives $500 in free credits to new advertisers',
      'Link Google Analytics to track conversions',
    ],
    signupUrl: 'https://ads.google.com',
    configFields: [],
    external: true,
    badge: '$500 free credit for new accounts',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads (Facebook & Instagram)',
    category: 'Paid Advertising',
    icon: '📘',
    description: 'Target local customers by zip code, age, and interests. Show ads on Facebook, Instagram, and Messenger.',
    pricing: 'Pay-per-impression · Suggested budget $200–$600/mo local',
    pricingColor: 'text-orange-600',
    envKeys: [],
    setupSteps: [
      'Go to business.facebook.com and create a Business account',
      'Set up Facebook Pixel on your website for conversion tracking',
      'Create a campaign: choose "Local Awareness" or "Conversions"',
      'Set radius targeting to 5–15 miles around your store',
      'Design ads with phone repair visuals and a call-to-action',
    ],
    signupUrl: 'https://business.facebook.com/adsmanager',
    configFields: [],
    external: true,
  },
  {
    id: 'yelp_ads',
    name: 'Yelp Ads',
    category: 'Local Advertising',
    icon: '⭐',
    description: 'Appear at the top of Yelp searches for "phone repair" and "cell phone stores" in your city. Highly targeted local traffic.',
    pricing: 'From $300/mo · Cost-per-click model',
    pricingColor: 'text-red-600',
    envKeys: [],
    setupSteps: [
      'Claim your free Yelp Business page at biz.yelp.com',
      'Set up photos, hours, and services',
      'Upgrade to Yelp Ads from the dashboard',
      'Set a daily or monthly budget',
      'Respond to reviews to improve ad performance',
    ],
    signupUrl: 'https://biz.yelp.com',
    configFields: [],
    external: true,
    badge: 'Claim free listing first',
    badgeColor: 'bg-red-50 text-red-600',
  },
  {
    id: 'google_business',
    name: 'Google Business Profile',
    category: 'Local SEO',
    icon: '📍',
    description: 'Free listing that puts your store on Google Maps and local search results. Essential for any local business.',
    pricing: '100% Free — highest ROI for local stores',
    pricingColor: 'text-green-700',
    envKeys: [],
    setupSteps: [
      'Go to business.google.com and claim your listing',
      'Verify your address (Google mails a postcard)',
      'Add photos, hours, services, and your website',
      'Post weekly updates and respond to reviews',
      'Enable Google Messages to get texts from customers',
    ],
    signupUrl: 'https://business.google.com',
    configFields: [],
    external: true,
    badge: 'Free — do this first!',
    badgeColor: 'bg-green-100 text-green-700',
  },
];

const CATEGORY_COLORS = {
  'SMS':                    'bg-green-100 text-green-700',
  'Email':                  'bg-blue-100 text-blue-700',
  'Email Marketing':        'bg-purple-100 text-purple-700',
  'Paid Advertising':       'bg-orange-100 text-orange-700',
  'Local Advertising':      'bg-red-100 text-red-700',
  'Local SEO':              'bg-teal-100 text-teal-700',
  'Repair Shop Marketing':  'bg-blue-100 text-blue-800',
};

// ── Plugin card ───────────────────────────────────────────────────────────────
function PluginCard({ integration, configured, onConfigure }) {
  const [expanded, setExpanded] = useState(false);
  const isConfigured = integration.envKeys.length > 0 && configured;
  const isExternal   = integration.external;

  return (
    <div className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${isConfigured ? 'border-green-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg flex-shrink-0">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{integration.name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[integration.category] || 'bg-gray-100 text-gray-600'}`}>
              {integration.category}
            </span>
            {integration.badge && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${integration.badgeColor}`}>
                {integration.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{integration.description}</p>
        </div>
        <div className="flex-shrink-0">
          {integration.envKeys.length > 0 ? (
            isConfigured
              ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircleIcon className="w-3.5 h-3.5" /> Active
                </span>
              : <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                  <ExclamationCircleIcon className="w-3.5 h-3.5" /> Not set up
                </span>
          ) : (
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">External</span>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="flex items-center gap-1.5">
        <CurrencyDollarIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className={`text-xs font-semibold ${integration.pricingColor}`}>{integration.pricing}</span>
      </div>

      {/* Setup steps (expandable) */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-gray-500 hover:text-gray-700 text-left flex items-center gap-1"
      >
        {expanded ? '▲' : '▶'} {expanded ? 'Hide' : 'Show'} setup steps
      </button>
      {expanded && (
        <ol className="space-y-1 pl-2">
          {integration.setupSteps.map((step, i) => (
            <li key={i} className="text-xs text-gray-600 flex gap-2">
              <span className="text-green-600 font-bold flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        {integration.configFields.length > 0 && (
          <button
            onClick={() => onConfigure(integration)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              isConfigured
                ? 'border-green-300 text-green-700 hover:bg-green-50'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            {isConfigured ? 'Reconfigure' : 'Configure'}
          </button>
        )}
        {integration.signupUrl && (
          <a
            href={integration.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            {isExternal ? 'Get Started' : 'Sign Up'}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Configure modal ───────────────────────────────────────────────────────────
function ConfigureModal({ integration, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{integration.icon}</span>
            <h2 className="font-bold text-gray-900">{integration.name} — Setup</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            These values go in your <strong>.env</strong> file on the server, then restart the server for them to take effect.
          </div>
          {integration.configFields.map(field => (
            <div key={field.key}>
              <label className="text-xs font-bold text-gray-600 block mb-1">{field.label}</label>
              <div className="flex items-center gap-2 bg-gray-900 text-green-400 font-mono text-xs rounded-lg px-3 py-2.5">
                <span className="text-gray-500 select-none">.env</span>
                <span className="text-gray-600 select-none">→</span>
                <span className="font-bold text-white">{field.key}</span>
                <span className="text-gray-500">=</span>
                <span className="text-green-300 truncate">{field.placeholder}</span>
              </div>
            </div>
          ))}
          <ol className="space-y-1.5 border-t border-gray-100 pt-3">
            {integration.setupSteps.map((step, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-2">
                <span className="text-green-600 font-bold flex-shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {integration.signupUrl && (
            <a
              href={integration.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Open {integration.name} →
            </a>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary w-full text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Marketing() {
  const [tab, setTab]             = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(empty);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [preview, setPreview]     = useState(null);
  const [msgConfig, setMsgConfig] = useState({ sms: false, email: false });
  const [configTarget, setConfigTarget] = useState(null);
  const [catFilter, setCatFilter] = useState('all');

  async function load() {
    try {
      const { data } = await api.get('/campaigns');
      setCampaigns(data);
    } catch { toast.error('Failed to load campaigns'); }
  }

  useEffect(() => {
    load();
    api.get('/messages/config/status').then(r => setMsgConfig(r.data)).catch(() => {});
  }, []);

  async function save() {
    if (!form.name || !form.message) return toast.error('Name and message required');
    setSaving(true);
    try {
      if (editing) { await api.put(`/campaigns/${editing}`, form); toast.success('Updated'); }
      else { await api.post('/campaigns', form); toast.success('Campaign created'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function doSend(id) {
    if (!confirm('Send this campaign to all recipients?')) return;
    try {
      const { data } = await api.post(`/campaigns/${id}/send`);
      const msg = data.failed > 0
        ? `Sent ${data.sent}, ${data.failed} failed`
        : `Sent to ${data.sent ?? data.recipientCount} recipients`;
      toast.success(msg);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function doPreview(id) {
    try {
      const { data } = await api.post(`/campaigns/${id}/preview`);
      setPreview({ id, count: data.recipientCount });
    } catch {}
  }

  function openEdit(c) {
    setForm({ name: c.name, type: c.type, subject: c.subject || '', message: c.message, target: c.target, scheduledAt: c.scheduledAt || '' });
    setEditing(c.id); setModal(true);
  }

  // Which integrations are configured
  function isConfigured(integration) {
    if (integration.id === 'twilio') return msgConfig.sms;
    if (integration.id === 'smtp')   return msgConfig.email;
    return false;
  }

  const categories = ['all', ...new Set(INTEGRATIONS.map(i => i.category))];
  const visibleIntegrations = catFilter === 'all'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === catFilter);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Marketing & Campaigns</h1>
          <p className="page-sub">Email, SMS campaigns and third-party marketing integrations</p>
        </div>
        {tab === 'campaigns' && (
          <button className="btn-primary" onClick={() => { setForm(empty); setEditing(null); setModal(true); }}>
            <PlusIcon className="w-4 h-4" />New Campaign
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'campaigns',    label: 'Campaigns',              icon: MegaphoneIcon },
          { key: 'integrations', label: 'Plugins & Integrations', icon: Cog6ToothIcon },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ── */}
      {tab === 'campaigns' && (
        <>
          {/* Config status */}
          <div className="flex gap-3">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${msgConfig.sms ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              <DevicePhoneMobileIcon className="w-3.5 h-3.5" />SMS {msgConfig.sms ? '✓ Ready' : '— Not configured'}
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${msgConfig.email ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
              <EnvelopeIcon className="w-3.5 h-3.5" />Email {msgConfig.email ? '✓ Ready' : '— Not configured'}
            </div>
            {!msgConfig.sms && !msgConfig.email && (
              <button onClick={() => setTab('integrations')} className="text-xs text-amber-700 underline">
                Set up integrations →
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Campaigns', value: campaigns.length },
              { label: 'Sent', value: campaigns.filter(c => c.status === 'sent').length },
              { label: 'Draft', value: campaigns.filter(c => c.status === 'draft').length },
              { label: 'Total Recipients', value: campaigns.reduce((s, c) => s + (c.recipientCount || 0), 0) },
            ].map(s => (
              <div key={s.label} className="card">
                <div className="text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Campaign list */}
          <div className="card p-0 overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="p-10 text-center">
                <MegaphoneIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No campaigns yet</p>
                <p className="text-slate-400 text-sm">Create your first campaign to engage customers</p>
              </div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="table-th">Name</th><th className="table-th">Type</th><th className="table-th">Target</th>
                  <th className="table-th">Status</th><th className="table-th">Recipients</th><th className="table-th">Sent</th><th className="table-th">Actions</th>
                </tr></thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="table-row">
                      <td className="table-td font-medium">{c.name}</td>
                      <td className="table-td"><span className={c.type === 'email' ? 'badge-blue' : 'badge-teal'}>{c.type.toUpperCase()}</span></td>
                      <td className="table-td text-slate-500">{TARGETS.find(t => t.value === c.target)?.label}</td>
                      <td className="table-td"><span className={STATUS_COLORS[c.status] || 'badge-gray'}>{c.status}</span></td>
                      <td className="table-td">{c.recipientCount || 0}</td>
                      <td className="table-td text-slate-500 text-xs">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : '—'}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          {c.status === 'draft' && (
                            <>
                              <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => openEdit(c)}>Edit</button>
                              <button className="text-xs text-brand-600 hover:underline" onClick={() => doPreview(c.id)}>Preview</button>
                              <button className="text-xs text-emerald-600 font-medium hover:underline" onClick={() => doSend(c.id)}>Send</button>
                            </>
                          )}
                          {c.status === 'sent' && <span className="text-xs text-slate-400">Sent</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {tab === 'integrations' && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div className="bg-gradient-to-r from-green-900 to-green-700 text-white rounded-xl p-4 flex items-start gap-4">
            <div className="text-3xl flex-shrink-0">🔌</div>
            <div>
              <h2 className="font-bold text-base mb-0.5">Third-Party Marketing Integrations</h2>
              <p className="text-green-200 text-sm">
                Connect paid marketing channels to grow your customer base. Start with Google Business Profile (free) and SMS/Email, then scale to paid ads as your budget grows.
              </p>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors capitalize ${
                  catFilter === cat
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-700'
                }`}>
                {cat === 'all' ? 'All Integrations' : cat}
              </button>
            ))}
          </div>

          {/* Integration cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleIntegrations.map(integration => (
              <PluginCard
                key={integration.id}
                integration={integration}
                configured={isConfigured(integration)}
                onConfigure={setConfigTarget}
              />
            ))}
          </div>

          {/* Cost estimator */}
          <div className="card p-5 space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-700" />
              Monthly Marketing Budget Guide
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Service</th>
                    <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Starter Budget</th>
                    <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Expected Reach</th>
                    <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { name: 'BoostMyRepair', budget: 'Subscription', reach: 'Reviews, follow-ups, SEO', best: 'Repair shop-specific growth' },
                    { name: 'Google Business Profile', budget: 'Free', reach: 'Local search & Maps', best: 'Organic local traffic' },
                    { name: 'SMS (Twilio)', budget: '~$10–50/mo', reach: '1,000–6,000 messages', best: 'Repair status, promotions' },
                    { name: 'Email (SMTP/SendGrid)', budget: 'Free–$20/mo', reach: 'Unlimited (own list)', best: 'Newsletters, follow-ups' },
                    { name: 'Google Ads', budget: '$300–600/mo', reach: '5,000–15,000 impressions', best: '"Phone repair near me"' },
                    { name: 'Meta Ads', budget: '$200–400/mo', reach: '10,000–25,000 people', best: 'Brand awareness, deals' },
                    { name: 'Yelp Ads', budget: '$300+/mo', reach: 'Yelp search results', best: 'High-intent local buyers' },
                  ].map(row => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-800">{row.name}</td>
                      <td className="py-2.5 text-green-700 font-semibold">{row.budget}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{row.reach}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{row.best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">* Costs are estimates and vary by location, competition, and campaign quality.</p>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal-box max-w-sm text-center">
            <div className="p-8">
              <div className="text-4xl font-bold text-brand-600 mb-2">{preview.count}</div>
              <div className="text-slate-600">recipients will receive this campaign</div>
              <div className="mt-4 flex gap-3 justify-center">
                <button className="btn-secondary" onClick={() => setPreview(null)}>Close</button>
                <button className="btn-primary" onClick={() => { setPreview(null); doSend(preview.id); }}>Send Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold">{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div><label className="label">Campaign Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Promo" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type</label>
                    <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Target Audience</label>
                    <select className="input" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                      {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                {form.type === 'email' && (
                  <div><label className="label">Subject Line</label><input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject…" /></div>
                )}
                <div>
                  <label className="label">Message *</label>
                  <textarea className="input" rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={form.type === 'sms' ? 'SMS message (160 chars max for single message)…' : 'Email body…'} />
                  {form.type === 'sms' && <p className="text-xs text-slate-400 mt-1">{form.message.length}/160 characters</p>}
                </div>
                <div>
                  <label className="label">Schedule Date (optional)</label>
                  <input type="datetime-local" className="input" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                {(!msgConfig.sms || !msgConfig.email) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    {!msgConfig.sms && !msgConfig.email
                      ? 'No sending channel configured. '
                      : !msgConfig.sms ? 'SMS not configured. ' : 'Email not configured. '}
                    <button className="underline font-semibold" onClick={() => { setModal(false); setTab('integrations'); }}>
                      Set up integrations →
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Campaign')}</button>
            </div>
          </div>
        </div>
      )}

      {configTarget && (
        <ConfigureModal integration={configTarget} onClose={() => setConfigTarget(null)} />
      )}
    </div>
  );
}
