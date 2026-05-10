// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export default function AddLabResultForm({ profileId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    profile_id: profileId,
    test_name: '',
    test_category: 'blood',
    value: '',
    unit: '',
    reference_low: '',
    reference_high: '',
    flag: 'normal',
    test_date: new Date().toISOString().split('T')[0],
    facility: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LabResult.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labResults']);
      toast.success('✅ Lab result added');
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error adding lab result:', error);
      toast.error('Failed to add lab result');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.test_name || !formData.value || !formData.unit) {
      toast.error('Please fill required fields');
      return;
    }

    const dataToSubmit = {
      ...formData,
      value: parseFloat(formData.value),
      reference_low: formData.reference_low ? parseFloat(formData.reference_low) : undefined,
      reference_high: formData.reference_high ? parseFloat(formData.reference_high) : undefined
    };

    createMutation.mutate(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="test_name">Test Name *</Label>
        <Input
          id="test_name"
          value={formData.test_name}
          onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
          placeholder="e.g., Blood Glucose"
          className="rounded-xl"
          required />

      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.test_category} onValueChange={(value) => setFormData({ ...formData, test_category: value })}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blood">Blood</SelectItem>
            <SelectItem value="urine">Urine</SelectItem>
            <SelectItem value="lipid">Lipid</SelectItem>
            <SelectItem value="liver">Liver</SelectItem>
            <SelectItem value="kidney">Kidney</SelectItem>
            <SelectItem value="thyroid">Thyroid</SelectItem>
            <SelectItem value="diabetes">Diabetes</SelectItem>
            <SelectItem value="vitamin">Vitamin</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="value">Result Value *</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder="120"
            className="rounded-xl"
            required />

        </div>

        <div>
          <Label htmlFor="unit">Unit *</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="mg/dL"
            className="rounded-xl"
            required />

        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ref_low">Reference Low</Label>
          <Input
            id="ref_low"
            type="number"
            step="0.01"
            value={formData.reference_low}
            onChange={(e) => setFormData({ ...formData, reference_low: e.target.value })}
            placeholder="70"
            className="rounded-xl" />

        </div>

        <div>
          <Label htmlFor="ref_high">Reference High</Label>
          <Input
            id="ref_high"
            type="number"
            step="0.01"
            value={formData.reference_high}
            onChange={(e) => setFormData({ ...formData, reference_high: e.target.value })}
            placeholder="100"
            className="rounded-xl" />

        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="flag">Flag</Label>
          <Select value={formData.flag} onValueChange={(value) => setFormData({ ...formData, flag: value })}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="test_date">Test Date *</Label>
          <Input
            id="test_date"
            type="date"
            value={formData.test_date}
            onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
            className="rounded-xl"
            required />

        </div>
      </div>

      <div>
        <Label htmlFor="facility">Lab Facility</Label>
        <Input
          id="facility"
          value={formData.facility}
          onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
          placeholder="Lab name"
          className="rounded-xl" />

      </div>

      <div className="flex gap-3 pt-4">
        {onCancel &&
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
            Cancel
          </Button>
        }
        <Button
          type="submit"
          disabled={createMutation.isPending} className="bg-[#E9F46A] text-[#1f1919] px-4 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 flex-1 hover:bg-[#D9E45A]">


          {createMutation.isPending ?
          <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </> :

          <>
              <TestTube className="w-4 h-4 mr-2" />
              Add Lab Result
            </>
          }
        </Button>
      </div>
    </form>);

}
