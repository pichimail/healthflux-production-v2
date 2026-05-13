import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Settings2, GripVertical, Eye, EyeOff, X, RotateCcw } from 'lucide-react';
import Haptics from '../utils/haptics';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { useTheme } from '@/lib/ThemeContext';

export const DEFAULT_WIDGETS = [
  { id: 'health_score',  label: 'Health Score',        icon: '🏥', enabled: true,  size: 'sm' },
  { id: 'vitals',        label: 'Vital Signs',          icon: '💓', enabled: true,  size: 'md' },
  { id: 'bp_chart',      label: 'Blood Pressure Chart', icon: '📈', enabled: true,  size: 'md' },
  { id: 'hr_chart',      label: 'Heart Rate Chart',     icon: '💗', enabled: true,  size: 'md' },
  { id: 'med_timeline',  label: 'Medication Timeline',  icon: '💊', enabled: true,  size: 'lg' },
  { id: 'med_adherence', label: 'Med Adherence',        icon: '✅', enabled: true,  size: 'md' },
  { id: 'doc_breakdown', label: 'Documents Breakdown',  icon: '📄', enabled: true,  size: 'md' },
  { id: 'ai_predictions',label: 'AI Predictions',       icon: '🧠', enabled: true,  size: 'lg' },
  { id: 'lab_alerts',    label: 'Lab Alerts',           icon: '⚠️', enabled: true,  size: 'md' },
  { id: 'medications',   label: 'Active Medications',   icon: '💉', enabled: true,  size: 'md' },
  { id: 'documents',     label: 'Recent Documents',     icon: '🗂️', enabled: false, size: 'md' },
  { id: 'recovery',      label: 'Recovery Scale',       icon: '🔋', enabled: false, size: 'md' },
];

const STORAGE_KEY = 'hf_dashboard_widgets';

export function loadWidgets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return DEFAULT_WIDGETS;
}

export function saveWidgets(widgets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

export function WidgetCustomizer({ widgets, onChange }) {
  const [open, setOpen] = useState(false);
  const { isLight } = useTheme();

  const toggle = (id) => {
    Haptics.medium();
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    onChange(updated);
    saveWidgets(updated);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    Haptics.light();
    const items = Array.from(widgets);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onChange(items);
    saveWidgets(items);
  };

  const reset = () => {
    Haptics.heavy();
    onChange(DEFAULT_WIDGETS);
    saveWidgets(DEFAULT_WIDGETS);
  };

  const enabledCount = widgets.filter(w => w.enabled).length;

  return (
    <>
      <button
        onClick={() => { Haptics.light(); setOpen(true); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold active-press"
        style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}
        title="Customize Dashboard"
      >
        <Settings2 size={12} />
        <span className="hidden sm:inline">Customize</span>
        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: '#d7f576', color: '#0a1200' }}>{enabledCount}</span>
      </button>

      <ResponsiveOverlay
        open={open}
        onOpenChange={setOpen}
        title="Customize Dashboard"
        description={`${enabledCount} widgets active`}
        hideHeader
        desktopClassName="max-w-2xl"
      >
        <div className="flex justify-center pt-1 pb-1 md:hidden">
          <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
        </div>

        {/* Header */}
        <div className="px-1 pb-3 md:px-0 md:pb-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--hf-border)' }}>
          <div>
            <p className="text-base font-black" style={{ color: 'var(--hf-text)' }}>Customize Dashboard</p>
            <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{enabledCount} widgets active · drag to reorder</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="p-2 rounded-xl" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
              <RotateCcw size={14} />
            </button>
            <button onClick={() => setOpen(false)} className="p-2 rounded-xl" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Drag list */}
        <div className="overflow-y-auto max-h-[72dvh] pt-3">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 pb-3">
                  {widgets.map((w, idx) => (
                    <Draggable key={w.id} draggableId={w.id} index={idx}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                          style={{
                            background: snap.isDragging ? 'rgba(215,245,118,0.1)' : 'var(--hf-surface-2)',
                            border: `1px solid ${snap.isDragging ? 'rgba(215,245,118,0.4)' : 'var(--hf-border)'}`,
                            opacity: w.enabled ? 1 : 0.5,
                            ...prov.draggableProps.style,
                          }}
                        >
                          <div {...prov.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1">
                            <GripVertical size={16} style={{ color: 'var(--hf-text-muted)' }} />
                          </div>
                          <span className="text-xl">{w.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{w.label}</p>
                            <p className="text-[9px] uppercase font-bold" style={{ color: 'var(--hf-text-muted)' }}>{w.size === 'lg' ? 'full width' : w.size === 'md' ? 'half' : 'compact'}</p>
                          </div>
                          <button onClick={() => toggle(w.id)}
                            className="p-2 rounded-xl transition-all"
                            style={{
                              background: w.enabled ? 'rgba(215,245,118,0.15)' : 'var(--hf-surface)',
                              color: w.enabled ? (isLight ? '#000000' : '#d7f576') : 'var(--hf-text-muted)'
                            }}>
                            {w.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </ResponsiveOverlay>
    </>
  );
}

export default WidgetCustomizer;
