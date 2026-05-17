// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Heart, ArrowRight, ArrowLeft, Check, Sparkles, Globe, Upload, Loader2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import FamilyMemberSetup from '@/components/onboarding/FamilyMemberSetup';
import { extractTextFromPdf, uploadFile, extractInsuranceData } from '@/components/utils/aiService';
import { getSupabaseClient } from '@/lib/db';   // Stable import instead of dynamic import inside functions

const STEPS = [
  { id: 1, title: 'Welcome', subtitle: 'Tell us your name' },
  { id: 2, title: 'About You', subtitle: 'Basic personal details' },
  { id: 3, title: 'Health Info', subtitle: 'A few medical details' },
  { id: 4, title: 'Language & Insurance', subtitle: 'Choose language & upload insurance (optional)' },
  { id: 5, title: "You're all set!", subtitle: 'Review & confirm' },
  { id: 6, title: 'Family Members', subtitle: 'Add your loved ones' },
];

const PASTEL_STEPS = [
  { bg: '#d7f576', text: '#0a1200' },
  { bg: '#c9bbff', text: '#1a0a40' },
  { bg: '#f7c9a3', text: '#3d1a00' },
  { bg: '#9bb4ff', text: '#0a1240' },
  { bg: '#a3e4d7', text: '#0a2a25' },
  { bg: '#f28c8c', text: '#3d0000' },
];

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'తెలుగు', native: 'Telugu' },
  { code: 'hi', label: 'हिंदी', native: 'Hindi' },
  { code: 'tinglish', label: 'Tinglish', native: 'Telugu + English' },
];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [insuranceProcessing, setInsuranceProcessing] = useState(false);
  const [insuranceData, setInsuranceData] = useState(null);
  const [insuranceUpload, setInsuranceUpload] = useState(null);
  const [insuranceError, setInsuranceError] = useState('');
  const [insuranceReviewed, setInsuranceReviewed] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', date_of_birth: '', gender: '', blood_group: '', height: '',
  });
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');
  const userIdRef = useRef(null);

  // ── Mount: check onboarding status, restore saved draft ──────────────
  useEffect(() => {
    const timeout = setTimeout(() => setChecking(false), 8000);
    (async () => {
      try {
        const sb = await getSupabaseClient();   // Using stable getter
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { clearTimeout(timeout); setChecking(false); return; }
        userIdRef.current = user.id;

        // Check if already completed onboarding
        const { data: existing } = await sb.from('profiles')
          .select('id, full_name, date_of_birth, gender, blood_group, height, onboarding_completed, preferred_language')
          .eq('user_id', user.id)
          .eq('relationship', 'self')
          .maybeSingle();

        clearTimeout(timeout);

        if (existing?.onboarding_completed) {
          navigate(createPageUrl('Dashboard'), { replace: true });
          return;
        }

        // Restore localStorage draft first (takes priority over DB partial data)
        const draftKey = `hf_onboarding_${user.id}`;
        let restored = false;
        try {
          const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
          if (saved) {
            if (saved.formData) setFormData(saved.formData);
            if (saved.selectedLang) {
              setSelectedLang(saved.selectedLang);
              i18n.changeLanguage(saved.selectedLang);
            }
            if (saved.step && saved.step >= 1 && saved.step <= 5) {
              setStep(saved.step);
            }
            restored = true;
          }
        } catch {}

        if (!restored && existing) {
          setFormData({
            full_name: existing.full_name || '',
            date_of_birth: existing.date_of_birth || '',
            gender: existing.gender || '',
            blood_group: existing.blood_group || '',
            height: existing.height ? String(existing.height) : '',
          });
          if (existing.preferred_language) {
            setSelectedLang(existing.preferred_language);
            i18n.changeLanguage(existing.preferred_language);
          }
        }

        setChecking(false);
      } catch {
        clearTimeout(timeout);
        setChecking(false);
      }
    })();
    return () => clearTimeout(timeout);
  }, []);

  // ── Auto-save draft whenever step or form data changes ────────────────
  useEffect(() => {
    if (checking || !userIdRef.current) return;
    try {
      localStorage.setItem(
        `hf_onboarding_${userIdRef.current}`,
        JSON.stringify({ step, formData, selectedLang })
      );
    } catch {}
  }, [step, formData, selectedLang, checking]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hf-bg)' }}>
        <div className="w-8 h-8 border-2 border-[#d7f576] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const go = (next) => { setDir(next > step ? 1 : -1); setStep(next); };

  const handleLangChange = (lang) => {
    setSelectedLang(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('hf_lang', lang);
  };

  const handleInsuranceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInsuranceProcessing(true);
    setInsuranceError('');
    setInsuranceData(null);
    setInsuranceReviewed(false);
    try {
      const isPdf = (file.type || '').toLowerCase().includes('pdf') || /\.pdf$/i.test(file.name || '');
      let result;

      if (isPdf) {
        const [uploadResult, extractedText] = await Promise.all([
          uploadFile(file).catch(() => null),
          extractTextFromPdf(file),
        ]);
        if (uploadResult) setInsuranceUpload({ url: uploadResult.url, name: file.name, size: file.size });
        if (!extractedText || extractedText.trim().length < 50) {
          throw new Error('Could not extract readable text from this PDF. It may be a scanned document — please upload a photo of your insurance card instead.');
        }
        result = await extractInsuranceData({ documentText: extractedText });
      } else {
        const uploadResult = await uploadFile(file);
        setInsuranceUpload({ url: uploadResult.url, name: file.name, size: file.size });
        result = await extractInsuranceData({ fileUrl: uploadResult.url });
      }

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (!parsed || !Array.isArray(parsed.members)) {
        throw new Error('AI could not extract insurance details. Please try a clearer image or PDF.');
      }
      setInsuranceData(parsed);
      if (parsed.members?.[0]?.full_name && !formData.full_name) {
        setFormData(prev => ({ ...prev, full_name: parsed.members[0].full_name }));
      }
    } catch (err) {
      console.error('Insurance extraction failed:', err);
      setInsuranceError(err.message || 'Insurance upload or extraction failed. Please retry with a clear image/PDF.');
    }
    setInsuranceProcessing(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();   // Using stable getter
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      try { localStorage.removeItem(`hf_onboarding_${user.id}`); } catch {}

      const profilePayload = {
        ...formData,
        relationship: 'self',
        height: formData.height ? parseFloat(formData.height) : undefined,
        onboarding_completed: true,
        preferred_language: selectedLang || 'en',
        insurance_provider: insuranceData?.insurer || undefined,
        insurance_policy_number: insuranceData?.policy_number || undefined,
        insurance_plan_name: insuranceData?.plan_name || undefined,
        insurance_valid_from: insuranceData?.valid_from || undefined,
        insurance_valid_to: insuranceData?.valid_to || undefined,
        insurance_sum_insured: insuranceData?.sum_insured ? Number(insuranceData.sum_insured) : undefined,
        insurance_document_url: insuranceUpload?.url || undefined,
        plan_type: 'free',
        subscription_status: 'active',
        user_id: user.id,
        created_by: user.email,
      };

      const { data: existing } = await sb.from('profiles')
        .select('id')
        .eq('created_by', user.email)
        .eq('relationship', 'self')
        .maybeSingle();

      let profile;
      if (existing?.id) {
        const { data, error } = await sb.from('profiles')
          .update(profilePayload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        profile = data;
      } else {
        const { data, error } = await sb.from('profiles')
          .insert(profilePayload)
          .select()
          .single();
        if (error) throw error;
        profile = data;
      }

      if (insuranceUpload?.url) {
        try {
          await sb.from('medical_documents').insert({
            profile_id: profile?.id,
            created_by: user.email,
            title: insuranceData?.insurer
              ? `${insuranceData.insurer} Insurance Document`
              : insuranceUpload.name || 'Insurance Document',
            document_type: 'insurance',
            file_url: insuranceUpload.url,
            status: 'processed',
            ai_summary: insuranceData
              ? `Policy: ${insuranceData.policy_number || 'N/A'} | Members detected: ${insuranceData.members?.length || 0}`
              : 'Uploaded during onboarding',
            ai_tags: ['insurance', 'onboarding'],
          });
        } catch (docErr) {
          // Non-critical
        }
      }

      // Auto-create family member profiles from extracted insurance data
      const familyMembers = insuranceData?.members?.filter(m => m.relationship !== 'self' && m.full_name?.trim()) || [];
      if (familyMembers.length > 0) {
        for (const member of familyMembers) {
          try {
            const { data: dups } = await sb.from('profiles')
              .select('id')
              .ilike('full_name', member.full_name.trim())
              .limit(1);
            if (dups?.length > 0) continue;

            await sb.from('profiles').insert({
              full_name: member.full_name.trim(),
              relationship: member.relationship || 'other',
              date_of_birth: member.date_of_birth || null,
              gender: member.gender || null,
              blood_group: member.blood_group || null,
              user_id: user.id,
              created_by: user.email,
            });
          } catch {
            // Non-critical
          }
        }
        navigate(createPageUrl('Dashboard'), { replace: true });
      } else {
        go(6);
      }
    } catch (err) {
      console.error('Profile creation failed:', err);
      const msg = err?.message || 'Unknown error';
      if (msg.includes('stack depth') || msg.includes('54001')) {
        window.alert('Database configuration error. Run the latest migration SQL.');
      } else if (msg.includes('duplicate')) {
        navigate(createPageUrl('Dashboard'), { replace: true });
      } else {
        window.alert(`Failed to create profile: ${msg.slice(0, 120)}`);
      }
    }
    setLoading(false);
  };

  const canNext = () => {
    if (step === 1) return formData.full_name.trim().length > 0;
    if (step === 4) {
      if (insuranceProcessing) return false;
      if (insuranceUpload && !insuranceData) return false;
      if (insuranceData && !insuranceReviewed) return false;
    }
    return true;
  };

  const theme = PASTEL_STEPS[(step - 1) % PASTEL_STEPS.length];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--hf-bg)', color: 'var(--hf-text)' }}>
      {/* Progress */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: i < step ? theme.bg : 'var(--hf-border)', opacity: i < step ? 1 : 0.3 }} />
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--hf-text-muted)' }}>
          Step {step} of {STEPS.length} — {STEPS[step - 1]?.title}
        </p>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="max-w-md mx-auto w-full">

            {/* STEP 1: Name */}
            {step === 1 && (
              <div className="space-y-6 pt-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: theme.bg }}>
                    <Sparkles className="w-8 h-8" style={{ color: theme.text }} />
                  </div>
                  <h1 className="text-2xl font-bold">Welcome to HealthFlux</h1>
                  <p style={{ color: 'var(--hf-text-muted)' }}>Your AI health companion. Let's set up your profile.</p>
                </div>
                <div>
                  <Label>Full Name</Label>
                  <Input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Your full name" className="mt-1" />
                </div>
              </div>
            )}

            {/* STEP 2: About */}
            {step === 2 && (
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme.bg }}>
                    <User className="w-5 h-5" style={{ color: theme.text }} />
                  </div>
                  <div><h2 className="font-bold text-lg">About You</h2><p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Basic details</p></div>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={v => setFormData(p => ({ ...p, gender: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 3: Health */}
            {step === 3 && (
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme.bg }}>
                    <Heart className="w-5 h-5" style={{ color: theme.text }} />
                  </div>
                  <div><h2 className="font-bold text-lg">Health Info</h2><p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Optional but helpful</p></div>
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <Select value={formData.blood_group} onValueChange={v => setFormData(p => ({ ...p, blood_group: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'].map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Height (cm)</Label>
                  <Input type="number" value={formData.height} onChange={e => setFormData(p => ({ ...p, height: e.target.value }))} placeholder="170" className="mt-1" />
                </div>
              </div>
            )}

            {/* STEP 4: Language + Insurance */}
            {step === 4 && (
              <div className="space-y-5 pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme.bg }}>
                    <Globe className="w-5 h-5" style={{ color: theme.text }} />
                  </div>
                  <div><h2 className="font-bold text-lg">Language & Insurance</h2><p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Choose your language</p></div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">App Language</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {LANGUAGES.map(lang => (
                      <button key={lang.code} onClick={() => handleLangChange(lang.code)}
                        className="p-3 rounded-xl border-2 text-left transition-all"
                        style={{
                          borderColor: selectedLang === lang.code ? theme.bg : 'var(--hf-border)',
                          background: selectedLang === lang.code ? `${theme.bg}22` : 'transparent',
                        }}>
                        <span className="font-bold text-sm">{lang.label}</span>
                        <br />
                        <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{lang.native}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Health Insurance Document</Label>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--hf-border)', color: 'var(--hf-text-muted)' }}>Optional</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--hf-text-muted)' }}>
                    Upload your family health insurance card/document. We'll auto-extract family member details and create profiles for everyone.
                  </p>
                  {insuranceError && (
                    <p className="text-xs mb-2" style={{ color: 'var(--hf-coral-strong)' }}>
                      {insuranceError}
                    </p>
                  )}

                  {!insuranceData && (
                    <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer hover:border-opacity-100 transition-all"
                      style={{ borderColor: 'var(--hf-border)' }}>
                      {insuranceProcessing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.bg }} />
                          <span className="text-sm font-medium">Extracting family details...</span>
                          <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>AI is reading your document</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--hf-text-muted)' }} />
                          <span className="text-sm font-medium">Upload Insurance Document</span>
                          <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>PDF, JPG, or PNG</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleInsuranceUpload} disabled={insuranceProcessing} />
                    </label>
                  )}

                  {insuranceData && (
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: `${theme.bg}15`, border: `1px solid ${theme.bg}40` }}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" style={{ color: theme.bg }} />
                        <span className="font-bold text-sm">{insuranceData.insurer || 'Insurance Document'}</span>
                        <Check className="w-4 h-4 ml-auto" style={{ color: '#22c55e' }} />
                      </div>

                      <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--hf-surface-2)' }}>
                        {insuranceData.plan_name && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--hf-text-muted)' }}>Plan</span>
                            <span className="font-medium">{insuranceData.plan_name}</span>
                          </div>
                        )}
                        {insuranceData.policy_number && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--hf-text-muted)' }}>Policy No.</span>
                            <span className="font-medium font-mono">{insuranceData.policy_number}</span>
                          </div>
                        )}
                        {insuranceData.sum_insured && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--hf-text-muted)' }}>Sum Insured</span>
                            <span className="font-medium">₹{Number(insuranceData.sum_insured).toLocaleString()}</span>
                          </div>
                        )}
                        {insuranceData.valid_from && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--hf-text-muted)' }}>Validity</span>
                            <span className="font-medium">{insuranceData.valid_from} → {insuranceData.valid_to || '—'}</span>
                          </div>
                        )}
                        {insuranceUpload?.name && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--hf-text-muted)' }}>File</span>
                            <span className="font-medium truncate max-w-[160px]">{insuranceUpload.name}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold mb-2">Family Members Extracted ({insuranceData.members?.length || 0})</p>
                        <div className="space-y-2">
                          {insuranceData.members?.map((m, i) => (
                            <div key={i} className="rounded-xl p-3" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                  style={{ background: PASTEL_STEPS[i % PASTEL_STEPS.length].bg, color: PASTEL_STEPS[i % PASTEL_STEPS.length].text }}>
                                  {m.full_name?.[0] || '?'}
                                </div>
                                <span className="font-semibold text-sm">{m.full_name || '—'}</span>
                                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                                  style={{ background: `${theme.bg}30`, color: theme.text }}>
                                  {m.relationship}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                                {m.gender && <span>👤 {m.gender}</span>}
                                {(m.age || m.date_of_birth) && <span>🎂 {m.date_of_birth || `Age ${m.age}`}</span>}
                                {m.blood_group && <span>🩸 {m.blood_group}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <label className="flex items-start gap-2 text-xs cursor-pointer p-2 rounded-xl"
                        style={{ background: insuranceReviewed ? `${theme.bg}20` : 'transparent', border: `1px solid ${insuranceReviewed ? theme.bg : 'var(--hf-border)'}` }}>
                        <input
                          type="checkbox"
                          checked={insuranceReviewed}
                          onChange={(e) => setInsuranceReviewed(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span className="font-medium">I have reviewed all the extracted details above and confirm they are correct. These will be saved to family profiles.</span>
                      </label>
                      {!insuranceReviewed && (
                        <p className="text-xs font-medium" style={{ color: 'var(--hf-coral-strong)' }}>
                          ⚠ Please review and confirm the extracted details to proceed to the next step.
                        </p>
                      )}
                      <button onClick={() => { setInsuranceData(null); setInsuranceUpload(null); setInsuranceReviewed(false); setInsuranceError(''); }} className="text-xs underline" style={{ color: 'var(--hf-text-muted)' }}>
                        Remove & upload different document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {step === 5 && (
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme.bg }}>
                    <Check className="w-5 h-5" style={{ color: theme.text }} />
                  </div>
                  <div><h2 className="font-bold text-lg">{t('common.done')}!</h2><p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Review your details</p></div>
                </div>
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--hf-card)' }}>
                  {[
                    ['Name', formData.full_name],
                    ['DOB', formData.date_of_birth || '—'],
                    ['Gender', formData.gender || '—'],
                    ['Blood Group', formData.blood_group || '—'],
                    ['Height', formData.height ? `${formData.height} cm` : '—'],
                    ['Language', LANGUAGES.find(l => l.code === selectedLang)?.label || 'English'],
                    ['Insurance', insuranceData ? `${insuranceData.insurer || 'Uploaded'} (${insuranceData.members?.length || 0} members)` : 'Not provided'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
                      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{k}</span>
                      <span className="text-sm font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: Family Members */}
            {step === 6 && (
              <FamilyMemberSetup onDone={() => navigate(createPageUrl('Dashboard'), { replace: true })} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      {step < 6 && (
        <div className="px-4 pb-6 pt-2 max-w-md mx-auto w-full flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => go(step - 1)} className="flex-1 h-12 rounded-xl">
              <ArrowLeft className="mr-1 h-4 w-4" /> {t('common.back')}
            </Button>
          )}
          {step < 5 && (
            <Button onClick={() => go(step + 1)} disabled={!canNext()}
              className="flex-1 h-12 rounded-xl font-semibold"
              style={{ background: theme.bg, color: theme.text }}>
              {t('common.next')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 5 && (
            <Button onClick={handleSubmit} disabled={loading}
              className="flex-1 h-12 rounded-xl font-semibold"
              style={{ background: theme.bg, color: theme.text }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Setting up…
                </span>
              ) : (
                <><Check className="mr-1 h-4 w-4" /> {insuranceData?.members?.length > 1 ? 'Create All Profiles' : "Let's Go!"}</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}