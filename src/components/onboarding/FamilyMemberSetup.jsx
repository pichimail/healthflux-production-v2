import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { callAI } from '@/components/utils/aiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus, Users, Loader2, X, FileText, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other'];

function ManualMemberForm({ onAdd, onCancel }) {
  const [data, setData] = useState({ full_name: '', relationship: '', gender: '', date_of_birth: '' });
  const set = (k, v) => setData(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
      <div className="space-y-1">
        <Label className="text-xs font-semibold" style={{ color: 'var(--hf-text)' }}>Full Name *</Label>
        <Input placeholder="e.g., Priya Sharma" value={data.full_name} onChange={e => set('full_name', e.target.value)} className="h-10 rounded-xl text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold" style={{ color: 'var(--hf-text)' }}>Relationship *</Label>
          <Select value={data.relationship} onValueChange={v => set('relationship', v)}>
            <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold" style={{ color: 'var(--hf-text)' }}>Gender</Label>
          <Select value={data.gender} onValueChange={v => set('gender', v)}>
            <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: '#c9bbff', color: '#1a0a40' }}
          disabled={!data.full_name.trim() || !data.relationship}
          onClick={() => onAdd(data)}>
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

export default function FamilyMemberSetup({ onDone }) {
  const [members, setMembers] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddManual = (data) => {
    setMembers(prev => [...prev, data]);
    setShowManual(false);
  };

  const handleRemove = (idx) => {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await callAI({
        prompt: `Extract all family members from this health insurance document. For each person, extract their full name, approximate age, gender (male/female/other), and relationship to the primary policy holder (self/spouse/child/parent/sibling/other). Skip the primary holder (self). Return ONLY the family members.`,
        response_json_schema: {
          type: "object",
          properties: {
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  age: { type: "number" },
                  gender: { type: "string", enum: ["male", "female", "other"] },
                  relationship: { type: "string", enum: ["spouse", "child", "parent", "sibling", "other"] }
                }
              }
            }
          }
        },
        file_urls: [file_url]
      });
      if (result?.members?.length) {
        const mapped = result.members.map(m => ({
          full_name: m.full_name || '',
          relationship: m.relationship || 'other',
          gender: m.gender || '',
          date_of_birth: m.age ? `${new Date().getFullYear() - m.age}-01-01` : '',
        }));
        setMembers(prev => [...prev, ...mapped]);
      }
    } catch (err) {
      console.error('Upload extraction failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const m of members) {
        await base44.entities.Profile.create({
          full_name: m.full_name,
          relationship: m.relationship,
          gender: m.gender || undefined,
          date_of_birth: m.date_of_birth || undefined,
        });
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <Users size={24} style={{ color: '#c9bbff' }} className="mx-auto mb-2" />
        <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Add Family Members</p>
        <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Add now or skip — you can always do this later</p>
      </div>

      {/* Upload insurance document */}
      <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
        style={{ background: 'rgba(215,245,118,0.08)', border: '1px dashed rgba(215,245,118,0.3)' }}>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(215,245,118,0.15)' }}>
          {uploading ? <Loader2 size={18} className="animate-spin" style={{ color: '#d7f576' }} /> : <FileText size={18} style={{ color: '#d7f576' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#d7f576' }}>
            {uploading ? 'Extracting family members...' : 'Upload Health Insurance Document'}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>AI will auto-detect family members</p>
        </div>
      </label>

      {/* Members list */}
      <AnimatePresence>
        {members.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: '#c9bbff', color: '#1a0a40' }}>
              {m.full_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--hf-text)' }}>{m.full_name}</p>
              <p className="text-[10px] capitalize" style={{ color: 'var(--hf-text-muted)' }}>{m.relationship} {m.gender ? `· ${m.gender}` : ''}</p>
            </div>
            <button onClick={() => handleRemove(i)} className="p-1 rounded-full hover:opacity-70" style={{ color: 'var(--hf-text-muted)' }}>
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Manual add */}
      {showManual ? (
        <ManualMemberForm onAdd={handleAddManual} onCancel={() => setShowManual(false)} />
      ) : (
        <button onClick={() => setShowManual(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
          <Plus size={14} /> Add Manually
        </button>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" className="h-12 rounded-2xl active-press font-bold" onClick={onDone}>
          Skip for Now
        </Button>
        <Button className="h-12 rounded-2xl font-bold active-press"
          style={{ background: '#a3e4d7', color: '#0a2a25' }}
          disabled={members.length === 0 || saving}
          onClick={handleSaveAll}>
          {saving ? (
            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving…</span>
          ) : (
            <><Check size={14} className="mr-1" /> Save & Continue</>
          )}
        </Button>
      </div>
    </div>
  );
}