import React, { useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Switch } from '@/components/ui/switch';
import { Key, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const INTEGRATIONS = [
  {
    id: 'openai', name: 'OpenAI', description: 'GPT-4o for health analysis, drug interactions, and AI insights',
    secretKey: 'OPENAI_API_KEY', status: 'configured', category: 'AI', color: 'var(--hf-lemon-strong)', tc: '#0a1200',
    docsUrl: 'https://platform.openai.com',
  },
  {
    id: 'gemini', name: 'Google Gemini', description: 'Gemini for document analysis and health Q&A',
    secretKey: 'GEMINI_API_KEY', status: 'configured', category: 'AI', color: 'var(--hf-lavender-strong)', tc: '#1a0a40',
    docsUrl: 'https://ai.google.dev',
  },
  {
    id: 'base44_ocr', name: 'Base44 OCR', description: 'Built-in OCR for extracting text from PDFs and images',
    secretKey: null, status: 'built-in', category: 'Processing', color: 'var(--hf-mint-strong)', tc: '#003d20',
    docsUrl: null,
  },
  {
    id: 'base44_email', name: 'Base44 Email', description: 'Platform email for notifications and reminders',
    secretKey: null, status: 'built-in', category: 'Communication', color: 'var(--hf-sky-strong)', tc: '#0a1240',
    docsUrl: null,
  },
  {
    id: 'stripe', name: 'Stripe Payments', description: 'Payment processing for subscription plans',
    secretKey: 'STRIPE_SECRET_KEY', status: 'not_configured', category: 'Payments', color: 'var(--hf-peach-strong)', tc: '#3d1a00',
    docsUrl: 'https://stripe.com/docs',
  },
];

const CATEGORY_ORDER = ['AI', 'Processing', 'Communication', 'Payments'];

export default function AdminIntegrations() {
  const [enabled, setEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_integrations') || '{}'); } catch { return {}; }
  });

  const toggle = (id, current) => {
    const updated = { ...enabled, [id]: !current };
    setEnabled(updated);
    localStorage.setItem('admin_integrations', JSON.stringify(updated));
    toast.success('Integration updated');
  };

  const isEnabled = (id, status) => {
    if (status === 'built-in') return true;
    return enabled[id] !== undefined ? enabled[id] : status === 'configured';
  };

  const grouped = {};
  INTEGRATIONS.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  });

  return (
    <AdminLayout currentPageName="AdminIntegrations">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Integrations</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Manage API providers and service connections</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: INTEGRATIONS.length, bg: '#d7f576', tc: '#0a1200' },
            { label: 'Active', value: INTEGRATIONS.filter(i => isEnabled(i.id, i.status)).length, bg: '#a8e6cf', tc: '#003d20' },
            { label: 'Built-in', value: INTEGRATIONS.filter(i => i.status === 'built-in').length, bg: '#c9bbff', tc: '#1a0a40' },
          ].map(s => (
            <div key={s.label} className="rounded-[20px] p-4" style={{ background: s.bg }}>
              <p className="text-2xl font-black" style={{ color: s.tc }}>{s.value}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: s.tc, opacity: 0.7 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {CATEGORY_ORDER.filter(cat => grouped[cat]).map(cat => (
          <div key={cat}>
            <p className="text-xs font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>{cat}</p>
            <div className="space-y-3">
              {grouped[cat].map(integration => {
                const on = isEnabled(integration.id, integration.status);
                const isBuiltIn = integration.status === 'built-in';
                const isConfigured = integration.status === 'configured';
                return (
                  <div key={integration.id} className="rounded-[20px] p-4 flex items-start justify-between gap-3 transition-all"
                    style={{ background: 'var(--hf-surface)', border: `1px solid ${on ? 'var(--hf-border-strong)' : 'var(--hf-border)'}` }}>
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: integration.color }}>
                        <Key size={16} style={{ color: integration.tc }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{integration.name}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                            background: isBuiltIn ? '#a8e6cf' : isConfigured ? 'rgba(215,245,118,0.15)' : 'rgba(242,140,140,0.15)',
                            color: isBuiltIn ? '#003d20' : isConfigured ? '#d7f576' : '#f28c8c',
                          }}>
                            {isBuiltIn ? 'Built-in' : isConfigured ? 'Configured' : 'Not configured'}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{integration.description}</p>
                        {integration.secretKey && (
                          <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--hf-text-muted)', opacity: 0.6 }}>
                            {integration.secretKey}
                          </p>
                        )}
                        {integration.docsUrl && (
                          <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] mt-1 hover:underline" style={{ color: 'var(--hf-sky-strong)' }}>
                            <ExternalLink size={10} /> View docs
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                      {on ? <CheckCircle2 size={14} style={{ color: 'var(--hf-mint-strong)' }} /> : <AlertCircle size={14} style={{ color: 'var(--hf-coral-strong)' }} />}
                      {!isBuiltIn && (
                        <Switch checked={on} onCheckedChange={() => toggle(integration.id, on)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Info box */}
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(155,180,255,0.1)', border: '1px solid rgba(155,180,255,0.2)' }}>
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-sky-strong)' }}>About API Keys</p>
          <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
            API keys are managed securely in your app's environment secrets (Settings → Secrets). 
            Keys shown as "Configured" are already set. To add or change keys, go to your Base44 dashboard → App Settings → Secrets.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}