import { useEffect, useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon, GiftIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function Referral() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/referrals/my').then(r => setData(r.data)).catch(() => toast.error('Failed to load referral info'));
  }, []);

  function copyLink() {
    if (!data?.referralUrl) return;
    navigator.clipboard.writeText(data.referralUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  const stats = data?.stats || {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GiftIcon className="w-6 h-6 text-teal-500" />
          Refer &amp; Earn
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Share CellTechPOS with other repair shops. You earn 30 free days for every store that subscribes.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { n: '1', label: 'Share your link', desc: 'Send your unique signup link to other shop owners.' },
          { n: '2', label: 'They sign up',    desc: 'They get a 30-day free trial — no credit card required.' },
          { n: '3', label: 'You earn 30 days', desc: 'When they subscribe, 30 days are added to your account.' },
        ].map(s => (
          <div key={s.n} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center mx-auto mb-2">{s.n}</div>
            <p className="text-xs font-semibold text-gray-800 mb-1">{s.label}</p>
            <p className="text-xs text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your referral link</p>
        {data ? (
          <div className="flex gap-2">
            <input
              readOnly
              value={data.referralUrl}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 font-mono"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        )}
        <p className="text-xs text-gray-400 mt-2">Your code: <span className="font-mono font-semibold text-gray-600">{data?.code || '...'}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Referred',   value: stats.total     ?? '—', color: 'text-gray-800' },
          { label: 'Subscribed',       value: stats.rewarded  ?? '—', color: 'text-green-700' },
          { label: 'Days Earned',      value: stats.rewardDays ?? '—', color: 'text-teal-700' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral history */}
      {data?.referrals?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Referral History</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Store</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.referrals.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-800 font-medium">{r.refereeName || 'New Store'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.status === 'rewarded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status === 'rewarded' ? '✓ Rewarded' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {r.status === 'rewarded' ? `+${r.rewardDays || 30} days` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.referrals?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
          <GiftIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No referrals yet. Share your link to get started!</p>
        </div>
      )}
    </div>
  );
}
