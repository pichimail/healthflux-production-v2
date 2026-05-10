import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, profile_id } = await req.json();
    if (!file_url || !profile_id) {
      return Response.json({ error: 'file_url and profile_id are required' }, { status: 400 });
    }

    // Step 1: classify the image
    const classResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Look at this image and classify it into exactly ONE of these categories:
- "food": if it shows any food, meal, drink, or edible items
- "skin": if it shows skin, a rash, wound, mole, or any skin condition
- "document": if it shows a medical document, prescription, lab report, or any text document

Respond with ONLY a JSON object with this exact structure:
{"category": "food"|"skin"|"document", "confidence": 0.0-1.0}`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });

    const category = classResult?.category || 'document';
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const timestamp = istNow.toISOString().replace('T', ' ').slice(0, 19) + ' IST';

    let analysisResult = {};
    let docRecord = null;

    // Step 2: run the appropriate analysis
    if (category === 'food') {
      const foodAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this food image and provide detailed nutritional information.
Return a JSON with:
- summary: one sentence description of the meal
- key_findings: array of 3-4 key nutritional facts
- calories_estimate: estimated total calories (number)
- macros: {protein_g, carbs_g, fat_g}
- health_score: 0-100 (how healthy is this meal)
- recommendations: array of 2 dietary suggestions`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_findings: { type: 'array', items: { type: 'string' } },
            calories_estimate: { type: 'number' },
            macros: { type: 'object' },
            health_score: { type: 'number' },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      analysisResult = {
        category: 'food',
        summary: foodAnalysis.summary || 'Food item analyzed',
        key_findings: foodAnalysis.key_findings || [],
        calories: foodAnalysis.calories_estimate,
        macros: foodAnalysis.macros,
        health_score: foodAnalysis.health_score,
        recommendations: foodAnalysis.recommendations || [],
      };

      // Save as MedicalDocument in Docs folder
      docRecord = await base44.asServiceRole.entities.MedicalDocument.create({
        profile_id,
        title: `Food Snap — ${timestamp}`,
        document_type: 'other',
        file_url,
        file_name: `food_snap_${Date.now()}.jpg`,
        file_type: 'image/jpeg',
        document_date: now.toISOString().slice(0, 10),
        ai_summary: foodAnalysis.summary || 'Food item analyzed',
        key_findings: foodAnalysis.key_findings || [],
        action_items: foodAnalysis.recommendations || [],
        ai_tags: ['Food', 'Nutrition', 'Multi-Snap'],
        health_score: foodAnalysis.health_score || null,
        notes: `Calories: ~${foodAnalysis.calories_estimate || '?'} kcal | Protein: ${foodAnalysis.macros?.protein_g || '?'}g | Carbs: ${foodAnalysis.macros?.carbs_g || '?'}g | Fat: ${foodAnalysis.macros?.fat_g || '?'}g`,
        status: 'completed',
      });

    } else if (category === 'skin') {
      const skinAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this skin image and provide a clinical assessment.
Return a JSON with:
- summary: one sentence describing what you see
- key_findings: array of 3-4 key observations
- conditions_detected: array of possible skin conditions (be conservative)
- severity: "clear"|"mild"|"moderate"|"severe"
- see_doctor_urgency: "no"|"within_month"|"within_week"|"immediately"
- skincare_routine: array of 2-3 recommended steps
- disclaimer: always include "This is an AI analysis. Please consult a dermatologist for medical advice."`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_findings: { type: 'array', items: { type: 'string' } },
            conditions_detected: { type: 'array', items: { type: 'string' } },
            severity: { type: 'string' },
            see_doctor_urgency: { type: 'string' },
            skincare_routine: { type: 'array', items: { type: 'string' } },
            disclaimer: { type: 'string' },
          },
        },
      });

      analysisResult = {
        category: 'skin',
        summary: skinAnalysis.summary || 'Skin analysis complete',
        key_findings: skinAnalysis.key_findings || [],
        conditions_detected: skinAnalysis.conditions_detected || [],
        severity: skinAnalysis.severity || 'mild',
        see_doctor_urgency: skinAnalysis.see_doctor_urgency || 'no',
        skincare_routine: skinAnalysis.skincare_routine || [],
      };

      // Save SkinAnalysis record
      await base44.asServiceRole.entities.SkinAnalysis.create({
        profile_id,
        image_url: file_url,
        analysis_date: now.toISOString(),
        conditions_detected: skinAnalysis.conditions_detected || [],
        severity: skinAnalysis.severity || 'mild',
        triage_advice: skinAnalysis.summary || '',
        skincare_routine: skinAnalysis.skincare_routine || [],
        see_doctor_urgency: skinAnalysis.see_doctor_urgency || 'no',
        tracking_notes: skinAnalysis.key_findings?.join('. ') || '',
        status: 'completed',
      });

      // Also save as MedicalDocument
      docRecord = await base44.asServiceRole.entities.MedicalDocument.create({
        profile_id,
        title: `Skin Snap — ${timestamp}`,
        document_type: 'other',
        file_url,
        file_name: `skin_snap_${Date.now()}.jpg`,
        file_type: 'image/jpeg',
        document_date: now.toISOString().slice(0, 10),
        ai_summary: skinAnalysis.summary || 'Skin analysis',
        key_findings: skinAnalysis.key_findings || [],
        action_items: skinAnalysis.skincare_routine || [],
        ai_tags: ['Skin', 'Dermatology', 'Multi-Snap'],
        status: 'completed',
      });

    } else {
      // document
      const docAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this medical document image and extract key information.
Return a JSON with:
- summary: 1-2 sentence description of what this document contains
- key_findings: array of 3-5 important findings or values
- action_items: array of 2-3 recommended actions based on this document
- document_type: "lab_report"|"prescription"|"imaging"|"discharge_summary"|"consultation"|"vaccination"|"insurance"|"other"
- ai_tags: array of relevant tags like "Lab Result", "Prescription", "Billing", "Referral", etc.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_findings: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            document_type: { type: 'string' },
            ai_tags: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      analysisResult = {
        category: 'document',
        summary: docAnalysis.summary || 'Document analyzed',
        key_findings: docAnalysis.key_findings || [],
        action_items: docAnalysis.action_items || [],
        document_type: docAnalysis.document_type || 'other',
        ai_tags: docAnalysis.ai_tags || [],
      };

      docRecord = await base44.asServiceRole.entities.MedicalDocument.create({
        profile_id,
        title: `Doc Snap — ${timestamp}`,
        document_type: docAnalysis.document_type || 'other',
        file_url,
        file_name: `doc_snap_${Date.now()}.jpg`,
        file_type: 'image/jpeg',
        document_date: now.toISOString().slice(0, 10),
        ai_summary: docAnalysis.summary || 'Document analyzed',
        key_findings: docAnalysis.key_findings || [],
        action_items: docAnalysis.action_items || [],
        ai_tags: [...(docAnalysis.ai_tags || []), 'Multi-Snap'],
        status: 'completed',
      });
    }

    return Response.json({
      ...analysisResult,
      document_id: docRecord?.id || null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});