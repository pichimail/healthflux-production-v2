/**
 * MIGRATION: POST-EXPORT
 * Route: /api/reports/enhanced
 * InvokeLLM calls: 0
 * DB calls: 8 (Profile, VitalMeasurement, LabResult, Medication, MedicationLog, HealthInsight, SideEffect, MedicalDocument)
 * Note: Data aggregation + PDF generation, no AI calls
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { profileId, dateRange, reportType, language = 'english', format = 'pdf' } = body;

    // Fetch all comprehensive data
    const profile = await base44.entities.Profile.filter({ id: profileId }).then(res => res[0]);
    const medications = await base44.entities.Medication.filter({ profile_id: profileId });
    const vitals = await base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 500);
    const labs = await base44.entities.LabResult.filter({ profile_id: profileId }, '-test_date', 200);
    const documents = await base44.entities.MedicalDocument.filter({ profile_id: profileId }, '-created_date', 50);
    const insights = await base44.entities.HealthInsight.filter({ profile_id: profileId }, '-created_date', 100);
    const medLogs = await base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 1000);
    const sideEffects = await base44.entities.SideEffect.filter({ profile_id: profileId }, '-onset_time');

    // Filter by date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange || 90));

    const filteredVitals = vitals.filter(v => new Date(v.measured_at) >= startDate);
    const filteredLabs = labs.filter(l => new Date(l.test_date) >= startDate);
    const filteredInsights = insights.filter(i => new Date(i.created_date) >= startDate);
    const filteredLogs = medLogs.filter(l => new Date(l.scheduled_time) >= startDate);

    // Calculate adherence statistics
    const adherenceStats = medications.filter(m => m.is_active).map(med => {
      const logs = filteredLogs.filter(l => l.medication_id === med.id);
      const taken = logs.filter(l => l.status === 'taken').length;
      const total = logs.length;
      return {
        name: med.medication_name,
        dosage: med.dosage,
        adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
        taken,
        total
      };
    });

    // Prepare report data
    const reportData = {
      profile,
      dateRange: { days: dateRange, start: startDate, end: new Date() },
      medications: adherenceStats,
      vitals: filteredVitals,
      labs: filteredLabs,
      insights: filteredInsights,
      sideEffects,
      documents: documents.length,
      reportType,
      language
    };

    if (format === 'json') {
      return Response.json(reportData);
    }

    if (format === 'txt') {
      let txtContent = `HEALTHFLUX COMPREHENSIVE HEALTH REPORT\n`;
      txtContent += `${'='.repeat(60)}\n\n`;
      txtContent += `Patient: ${profile?.full_name || 'Patient'}\n`;
      txtContent += `Report Period: ${dateRange} days (${startDate.toDateString()} - ${new Date().toDateString()})\n`;
      txtContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      txtContent += `MEDICATIONS (${adherenceStats.length})\n`;
      txtContent += `${'-'.repeat(60)}\n`;
      adherenceStats.forEach((med, idx) => {
        txtContent += `${idx + 1}. ${med.name} - ${med.dosage}\n`;
        txtContent += `   Adherence: ${med.adherence}% (${med.taken}/${med.total} doses)\n\n`;
      });

      txtContent += `\nVITAL MEASUREMENTS (${filteredVitals.length})\n`;
      txtContent += `${'-'.repeat(60)}\n`;
      const vitalsByType = {};
      filteredVitals.forEach(v => {
        if (!vitalsByType[v.vital_type]) vitalsByType[v.vital_type] = [];
        vitalsByType[v.vital_type].push(v);
      });
      Object.entries(vitalsByType).forEach(([type, readings]) => {
        txtContent += `${type.replace(/_/g, ' ').toUpperCase()}: ${readings.length} readings\n`;
      });

      txtContent += `\n\nLAB RESULTS (${filteredLabs.length})\n`;
      txtContent += `${'-'.repeat(60)}\n`;
      const abnormalLabs = filteredLabs.filter(l => l.flag !== 'normal');
      txtContent += `Abnormal Results: ${abnormalLabs.length}\n\n`;
      abnormalLabs.slice(0, 10).forEach(lab => {
        txtContent += `- ${lab.test_name}: ${lab.value} ${lab.unit} [${lab.flag.toUpperCase()}]\n`;
      });

      return new Response(txtContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename=health-report-${new Date().toISOString().split('T')[0]}.txt`
        }
      });
    }

    // Generate PDF (enhanced styling)
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = doc.internal.pageSize.width - 2 * margin;

    const checkPageBreak = (needed = 20) => {
      if (yPos + needed > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Modern Header with Gradient Effect
    doc.setFillColor(233, 244, 106); // #E9F46A
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    const titleText = reportType === 'doctor' ? '🏥 Medical Provider Report' : '📊 Personal Health Report';
    doc.text(titleText, margin, 18);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('HealthFlux Comprehensive Analysis', margin, 28);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - margin - 50, 28);

    yPos = 50;
    doc.setTextColor(0, 0, 0);

    // Patient Info Card
    doc.setFillColor(244, 244, 242);
    doc.roundedRect(margin, yPos - 5, contentWidth, 35, 3, 3, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('Patient Information', margin + 5, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${profile?.full_name || 'Patient'}`, margin + 5, yPos);
    yPos += 6;
    
    if (profile?.date_of_birth) {
      const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
      doc.text(`Age: ${age} years | DOB: ${new Date(profile.date_of_birth).toLocaleDateString()}`, margin + 5, yPos);
      yPos += 6;
    }
    
    if (profile?.gender || profile?.blood_group) {
      let info = '';
      if (profile.gender) info += `Gender: ${profile.gender}`;
      if (profile.blood_group) info += ` | Blood Group: ${profile.blood_group}`;
      doc.text(info, margin + 5, yPos);
      yPos += 6;
    }

    if (profile?.allergies?.length > 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`⚠️ Allergies: ${profile.allergies.join(', ')}`, margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
    }

    yPos += 12;

    // Report Period Badge
    checkPageBreak();
    doc.setFillColor(233, 244, 106);
    doc.roundedRect(margin, yPos - 5, contentWidth, 12, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`📅 Report Period: ${dateRange} Days (${startDate.toLocaleDateString()} - ${new Date().toLocaleDateString()})`, margin + 5, yPos + 3);
    yPos += 18;

    // Key Metrics Dashboard
    checkPageBreak(25);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, yPos - 5, contentWidth, 28, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Health Data Summary', margin + 5, yPos);
    yPos += 8;

    const metrics = [
      { label: 'Active Medications', value: medications.filter(m => m.is_active).length },
      { label: 'Vital Readings', value: filteredVitals.length },
      { label: 'Lab Tests', value: filteredLabs.length },
      { label: 'Health Insights', value: filteredInsights.length }
    ];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    metrics.forEach((metric, idx) => {
      const xStart = margin + 5 + (idx * (contentWidth / 4));
      doc.setFont('helvetica', 'bold');
      doc.text(metric.value.toString(), xStart, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.label, xStart, yPos + 4);
    });
    yPos += 22;

    // Medications Section
    if (adherenceStats.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(155, 180, 255);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('💊 Current Medications & Adherence', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      adherenceStats.forEach((med, idx) => {
        checkPageBreak(35);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(margin, yPos - 3, contentWidth, 28, 2, 2, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${med.name}`, margin + 5, yPos + 2);
        yPos += 7;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Dosage: ${med.dosage}`, margin + 5, yPos);
        yPos += 6;

        // Modern Adherence Bar
        const barWidth = 60;
        const adherence = med.adherence;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 5, yPos - 2, barWidth, 5, 1, 1);
        
        const fillColor = adherence >= 80 ? [34, 197, 94] : adherence >= 60 ? [251, 191, 36] : [239, 68, 68];
        doc.setFillColor(...fillColor);
        doc.roundedRect(margin + 5, yPos - 2, (barWidth * adherence) / 100, 5, 1, 1, 'F');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${adherence}% Adherence`, margin + 70, yPos + 2);
        doc.text(`(${med.taken}/${med.total} doses)`, margin + 110, yPos + 2);
        doc.setFont('helvetica', 'normal');
        
        yPos += 14;
      });
      yPos += 8;
    }

    // Vitals Trends
    if (filteredVitals.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(11, 90, 70);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('❤️ Vital Signs Analysis', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      const vitalsByType = {};
      filteredVitals.forEach(v => {
        if (!vitalsByType[v.vital_type]) vitalsByType[v.vital_type] = [];
        vitalsByType[v.vital_type].push(v);
      });

      Object.entries(vitalsByType).forEach(([type, readings]) => {
        checkPageBreak(20);
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(margin, yPos - 3, contentWidth, 14, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(type.replace(/_/g, ' ').toUpperCase(), margin + 5, yPos + 2);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const latest = readings[readings.length - 1];
        const oldest = readings[0];
        
        if (type === 'blood_pressure' && latest.systolic) {
          doc.text(`Latest: ${latest.systolic}/${latest.diastolic} mmHg | Readings: ${readings.length}`, margin + 5, yPos);
          if (oldest.systolic) {
            const change = latest.systolic - oldest.systolic;
            const trend = change > 5 ? '↗️' : change < -5 ? '↘️' : '➡️';
            doc.text(`${trend} ${Math.abs(change)} mmHg change`, margin + 120, yPos);
          }
        } else if (latest.value) {
          doc.text(`Latest: ${latest.value} ${latest.unit || ''} | Readings: ${readings.length}`, margin + 5, yPos);
          if (oldest.value) {
            const change = latest.value - oldest.value;
            const trend = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️';
            doc.text(`${trend} ${Math.abs(change.toFixed(1))} ${latest.unit || ''}`, margin + 120, yPos);
          }
        }
        
        yPos += 12;
      });
      yPos += 8;
    }

    // Lab Results
    if (filteredLabs.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(237, 230, 247);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(109, 40, 217);
      doc.text('🧪 Laboratory Results', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      const abnormalLabs = filteredLabs.filter(l => l.flag !== 'normal');
      if (abnormalLabs.length > 0) {
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(margin, yPos - 3, contentWidth, 10, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`⚠️ ${abnormalLabs.length} Abnormal Results Require Attention`, margin + 5, yPos + 3);
        doc.setTextColor(0, 0, 0);
        yPos += 15;
      }

      filteredLabs.slice(0, 15).forEach(lab => {
        checkPageBreak(12);
        const isAbnormal = lab.flag !== 'normal';
        
        if (isAbnormal) {
          doc.setFillColor(254, 242, 242);
          doc.roundedRect(margin, yPos - 3, contentWidth, 10, 2, 2, 'F');
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(lab.test_name, margin + 5, yPos + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`${lab.value} ${lab.unit}`, margin + 80, yPos + 2);
        
        if (lab.reference_low && lab.reference_high) {
          doc.text(`(${lab.reference_low}-${lab.reference_high})`, margin + 110, yPos + 2);
        }
        
        if (isAbnormal) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text(`[${lab.flag.toUpperCase()}]`, margin + 150, yPos + 2);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        }
        
        yPos += 10;
      });
      yPos += 8;
    }

    // Health Insights
    if (filteredInsights.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(252, 211, 77);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('💡 AI Health Insights', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      filteredInsights.slice(0, 8).forEach(insight => {
        checkPageBreak(18);
        const severityColors = {
          critical: [254, 226, 226],
          high: [254, 243, 199],
          medium: [254, 249, 195],
          low: [236, 253, 245],
          info: [239, 246, 255]
        };
        
        doc.setFillColor(...(severityColors[insight.severity] || [249, 250, 251]));
        doc.roundedRect(margin, yPos - 3, contentWidth, 14, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(insight.title, margin + 5, yPos + 2);
        yPos += 6;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const desc = insight.description.substring(0, 100) + (insight.description.length > 100 ? '...' : '');
        doc.text(desc, margin + 5, yPos);
        
        yPos += 12;
      });
      yPos += 8;
    }

    // Clinical Discussion (Doctor Report)
    if (reportType === 'doctor') {
      checkPageBreak(40);
      doc.setFillColor(219, 234, 254);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('🩺 Clinical Discussion Points', margin + 5, yPos + 2);
      yPos += 15;

      const discussionPoints = [];
      if (adherenceStats.some(m => m.adherence < 80)) {
        discussionPoints.push('Address medication adherence barriers');
      }
      if (abnormalLabs.length > 0) {
        discussionPoints.push(`Review ${abnormalLabs.length} abnormal lab results`);
      }
      if (sideEffects.length > 0) {
        discussionPoints.push('Discuss reported side effects and alternatives');
      }
      discussionPoints.push('Evaluate current treatment effectiveness');
      discussionPoints.push('Review lifestyle modifications and preventive care');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      discussionPoints.forEach(point => {
        checkPageBreak(6);
        doc.text(`• ${point}`, margin + 5, yPos);
        yPos += 6;
      });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`HealthFlux Report | Page ${i} of ${totalPages}`, margin, pageHeight - 10);
      doc.text('Confidential Medical Information', doc.internal.pageSize.width - margin - 45, pageHeight - 10);
    }

    const pdfBuffer = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return Response.json({ 
      pdfBase64,
      success: true,
      fileName: `healthflux-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
    });

  } catch (error) {
    console.error('Enhanced report generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});