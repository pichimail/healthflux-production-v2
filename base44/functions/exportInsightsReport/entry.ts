/**
 * MIGRATION: POST-EXPORT
 * Route: /api/reports/export
 * InvokeLLM calls: 0
 * DB calls: 1 (Profile.filter)
 * Note: PDF generation via jsPDF, no AI calls
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
    const { 
      profileId, 
      insightsData, 
      reportType = 'self', 
      format = 'pdf',
      language = 'english',
      pageType = 'insights' // 'insights' or 'wellness'
    } = body;

    // Fetch profile and related data
    const profile = await base44.entities.Profile.filter({ id: profileId }).then(res => res[0]);

    if (format === 'json') {
      return Response.json({
        profile,
        insights: insightsData,
        generated_at: new Date().toISOString(),
        report_type: reportType,
        page_type: pageType
      });
    }

    if (format === 'txt') {
      let txtContent = `HEALTHFLUX ${pageType.toUpperCase()} REPORT\n`;
      txtContent += `${'='.repeat(80)}\n\n`;
      txtContent += `Patient: ${profile?.full_name || 'Patient'}\n`;
      txtContent += `Report Type: ${reportType}\n`;
      txtContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      if (insightsData.insights && insightsData.insights.length > 0) {
        txtContent += `\nINSIGHTS (${insightsData.insights.length})\n`;
        txtContent += `${'-'.repeat(80)}\n`;
        insightsData.insights.forEach((insight, idx) => {
          txtContent += `\n${idx + 1}. [${insight.severity?.toUpperCase() || 'INFO'}] ${insight.title}\n`;
          txtContent += `   ${insight.description}\n`;
          if (insight.data_source) {
            txtContent += `   Sources: ${insight.data_source.length} data points\n`;
          }
        });
      }

      if (insightsData.recommendations && insightsData.recommendations.length > 0) {
        txtContent += `\n\nRECOMMENDATIONS\n`;
        txtContent += `${'-'.repeat(80)}\n`;
        insightsData.recommendations.forEach((rec, idx) => {
          txtContent += `${idx + 1}. ${rec}\n`;
        });
      }

      if (insightsData.metrics) {
        txtContent += `\n\nKEY METRICS\n`;
        txtContent += `${'-'.repeat(80)}\n`;
        Object.entries(insightsData.metrics).forEach(([key, value]) => {
          txtContent += `${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
        });
      }

      return new Response(txtContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename=${pageType}-report-${new Date().toISOString().split('T')[0]}.txt`
        }
      });
    }

    // Generate PDF
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    const checkPageBreak = (needed = 20) => {
      if (yPos + needed > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    const wrapText = (text, maxWidth) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      return lines;
    };

    // Header
    doc.setFillColor(233, 244, 106);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleEmoji = pageType === 'wellness' ? '🌟' : '💡';
    const titleText = pageType === 'wellness' ? 'Wellness Insights Report' : 'Health Insights Report';
    doc.text(`${titleEmoji} ${titleText}`, margin, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('HealthFlux AI-Powered Analysis', margin, 28);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, 28);

    yPos = 50;
    doc.setTextColor(0, 0, 0);

    // Patient Info
    doc.setFillColor(244, 244, 242);
    doc.roundedRect(margin, yPos - 5, contentWidth, 30, 3, 3, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
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
    
    doc.text(`Report Type: ${reportType === 'self' ? 'Personal Reference' : reportType === 'doctor' ? 'Healthcare Provider' : 'Family & Friends'}`, margin + 5, yPos);
    yPos += 12;

    // Summary Badge
    if (insightsData.summary) {
      checkPageBreak(30);
      doc.setFillColor(233, 244, 106);
      doc.roundedRect(margin, yPos - 5, contentWidth, 25, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 Summary', margin + 5, yPos);
      yPos += 7;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryLines = wrapText(insightsData.summary, contentWidth - 10);
      summaryLines.forEach(line => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 10;
    }

    // Key Metrics
    if (insightsData.metrics) {
      checkPageBreak(40);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin, yPos - 5, contentWidth, 'auto', 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📈 Key Metrics', margin + 5, yPos);
      yPos += 10;

      const metrics = Object.entries(insightsData.metrics);
      const metricsPerRow = 3;
      
      for (let i = 0; i < metrics.length; i += metricsPerRow) {
        checkPageBreak(15);
        const rowMetrics = metrics.slice(i, i + metricsPerRow);
        rowMetrics.forEach(([key, value], idx) => {
          const xStart = margin + 5 + (idx * (contentWidth / metricsPerRow));
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(String(value), xStart, yPos);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(key.replace(/_/g, ' ').toUpperCase(), xStart, yPos + 5);
        });
        yPos += 12;
      }
      yPos += 10;
    }

    // Insights Section
    if (insightsData.insights && insightsData.insights.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(155, 180, 255);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${titleEmoji} AI-Generated Insights (${insightsData.insights.length})`, margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      insightsData.insights.forEach((insight, idx) => {
        const estimatedHeight = 35 + Math.ceil(insight.description?.length / 80) * 5;
        checkPageBreak(estimatedHeight);

        const severityColors = {
          critical: [254, 226, 226, 220, 38, 38],
          high: [254, 243, 199, 217, 119, 6],
          medium: [254, 249, 195, 161, 98, 7],
          low: [236, 253, 245, 5, 150, 105],
          info: [239, 246, 255, 59, 130, 246]
        };

        const [bgR, bgG, bgB, textR, textG, textB] = severityColors[insight.severity] || severityColors.info;

        doc.setFillColor(bgR, bgG, bgB);
        const boxHeight = 30 + Math.ceil(insight.description?.length / 80) * 5;
        doc.roundedRect(margin, yPos - 3, contentWidth, boxHeight, 2, 2, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textR, textG, textB);
        doc.text(`${idx + 1}. ${insight.title || 'Insight'}`, margin + 5, yPos + 2);
        yPos += 7;

        if (insight.severity) {
          doc.setFontSize(8);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(margin + 5, yPos - 3, 30, 5, 1, 1, 'F');
          doc.text(insight.severity.toUpperCase(), margin + 7, yPos);
          yPos += 8;
        } else {
          yPos += 2;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        if (insight.description) {
          const descLines = wrapText(insight.description, contentWidth - 10);
          descLines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 5;
          });
        }

        if (insight.data_source && insight.data_source.length > 0) {
          yPos += 2;
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(`📊 Based on ${insight.data_source.length} data point${insight.data_source.length > 1 ? 's' : ''}`, margin + 5, yPos);
        }

        yPos += 10;
      });
      yPos += 5;
    }

    // Recommendations
    if (insightsData.recommendations && insightsData.recommendations.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('✅ Recommendations', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      insightsData.recommendations.forEach((rec, idx) => {
        const estimatedHeight = 15 + Math.ceil(rec.length / 100) * 5;
        checkPageBreak(estimatedHeight);

        doc.setFillColor(240, 253, 244);
        const recHeight = 12 + Math.ceil(rec.length / 100) * 5;
        doc.roundedRect(margin, yPos - 3, contentWidth, recHeight, 2, 2, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const recLines = wrapText(`${idx + 1}. ${rec}`, contentWidth - 10);
        recLines.forEach(line => {
          doc.text(line, margin + 5, yPos + 2);
          yPos += 5;
        });
        yPos += 10;
      });
      yPos += 5;
    }

    // Trends Data
    if (insightsData.trends && Object.keys(insightsData.trends).length > 0) {
      checkPageBreak(30);
      doc.setFillColor(237, 230, 247);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(109, 40, 217);
      doc.text('📊 Health Trends', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      Object.entries(insightsData.trends).forEach(([key, value]) => {
        checkPageBreak(15);
        doc.setFillColor(250, 245, 255);
        doc.roundedRect(margin, yPos - 3, contentWidth, 12, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(key.replace(/_/g, ' ').toUpperCase(), margin + 5, yPos + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(String(value), margin + 100, yPos + 2);
        
        yPos += 15;
      });
      yPos += 5;
    }

    // Medications Summary
    if (insightsData.medications && insightsData.medications.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(247, 201, 163);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 53, 15);
      doc.text(`💊 Active Medications (${insightsData.medications.length})`, margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      insightsData.medications.forEach((med, idx) => {
        checkPageBreak(18);
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(margin, yPos - 3, contentWidth, 15, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${med.medication_name}`, margin + 5, yPos + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`${med.dosage} - ${med.frequency?.replace(/_/g, ' ')}`, margin + 5, yPos + 7);
        
        if (med.adherence !== undefined) {
          doc.text(`Adherence: ${med.adherence}%`, margin + 5, yPos + 12);
        }
        
        yPos += 18;
      });
      yPos += 5;
    }

    // Action Items (for self/family reports)
    if (reportType !== 'doctor' && insightsData.action_items && insightsData.action_items.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(254, 215, 170);
      doc.roundedRect(margin, yPos - 5, contentWidth, 10, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 65, 12);
      doc.text('🎯 Your Action Plan', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      insightsData.action_items.forEach((item, idx) => {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${item}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 5;
    }

    // Disclaimer
    checkPageBreak(25);
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin, yPos - 5, contentWidth, 20, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(113, 63, 18);
    doc.text('⚠️ Medical Disclaimer:', margin + 5, yPos);
    yPos += 5;
    const disclaimer = reportType === 'doctor' 
      ? 'This report is AI-generated and should be used as a supplementary tool for clinical decision-making.'
      : 'This report is for informational purposes only and does not constitute medical advice. Always consult with a qualified healthcare provider for medical decisions.';
    const disclaimerLines = wrapText(disclaimer, contentWidth - 10);
    disclaimerLines.forEach(line => {
      doc.text(line, margin + 5, yPos);
      yPos += 4;
    });

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`HealthFlux ${pageType === 'wellness' ? 'Wellness' : 'Health'} Report | Page ${i} of ${totalPages}`, margin, pageHeight - 10);
      doc.text('Confidential Health Information', pageWidth - margin - 42, pageHeight - 10);
    }

    const pdfBuffer = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return Response.json({ 
      pdfBase64,
      success: true,
      fileName: `healthflux-${pageType}-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
    });

  } catch (error) {
    console.error('Insights report export error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});