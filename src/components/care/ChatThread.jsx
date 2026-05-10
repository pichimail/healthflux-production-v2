// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatThread({ careCircle, user, onBack }) {
  const [msg, setMsg] = useState('');
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const isOwner = user?.email === careCircle.owner_email;
  const otherName = isOwner
    ? (careCircle.caregiver_name || careCircle.caregiver_email)
    : (careCircle.owner_email);
  const otherInitial = otherName?.[0]?.toUpperCase() || '?';

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['care-messages', careCircle.id],
    queryFn: () => base44.entities.CareCircleMessage.filter(
      { care_circle_id: careCircle.id },
      'created_date',
      200
    ),
    refetchInterval: 3000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (text) => base44.entities.CareCircleMessage.create({
      care_circle_id: careCircle.id,
      profile_id: careCircle.profile_id,
      owner_email: careCircle.owner_email,
      caregiver_email: careCircle.caregiver_email,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      message: text,
      message_type: 'text',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care-messages', careCircle.id] });
      setMsg('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = msg.trim();
    if (!trimmed) return;
    sendMut.mutate(trimmed);
  };

  const shareHealthUpdate = () => {
    sendMut.mutate(`📊 Health Update: I'd like to discuss my latest health data. Please check my shared profile for the most recent vitals and reports.`);
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--hf-border)', background: 'var(--hf-surface)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--hf-text)' }} />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: isOwner ? '#a8e6cf' : '#c9bbff', color: isOwner ? '#003d20' : '#1a0a40' }}>
          {otherInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{otherName}</p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
            {careCircle.relationship} · {careCircle.status}
          </p>
        </div>
        <button onClick={shareHealthUpdate} title="Share health update"
          className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.1)' }}>
          <Heart size={14} style={{ color: 'var(--hf-coral-strong)' }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--hf-bg)' }}>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Start a conversation</p>
            <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
              Discuss health reports and observations securely
            </p>
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.sender_email === user.email;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {!isMine && (
                  <p className="text-[9px] font-bold mb-1 px-1" style={{ color: 'var(--hf-text-muted)' }}>
                    {m.sender_name || m.sender_email}
                  </p>
                )}
                <div className="px-3.5 py-2.5 rounded-2xl"
                  style={{
                    background: isMine ? '#d7f576' : 'var(--hf-surface)',
                    color: isMine ? '#0a1200' : 'var(--hf-text)',
                    borderBottomRightRadius: isMine ? '6px' : '18px',
                    borderBottomLeftRadius: isMine ? '18px' : '6px',
                    border: isMine ? 'none' : '1px solid var(--hf-border)',
                  }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                </div>
                <p className={`text-[9px] mt-0.5 px-1 ${isMine ? 'text-right' : ''}`} style={{ color: 'var(--hf-text-muted)' }}>
                  {m.created_date ? format(new Date(m.created_date), 'h:mm a') : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t" style={{ borderColor: 'var(--hf-border)', background: 'var(--hf-surface)' }}>
        <Input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-10 rounded-2xl text-sm"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
        />
        <Button type="submit" disabled={!msg.trim() || sendMut.isPending}
          className="h-10 w-10 rounded-full p-0 flex-shrink-0"
          style={{ background: msg.trim() ? '#d7f576' : 'var(--hf-surface-2)', color: msg.trim() ? '#0a1200' : 'var(--hf-text-muted)' }}>
          {sendMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </form>
    </div>
  );
}
