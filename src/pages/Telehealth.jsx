// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { Button } from '@/components/ui/button';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Star, Video, Calendar, Search, FileText, CheckCircle, X, Plus } from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';
import { toast } from 'sonner';
import { listDocuments } from '@/services/documents';
import {
  bookTelehealthAppointment,
  cancelTelehealthAppointment,
  createTelehealthDoctor,
  getTelehealthBookingAvailability,
  listTelehealthAppointments,
  listTelehealthDoctors,
} from '@/services/telehealth';

const SPECIALTIES = ['All', 'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist', 'Endocrinologist', 'Psychiatrist', 'Orthopedist', 'Gynecologist', 'Pediatrician'];

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10} style={{ color: i <= Math.round(rating) ? '#f7c9a3' : 'var(--hf-border)', fill: i <= Math.round(rating) ? '#f7c9a3' : 'transparent' }} />
      ))}
    </div>
  );
}

function DoctorCard({ doctor, onBook, canBook }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: 'rgba(201,187,255,0.15)' }}>
          👨‍⚕️
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{doctor.name}</p>
              <p className="text-xs" style={{ color: 'var(--hf-lavender-strong)' }}>{doctor.specialty}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{doctor.qualifications} · {doctor.experience_years}y exp</p>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
              style={{ background: doctor.is_available ? 'rgba(168,230,207,0.2)' : 'var(--hf-surface-2)', color: doctor.is_available ? '#a8e6cf' : 'var(--hf-text-muted)' }}>
              {doctor.is_available ? '● Available' : 'Unavailable'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <StarRating rating={doctor.rating} />
            <span className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{doctor.rating}</span>
            <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>({doctor.review_count} reviews)</span>
          </div>

          <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--hf-text-muted)' }}>{doctor.bio}</p>

          {doctor.languages?.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {doctor.languages.map(l => (
                <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>{l}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-base font-black" style={{ color: 'var(--hf-lemon-strong)' }}>₹{doctor.consultation_fee}</span>
            <Button onClick={() => onBook(doctor)} disabled={!doctor.is_available || !canBook} size="sm"
              className="rounded-xl h-8 text-xs font-bold px-4"
              style={{ background: doctor.is_available && canBook ? '#d7f576' : 'var(--hf-surface-2)', color: doctor.is_available && canBook ? '#0a1200' : 'var(--hf-text-muted)' }}>
              <Video size={11} className="mr-1" /> Book
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingDialog({ doctor, open, onClose, user, activeProfileId, documents }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [booked, setBooked] = useState(false);
  const qc = useQueryClient();
  const bookingAvailability = getTelehealthBookingAvailability();
  const bookingEnabled = bookingAvailability.status === 'ready';

  const mutation = useMutation({
    mutationFn: bookTelehealthAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telehealth-appointments'] });
      setBooked(true);
      toast.success('Appointment confirmed!');
    },
    onError: (error) => toast.error(error?.message || 'Booking failed'),
  });

  const handleBook = () => {
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
    const dt = new Date(`${selectedSlot.date}T${selectedSlot.time}`);
    mutation.mutate({
      user_email: user?.email,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      specialty: doctor.specialty,
      scheduled_at: dt.toISOString(),
      duration_minutes: 30,
      status: 'confirmed',
      reason,
      shared_profile_ids: activeProfileId ? [activeProfileId] : [],
      shared_document_ids: selectedDocIds,
      consultation_fee: doctor.consultation_fee,
    });
  };

  if (!doctor) return null;
  const slots = doctor.available_slots?.filter(s => !s.is_booked) || [];

  return (
    <AdaptiveOverlay open={open} onOpenChange={o => { if (!o) { onClose(); setBooked(false); setSelectedSlot(null); setReason(''); setSelectedDocIds([]); } }} title={`Book with ${doctor.name}`} size="lg" showClose>

        {booked ? (
          <div className="flex flex-col items-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(168,230,207,0.2)' }}>
              <CheckCircle size={32} style={{ color: 'var(--hf-mint-strong)' }} />
            </div>
            <p className="font-bold text-base" style={{ color: 'var(--hf-text)' }}>Appointment Confirmed!</p>
            {selectedSlot && <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(`${selectedSlot.date}T${selectedSlot.time}`), 'EEEE, MMM d · h:mm a')}</p>}
            <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>You'll receive a video link before the appointment. Check "My Appointments" to join.</p>
            <Button onClick={onClose} className="rounded-2xl h-10 px-8 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {!bookingEnabled && (
              <div className="rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: 'var(--hf-border)', background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
                {bookingAvailability.reason}
              </div>
            )}
            {/* Slots */}
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--hf-text-muted)' }}>Select a Time Slot</p>
              {slots.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No available slots at this time.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot, i) => (
                    <button key={i} onClick={() => setSelectedSlot(slot)}
                      className="p-2.5 rounded-xl text-center transition-all"
                      style={{
                        background: selectedSlot === slot ? '#d7f576' : 'var(--hf-surface-2)',
                        border: selectedSlot === slot ? '1.5px solid #d7f576' : '1px solid var(--hf-border)',
                        color: selectedSlot === slot ? '#0a1200' : 'var(--hf-text)',
                      }}>
                      <p className="text-xs font-bold">{format(new Date(slot.date), 'MMM d')}</p>
                      <p className="text-[10px]" style={{ color: selectedSlot === slot ? '#0a1200' : 'var(--hf-text-muted)' }}>{slot.time}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reason for Consultation</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Describe your concern briefly…" rows={2}
                className="rounded-xl text-sm" />
            </div>

            {/* Share records */}
            {documents?.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--hf-text-muted)' }}>Share Health Records (optional)</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {documents.slice(0, 8).map(doc => (
                    <label key={doc.id} className="flex items-center gap-2 p-2 rounded-xl cursor-pointer" style={{ background: 'var(--hf-surface-2)' }}>
                      <input type="checkbox" checked={selectedDocIds.includes(doc.id)}
                        onChange={e => setSelectedDocIds(p => e.target.checked ? [...p, doc.id] : p.filter(id => id !== doc.id))} />
                      <FileText size={11} style={{ color: 'var(--hf-text-muted)' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--hf-text)' }}>{doc.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Fee + Book */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--hf-border)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Consultation Fee</p>
                <p className="text-xl font-black" style={{ color: 'var(--hf-lemon-strong)' }}>₹{doctor.consultation_fee}</p>
              </div>
              <Button onClick={handleBook}
                disabled={!bookingEnabled || !selectedSlot || mutation.isPending}
                className="rounded-2xl h-11 px-6 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
                {mutation.isPending ? 'Booking…' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        )}
    </AdaptiveOverlay>
  );
}

function AddDoctorDialog({ open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', specialty: 'General Physician', qualifications: '', experience_years: '',
    bio: '', consultation_fee: '', rating: 4.5, review_count: 0,
    languages: ['English'], is_available: true, available_slots: []
  });
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');

  const mut = useMutation({
    mutationFn: createTelehealthDoctor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telehealth-doctors'] });
      onClose();
      toast.success('Doctor added!');
    },
  });

  const addSlot = () => {
    if (slotDate && slotTime) {
      setForm(f => ({ ...f, available_slots: [...f.available_slots, { date: slotDate, time: slotTime, is_booked: false }] }));
      setSlotDate(''); setSlotTime('');
    }
  };

  return (
    <AdaptiveOverlay open={open} onOpenChange={onClose} title="Add Doctor" size="lg" showClose>
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-bold">Doctor Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. John Smith" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Specialty</Label>
              <Select value={form.specialty} onValueChange={v => setForm(f => ({ ...f, specialty: v }))}>
                <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SPECIALTIES.filter(s => s !== 'All').map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Experience (years)</Label>
              <Input type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: parseInt(e.target.value) }))} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Qualifications</Label>
              <Input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} placeholder="MBBS, MD" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Fee (₹)</Label>
              <Input type="number" value={form.consultation_fee} onChange={e => setForm(f => ({ ...f, consultation_fee: parseFloat(e.target.value) }))} className="h-10 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Bio</Label>
            <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} className="rounded-xl text-xs" />
          </div>

          {/* Add slots */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Available Slots</Label>
            <div className="flex gap-2">
              <Input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} className="h-9 rounded-xl text-xs flex-1" />
              <Input type="time" value={slotTime} onChange={e => setSlotTime(e.target.value)} className="h-9 rounded-xl text-xs w-24" />
              <Button type="button" onClick={addSlot} size="sm" className="h-9 rounded-xl px-3" style={{ background: '#d7f576', color: '#0a1200' }}>Add</Button>
            </div>
            {form.available_slots.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                <span style={{ color: 'var(--hf-text)' }}>{s.date} · {s.time}</span>
                <button onClick={() => setForm(f => ({ ...f, available_slots: f.available_slots.filter((_, j) => j !== i) }))}>
                  <X size={12} style={{ color: 'var(--hf-text-muted)' }} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="rounded-2xl h-10">Cancel</Button>
            <Button onClick={() => mut.mutate({ ...form, experience_years: parseInt(form.experience_years) || 0, consultation_fee: parseFloat(form.consultation_fee) || 0 })}
              disabled={!form.name || mut.isPending}
              className="rounded-2xl h-10 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
              {mut.isPending ? 'Adding…' : 'Add Doctor'}
            </Button>
          </div>
        </div>
    </AdaptiveOverlay>
  );
}

export default function Telehealth() {
  const { user, activeProfileId } = useActiveProfile();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [addDoctorOpen, setAddDoctorOpen] = useState(false);
  const [aptFilter, setAptFilter] = useState('upcoming');
  const qc = useQueryClient();

  const { data: dbDoctors = [] } = useQuery({
    queryKey: ['telehealth-doctors'],
    queryFn: listTelehealthDoctors,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['telehealth-appointments', user?.email],
    queryFn: () => listTelehealthAppointments(user?.email),
    enabled: !!user?.email,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['telehealth-docs', activeProfileId],
    queryFn: () => listDocuments(activeProfileId),
    enabled: !!activeProfileId,
  });

  const cancelApt = useMutation({
    mutationFn: cancelTelehealthAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telehealth-appointments', user?.email] });
      toast.success('Appointment cancelled');
    },
  });

  const allDoctors = dbDoctors;
  const filtered = allDoctors.filter(d => {
    const ms = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const msp = specialty === 'All' || d.specialty === specialty;
    return ms && msp;
  });

  const upcoming = appointments.filter(a => a.status !== 'cancelled' && isFuture(new Date(a.scheduled_at)));
  const past = appointments.filter(a => a.status === 'cancelled' || isPast(new Date(a.scheduled_at)));
  const bookingAvailability = getTelehealthBookingAvailability();
  const canBook = bookingAvailability.status === 'ready';

  const STATUS_STYLE = {
    confirmed: { bg: 'rgba(168,230,207,0.2)', color: 'var(--hf-mint-strong)' },
    completed: { bg: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' },
    cancelled:  { bg: 'rgba(242,140,140,0.15)', color: 'var(--hf-coral-strong)' },
    pending:    { bg: 'rgba(247,201,163,0.2)', color: 'var(--hf-peach-strong)' },
  };

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2">
          <Video className="w-5 h-5" style={{ color: 'var(--hf-lemon-strong)' }} /> Telehealth
        </h1>
        <p className="bento-subtitle">Consult certified doctors online</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { v: allDoctors.filter(d => d.is_available).length, label: 'Available', icon: '👨‍⚕️', color: 'var(--hf-mint-strong)', tc: '#003d20' },
          { v: upcoming.length, label: 'Upcoming', icon: '📅', color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
          { v: past.length, label: 'Past', icon: '✅', color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-xl font-black mt-0.5" style={{ color: s.tc }}>{s.v}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.tc }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {[['browse', '🔍 Browse'], ['appointments', `📅 My Appointments${upcoming.length ? ` (${upcoming.length})` : ''}`]].map(([key, lbl]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            style={{
              background: activeTab === key ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === key ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>{lbl}</button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors…" className="pl-8 rounded-xl text-xs h-10" />
            </div>
            {user?.role === 'admin' && (
              <Button onClick={() => setAddDoctorOpen(true)} size="sm" className="h-10 px-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                <Plus size={13} className="mr-1" /> Add
              </Button>
            )}
          </div>

          {!canBook && (
            <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--hf-border)', background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
              {bookingAvailability.reason}
            </div>
          )}

          {/* Specialty pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {SPECIALTIES.map(s => (
              <button key={s} onClick={() => setSpecialty(s)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-bold flex-shrink-0"
                style={{
                  background: specialty === s ? '#d7f576' : 'var(--hf-surface-2)',
                  color: specialty === s ? '#0a1200' : 'var(--hf-text-muted)',
                  border: '1px solid var(--hf-border)',
                }}>{s}</button>
            ))}
          </div>

          {/* Doctor list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">👨‍⚕️</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>
                {allDoctors.length === 0 ? 'No providers available yet' : 'No doctors found'}
              </p>
              {allDoctors.length === 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                  Provider data is not available from the backend yet.
                </p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map(doc => <DoctorCard key={doc.id} doctor={doc} onBook={setBookingDoctor} canBook={canBook} />)}
            </div>
          )}
        </div>
      )}

      {/* ── APPOINTMENTS TAB ── */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {/* Sub-filter */}
          <div className="flex gap-1.5">
            {[['upcoming', '⏳ Upcoming'], ['past', '🕐 Past']].map(([key, lbl]) => (
              <button key={key} onClick={() => setAptFilter(key)}
                className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{
                  background: aptFilter === key ? '#c9bbff' : 'var(--hf-surface-2)',
                  color: aptFilter === key ? '#1a0a40' : 'var(--hf-text-muted)',
                  border: '1px solid var(--hf-border)',
                }}>{lbl}</button>
            ))}
          </div>

          {(aptFilter === 'upcoming' ? upcoming : past).length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4 text-center">
              <div className="text-4xl">📅</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>
                {aptFilter === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
              </p>
              {aptFilter === 'upcoming' && (
                <Button onClick={() => setActiveTab('browse')} className="rounded-2xl h-9 text-xs px-6" style={{ background: '#d7f576', color: '#0a1200' }}>Browse Doctors</Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {(aptFilter === 'upcoming' ? upcoming : past).map(apt => {
                const ss = STATUS_STYLE[apt.status] || STATUS_STYLE.pending;
                return (
                  <div key={apt.id} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'rgba(201,187,255,0.15)' }}>👨‍⚕️</div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{apt.doctor_name}</p>
                          <p className="text-xs" style={{ color: 'var(--hf-lavender-strong)' }}>{apt.specialty}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Calendar size={10} style={{ color: 'var(--hf-text-muted)' }} />
                            <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(apt.scheduled_at), 'EEE, MMM d · h:mm a')}</span>
                          </div>
                          {apt.consultation_fee && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--hf-lemon-strong)' }}>₹{apt.consultation_fee}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: ss.bg, color: ss.color }}>
                          {apt.status}
                        </span>
                        {apt.meeting_url && apt.status === 'confirmed' && (
                          <a href={apt.meeting_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="rounded-xl h-7 text-[10px] px-3" style={{ background: '#d7f576', color: '#0a1200' }}>
                              <Video size={10} className="mr-1" /> Join
                            </Button>
                          </a>
                        )}
                        {apt.status === 'confirmed' && isFuture(new Date(apt.scheduled_at)) && (
                          <button onClick={() => cancelApt.mutate(apt.id)}
                            className="text-[9px]" style={{ color: 'var(--hf-coral-strong)' }}>Cancel</button>
                        )}
                      </div>
                    </div>
                    {apt.reason && (
                      <p className="text-xs mt-2 p-2 rounded-xl" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>{apt.reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking dialog */}
      {bookingDoctor && (
        <BookingDialog doctor={bookingDoctor} open={!!bookingDoctor} onClose={() => setBookingDoctor(null)}
          user={user} activeProfileId={activeProfileId} documents={documents} />
      )}

      {/* Add doctor dialog */}
      {user?.role === 'admin' && <AddDoctorDialog open={addDoctorOpen} onClose={() => setAddDoctorOpen(false)} />}
    </div>
  );
}
