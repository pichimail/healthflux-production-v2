import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DrugInteractionChecker({ profileId, medications }) {
  const [expandedInteraction, setExpandedInteraction] = useState(null);
  const [checking, setChecking] = useState(false);

  const { data: interactions = [], refetch } = useQuery({
    queryKey: ['drugInteractions', profileId],
    queryFn: () => base44.entities.DrugInteraction.filter({ 
      profile_id: profileId,
      is_acknowledged: false 
    }),
    enabled: !!profileId,
  });

  useEffect(() => {
    if (medications.length >= 2) {
      checkInteractions();
    }
  }, [medications.length]);

  const checkInteractions = async () => {
    if (medications.length < 2) return;
    
    setChecking(true);
    try {
      const activeMeds = medications.filter(m => m.is_active);
      const { data } = await base44.functions.invoke('checkDrugInteractions', {
        profileId,
        medications: activeMeds.map(m => ({
          id: m.id,
          name: m.medication_name,
          dosage: m.dosage
        }))
      });

      if (data.interactions?.length > 0) {
        refetch();
      }
    } catch (error) {
      console.error('Drug interaction check error:', error);
    } finally {
      setChecking(false);
    }
  };

  const acknowledgeInteraction = async (interactionId) => {
    await base44.entities.DrugInteraction.update(interactionId, {
      is_acknowledged: true
    });
    refetch();
  };

  if (medications.length < 2) {
    return null;
  }

  const criticalInteractions = interactions.filter(i => i.interaction_type === 'major');
  const moderateInteractions = interactions.filter(i => i.interaction_type === 'moderate');
  const minorInteractions = interactions.filter(i => i.interaction_type === 'minor');

  if (interactions.length === 0) {
    return (
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">No Interactions Detected</p>
              <p className="text-xs text-green-700">Your current medications appear safe together</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (type) => {
    switch (type) {
      case 'major': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' };
      case 'moderate': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600' };
      case 'minor': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', icon: 'text-yellow-600' };
      default: return { bg: 'bg-[var(--hf-surface)]', border: 'border-[var(--hf-border)]', text: 'text-[var(--hf-text)]', icon: 'text-[var(--hf-muted)]' };
    }
  };

  return (
    <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
      <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)] flex items-center gap-2">
          <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600" />
          Drug Interaction Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Critical Interactions */}
          {criticalInteractions.length > 0 && (
            <Alert className="border-2 border-red-200 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-sm font-semibold text-red-900">
                {criticalInteractions.length} Critical Interaction{criticalInteractions.length > 1 ? 's' : ''} - Consult Doctor Immediately
              </AlertDescription>
            </Alert>
          )}

          {interactions.map((interaction) => {
            const med1 = medications.find(m => m.id === interaction.medication_id_1);
            const med2 = medications.find(m => m.id === interaction.medication_id_2);
            const colors = getSeverityColor(interaction.interaction_type);
            const isExpanded = expandedInteraction === interaction.id;

            return (
              <div
                key={interaction.id}
                className={`p-3 sm:p-4 rounded-2xl border-2 ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {interaction.interaction_type === 'major' && (
                      <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
                    )}
                    {interaction.interaction_type === 'moderate' && (
                      <AlertCircle className={`w-5 h-5 ${colors.icon}`} />
                    )}
                    {interaction.interaction_type === 'minor' && (
                      <Info className={`w-5 h-5 ${colors.icon}`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs ${colors.text} bg-[var(--hf-surface)] border ${colors.border}`}>
                        {interaction.interaction_type.toUpperCase()}
                      </Badge>
                      <p className="text-xs font-bold ${colors.text}">
                        {med1?.medication_name} ⚡ {med2?.medication_name}
                      </p>
                    </div>
                    
                    <p className={`text-xs ${colors.text} mb-2`}>
                      {interaction.description}
                    </p>

                    {isExpanded && (
                      <div className="mt-3 p-3 bg-[var(--hf-surface)] rounded-xl border border-[var(--hf-border)]">
                        <p className="text-xs font-semibold text-[var(--hf-text)] mb-1">📋 Recommendation:</p>
                        <p className="text-xs text-[var(--hf-text)]">{interaction.recommendation}</p>
                        
                        {interaction.interaction_type === 'major' && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs font-bold text-red-900">⚠️ Action Required:</p>
                            <p className="text-xs text-red-800">Contact your doctor or pharmacist before taking these medications together</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => setExpandedInteraction(isExpanded ? null : interaction.id)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-xl"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            More Info
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => acknowledgeInteraction(interaction.id)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-xl"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            onClick={checkInteractions}
            disabled={checking}
            variant="outline"
            className="w-full rounded-2xl h-10 text-sm"
          >
            {checking ? 'Checking...' : '🔄 Re-check Interactions'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}