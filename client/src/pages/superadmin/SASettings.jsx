import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Cog6ToothIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon,
  BuildingStorefrontIcon, LockClosedIcon, PaperAirplaneIcon,
  ServerIcon, CalendarDaysIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const CARD = { background: '#13162a', border: '1px solid #1e2240', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' };
const SECTION_TITLE = { fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(99,102,241,0.2)', paddingBottom: '0.5rem', marginBottom: '1rem' };
const INP = { background: '#1a1f35', border: '1px solid #2a2f50', color: 'white', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', width: '100%', outline: 'none', fontSize: '0.875rem' };
const LBL = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const BTN_PRIMARY = { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' };
const BTN_SECONDARY = { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' };

function Field({ label, children }) {
  return (
    <div>
      <label style={LBL}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color: '#6366f1' }} />
      <h2 className="font-bold text-white text-sm">{title}</h2>
    </div>
  );
}

export default function SASettings() {
  const { user, setAuth, token } = useAuthStore();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  // My Account state
  const [acctName, setAcctName] = useState('');
  const [acctEmail, setAcctEmail] = useState('');
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' });

  // Platform branding
  const [brand, setBrand] = useState({
    platformName: '', supportEmail: '', supportPhone: '', zelleEmail: '', logoUrl: '',
  });

  // SMTP
  const [smtp, setSmtp] = useState({
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFromName: '', smtpFromEmail: '',
  });

  // Trial
  const [trial, setTrial] = useState({ trialDays: '14', autoSeedInventory: 'false' });

  // Welcome email
  const [welcome, setWelcome] = useState({ welcomeEmailSubject: '', welcomeEmailBody: '' });

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
      setBrand({
        platformName:  data.platformName  || '',
        supportEmail:  data.supportEmail  || '',
        supportPhone:  data.supportPhone  || '',
        zelleEmail:    data.zelleEmail    || '',
        logoUrl:       data.logoUrl       || '',
      });
      setSmtp({
        smtpHost:      data.smtpHost      || '',
        smtpPort:      data.smtpPort      || '587',
        smtpUser:      data.smtpUser      || '',
        smtpPass:      data.smtpPass      || '',
        smtpFromName:  data.smtpFromName  || '',
        smtpFromEmail: data.smtpFromEmail || '',
      });
      setTrial({
        trialDays:        data.trialDays        || '14',
        autoSeedInventory: data.autoSeedInventory || 'false',
      });
      setWelcome({
        welcomeEmailSubject: data.welcomeEmailSubject || '',
        welcomeEmailBody:    data.welcomeEmailBody    || '',
      });
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAcctName(user?.name || '');
    setAcctEmail(user?.email || '');
    loadSettings();
  }, []);

  async function saveSection(key, payload) {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const { data } = await api.put('/settings', payload);
      setSettings(data);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  }

  async function saveAccount() {
    setSaving(s => ({ ...s, acct: true }));
    try {
      const { data } = await api.put(`/admin/users/${user.id}`, { name: acctName, email: acctEmail });
      setAuth(token, { ...user, name: data.name, email: data.email });
      toast.success('Account updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(s => ({ ...s, acct: false }));
    }
  }

  async function changePassword() {
    if (!pw.new || pw.new !== pw.confirm) return toast.error('Passwords do not match');
    if (pw.new.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(s => ({ ...s, pw: true }));
    try {
      await api.put(`/admin/users/${user.id}`, { password: pw.new });
      toast.success('Password changed');
      setPw({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(s => ({ ...s, pw: false }));
    }
  }

  async function sendTestEmail() {
    if (!smtp.smtpHost || !smtp.smtpUser || !smtp.smtpPass) {
      return toast.error('Fill in SMTP Host, Username, and Password first');
    }
    setSaving(s => ({ ...s, testEmail: true }));
    try {
      const { data } = await api.post('/settings/test-email', smtp);
      toast.success(`Test email sent to ${data.to} via ${data.host}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setSaving(s => ({ ...s, testEmail: false }));
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} style={{ background: '#13162a', borderRadius: '0.75rem', height: '200px' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Cog6ToothIcon className="w-6 h-6" style={{ color: '#6366f1' }} />
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Platform configuration and account management</p>
        </div>
      </div>

      {/* ── My Account ── */}
      <div style={CARD}>
        <SectionHeader icon={UserCircleIcon} title="My Account" />
        <div style={SECTION_TITLE}>Profile</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Display Name">
            <input style={INP} value={acctName} onChange={e => setAcctName(e.target.value)} placeholder="Your Name" />
          </Field>
          <Field label="Email Address">
            <input type="email" style={INP} value={acctEmail} onChange={e => setAcctEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
        </div>
        <div className="flex justify-end">
          <button style={BTN_PRIMARY} onClick={saveAccount} disabled={saving.acct}>
            <CheckIcon className="w-4 h-4" />
            {saving.acct ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        <div style={{ ...SECTION_TITLE, marginTop: '1.5rem' }}>Change Password</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Field label="Current Password">
            <input type="password" style={INP} value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="••••••" />
          </Field>
          <Field label="New Password">
            <input type="password" style={INP} value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} placeholder="••••••" />
          </Field>
          <Field label="Confirm Password">
            <input type="password" style={INP} value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••" />
          </Field>
        </div>
        <div className="flex justify-end">
          <button style={BTN_PRIMARY} onClick={changePassword} disabled={saving.pw}>
            <LockClosedIcon className="w-4 h-4" />
            {saving.pw ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* ── Platform Branding ── */}
      <div style={CARD}>
        <SectionHeader icon={BuildingStorefrontIcon} title="Platform Branding" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Platform Name">
            <input style={INP} value={brand.platformName} onChange={e => setBrand(b => ({ ...b, platformName: e.target.value }))} placeholder="CellTechPOS" />
          </Field>
          <Field label="Logo URL">
            <input style={INP} value={brand.logoUrl} onChange={e => setBrand(b => ({ ...b, logoUrl: e.target.value }))} placeholder="https://…/logo.png" />
          </Field>
          <Field label="Support Email">
            <input type="email" style={INP} value={brand.supportEmail} onChange={e => setBrand(b => ({ ...b, supportEmail: e.target.value }))} placeholder="support@celltechpos.com" />
          </Field>
          <Field label="Support Phone">
            <input style={INP} value={brand.supportPhone} onChange={e => setBrand(b => ({ ...b, supportPhone: e.target.value }))} placeholder="(800) 555-0100" />
          </Field>
          <div className="col-span-2">
            <Field label="Zelle Email">
              <input style={INP} value={brand.zelleEmail} onChange={e => setBrand(b => ({ ...b, zelleEmail: e.target.value }))} placeholder="Pcworldexchange@gmail.com" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <button style={BTN_PRIMARY} onClick={() => saveSection('brand', brand)} disabled={saving.brand}>
            <CheckIcon className="w-4 h-4" />
            {saving.brand ? 'Saving…' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* ── SMTP Email Config ── */}
      <div style={CARD}>
        <SectionHeader icon={ServerIcon} title="SMTP Email Config" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="SMTP Host">
            <input style={INP} value={smtp.smtpHost} onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.sendgrid.net" />
          </Field>
          <Field label="SMTP Port">
            <input style={INP} value={smtp.smtpPort} onChange={e => setSmtp(s => ({ ...s, smtpPort: e.target.value }))} placeholder="587" />
          </Field>
          <Field label="SMTP Username">
            <input style={INP} value={smtp.smtpUser} onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))} placeholder="apikey" />
          </Field>
          <Field label="SMTP Password">
            <input type="password" style={INP} value={smtp.smtpPass} onChange={e => setSmtp(s => ({ ...s, smtpPass: e.target.value }))} placeholder="••••••••" />
          </Field>
          <Field label="From Name">
            <input style={INP} value={smtp.smtpFromName} onChange={e => setSmtp(s => ({ ...s, smtpFromName: e.target.value }))} placeholder="CellTechPOS" />
          </Field>
          <Field label="From Email">
            <input type="email" style={INP} value={smtp.smtpFromEmail} onChange={e => setSmtp(s => ({ ...s, smtpFromEmail: e.target.value }))} placeholder="noreply@celltechpos.com" />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <button style={BTN_SECONDARY} onClick={sendTestEmail} disabled={saving.testEmail}>
            <PaperAirplaneIcon className="w-4 h-4" />
            {saving.testEmail ? 'Sending…' : 'Send Test Email'}
          </button>
          <button style={BTN_PRIMARY} onClick={() => saveSection('smtp', smtp)} disabled={saving.smtp}>
            <CheckIcon className="w-4 h-4" />
            {saving.smtp ? 'Saving…' : 'Save SMTP Config'}
          </button>
        </div>
      </div>

      {/* ── Trial Settings ── */}
      <div style={CARD}>
        <SectionHeader icon={CalendarDaysIcon} title="Trial Settings" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Trial Duration">
            <select style={INP} value={trial.trialDays} onChange={e => setTrial(t => ({ ...t, trialDays: e.target.value }))}>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </Field>
          <Field label="Auto-Seed Inventory on Onboard">
            <div className="flex items-center gap-3 h-9">
              <button
                onClick={() => setTrial(t => ({ ...t, autoSeedInventory: t.autoSeedInventory === 'true' ? 'false' : 'true' }))}
                style={{
                  width: '2.75rem', height: '1.5rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  background: trial.autoSeedInventory === 'true' ? '#6366f1' : '#374151',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                <span style={{
                  display: 'block', width: '1.1rem', height: '1.1rem', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '0.2rem',
                  left: trial.autoSeedInventory === 'true' ? '1.4rem' : '0.2rem',
                  transition: 'left 0.2s',
                }} />
              </button>
              <span className="text-sm" style={{ color: '#9ca3af' }}>
                {trial.autoSeedInventory === 'true' ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </Field>
        </div>
        <div className="flex justify-end">
          <button style={BTN_PRIMARY} onClick={() => saveSection('trial', trial)} disabled={saving.trial}>
            <CheckIcon className="w-4 h-4" />
            {saving.trial ? 'Saving…' : 'Save Trial Settings'}
          </button>
        </div>
      </div>

      {/* ── Welcome Email ── */}
      <div style={CARD}>
        <SectionHeader icon={EnvelopeIcon} title="Welcome Email Template" />
        <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
          Available variables: <code style={{ color: '#a5b4fc' }}>{'{{adminName}}'}</code>, <code style={{ color: '#a5b4fc' }}>{'{{storeName}}'}</code>, <code style={{ color: '#a5b4fc' }}>{'{{adminEmail}}'}</code>
        </p>
        <div className="space-y-3 mb-4">
          <Field label="Subject">
            <input style={INP} value={welcome.welcomeEmailSubject} onChange={e => setWelcome(w => ({ ...w, welcomeEmailSubject: e.target.value }))} placeholder="Welcome to CellTechPOS!" />
          </Field>
          <Field label="Email Body">
            <textarea
              style={{ ...INP, minHeight: '160px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
              value={welcome.welcomeEmailBody}
              onChange={e => setWelcome(w => ({ ...w, welcomeEmailBody: e.target.value }))}
              placeholder="Hi {{adminName}},&#10;&#10;Welcome to CellTechPOS!…"
            />
          </Field>
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['{{adminName}}', '{{storeName}}', '{{adminEmail}}'].map(v => (
            <button key={v}
              onClick={() => setWelcome(w => ({ ...w, welcomeEmailBody: w.welcomeEmailBody + v }))}
              style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace' }}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button style={BTN_PRIMARY} onClick={() => saveSection('welcome', welcome)} disabled={saving.welcome}>
            <CheckIcon className="w-4 h-4" />
            {saving.welcome ? 'Saving…' : 'Save Welcome Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
