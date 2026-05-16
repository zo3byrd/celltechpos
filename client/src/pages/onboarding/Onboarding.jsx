import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const STEPS = ['Welcome', 'Store Profile', 'Invite Staff', 'All Set!'];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < current ? 'bg-green-600 text-white' :
            i === current ? 'bg-green-700 text-white ring-4 ring-green-100' :
            'bg-gray-200 text-gray-400'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-10 transition-all ${i < current ? 'bg-green-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Welcome ────────────────────────────────────────────────────────────
function StepWelcome({ user, onNext }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">
        🎉
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}!</h2>
        <p className="text-gray-500 mt-1">Your 30-day free trial has started. Let's get your store set up — it only takes a minute.</p>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
        <p className="text-sm font-semibold text-green-800">Here's what we'll set up:</p>
        {[
          'Store address, phone & email (for receipts & customer notifications)',
          'Optional: invite your first staff member',
        ].map(item => (
          <div key={item} className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
            <span className="text-sm text-green-700">{item}</span>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="btn-primary w-full py-3 text-base">
        Let's get started →
      </button>
    </div>
  );
}

// ── Step 2: Store Profile ──────────────────────────────────────────────────────
function StepStoreProfile({ user, onNext, onSkip }) {
  const [form, setForm] = useState({
    name: user?.store?.name || '',
    address: '',
    city: user?.store?.city || '',
    state: user?.store?.state || '',
    zip: '',
    phone: '',
    email: '',
    taxRate: '0.08',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/admin/store', {
        ...form,
        taxRate: parseFloat(form.taxRate) || 0.08,
      });
      toast.success('Store profile saved!');
      onNext();
    } catch {
      toast.error('Could not save store profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Store Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">This info appears on receipts and customer notifications.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Store Name</label>
          <input className="input w-full" value={form.name} onChange={set('name')} placeholder="PC World Exchange" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Street Address</label>
          <input className="input w-full" value={form.address} onChange={set('address')} placeholder="123 Main St" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">City</label>
            <input className="input w-full" value={form.city} onChange={set('city')} placeholder="Orlando" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">State</label>
            <select className="input w-full" value={form.state} onChange={set('state')}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">ZIP Code</label>
            <input className="input w-full" value={form.zip} onChange={set('zip')} placeholder="32801" maxLength={10} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Tax Rate (%)</label>
            <input className="input w-full" type="number" step="0.01" min="0" max="20" value={(parseFloat(form.taxRate) * 100).toFixed(2)}
              onChange={e => setForm(f => ({ ...f, taxRate: (parseFloat(e.target.value) / 100).toFixed(4) }))}
              placeholder="8.00" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Store Phone</label>
          <input className="input w-full" value={form.phone} onChange={set('phone')} placeholder="(407) 555-0100" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Store Email</label>
          <input type="email" className="input w-full" value={form.email} onChange={set('email')} placeholder="info@mystore.com" />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onSkip} className="btn-secondary flex-1">Skip for now</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Invite Staff ───────────────────────────────────────────────────────
function StepInviteStaff({ onNext, onSkip }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'technician', password: '' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleInvite() {
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/users', form);
      toast.success(`${form.name} has been added!`);
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not add user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Invite a Staff Member</h2>
        <p className="text-sm text-gray-500 mt-0.5">Add your first employee so they can log in and start working.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Full Name</label>
          <input className="input w-full" value={form.name} onChange={set('name')} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</label>
          <input type="email" className="input w-full" value={form.email} onChange={set('email')} placeholder="jane@mystore.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Role</label>
          <select className="input w-full" value={form.role} onChange={set('role')}>
            <option value="admin">Admin (full access)</option>
            <option value="technician">Technician (repairs only)</option>
            <option value="sales_rep">Sales Rep</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Temporary Password</label>
          <input type="password" className="input w-full" value={form.password} onChange={set('password')} placeholder="Min 6 characters" minLength={6} />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onSkip} className="btn-secondary flex-1">Skip for now</button>
        <button onClick={handleInvite} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Adding…' : 'Add & Continue →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Done ───────────────────────────────────────────────────────────────
function StepDone({ onFinish }) {
  const QUICK_LINKS = [
    { emoji: '🔧', label: 'Create a Repair Ticket', to: '/app/repairs/new', desc: 'Log a new device repair' },
    { emoji: '💰', label: 'Open Point of Sale', to: '/app/pos', desc: 'Ring up a sale or accessory' },
    { emoji: '📦', label: 'Add Inventory', to: '/app/inventory', desc: 'Stock products & accessories' },
    { emoji: '👥', label: 'Manage Staff', to: '/app/admin/users', desc: 'Add more team members' },
  ];

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">
        🚀
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
        <p className="text-gray-500 mt-1">Your store is ready to go. Here's where to start:</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left">
        {QUICK_LINKS.map(l => (
          <button key={l.to} onClick={() => onFinish(l.to)}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group">
            <div className="text-2xl mb-1">{l.emoji}</div>
            <div className="text-sm font-semibold text-gray-800 group-hover:text-green-800">{l.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{l.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={() => onFinish('/app')} className="btn-secondary w-full">
        Go to Dashboard →
      </button>
    </div>
  );
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding() {
  const { user, setOnboardingDone } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  function finish(to = '/app') {
    setOnboardingDone();
    navigate(to, { replace: true });
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-baseline gap-0 justify-center">
            <span className="text-2xl font-black text-gray-900 tracking-tight">CELL</span>
            <span className="text-2xl font-black text-teal-500 tracking-tight">TECH</span>
            <span className="text-xs font-black text-sky-400 ml-1 tracking-widest">POS</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">Setup Wizard · Step {step + 1} of {STEPS.length}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <StepDots current={step} />

          {step === 0 && <StepWelcome user={user} onNext={() => setStep(1)} />}
          {step === 1 && <StepStoreProfile user={user} onNext={() => setStep(2)} onSkip={() => setStep(2)} />}
          {step === 2 && <StepInviteStaff onNext={() => setStep(3)} onSkip={() => setStep(3)} />}
          {step === 3 && <StepDone onFinish={finish} />}
        </div>

        {step > 0 && step < 3 && (
          <button onClick={() => finish('/app')} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 py-2">
            Skip setup — go straight to dashboard
          </button>
        )}
      </div>
    </div>
  );
}
