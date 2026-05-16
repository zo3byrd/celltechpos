import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

const DEVICE_TYPES = ['phone','tablet','laptop','watch','other'];

export default function RepairRequest() {
  const [params] = useSearchParams();
  const storeId = params.get('storeId');

  const [storeInfo, setStoreInfo] = useState(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    deviceType: 'phone', deviceBrand: '', deviceModel: '', issueDescription: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!storeId) return;
    api.get(`/public/repair-request/store-info?storeId=${storeId}`)
      .then(r => setStoreInfo(r.data))
      .catch(() => {});
  }, [storeId]);

  async function submit(e) {
    e.preventDefault();
    if (!form.firstName || !form.phone || !form.deviceBrand || !form.issueDescription) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/public/repair-request', { ...form, storeId });
      setSubmitted(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed. Please call us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold mb-2">Invalid link</p>
          <p className="text-sm">Please use the link provided by your repair shop.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Request Submitted!</h2>
          <p className="text-gray-500 text-sm">
            Your repair request has been received. We'll contact you shortly to confirm your appointment.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Ticket Number</p>
            <p className="font-mono font-bold text-lg text-gray-800">{submitted.ticketNumber}</p>
          </div>
          <p className="text-xs text-gray-400">
            Save this ticket number to check your repair status later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          {storeInfo?.logoUrl && (
            <img src={storeInfo.logoUrl} alt={storeInfo.name} className="h-16 object-contain mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{storeInfo?.name || 'Repair Shop'}</h1>
          <p className="text-gray-500 text-sm mt-1">Submit a repair request and we'll be in touch</p>
          {storeInfo?.phone && <p className="text-green-700 font-semibold text-sm mt-1">{storeInfo.phone}</p>}
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name <span className="text-red-500">*</span></label>
              <input className="input" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone <span className="text-red-500">*</span></label>
              <input className="input" type="tel" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="optional" />
            </div>
          </div>

          <h2 className="font-semibold text-gray-800 border-b pb-2 pt-2">Device Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Device Type</label>
              <select className="input" value={form.deviceType} onChange={e => set('deviceType', e.target.value)}>
                {DEVICE_TYPES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Brand <span className="text-red-500">*</span></label>
              <input className="input" required value={form.deviceBrand} onChange={e => set('deviceBrand', e.target.value)} placeholder="Apple, Samsung…" />
            </div>
            <div className="col-span-2">
              <label className="label">Model</label>
              <input className="input" value={form.deviceModel} onChange={e => set('deviceModel', e.target.value)} placeholder="iPhone 14 Pro, Galaxy S23…" />
            </div>
          </div>

          <div>
            <label className="label">Describe the Issue <span className="text-red-500">*</span></label>
            <textarea className="input h-28 resize-none" required value={form.issueDescription}
              onChange={e => set('issueDescription', e.target.value)}
              placeholder="Tell us what's wrong with your device…" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-white text-base transition-all disabled:opacity-50"
            style={{ background: '#166534' }}>
            {submitting ? 'Submitting…' : 'Submit Repair Request'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            By submitting, you agree that we may contact you via phone or email about your repair.
          </p>
        </form>
      </div>
    </div>
  );
}
