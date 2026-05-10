/**
 * MobileSelect — renders a native vaul Drawer picker on mobile,
 * falls back to shadcn Select on desktop.
 *
 * Props: value, onValueChange, placeholder, options: [{value, label}], triggerClassName, disabled
 */
import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { Check, ChevronDown } from 'lucide-react';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';

function useMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

export default function MobileSelect({
  value, onValueChange, placeholder = 'Select…',
  options = [], disabled = false, triggerClassName = '', className = '',
}) {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const cls = triggerClassName || className;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cls}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[200]" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-[210] rounded-t-3xl flex flex-col outline-none"
            style={{ backgroundColor: 'var(--hf-surface, #1a1a2e)', maxHeight: '70dvh', border: '1px solid var(--hf-border, rgba(255,255,255,0.1))', borderBottom: 'none' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong, rgba(255,255,255,0.2))' }} />
            </div>
            <p className="text-sm font-bold px-5 py-3 border-b flex-shrink-0"
              style={{ color: 'var(--hf-text, #fff)', borderColor: 'var(--hf-border, rgba(255,255,255,0.1))' }}>
              {placeholder}
            </p>
            <div className="overflow-y-auto flex-1 px-3 py-3 pb-10 space-y-1">
              {options.map(o => {
                const isSelected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onValueChange(o.value); setOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm text-left transition-all active:scale-[0.98]"
                    style={{
                      background: isSelected ? 'rgba(215,245,118,0.15)' : 'var(--hf-surface-2, rgba(255,255,255,0.05))',
                      color: isSelected ? '#d7f576' : 'var(--hf-text, #fff)',
                      fontWeight: isSelected ? 700 : 500,
                      border: isSelected ? '1.5px solid rgba(215,245,118,0.4)' : '1px solid transparent',
                    }}
                  >
                    {o.label}
                    {isSelected && <Check size={15} style={{ color: 'var(--hf-lemon-strong)' }} />}
                  </button>
                );
              })}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}