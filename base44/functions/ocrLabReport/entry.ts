import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_id, file_url } = await req.json();
  if (!profile_id || !file_url) {
    return Response.json({ error: 'profile_id and file_url are required' }, { status: 400 });
  }

  try {
    // Extract structured lab data from the document
    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          lab_results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                test_name: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
                reference_low: { type: 'number' },
                reference_high: { type: 'number' },
                test_date: { type: 'string' },
                category: { type: 'string', enum: ['blood', 'urine', 'lipid', 'liver', 'kidney', 'thyroid', 'diabetes', 'vitamin', 'other'] },
                flag: { type: 'string', enum: ['low', 'normal', 'high'] },
                facility: { type: 'string' }
              }
            }
          },
          vitals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                vital_type: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
                measured_at: { type: 'string' }
              }
            }
          },
          report_date: { type: 'string' },
          facility_name: { type: 'string' },
          doctor_name: { type: 'string' }
        }
      }
    });

    if (extraction.status !== 'success') {
      return Response.json({ error: 'Could not extract data from document', details: extraction.details }, { status: 422 });
    }

    const data = extraction.output;
    const created = { lab_results: [], vitals: [], flagged: [] };

    // Save lab results
    if (data.lab_results?.length) {
      for (const lab of data.lab_results) {
        if (!lab.test_name || lab.value === undefined) continue;

        // Auto-determine flag if not provided
        let flag = lab.flag || 'normal';
        if (!lab.flag && lab.reference_low !== undefined && lab.reference_high !== undefined) {
          if (lab.value < lab.reference_low) flag = 'low';
          else if (lab.value > lab.reference_high) flag = 'high';
          else flag = 'normal';
        }

        const labRecord = await base44.entities.LabResult.create({
          profile_id,
          test_name: lab.test_name,
          test_category: lab.category || 'other',
          value: lab.value,
          unit: lab.unit || '',
          reference_low: lab.reference_low,
          reference_high: lab.reference_high,
          flag,
          test_date: lab.test_date || data.report_date || new Date().toISOString().split('T')[0],
          facility: lab.facility || data.facility_name || '',
        });

        created.lab_results.push(labRecord);
        if (flag !== 'normal') {
          created.flagged.push({ type: 'lab', name: lab.test_name, value: lab.value, unit: lab.unit, flag });
        }
      }
    }

    // Save vitals
    if (data.vitals?.length) {
      for (const vital of data.vitals) {
        if (!vital.vital_type || vital.value === undefined) continue;
        const vitalRecord = await base44.entities.VitalMeasurement.create({
          profile_id,
          vital_type: vital.vital_type,
          value: vital.value,
          unit: vital.unit || '',
          measured_at: vital.measured_at || new Date().toISOString(),
          source: 'device'
        });
        created.vitals.push(vitalRecord);
      }
    }

    // Create health insight if abnormal results found
    if (created.flagged.length > 0) {
      const flaggedSummary = created.flagged.map(f => `${f.name}: ${f.value} ${f.unit} (${f.flag.toUpperCase()})`).join(', ');
      await base44.entities.HealthInsight.create({
        profile_id,
        insight_type: 'alert',
        title: `${created.flagged.length} Abnormal Lab Result${created.flagged.length > 1 ? 's' : ''} Detected`,
        description: `From your recently uploaded lab report, the following results were outside normal ranges: ${flaggedSummary}. Please review with your healthcare provider.`,
        severity: created.flagged.some(f => f.flag === 'high') ? 'high' : 'medium',
        is_read: false,
        is_dismissed: false
      });
    }

    return Response.json({
      success: true,
      extracted: {
        lab_count: created.lab_results.length,
        vital_count: created.vitals.length,
        flagged_count: created.flagged.length,
        flagged: created.flagged
      }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});