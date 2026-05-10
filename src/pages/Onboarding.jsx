// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, User, Heart, Droplets, Ruler, ArrowRight, ArrowLeft, Check, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FamilyMemberSetup from '@/components/onboarding/FamilyMemberSetup';

const STEPS = [
  { id: 1, title: 'Welcome', subtitle: 'Tell us your name' },
  { id: 2, title: 'About You', subtitle: 'Basic personal details' },
  { id: 3, title: 'Health Info', subtitle: 'A few medical details' },
  { id: 4, title: "You're all set!", subtitle: 'Review & confirm' },
  { id: 5, title: 'Family Members', subtitle: 'Add your loved ones' },
];

const PASTEL_STEPS = [
  { bg: '#d7f576', text: '#0a1200' },   // lemon
  { bg: '#c9bbff', text: '#1a0a40' },   // lavender
  { bg: '#f7c9a3', text: '#3d1a00' },   // peach
  { bg: '#a3e4d7', text: '#0a2a25' },   // mint
  { bg: '#9bb4ff', text: '#0a1240' },   // sky
];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    height: '',
  });

  // Skip onboarding if user already has a profile
  // Use .list() — filter({ created_by }) causes 405 due to RLS
  // 8-second timeout so checking never hangs forever
  useEffect(() => {
    const timeout = setTimeout(() => setChecking(false), 8000);
    base44.auth.me()
      .then(async () => {
        const raw = await base44.entities.Profile.list('-created_date', 1);
        const profiles = Array.isArray(raw) ? raw : [];
        clearTimeout(timeout);
        if (profiles.length > 0) {
          navigate(createPageUrl('Dashboard'), { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => { clearTimeout(timeout); setChecking(false); });
    return () => clearTimeout(timeout);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hf-bg)' }}>
        <div className="w-8 h-8 border-2 border-[#d7f576] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const go = (next) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await base44.entities.Profile.create({
        ...formData,
        relationship: 'self',
        height: formData.height ? parseFloat(formData.height) : undefined,
      });
      // Go to family member step
      go(5);
    } catch (err) {
      console.error(err);
      alert('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pastel = PASTEL_STEPS[(step - 1) % PASTEL_STEPS.length];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--hf-bg)' }}>

      {/* Full-screen splash / hero top */}
      <div
        className="relative flex flex-col items-center justify-center px-6 pt-16 pb-10 text-center"
        style={{ background: pastel.bg, minHeight: '38dvh', borderRadius: '0 0 2.5rem 2.5rem' }}
      >
        <motion.div
          key={step + '-icon'}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-4 shadow-lg"
          style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)' }}
        >
          {step === 1 && <Sparkles size={36} style={{ color: pastel.text }} />}
          {step === 2 && <User size={36} style={{ color: pastel.text }} />}
          {step === 3 && <Droplets size={36} style={{ color: pastel.text }} />}
          {step === 4 && <Check size={36} style={{ color: pastel.text }} />}
          {step === 5 && <Users size={36} style={{ color: pastel.text }} />}
        </motion.div>

        <motion.h1
          key={step + '-title'}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl md:text-3xl font-black mb-1"
          style={{ color: pastel.text }}
        >
          {step === 1 ? 'Welcome to HealthFlux' : STEPS[step - 1].title}
        </motion.h1>
        <motion.p
          key={step + '-sub'}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.06 }}
          className="text-sm font-medium"
          style={{ color: pastel.text, opacity: 0.7 }}
        >
          {STEPS[step - 1].subtitle}
        </motion.p>

        {/* Step dots */}
        <div className="flex gap-2 mt-5">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className="rounded-full transition-all duration-300"
              style={{
                width: step === s.id ? '28px' : '8px',
                height: '8px',
                background: step === s.id ? pastel.text : `${pastel.text}44`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="rounded-3xl p-5 space-y-4"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}
          >
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Your Full Name *</Label>
                  <Input
                    placeholder="e.g., Arjun Sharma"
                    value={formData.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    className="h-12 rounded-2xl text-base"
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full h-12 rounded-2xl font-bold text-base active-press"
                  style={{ background: pastel.bg, color: pastel.text }}
                  disabled={!formData.full_name.trim()}
                  onClick={() => go(2)}
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Date of Birth *</Label>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Enter in format: DD-MM-YYYY (e.g., 15-08-1992)</p>
                  <Input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={formData.date_of_birth_display || ''}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/[^0-9]/g, '');
                      // Auto-insert dashes after DD and MM
                      let display = raw;
                      if (raw.length > 2) display = raw.slice(0,2) + '-' + raw.slice(2);
                      if (raw.length > 4) display = raw.slice(0,2) + '-' + raw.slice(2,4) + '-' + raw.slice(4,8);
                      // Convert DD-MM-YYYY → YYYY-MM-DD for storage
                      const parts = display.split('-');
                      const isoValue = parts.length === 3 && parts[2].length === 4
                        ? `${parts[2]}-${parts[1]}-${parts[0]}`
                        : '';
                      setFormData(f => ({ ...f, date_of_birth_display: display, date_of_birth: isoValue }));
                    }}
                    className="h-12 rounded-2xl text-lg tracking-widest font-mono"
                    maxLength={10}
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Gender *</Label>
                  <Select value={formData.gender} onValueChange={(v) => set('gender', v)}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other / Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button variant="outline" className="h-12 rounded-2xl active-press" onClick={() => go(1)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="h-12 rounded-2xl font-bold active-press"
                    style={{ background: pastel.bg, color: pastel.text }}
                    disabled={!formData.date_of_birth || !formData.gender}
                    onClick={() => go(3)}
                  >
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Blood Group</Label>
                  <Select value={formData.blood_group} onValueChange={(v) => set('blood_group', v)}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Height (cm)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 170"
                    value={formData.height}
                    onChange={(e) => set('height', e.target.value)}
                    className="h-12 rounded-2xl"
                  />
                </div>
                <p className="text-xs text-center" style={{ color: 'var(--hf-text-muted)' }}>
                  These fields are optional — you can fill them in your profile later.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 rounded-2xl active-press" onClick={() => go(2)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="h-12 rounded-2xl font-bold active-press"
                    style={{ background: pastel.bg, color: pastel.text }}
                    onClick={() => go(4)}
                  >
                    Review <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {/* Summary cards */}
                {[
                  { icon: <User size={16} />, label: 'Name', value: formData.full_name },
                  { icon: <Heart size={16} />, label: 'Date of Birth', value: formData.date_of_birth_display || formData.date_of_birth },
                  { icon: <Activity size={16} />, label: 'Gender', value: formData.gender },
                  { icon: <Droplets size={16} />, label: 'Blood Group', value: formData.blood_group || '—' },
                  { icon: <Ruler size={16} />, label: 'Height', value: formData.height ? `${formData.height} cm` : '—' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <span style={{ color: 'var(--hf-text-muted)' }}>{row.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>{row.label}</p>
                      <p className="text-sm font-semibold capitalize" style={{ color: 'var(--hf-text)' }}>{row.value}</p>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="h-12 rounded-2xl active-press" onClick={() => go(3)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="h-12 rounded-2xl font-bold active-press"
                    style={{ background: pastel.bg, color: pastel.text }}
                    disabled={loading}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Setting up…
                      </span>
                    ) : (
                      <><Check className="mr-1 h-4 w-4" /> Let's Go!</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <FamilyMemberSetup onDone={() => navigate(createPageUrl('Dashboard'), { replace: true })} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}