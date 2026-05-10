/**
 * documentProcessor — Production OCR/AI document processing pipeline.
 * 
 * Steps:
 * 1. Auth + ownership validation
 * 2. Multi-model OCR extraction (vision LLM → Base44 ExtractData fallback)
 * 3. AI health analysis + summary
 * 4. Persist extracted entities: LabResult, VitalMeasurement (from doc), Medication (extracted)
 * 5. Update MedicalDocument with all extracted data + status
 * 6. Create HealthInsight records for critical findings
 * 7. Return structured result
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VALID_DOC_TYPES = ['lab_report','prescription','imaging','discharge_summary','consultation','vaccination','insurance','other'];
const VALID_VITAL_TYPES = ['blood_pressure','heart_rate','temperature','weight','height','bmi','blood_glucose','oxygen_saturation','respiratory_rate'];
const VALID_FLAG = ['low','normal','high'];
const VALID_LAB_CATS = ['blood','urine','lipid','liver','kidney','thyroid','diabetes','vitamin','other'];
const VALID_FREQ = ['once_daily','twice_daily','three_times_daily','four_times_daily','as_needed','custom'];

function coerceDocType(raw) {
  if (!raw) return 'other';
  const r = String(raw).toLowerCase().replace(/[\s-]/g,'_');
  return VALID_DOC_TYPES.includes(r) ? r : 'other';
}
function coerceFlag(raw) {
  if (!raw) return 'normal';
  const r = String(raw).toLowerCase();
  if (r === 'high' || r === 'elevated' || r === 'abnormal_high') return 'high';
  if (r === 'low' || r === 'reduced' || r === 'abnormal_low') return 'low';
  return 'normal';
}
function coerceVitalType(raw) {
  if (!raw) return null;
  const r = String(raw).toLowerCase().replace(/[\s-]/g,'_');
  return VALID_VITAL_TYPES.includes(r) ? r : null;
}
function coerceFreq(raw) {
  if (!raw) return 'custom';
  const r = String(raw).toLowerCase().replace(/[\s-]/g,'_');
  if (r.includes('once') || r === '1x') return 'once_daily';
  if (r.includes('twice') || r.includes('two') || r === 'bid' || r === '2x') return 'twice_daily';
  if (r.includes('three') || r === 'tid' || r === '3x') return 'three_times_daily';
  if (r.includes('four') || r === 'qid' || r === '4x') return 'four_times_daily';
  if (r.includes('needed') || r === 'prn') return 'as_needed';
  return VALID_FREQ.includes(r) ? r : 'custom';
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    document_title: { type: 'string' },
    document_type: { type: 'string' },
    document_date: { type: 'string' },
    facility_name: { type: 'string' },
    facility_address: { type: 'string' },
    facility_phone: { type: 'string' },
    doctor_name: { type: 'string' },
    doctor_qualification: { type: 'string' },
    doctor_registration_number: { type: 'string' },
    patient_name: { type: 'string' },
    patient_age: { type: 'string' },
    summary: { type: 'string' },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          dosage: { type: 'string' },
          frequency: { type: 'string' },
          duration: { type: 'string' },
          purpose: { type: 'string' },
          instructions: { type: 'string' }
        }
      }
    },
    vitals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' },
          systolic: { type: 'number' },
          diastolic: { type: 'number' }
        }
      }
    },
    lab_results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          test_category: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' },
          reference_min: { type: 'number' },
          reference_max: { type: 'number' },
          flag: { type: 'string' }
        }
      }
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { document_id, file_url, file_type, profile_id } = body;

    if (!file_url || !profile_id) {
      return Response.json({ error: 'file_url and profile_id are required' }, { status: 400 });
    }

    // Ownership check — if document_id given, verify ownership
    if (document_id) {
      const docs = await base44.entities.MedicalDocument.filter({ id: document_id });
      if (!docs.length) return Response.json({ error: 'Document not found' }, { status: 404 });
      if (docs[0].created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Mark as processing
    if (document_id) {
      await base44.entities.MedicalDocument.update(document_id, { status: 'processing' });
    }

    let extractedData = {};
    let extractionMethod = 'none';
    const isImage = (file_type || '').includes('image');
    const isPDF = (file_type || '').includes('pdf');

    // Step 1: Vision-based extraction (works for both images and PDFs)
    if (isImage || isPDF) {
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a medical OCR system. Extract ALL information from this medical document.

For EVERY piece of text visible extract:
- Document title, type, date
- Facility/hospital name, address, phone  
- Doctor name, qualification, registration number
- Patient name and age if visible
- ALL medications: name, dosage, frequency, duration, instructions
- ALL vital signs: type, value, unit (use: blood_pressure, heart_rate, temperature, weight, height, bmi, blood_glucose, oxygen_saturation)
- For blood pressure give systolic and diastolic separately
- ALL lab results: name, value, unit, reference range min/max, flag (low/normal/high)
- A clear summary of the document

Return complete structured JSON.`,
          file_urls: [file_url],
          response_json_schema: EXTRACTION_SCHEMA
        });
        if (res && (res.document_title || res.summary || (res.lab_results?.length > 0) || (res.medications?.length > 0))) {
          extractedData = res;
          extractionMethod = 'llm_vision';
        }
      } catch (e) {
        console.warn('LLM vision extraction failed:', e.message);
      }
    }

    // Step 2: Base44 ExtractDataFromUploadedFile as fallback
    if (extractionMethod === 'none' && (isImage || isPDF)) {
      try {
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: EXTRACTION_SCHEMA
        });
        if (res.status === 'success' && res.output) {
          extractedData = res.output;
          extractionMethod = 'base44_extract';
        }
      } catch (e) {
        console.warn('Base44 extract failed:', e.message);
      }
    }

    // Guarantee minimal fields
    if (!extractedData.document_title) extractedData.document_title = 'Medical Document';
    if (!extractedData.document_type) extractedData.document_type = 'other';
    if (!extractedData.document_date) extractedData.document_date = new Date().toISOString().split('T')[0];

    // Step 3: AI health analysis
    let aiAnalysis = { summary: extractedData.summary || '', health_score: 70, risk_factors: [], key_findings: [], action_items: [] };
    try {
      const analysisRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical AI. Analyze this extracted medical document data and provide health insights:

${JSON.stringify({ 
  title: extractedData.document_title, 
  type: extractedData.document_type,
  summary: extractedData.summary,
  lab_results: extractedData.lab_results,
  vitals: extractedData.vitals,
  medications: extractedData.medications 
}, null, 2)}

Provide:
1. Clear readable summary (plain English, no markdown symbols like *** or ###)
2. Health score 0-100
3. Risk factors with severity (critical/high/medium/low)
4. Key findings as plain text bullets
5. Action items the patient should take

Keep everything plain text without markdown formatting characters.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            health_score: { type: 'number' },
            risk_factors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  factor: { type: 'string' },
                  severity: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            key_findings: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            preventive_plan: { type: 'string' }
          }
        }
      });
      aiAnalysis = { ...aiAnalysis, ...analysisRes };
    } catch (e) {
      console.warn('AI analysis failed:', e.message);
    }

    const now = new Date().toISOString();
    const dateForVitals = extractedData.document_date
      ? new Date(extractedData.document_date).toISOString()
      : now;

    // Step 4: Persist extracted entities
    const persistedLabs = [];
    const persistedVitals = [];

    // Persist lab results
    if (Array.isArray(extractedData.lab_results)) {
      for (const lab of extractedData.lab_results) {
        if (!lab.name || lab.value == null) continue;
        try {
          const cat = VALID_LAB_CATS.includes(lab.test_category?.toLowerCase()) ? lab.test_category.toLowerCase() : 'other';
          const flag = coerceFlag(lab.flag);
          const saved = await base44.entities.LabResult.create({
            profile_id,
            document_id: document_id || null,
            test_name: lab.name,
            test_category: cat,
            value: Number(lab.value),
            unit: lab.unit || '',
            reference_low: lab.reference_min != null ? Number(lab.reference_min) : null,
            reference_high: lab.reference_max != null ? Number(lab.reference_max) : null,
            flag,
            test_date: extractedData.document_date || new Date().toISOString().split('T')[0],
            facility: extractedData.facility_name || '',
            notes: `Auto-extracted from document: ${extractedData.document_title}`
          });
          persistedLabs.push(saved);
        } catch (e) {
          console.warn('Lab persist failed:', e.message);
        }
      }
    }

    // Persist vitals
    if (Array.isArray(extractedData.vitals)) {
      for (const v of extractedData.vitals) {
        const vType = coerceVitalType(v.type);
        if (!vType) continue;
        if (vType === 'blood_pressure' && (!v.systolic || !v.diastolic)) continue;
        if (vType !== 'blood_pressure' && v.value == null) continue;
        try {
          const saved = await base44.entities.VitalMeasurement.create({
            profile_id,
            vital_type: vType,
            value: v.value != null ? Number(v.value) : null,
            systolic: v.systolic != null ? Number(v.systolic) : null,
            diastolic: v.diastolic != null ? Number(v.diastolic) : null,
            unit: v.unit || '',
            measured_at: dateForVitals,
            source: 'device',
            notes: `Auto-extracted from document: ${extractedData.document_title}`
          });
          persistedVitals.push(saved);
        } catch (e) {
          console.warn('Vital persist failed:', e.message);
        }
      }
    }

    // Step 5: Update MedicalDocument with all extracted data
    const docUpdatePayload = {
      title: extractedData.document_title,
      document_type: coerceDocType(extractedData.document_type),
      document_date: extractedData.document_date || new Date().toISOString().split('T')[0],
      facility_name: extractedData.facility_name || null,
      doctor_name: extractedData.doctor_name || null,
      ai_summary: aiAnalysis.summary || extractedData.summary || '',
      ai_summary_detailed: aiAnalysis.preventive_plan || null,
      key_findings: aiAnalysis.key_findings || [],
      action_items: aiAnalysis.action_items || [],
      health_score: aiAnalysis.health_score || null,
      risk_factors: aiAnalysis.risk_factors || [],
      extracted_medications: extractedData.medications || [],
      extracted_vitals: extractedData.vitals || [],
      extracted_lab_results: (extractedData.lab_results || []).map(l => ({
        name: l.name,
        value: l.value,
        unit: l.unit,
        reference_low: l.reference_min,
        reference_high: l.reference_max,
        flag: coerceFlag(l.flag)
      })),
      preventive_plan: aiAnalysis.preventive_plan || null,
      status: 'completed'
    };

    if (document_id) {
      await base44.entities.MedicalDocument.update(document_id, docUpdatePayload);
    }

    // Step 6: Create HealthInsights for critical/high risk factors
    const criticalRisks = (aiAnalysis.risk_factors || []).filter(r => r.severity === 'critical' || r.severity === 'high');
    for (const risk of criticalRisks.slice(0, 3)) {
      try {
        await base44.entities.HealthInsight.create({
          profile_id,
          insight_type: 'risk_assessment',
          title: `Risk Factor: ${risk.factor}`,
          description: risk.description || '',
          severity: risk.severity === 'critical' ? 'critical' : 'high',
          data_source: document_id ? [document_id] : [],
          ai_confidence: 0.8,
          is_read: false,
          is_dismissed: false
        });
      } catch (e) {
        console.warn('Insight create failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      document_id,
      extraction_method: extractionMethod,
      extracted: {
        title: extractedData.document_title,
        type: coerceDocType(extractedData.document_type),
        date: extractedData.document_date,
        facility: extractedData.facility_name,
        doctor: extractedData.doctor_name,
        medications_count: (extractedData.medications || []).length,
        vitals_count: persistedVitals.length,
        labs_count: persistedLabs.length
      },
      ai_summary: aiAnalysis.summary,
      health_score: aiAnalysis.health_score,
      key_findings: aiAnalysis.key_findings,
      action_items: aiAnalysis.action_items,
      risk_factors: aiAnalysis.risk_factors
    });

  } catch (error) {
    console.error('documentProcessor error:', error);
    // Mark document as failed
    try {
      const b = await req.clone().json().catch(() => ({}));
      if (b.document_id) {
        const base44 = createClientFromRequest(req);
        await base44.entities.MedicalDocument.update(b.document_id, { status: 'failed' });
      }
    } catch (_) {}
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});