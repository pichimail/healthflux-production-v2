import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Phone, AlertCircle, Loader2, ExternalLink, Lock, Fingerprint, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const FEATURES = [
  { icon: '🏥', title: 'Unified Health Records', desc: 'Access all your health records from any hospital in India' },
  { icon: '🔗', title: 'Seamless Sharing', desc: 'Share records with doctors and hospitals with one tap' },
  { icon: '🔒', title: 'Consent-Based Access', desc: 'Full control over who sees your health data' },
  { icon: '📱', title: 'Digital Health ID', desc: 'Your 14-digit ABHA number acts as a universal health ID' },
];

export default function ABHASettings() {
  const [method, setMethod] = useState('phone');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);
  const [abhaId] = useState('12-3456-7890-1234');

  const sendOTP = async () => {
    const val = method === 'phone' ? phone : aadhaar;
    if (!val || val.length < (method === 'phone' ? 10 : 12)) { toast.error('Please enter a valid ' + (method === 'phone' ? 'phone number' : 'Aadhaar number')); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setOtpSent(true);
    setLoading(false);
    toast.success('OTP sent to your registered mobile number');
  };

  const verify = async () => {
    if (otp.length < 6) { toast.error('Enter valid 6-digit OTP'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setLinked(true);
    setLoading(false);
    toast.success('🎉 ABHA account linked successfully!');
  };

  const reset = () => { setOtpSent(false); setOtp(''); setPhone(''); setAadhaar(''); };

  if (linked) return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2"><Shield size={20} style={{ color: 'var(--hf-mint-strong)' }} /> ABHA Settings</h1>
        <p className="bento-subtitle">Ayushman Bharat Health Account</p>
      </div>

      {/* Linked success */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'linear-gradient(135deg, rgba(168,230,207,0.15), rgba(215,245,118,0.1))', border: '1px solid rgba(168,230,207,0.4)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'rgba(168,230,207,0.2)' }}>✅</div>
          <div className="flex-1">
            <p className="font-black text-sm" style={{ color: 'var(--hf-mint-strong)' }}>ABHA Account Linked</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Your Ayushman Bharat Health Account is active</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hf-text-muted)' }}>ABHA Number</p>
          <p className="text-lg font-black tracking-widest" style={{ color: 'var(--hf-text)' }}>{abhaId}</p>
          <p className="text-[9px] mt-1" style={{ color: 'var(--hf-text-muted)' }}>Linked via: {method === 'phone' ? `Phone ${phone}` : `Aadhaar ${aadhaar}`}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { v: '0', label: 'Records Linked', color: 'var(--hf-mint-strong)', tc: '#003d20' },
          { v: '0', label: 'Consents Given', color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
          { v: 'Active', label: 'Status', color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <p className="text-lg font-black" style={{ color: s.tc }}>{s.v}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.tc }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Lock size={14} style={{ color: 'var(--hf-lemon-strong)' }} />
          <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>Privacy & Consent</p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>Your health data is protected under the DPDP Act. All sharing requires explicit consent from you. Visit the ABHA portal to manage your records and consents.</p>
        <a href="https://healthid.ndhm.gov.in" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 mt-3 text-xs font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>
          Open ABHA Portal <ExternalLink size={11} />
        </a>
      </div>

      <button onClick={() => setLinked(false)} className="w-full h-10 rounded-2xl text-xs font-bold" style={{ background: 'rgba(242,140,140,0.1)', color: 'var(--hf-coral-strong)', border: '1px solid rgba(242,140,140,0.3)' }}>
        Unlink ABHA Account
      </button>
    </div>
  );

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2"><Shield size={20} style={{ color: 'var(--hf-mint-strong)' }} /> ABHA Integration</h1>
        <p className="bento-subtitle">Ayushman Bharat Health Account</p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {FEATURES.map(f => (
          <div key={f.title} className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <span className="text-xl">{f.icon}</span>
            <p className="text-xs font-black mt-1.5 mb-0.5" style={{ color: 'var(--hf-text)' }}>{f.title}</p>
            <p className="text-[9px] leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Link method selector */}
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Link Method</p>
        <div className="grid grid-cols-2 gap-2">
          {[{ k: 'phone', icon: <Phone size={18} />, label: 'Phone Number', sub: 'OTP on mobile' }, { k: 'aadhaar', icon: <Fingerprint size={18} />, label: 'Aadhaar', sub: 'Via Aadhaar OTP' }].map(m => (
            <button key={m.k} onClick={() => { setMethod(m.k); reset(); }}
              className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all"
              style={{ background: method === m.k ? 'rgba(168,230,207,0.15)' : 'var(--hf-surface)', border: method === m.k ? '1.5px solid rgba(168,230,207,0.5)' : '1px solid var(--hf-border)' }}>
              <span style={{ color: method === m.k ? '#a8e6cf' : 'var(--hf-text-muted)' }}>{m.icon}</span>
              <div className="text-center">
                <p className="text-xs font-bold" style={{ color: method === m.k ? '#a8e6cf' : 'var(--hf-text)' }}>{m.label}</p>
                <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{m.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input + OTP */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        {!otpSent ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{method === 'phone' ? 'Mobile Number' : 'Aadhaar Number'}</Label>
              {method === 'phone' ? (
                <div className="flex gap-2">
                  <div className="flex items-center justify-center px-3 rounded-xl text-sm font-bold" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>+91</div>
                  <Input type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="h-12 rounded-2xl flex-1 font-mono tracking-widest text-center text-lg font-bold" maxLength={10} />
                </div>
              ) : (
                <Input type="text" placeholder="Enter 12-digit Aadhaar" value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))} className="h-12 rounded-2xl font-mono tracking-widest text-center text-lg font-bold" maxLength={12} />
              )}
            </div>
            <Button onClick={sendOTP} disabled={loading} className="w-full h-11 rounded-2xl font-bold" style={{ background: '#a8e6cf', color: '#003d20' }}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Sending OTP…</> : 'Send OTP'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>Enter OTP sent to your {method === 'phone' ? `+91 ${phone}` : 'registered mobile'}</p>
              <button onClick={reset} className="text-[10px]" style={{ color: 'var(--hf-lemon-strong)' }}>Change</button>
            </div>
            {/* OTP boxes */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input key={i} type="text" maxLength={1}
                  value={otp[i] || ''}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '');
                    const arr = otp.split('');
                    arr[i] = v;
                    setOtp(arr.join(''));
                    if (v && i < 5) document.getElementById(`otp_${i+1}`)?.focus();
                  }}
                  id={`otp_${i}`}
                  className="w-10 h-12 text-center text-xl font-black rounded-xl outline-none"
                  style={{ background: otp[i] ? 'rgba(168,230,207,0.2)' : 'var(--hf-surface-2)', border: otp[i] ? '1.5px solid #a8e6cf' : '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
                />
              ))}
            </div>
            <Button onClick={verify} disabled={loading || otp.length < 6} className="w-full h-11 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Verifying…</> : '✓ Verify & Link ABHA'}
            </Button>
            <button className="w-full text-xs text-center" style={{ color: 'var(--hf-text-muted)' }} onClick={sendOTP}>
              <RefreshCw size={10} className="inline mr-1" />Resend OTP
            </button>
          </div>
        )}
      </div>

      <div className="p-3 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(247,201,163,0.1)', border: '1px solid rgba(247,201,163,0.3)' }}>
        <AlertCircle size={14} style={{ color: 'var(--hf-peach-strong)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[10px] font-bold" style={{ color: 'var(--hf-peach-strong)' }}>Important Note</p>
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>Your phone/Aadhaar must be registered with ABHA. Don't have ABHA yet? <a href="https://healthid.ndhm.gov.in" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--hf-lemon-strong)' }}>Create at abdm.gov.in</a></p>
        </div>
      </div>
    </div>
  );
}