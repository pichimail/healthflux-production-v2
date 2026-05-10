import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function ProviderReports({ profileId, medications }) {
  const [generating, setGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('90');
  const [reportType, setReportType] = useState('doctor');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [language, setLanguage] = useState('english');

  const { data: profile } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => base44.entities.Profile.filter({ id: profileId }).then((res) => res[0]),
    enabled: !!profileId
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['allMedLogs', profileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 1000),
    enabled: !!profileId
  });

  const { data: sideEffects = [] } = useQuery({
    queryKey: ['allSideEffects', profileId],
    queryFn: () => base44.entities.SideEffect.filter({ profile_id: profileId }, '-onset_time'),
    enabled: !!profileId
  });

  const { data: effectiveness = [] } = useQuery({
    queryKey: ['allEffectiveness', profileId],
    queryFn: () => base44.entities.MedicationEffectiveness.filter({ profile_id: profileId }, '-recorded_at'),
    enabled: !!profileId
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['reportVitals', profileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 500),
    enabled: !!profileId
  });

  const { data: labs = [] } = useQuery({
    queryKey: ['reportLabs', profileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: profileId }, '-test_date', 200),
    enabled: !!profileId
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['insights', profileId],
    queryFn: () => base44.entities.HealthInsight.filter({ profile_id: profileId }, '-created_date', 200),
    enabled: !!profileId
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', profileId],
    queryFn: () => base44.entities.MedicalDocument.filter({ profile_id: profileId }, '-created_date', 100),
    enabled: !!profileId
  });

  const generateReportMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateEnhancedReport', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (exportFormat === 'pdf' && data.pdfBase64) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName || `health-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report generated successfully');
      } else if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported as JSON');
      } else if (exportFormat === 'txt') {
        // Response will be text format
        toast.success('Report exported as text');
      }
      setGenerating(false);
    },
    onError: (error) => {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
      setGenerating(false);
    }
  });

  const generateEnhancedReport = async () => {
    setGenerating(true);

    const periodDays = parseInt(reportPeriod);
    const startDate = subDays(new Date(), periodDays);

    // Filter data by period
    const filteredLogs = logs.filter((l) => new Date(l.scheduled_time) >= startDate);
    const filteredSideEffects = sideEffects.filter((se) => new Date(se.onset_time) >= startDate);
    const filteredEffectiveness = effectiveness.filter((e) => new Date(e.recorded_at) >= startDate);
    const filteredVitals = vitals.filter((v) => new Date(v.measured_at) >= startDate);
    const filteredLabs = labs.filter((l) => new Date(l.test_date) >= startDate);

    // Calculate adherence stats
    const adherenceStats = medications.map((med) => {
      const medLogs = filteredLogs.filter((l) => l.medication_id === med.id);
      const taken = medLogs.filter((l) => l.status === 'taken').length;
      const total = medLogs.length;
      const medEffectiveness = filteredEffectiveness.filter((e) => e.medication_id === med.id);
      const avgRating = medEffectiveness.length > 0 ?
      (medEffectiveness.reduce((sum, e) => sum + e.rating, 0) / medEffectiveness.length).toFixed(1) :
      null;

      return {
        name: med.medication_name,
        dosage: med.dosage,
        frequency: med.frequency?.replace(/_/g, ' '),
        purpose: med.purpose,
        prescriber: med.prescriber,
        start_date: med.start_date,
        adherence: total > 0 ? Math.round(taken / total * 100) : 0,
        taken,
        total,
        effectiveness_rating: avgRating
      };
    });

    // Prepare vitals trends
    const vitalsTrends = {};
    filteredVitals.forEach((v) => {
      if (!vitalsTrends[v.vital_type]) {
        vitalsTrends[v.vital_type] = [];
      }
      vitalsTrends[v.vital_type].push({
        date: v.measured_at,
        value: v.value,
        systolic: v.systolic,
        diastolic: v.diastolic,
        unit: v.unit
      });
    });

    // Prepare lab results summary
    const labSummary = filteredLabs.map((lab) => ({
      test_name: lab.test_name,
      value: lab.value,
      unit: lab.unit,
      flag: lab.flag,
      reference_low: lab.reference_low,
      reference_high: lab.reference_high,
      test_date: lab.test_date,
      category: lab.test_category
    }));

    // Prepare side effects summary
    const sideEffectsSummary = filteredSideEffects.map((se) => {
      const med = medications.find((m) => m.id === se.medication_id);
      return {
        medication: med?.medication_name,
        severity: se.severity,
        symptom: se.symptom,
        onset_time: se.onset_time,
        duration_minutes: se.duration_minutes,
        notes: se.notes,
        reported_to_doctor: se.reported_to_doctor
      };
    });

    const reportData = {
      profile: {
        name: profile?.full_name || 'Patient',
        date_of_birth: profile?.date_of_birth,
        gender: profile?.gender,
        blood_group: profile?.blood_group,
        allergies: profile?.allergies,
        chronic_conditions: profile?.chronic_conditions
      },
      report_period: {
        days: periodDays,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      },
      medications: adherenceStats,
      side_effects: sideEffectsSummary,
      vitals_trends: vitalsTrends,
      lab_results: labSummary,
      summary: {
        total_medications: medications.length,
        total_doses_logged: filteredLogs.length,
        total_side_effects: filteredSideEffects.length,
        total_effectiveness_reviews: filteredEffectiveness.length,
        total_vitals_recorded: filteredVitals.length,
        total_lab_tests: filteredLabs.length
      }
    };

    generateReportMutation.mutate({
      profileId,
      dateRange: periodDays.toString(),
      reportType,
      language,
      format: exportFormat
    });
  };

  return (
    <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
      <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)] flex items-center gap-2">
          <FileText className="w-4 sm:w-5 h-4 sm:h-5" />
          Provider Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-gradient-to-br text-zinc-50 p-3 rounded-2xl sm:p-4 from-blue-50 via-indigo-50 to-purple-50 border border-blue-200">
            <h3 className="text-[#241e1e] mb-2 text-sm font-semibold">📊 Comprehensive Health Report</h3>
            <p className="text-[#222020] mb-3 text-xs">Export all health data: medications, vitals, labs, insights, documents, trends - in multiple formats

            </p>
            
            <div className="space-y-2 mb-3">
              <Label className="text-xs text-[var(--hf-text)]">Report Period</Label>
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="h-10 rounded-2xl bg-[var(--hf-surface)] text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="180">Last 6 Months</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <Label className="text-xs text-[var(--hf-text)] mb-1 block">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="h-9 rounded-2xl bg-[var(--hf-surface)] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">For Doctor 🩺</SelectItem>
                    <SelectItem value="family">For Family 👨‍👩‍👧</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-[var(--hf-text)] mb-1 block">Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="h-9 rounded-2xl bg-[var(--hf-surface)] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF 📄</SelectItem>
                    <SelectItem value="json">JSON 💾</SelectItem>
                    <SelectItem value="txt">TXT 📝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {exportFormat === 'pdf' && reportType === 'family' &&
            <div className="mb-3">
                <Label className="text-xs text-[var(--hf-text)] mb-1 block">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9 rounded-2xl bg-[var(--hf-surface)] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="telugu">తెలుగు (Telugu)</SelectItem>
                    <SelectItem value="hindi">हिन्दी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }

            <Button
              onClick={generateEnhancedReport}
              disabled={generating}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl active-press shadow-lg h-10 sm:h-11">

              {generating ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </> :

              <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()} Report
                </>
              }
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 sm:p-3 bg-[var(--hf-surface-2)] rounded-2xl text-center">
              <FileText className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <p className="text-base sm:text-lg font-bold text-[var(--hf-text)]">{medications.length}</p>
              <p className="text-xs text-[var(--hf-muted)]">Meds</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-[var(--hf-surface-2)] rounded-2xl text-center">
              <Activity className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <p className="text-base sm:text-lg font-bold text-[var(--hf-text)]">{vitals.length}</p>
              <p className="text-xs text-[var(--hf-muted)]">Vitals</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-[var(--hf-surface-2)] rounded-2xl text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <p className="text-base sm:text-lg font-bold text-[var(--hf-text)]">{labs.length}</p>
              <p className="text-xs text-[var(--hf-muted)]">Labs</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-[var(--hf-surface-2)] rounded-2xl text-center">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-orange-600" />
              <p className="text-base sm:text-lg font-bold text-[var(--hf-text)]">{sideEffects.length}</p>
              <p className="text-xs text-[var(--hf-muted)]">Effects</p>
            </div>
          </div>

          <div className="bg-gradient-to-r text-[#2a2727] p-2.5 text-xs rounded-2xl from-yellow-50 to-amber-50 sm:p-3 border border-yellow-200">
            <p className="text-[#151414] mb-1 font-semibold">📋 Report Includes:</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>Patient profile & medical history</li>
              <li>Active medications & adherence stats</li>
              <li>Vitals trends with visualizations</li>
              <li>Lab results with flags</li>
              <li>AI health insights & predictions</li>
              <li>Wellness insights & recommendations</li>
              <li>Side effects & effectiveness</li>
              <li>Document summaries & analysis</li>
              <li>Emergency profile info</li>
              {reportType === 'doctor' && <li>Clinical discussion points</li>}
              {reportType === 'family' && <li>Easy-to-understand language</li>}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 p-2 rounded-xl text-center">
              <p className="text-xs font-semibold text-blue-900">📄 PDF</p>
              <p className="text-[10px] text-blue-700">Styled</p>
            </div>
            <div className="bg-green-50 p-2 rounded-xl text-center">
              <p className="text-xs font-semibold text-green-900">💾 JSON</p>
              <p className="text-[10px] text-green-700">Data</p>
            </div>
            <div className="bg-purple-50 p-2 rounded-xl text-center">
              <p className="text-xs font-semibold text-purple-900">📝 TXT</p>
              <p className="text-[10px] text-purple-700">Plain</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>);

}