// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import {
  AlertTriangle, Download, Share2, Phone, Pill, Activity,
  Copy, Check, Heart, Shield, User
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useActiveProfile } from '../components/ActiveProfileContext';

export default function EmergencyProfile() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [shareDialog, setShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState({ recipient_name: '', recipient_email: '', expires_hours: 24 });

  const { data: medications = [] } = useQuery({
    queryKey: ['meds-emergency', activeProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: activeProfileId, is_active: true }),
    enabled: !!activeProfileId,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals-emergency', activeProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 5),
    enabled: !!activeProfileId,
  });

  const { data: labs = [] } = useQuery({
    queryKey: ['labs-emergency', activeProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date', 5),
    enabled: !!activeProfileId,
  });

  const createShareLink = useMutation({
    mutationFn: async (data) => {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + data.expires_hours);
      return base44.entities.ShareLink.create({
        profile_id: activeProfileId, token, ...data,
        expires_at: expiresAt.toISOString(),
        allowed_scopes: ['documents', 'lab_results', 'vitals', 'medications'],
        purpose: 'Emergency Health Profile',
      });
    },
    onSuccess: (link) => { setShareLink(link); toast.success('Secure link created'); },
  });

  const copyLink = () => {
    const url = `${window.location.origin}/PublicShare?token=${shareLink.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const addLine = (text, size = 10, bold = false, color = [10, 10, 10]) => {
      doc.setFontSize(size); doc.setTextColor(...color);
      if (bold) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal');
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(text, 20, y); y += size * 0.7 + 2;
    };

    addLine('⚕ EMERGENCY HEALTH PROFILE', 18, true, [200, 30, 30]);
    y += 3;
    addLine(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 9, false, [100, 100, 100]);
    y += 6;

    addLine('PATIENT INFORMATION', 13, true);
    y += 2;
    addLine(`Name: ${activeProfile?.full_name || 'N/A'}`);
    if (activeProfile?.date_of_birth) addLine(`DOB: ${format(new Date(activeProfile.date_of_birth), 'MMM d, yyyy')}`);
    addLine(`Blood Group: ${activeProfile?.blood_group || 'Unknown'}`);
    addLine(`Gender: ${activeProfile?.gender || 'Unknown'}`);
    if (activeProfile?.emergency_contact) { y += 4; addLine('EMERGENCY CONTACT', 13, true); addLine(activeProfile.emergency_contact); }

    if (activeProfile?.allergies?.length > 0) {
      y += 4; addLine('⚠ ALLERGIES', 13, true, [200, 30, 30]);
      activeProfile.allergies.forEach(a => addLine(`• ${a}`, 10, false, [200, 30, 30]));
    }
    if (activeProfile?.chronic_conditions?.length > 0) {
      y += 4; addLine('CHRONIC CONDITIONS', 13, true);
      activeProfile.chronic_conditions.forEach(c => addLine(`• ${c}`));
    }
    if (medications.length > 0) {
      y += 4; addLine('CURRENT MEDICATIONS', 13, true);
      medications.forEach(m => {
        addLine(`• ${m.medication_name} — ${m.dosage}`, 10, true);
        addLine(`  ${m.frequency?.replace(/_/g, ' ')}${m.purpose ? ` (${m.purpose})` : ''}`, 9, false, [100, 100, 100]);
      });
    }
    if (vitals.length > 0) {
      y += 4; addLine('RECENT VITALS', 13, true);
      vitals.forEach(v => {
        const val = v.vital_type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : `${v.value} ${v.unit}`;
        addLine(`• ${v.vital_type.replace(/_/g, ' ')}: ${val}`);
      });
    }

    doc.save(`emergency-${activeProfile?.full_name?.replace(/\s/g, '-') || 'profile'}.pdf`);
    toast.success('PDF downloaded');
  };

  if (!activeProfile) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-3">👤</div>
        <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No profile selected</p>
      </div>
    </div>
  );

  const InfoRow = ({ label, value, valueStyle }) => (
    <div className="flex justify-between items-center py-2.5 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{label}</span>
      <span className="text-xs font-bold" style={{ color: 'var(--hf-text)', ...valueStyle }}>{value || '–'}</span>
    </div>
  );

  return (
    <div className="bento-page">
      <div className="bento-header">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.2)' }}>
            <AlertTriangle size={22} style={{ color: 'var(--hf-coral-strong)' }} />
          </div>
          <div>
            <h1 className="bento-title">Emergency Profile</h1>
            <p className="bento-subtitle">Critical info for first responders</p>
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className="p-3 rounded-2xl flex items-start gap-3 mb-4" style={{ background: 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.3)' }}>
        <AlertTriangle size={15} style={{ color: 'var(--hf-coral-strong)', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
          Keep this profile updated. In an emergency, this information may be critical for healthcare providers.
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button onClick={downloadPDF} className="h-11 rounded-2xl font-bold" style={{ background: '#f28c8c', color: '#3d0000' }}>
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
        <Button onClick={() => setShareDialog(true)} variant="outline" className="h-11 rounded-2xl font-bold" style={{ border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
          <Share2 className="w-4 h-4 mr-2" /> Share Securely
        </Button>
      </div>

      {/* Patient info */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {/* Basic info */}
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
              <User size={13} style={{ color: 'var(--hf-lavender-strong)' }} /> Patient Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <InfoRow label="Name" value={activeProfile.full_name} />
            <InfoRow label="DOB" value={activeProfile.date_of_birth ? format(new Date(activeProfile.date_of_birth), 'MMM d, yyyy') : null} />
            <InfoRow label="Gender" value={activeProfile.gender} valueStyle={{ textTransform: 'capitalize' }} />
            <InfoRow label="Blood Group" value={activeProfile.blood_group} valueStyle={{ color: 'var(--hf-coral-strong)' }} />
          </CardContent>
        </Card>

        {/* Emergency contact */}
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
              <Phone size={13} style={{ color: 'var(--hf-sky-strong)' }} /> Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {activeProfile.emergency_contact ? (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(155,180,255,0.1)', border: '1px solid rgba(155,180,255,0.3)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--hf-sky-strong)' }}>{activeProfile.emergency_contact}</p>
              </div>
            ) : (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--hf-text-muted)' }}>No emergency contact set. Update your profile.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Allergies */}
      <Card className="border-0 card-shadow rounded-2xl mb-3">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-coral-strong)' }}>
            <AlertTriangle size={13} /> Allergies (Critical)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {activeProfile.allergies?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeProfile.allergies.map((a, i) => (
                <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(242,140,140,0.15)', border: '1px solid rgba(242,140,140,0.4)', color: 'var(--hf-coral-strong)' }}>{a}</span>
              ))}
            </div>
          ) : <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No known allergies</p>}
        </CardContent>
      </Card>

      {/* Chronic conditions */}
      {activeProfile.chronic_conditions?.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl mb-3">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
              <Activity size={13} style={{ color: 'var(--hf-lavender-strong)' }} /> Chronic Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {activeProfile.chronic_conditions.map((c, i) => (
                <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(201,187,255,0.12)', border: '1px solid rgba(201,187,255,0.35)', color: 'var(--hf-lavender-strong)' }}>{c}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      <Card className="border-0 card-shadow rounded-2xl mb-3">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
            <Pill size={13} style={{ color: 'var(--hf-peach-strong)' }} /> Current Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {medications.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No active medications</p>
          ) : (
            <div className="space-y-2">
              {medications.map(m => (
                <div key={m.id} className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  <span className="text-base">💊</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{m.medication_name} — {m.dosage}</p>
                    <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{m.frequency?.replace(/_/g, ' ')}{m.purpose ? ` · ${m.purpose}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent vitals */}
      {vitals.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl mb-3">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
              <Heart size={13} style={{ color: 'var(--hf-coral-strong)' }} /> Recent Vitals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 grid grid-cols-2 gap-2">
            {vitals.map(v => (
              <div key={v.id} className="p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                <p className="text-[10px] capitalize" style={{ color: 'var(--hf-text-muted)' }}>{v.vital_type.replace(/_/g, ' ')}</p>
                <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>
                  {v.vital_type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : `${v.value} ${v.unit || ''}`}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(v.measured_at), 'MMM d')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* QR / print hint */}
      <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(215,245,118,0.08)', border: '1px dashed rgba(215,245,118,0.3)' }}>
        <Shield size={18} style={{ color: 'var(--hf-lemon-strong)', flexShrink: 0 }} />
        <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
          Tip: Download the PDF and save it on your phone's lock screen or print it to carry in your wallet.
        </p>
      </div>

      {/* Share Dialog */}
      <AdaptiveOverlay open={shareDialog} onOpenChange={o => { setShareDialog(o); if (!o) setShareLink(null); }} title="Share Emergency Profile" size="sm" showClose>
          {!shareLink ? (
            <div className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Recipient Name</Label>
                <Input value={shareData.recipient_name} onChange={e => setShareData(s => ({ ...s, recipient_name: e.target.value }))} placeholder="Dr. Smith" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Recipient Email</Label>
                <Input type="email" value={shareData.recipient_email} onChange={e => setShareData(s => ({ ...s, recipient_email: e.target.value }))} placeholder="doctor@hospital.com" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Expires in (hours)</Label>
                <Input type="number" value={shareData.expires_hours} onChange={e => setShareData(s => ({ ...s, expires_hours: parseInt(e.target.value) }))} min={1} max={168} className="h-11 rounded-2xl" />
              </div>
              <Button onClick={() => createShareLink.mutate(shareData)} className="w-full h-11 rounded-2xl font-bold" style={{ background: '#9bb4ff', color: '#0a1240' }}
                disabled={createShareLink.isPending}>
                {createShareLink.isPending ? 'Creating…' : 'Create Secure Link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mt-3">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(168,230,207,0.15)', border: '1px solid rgba(168,230,207,0.35)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--hf-mint-strong)' }}>Link created!</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Expires: {format(new Date(shareLink.expires_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div className="flex gap-2">
                <Input value={`${window.location.origin}/PublicShare?token=${shareLink.token}`} readOnly className="flex-1 h-10 rounded-xl text-xs" />
                <Button onClick={copyLink} size="icon" className="h-10 w-10 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  {copied ? <Check className="w-4 h-4" style={{ color: 'var(--hf-mint-strong)' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--hf-text-muted)' }} />}
                </Button>
              </div>
            </div>
          )}
      </AdaptiveOverlay>
    </div>
  );
}
