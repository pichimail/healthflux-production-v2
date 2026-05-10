/**
 * MIGRATION: POST-EXPORT
 * Route: /api/profiles/extract-family
 * InvokeLLM calls: 1 (extract family member data from document with JSON schema + file_url)
 * Replace with: OpenAI API (structured extraction)
 * DB calls: 2 (MedicalDocument, Profile.create)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl, documentType } = body; // documentType: 'health_insurance' | 'medical_record'

    // Fetch the document and extract text
    const prompt = `Analyze this health insurance or medical document and extract information about all family members mentioned.

For each family member found, extract:
- Full name
- Relationship to policy holder (self, spouse, child, parent, sibling, other)
- Date of birth or age
- Gender
- Blood group (if mentioned)
- Any allergies mentioned
- Any chronic conditions or medical history mentioned
- Policy/ID numbers (if applicable)

Return a JSON array of family members in this format:
{
  "family_members": [
    {
      "full_name": "John Doe",
      "relationship": "self" | "spouse" | "child" | "parent" | "sibling" | "other",
      "date_of_birth": "YYYY-MM-DD" or null,
      "age": number or null,
      "gender": "male" | "female" | "other" or null,
      "blood_group": "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" or null,
      "allergies": ["allergy1", "allergy2"] or [],
      "chronic_conditions": ["condition1", "condition2"] or [],
      "policy_id": "string" or null,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "document_summary": "Brief summary of the document",
  "extraction_notes": "Any issues or uncertainties in extraction"
}

Important:
- Only include family members that are clearly identified
- Use null for any fields you cannot confidently extract
- Mark confidence as "high" only if the information is explicitly stated
- For children, estimate age if DOB not available
- Be conservative - if unsure, use "low" confidence`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      file_urls: fileUrl,
      response_json_schema: {
        type: 'object',
        properties: {
          family_members: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                full_name: { type: 'string' },
                relationship: { type: 'string' },
                date_of_birth: { type: 'string' },
                age: { type: 'number' },
                gender: { type: 'string' },
                blood_group: { type: 'string' },
                allergies: { type: 'array', items: { type: 'string' } },
                chronic_conditions: { type: 'array', items: { type: 'string' } },
                policy_id: { type: 'string' },
                confidence: { type: 'string' }
              }
            }
          },
          document_summary: { type: 'string' },
          extraction_notes: { type: 'string' }
        }
      }
    });

    // Create profiles for family members with high/medium confidence
    const createdProfiles = [];
    for (const member of response.family_members) {
      if (member.confidence !== 'low' && member.full_name) {
        try {
          const profileData = {
            full_name: member.full_name,
            relationship: member.relationship || 'other',
            date_of_birth: member.date_of_birth || undefined,
            gender: member.gender || undefined,
            blood_group: member.blood_group || undefined,
            allergies: member.allergies || [],
            chronic_conditions: member.chronic_conditions || []
          };

          // Check if profile already exists
          const existing = await base44.entities.Profile.filter({
            full_name: member.full_name,
            created_by: user.email
          });

          if (existing.length === 0) {
            const newProfile = await base44.entities.Profile.create(profileData);
            createdProfiles.push({
              ...newProfile,
              status: 'created',
              confidence: member.confidence
            });
          } else {
            createdProfiles.push({
              ...existing[0],
              status: 'already_exists',
              confidence: member.confidence
            });
          }
        } catch (error) {
          console.error(`Error creating profile for ${member.full_name}:`, error);
          createdProfiles.push({
            full_name: member.full_name,
            status: 'error',
            error: error.message,
            confidence: member.confidence
          });
        }
      }
    }

    return Response.json({
      success: true,
      extracted_members: response.family_members,
      created_profiles: createdProfiles,
      document_summary: response.document_summary,
      extraction_notes: response.extraction_notes
    });

  } catch (error) {
    console.error('Family profile extraction error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});