import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Activity } from 'lucide-react';
import { toast } from 'sonner';

const VITAL_TYPES = [
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'weight', label: 'Weight' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'blood_glucose', label: 'Blood Glucose' },
  { value: 'oxygen_saturation', label: 'SpO2' },
  { value: 'respiratory_rate', label: 'Respiratory Rate' },
];

const UNITS = {
  blood_pressure: 'mmHg',
  heart_rate: 'bpm',
  weight: 'kg',
  temperature: '°C',
  blood_glucose: 'mg/dL',
  oxygen_saturation: '%',
  respiratory_rate: 'breaths/min',
};

export default function LogVitalForm({ profileId, onSuccess, onCancel }) {
  const [vitalType, setVitalType] = useState('blood_pressure');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VitalMeasurement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vitals']);
      toast.success('✅ Vital logged');
      onSuccess?.();
    },
    onError: () => toast.error('Failed to log vital'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      profile_id: profileId,
      vital_type: vitalType,
      measured_at: new Date().toISOString(),
      unit: UNITS[vitalType],
      notes: notes || undefined,
      source: 'manual',
    };

    if (vitalType === 'blood_pressure') {
      if (!systolic || !diastolic) { toast.error('Enter both values'); return; }
      data.systolic = parseFloat(systolic);
      data.diastolic = parseFloat(diastolic);
      data.value = parseFloat(systolic);
    } else {
      if (!value) { toast.error('Enter a value'); return; }
      data.value = parseFloat(value);
    }

    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Vital Type</Label>
        <Select value={vitalType} onValueChange={setVitalType}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VITAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {vitalType === 'blood_pressure' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Systolic *</Label>
            <Input type="number" value={systolic} onChange={e => setSystolic(e.target.value)} placeholder="120" className="rounded-xl" required />
          </div>
          <div>
            <Label>Diastolic *</Label>
            <Input type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)} placeholder="80" className="rounded-xl" required />
          </div>
        </div>
      ) : (
        <div>
          <Label>Value ({UNITS[vitalType]}) *</Label>
          <Input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} placeholder="Enter value" className="rounded-xl" required />
        </div>
      )}

      <div>
        <Label>Notes</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="rounded-xl" />
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">Cancel</Button>}
        <Button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-xl" style={{ background: '#d7f576', color: '#0a1200' }}>
          {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
          Log Vital
        </Button>
      </div>
    </form>
  );
}