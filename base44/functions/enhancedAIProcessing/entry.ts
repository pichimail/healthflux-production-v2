/**
 * Enhanced AI Processing — Base44 InvokeLLM FIRST, fallback to OpenAI/Gemini
 * Extracts ALL details from any medical document: lab, prescription, imaging, discharge, etc.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { document_id, file_url, profile_id } = await req.json();
        if (!document_id || !file_url || !profile_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await base44.asServiceRole.entities.MedicalDocument.update(document_id, { status: 'processing' });

        const docArr = await base44.asServiceRole.entities.MedicalDocument.filter({ id: document_id });
        if (!docArr || docArr.length === 0) return Response.json({ error: 'Document not found' }, { status: 404 });
        const doc = docArr[0];

        const profileArr = await base44.asServiceRole.entities.Profile.filter({ id: profile_id });
        const profileData = profileArr[0] || {};

        const EXTRACTION_SCHEMA = {
            type: "object",
            properties: {
                title: { type: "string" },
                document_type: { type: "string", enum: ["lab_report", "prescription", "imaging", "discharge_summary", "consultation", "vaccination", "insurance", "other"] },
                document_date: { type: "string" },
                summary: { type: "string" },
                ai_summary_rich: { type: "string" },
                // Facility
                facility_name: { type: "string" },
                facility_address: { type: "string" },
                facility_city: { type: "string" },
                facility_state: { type: "string" },
                facility_pincode: { type: "string" },
                facility_phone: { type: "string" },
                facility_tollfree: { type: "string" },
                facility_email: { type: "string" },
                facility_website: { type: "string" },
                // Doctor / Provider
                doctor_name: { type: "string" },
                doctor_qualification: { type: "string" },
                doctor_registration_number: { type: "string" },
                doctor_phone: { type: "string" },
                doctor_specialization: { type: "string" },
                // Lab technician / pharmacist
                technician_name: { type: "string" },
                pharmacist_name: { type: "string" },
                // Patient
                patient_name: { type: "string" },
                patient_age: { type: "string" },
                patient_id: { type: "string" },
                patient_gender: { type: "string" },
                // Insurance
                insurance_provider: { type: "string" },
                insurance_policy_number: { type: "string" },
                insurance_officer_name: { type: "string" },
                // Clinical data
                diagnoses: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                chief_complaint: { type: "string" },
                clinical_notes: { type: "string" },
                lab_results: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                            unit: { type: "string" },
                            reference_low: { type: "number" },
                            reference_high: { type: "number" },
                            category: { type: "string" },
                            flag: { type: "string" }
                        }
                    }
                },
                vitals: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            type: { type: "string" },
                            value: { type: "number" },
                            systolic: { type: "number" },
                            diastolic: { type: "number" },
                            unit: { type: "string" }
                        }
                    }
                },
                medications: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            dosage: { type: "string" },
                            frequency: { type: "string" },
                            times: { type: "array", items: { type: "string" } },
                            purpose: { type: "string" },
                            duration: { type: "string" },
                            instructions: { type: "string" }
                        }
                    }
                }
            }
        };

        const EXTRACTION_PROMPT = `You are an expert medical document analysis AI. Analyze this medical document EXTREMELY thoroughly and extract EVERY SINGLE DETAIL visible.

This could be: lab report, blood test, prescription, imaging (X-ray/MRI/CT), discharge summary, consultation note, vaccination record, insurance document, or any other medical record.

Extract:
1. A descriptive title (e.g., "CBC Blood Report - City Hospital - March 2025")
2. Document type (lab_report/prescription/imaging/discharge_summary/consultation/vaccination/insurance/other)
3. Document date in YYYY-MM-DD
4. COMPLETE FACILITY DETAILS: Full hospital/clinic/lab/pharmacy name, complete postal address (street, area, city, state, pincode), ALL phone numbers, toll-free numbers, email, website
5. DOCTOR/PROVIDER DETAILS: Full name with title (Dr.), all qualifications/degrees (MBBS, MD, etc.), registration/license number, direct phone, specialization
6. LAB TECHNICIAN: name if visible on lab reports
7. PHARMACIST: name if visible on prescriptions
8. PATIENT DETAILS: Full name, age, gender, patient/UHID/registration number
9. INSURANCE DETAILS: Provider, policy number, officer name
10. ALL LAB RESULTS: Every single test with exact values, units, and reference ranges
11. ALL VITAL SIGNS: BP (systolic+diastolic), heart rate, temperature, weight, height, SpO2, etc.
12. ALL MEDICATIONS: Every medicine with dosage (mg/ml), frequency (OD/BD/TDS), timing, purpose, duration, special instructions
13. DIAGNOSES: All conditions diagnosed
14. RECOMMENDATIONS: All follow-up instructions and advice
15. CHIEF COMPLAINT: If consultation note
16. CLINICAL NOTES: Any clinical observations

For summary: Write a comprehensive 3-5 sentence plain-English summary.
For ai_summary_rich: Write a detailed rich summary formatted with sections like: Overview, Key Findings, Medications Prescribed, Recommendations, Provider Details. This will be shown to the user as the AI analysis.

Be absolutely thorough. Do not skip any visible text.`;

        let extractedData = null;
        let extractionMethod = '';

        // === STEP 1: Base44 InvokeLLM (PRIMARY — always try first) ===
        try {
            console.log('Attempting Base44 InvokeLLM extraction...');
            extractedData = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: EXTRACTION_PROMPT,
                file_urls: [file_url],
                response_json_schema: EXTRACTION_SCHEMA
            });
            if (extractedData && extractedData.title) {
                extractionMethod = 'Base44 AI (InvokeLLM)';
                console.log('Base44 InvokeLLM succeeded:', extractedData.title);
            } else {
                extractedData = null;
            }
        } catch (e) {
            console.warn('Base44 InvokeLLM failed, falling back:', e.message);
        }

        // === STEP 2: Fallback — OpenAI GPT-4o (only if Base44 failed) ===
        if (!extractedData) {
            try {
                console.log('Falling back to OpenAI...');
                const OpenAI = (await import('npm:openai')).default;
                const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are a medical document analysis AI. Extract ALL structured information. Respond ONLY with valid JSON." },
                        { role: "user", content: [
                            { type: "text", text: EXTRACTION_PROMPT + "\n\nRespond with JSON matching: " + JSON.stringify(EXTRACTION_SCHEMA) },
                            { type: "image_url", image_url: { url: file_url } }
                        ]}
                    ],
                    response_format: { type: "json_object" }
                });
                extractedData = JSON.parse(response.choices[0].message.content);
                extractionMethod = 'OpenAI GPT-4o (fallback)';
                console.log('OpenAI fallback succeeded');
            } catch (e) {
                console.warn('OpenAI fallback failed:', e.message);
            }
        }

        // === STEP 3: Fallback — Gemini (only if both above failed) ===
        if (!extractedData) {
            try {
                console.log('Falling back to Gemini...');
                const { GoogleGenerativeAI } = await import('npm:@google/generative-ai');
                const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY"));
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: { responseMimeType: "application/json", responseSchema: EXTRACTION_SCHEMA }
                });
                const imageResponse = await fetch(file_url);
                const imageBuffer = await imageResponse.arrayBuffer();
                const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
                const mimeType = doc.file_type || 'image/jpeg';
                const result = await model.generateContent([
                    { text: EXTRACTION_PROMPT },
                    { inlineData: { data: imageBase64, mimeType } }
                ]);
                extractedData = JSON.parse(result.response.text());
                extractionMethod = 'Google Gemini (fallback)';
                console.log('Gemini fallback succeeded');
            } catch (e) {
                console.warn('Gemini fallback failed:', e.message);
            }
        }

        // === STEP 4: Absolute last resort — Base44 ExtractDataFromUploadedFile ===
        if (!extractedData) {
            try {
                console.log('Trying Base44 ExtractDataFromUploadedFile...');
                const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
                    file_url,
                    json_schema: EXTRACTION_SCHEMA
                });
                if (result.status === 'success' && result.output) {
                    extractedData = result.output;
                    extractionMethod = 'Base44 ExtractDataFromUploadedFile (fallback)';
                }
            } catch (e) {
                console.warn('ExtractDataFromUploadedFile failed:', e.message);
            }
        }

        if (!extractedData) {
            await base44.asServiceRole.entities.MedicalDocument.update(document_id, { status: 'failed' });
            return Response.json({ success: false, error: 'All extraction methods failed.' }, { status: 500 });
        }

        // Defaults
        if (!extractedData.title) extractedData.title = doc.title || 'Medical Document';
        if (!extractedData.document_type) extractedData.document_type = 'other';
        if (!extractedData.document_date) extractedData.document_date = new Date().toISOString().split('T')[0];

        // Build comprehensive provider contact block
        const contactLines = [
            extractedData.facility_address && `📍 ${extractedData.facility_address}`,
            (extractedData.facility_city || extractedData.facility_state) && `${[extractedData.facility_city, extractedData.facility_state, extractedData.facility_pincode].filter(Boolean).join(', ')}`,
            extractedData.facility_phone && `📞 ${extractedData.facility_phone}`,
            extractedData.facility_tollfree && `📞 Toll-free: ${extractedData.facility_tollfree}`,
            extractedData.facility_email && `✉️ ${extractedData.facility_email}`,
            extractedData.facility_website && `🌐 ${extractedData.facility_website}`,
            extractedData.doctor_qualification && `🎓 ${extractedData.doctor_qualification}`,
            extractedData.doctor_registration_number && `Reg: ${extractedData.doctor_registration_number}`,
            extractedData.doctor_phone && `Dr. Phone: ${extractedData.doctor_phone}`,
            extractedData.insurance_provider && `🏥 Insurance: ${extractedData.insurance_provider}`,
            extractedData.insurance_policy_number && `Policy#: ${extractedData.insurance_policy_number}`,
        ].filter(Boolean).join('\n');

        const richSummary = extractedData.ai_summary_rich || extractedData.summary || 'Document processed successfully.';
        const fullSummary = contactLines ? `${richSummary}\n\n📋 Provider Details:\n${contactLines}` : richSummary;

        // Update document with all extracted data
        await base44.asServiceRole.entities.MedicalDocument.update(document_id, {
            title: extractedData.title,
            document_type: extractedData.document_type,
            facility_name: extractedData.facility_name || extractedData.insurance_provider || doc.facility_name,
            doctor_name: extractedData.doctor_name || doc.doctor_name,
            document_date: extractedData.document_date || doc.document_date,
            ai_summary: fullSummary,
            extracted_medications: extractedData.medications || [],
            extracted_vitals: extractedData.vitals || [],
            extracted_lab_results: extractedData.lab_results || [],
            notes: doc.notes,
            status: 'completed'
        });

        // Auto-populate LabResults
        const labCount = { created: 0 };
        if (extractedData.lab_results?.length > 0) {
            for (const lab of extractedData.lab_results) {
                if (lab.name && (lab.value !== undefined && lab.value !== null)) {
                    const val = parseFloat(lab.value);
                    const low = lab.reference_low != null ? parseFloat(lab.reference_low) : null;
                    const high = lab.reference_high != null ? parseFloat(lab.reference_high) : null;
                    let flag = 'normal';
                    if (!isNaN(val)) {
                        if (low !== null && val < low) flag = 'low';
                        else if (high !== null && val > high) flag = 'high';
                    }
                    await base44.asServiceRole.entities.LabResult.create({
                        profile_id: doc.profile_id,
                        document_id,
                        test_name: lab.name,
                        test_category: lab.category || 'other',
                        value: isNaN(val) ? 0 : val,
                        unit: lab.unit || '',
                        reference_low: low,
                        reference_high: high,
                        flag,
                        test_date: extractedData.document_date || new Date().toISOString().split('T')[0],
                        facility: extractedData.facility_name || ''
                    });
                    labCount.created++;
                    if (flag !== 'normal') {
                        await base44.asServiceRole.entities.HealthInsight.create({
                            profile_id: doc.profile_id,
                            insight_type: 'alert',
                            title: `Abnormal ${lab.name}: ${flag.toUpperCase()}`,
                            description: `Your ${lab.name} is ${flag}: ${lab.value} ${lab.unit || ''} (Range: ${low ?? '?'}–${high ?? '?'}). Please consult your healthcare provider.`,
                            severity: flag === 'high' ? 'high' : 'medium',
                            data_source: [document_id],
                            ai_confidence: 0.92,
                            is_read: false
                        });
                    }
                }
            }
        }

        // Auto-populate VitalMeasurements
        const vitalCount = { created: 0 };
        if (extractedData.vitals?.length > 0) {
            for (const v of extractedData.vitals) {
                if (v.type && (v.value || v.systolic)) {
                    const vData = {
                        profile_id: doc.profile_id,
                        vital_type: v.type,
                        measured_at: extractedData.document_date ? new Date(extractedData.document_date).toISOString() : new Date().toISOString(),
                        source: 'document',
                        notes: `From: ${extractedData.title}`
                    };
                    if (v.type === 'blood_pressure' && v.systolic) {
                        vData.systolic = parseFloat(v.systolic);
                        vData.diastolic = parseFloat(v.diastolic || 0);
                        vData.unit = 'mmHg';
                    } else if (v.value) {
                        vData.value = parseFloat(v.value);
                        vData.unit = v.unit || '';
                    }
                    await base44.asServiceRole.entities.VitalMeasurement.create(vData);
                    vitalCount.created++;
                }
            }
        }

        // Auto-populate Medications
        const medCount = { created: 0 };
        if (extractedData.medications?.length > 0) {
            const existing = await base44.asServiceRole.entities.Medication.filter({ profile_id: doc.profile_id, is_active: true });
            for (const med of extractedData.medications) {
                if (!med.name) continue;
                const dup = existing.find(m => m.medication_name?.toLowerCase() === med.name.toLowerCase());
                if (!dup) {
                    const freqMap = { 'once_daily': 'once_daily', 'od': 'once_daily', 'twice_daily': 'twice_daily', 'bd': 'twice_daily', 'tds': 'three_times_daily', 'three_times_daily': 'three_times_daily', 'qid': 'four_times_daily', 'four_times_daily': 'four_times_daily' };
                    const freqKey = med.frequency?.toLowerCase().replace(/\s+/g, '_') || '';
                    const frequency = freqMap[freqKey] || 'as_needed';
                    await base44.asServiceRole.entities.Medication.create({
                        profile_id: doc.profile_id,
                        medication_name: med.name,
                        dosage: med.dosage || '',
                        frequency,
                        times: med.times || [],
                        start_date: extractedData.document_date || new Date().toISOString().split('T')[0],
                        purpose: med.purpose || '',
                        prescriber: extractedData.doctor_name || '',
                        side_effects: med.instructions || '',
                        is_active: true,
                        reminders_enabled: true
                    });
                    medCount.created++;
                }
            }
        }

        // Recommendations as HealthInsights
        if (extractedData.recommendations?.length > 0) {
            for (const rec of extractedData.recommendations) {
                await base44.asServiceRole.entities.HealthInsight.create({
                    profile_id: doc.profile_id,
                    insight_type: 'recommendation',
                    title: 'Recommendation from Document',
                    description: rec,
                    severity: 'info',
                    data_source: [document_id],
                    ai_confidence: 0.85,
                    is_read: false
                });
            }
        }

        return Response.json({
            success: true,
            extraction_method: extractionMethod,
            extracted_data: extractedData,
            document_id,
            counts: {
                lab_results: labCount.created,
                vitals: vitalCount.created,
                medications: medCount.created
            }
        });

    } catch (error) {
        console.error('Processing error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});