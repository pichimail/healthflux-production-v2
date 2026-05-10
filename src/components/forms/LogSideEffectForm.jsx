import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function LogSideEffectForm({ profileId, medicationId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    profile_id: profileId,
    medication_id: medicationId || '',
    severity: 'mild',
    symptom: '',
    onset_time: new Date().toISOString().slice(0, 16),
    duration_minutes: '',
    notes: '',
    reported_to_doctor: false
  });

  const queryClient = useQueryClient();

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', profileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: profileId, is_active: true }),
    enabled: !!profileId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SideEffect.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sideEffects']);
      toast.success('✅ Side effect logged');
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error logging side effect:', error);
      toast.error('Failed to log side effect');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.medication_id || !formData.symptom) {
      toast.error('Please fill required fields');
      return;
    }

    const dataToSubmit = {
      ...formData,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined
    };

    createMutation.mutate(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="medication">Medication *</Label>
        <Select 
          value={formData.medication_id} 
          onValueChange={(value) => setFormData({ ...formData, medication_id: value })}
          required
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select medication" />
          </SelectTrigger>
          <SelectContent>
            {medications.map(med => (
              <SelectItem key={med.id} value={med.id}>
                {med.medication_name} - {med.dosage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="severity">Severity *</Label>
        <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild">Mild</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="severe">Severe</SelectItem>
            <SelectItem value="life_threatening">Life Threatening</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="symptom">Symptom/Side Effect *</Label>
        <Textarea
          id="symptom"
          value={formData.symptom}
          onChange={(e) => setFormData({ ...formData, symptom: e.target.value })}
          placeholder="Describe the side effect..."
          className="rounded-xl min-h-[80px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="onset_time">Onset Time *</Label>
          <Input
            id="onset_time"
            type="datetime-local"
            value={formData.onset_time}
            onChange={(e) => setFormData({ ...formData, onset_time: e.target.value })}
            className="rounded-xl"
            required
          />
        </div>

        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
            placeholder="30"
            className="rounded-xl"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional details..."
          className="rounded-xl"
        />
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Log Side Effect
            </>
          )}
        </Button>
      </div>
    </form>
  );
}