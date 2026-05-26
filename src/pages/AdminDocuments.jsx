import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { FileText, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';

export default function AdminDocuments() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin-documents-full'],
    queryFn: () => base44.entities.MedicalDocument.list('-created_date', 500),
  });

  const filtered = documents.filter(d => {
    const matchSearch = !search ||
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.created_by?.toLowerCase().includes(search.toLowerCase()) ||
      d.facility_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.document_type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const statusColor = (s) => {
    if (s === 'completed') return { bg: '#d7f576', text: '#0a1200' };
    if (s === 'processing') return { bg: '#f7c9a3', text: '#3d1a00' };
    if (s === 'failed') return { bg: '#f28c8c', text: '#3d0000' };
    return { bg: 'var(--hf-surface-2)', text: 'var(--hf-text-muted)' };
  };

  return (
    <AdminLayout currentPageName="AdminDocuments">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Documents</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{documents.length} total documents</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
            <Input
              placeholder="Search by title or owner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 w-40 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {['lab_report','prescription','imaging','discharge_summary','consultation','vaccination','insurance','other'].map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10 w-40 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hf-border)' }}>
                  {['Title', 'Type', 'Owner', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>No documents found</td></tr>
                ) : filtered.map(doc => {
                  const sc = statusColor(doc.status);
                  return (
                    <tr key={doc.id} className="cursor-pointer hover:bg-white/3 transition-colors" style={{ borderBottom: '1px solid var(--hf-border)' }}
                      onClick={() => setSelectedDoc(doc)}>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>
                        <div className="flex items-center gap-2">
                          <FileText size={14} style={{ color: 'var(--hf-text-muted)' }} />
                          <span className="truncate max-w-[160px]">{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--hf-text-muted)' }}>{doc.document_type?.replace(/_/g,' ') || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{doc.created_by || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize" style={{ background: sc.bg, color: sc.text }}>{doc.status || 'pending'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdaptiveOverlay
        open={!!selectedDoc}
        onOpenChange={v => { if (!v) setSelectedDoc(null); }}
        title={selectedDoc?.title || 'Document Detail'}
        size="md"
        showClose
      >
        {selectedDoc && (
          <div className="space-y-3 text-sm">
            {[
              ['Type', selectedDoc.document_type?.replace(/_/g,' ')],
              ['Owner', selectedDoc.created_by],
              ['Status', selectedDoc.status],
              ['Facility', selectedDoc.facility_name],
              ['Doctor', selectedDoc.doctor_name],
              ['Date', selectedDoc.document_date],
              ['Created', selectedDoc.created_date ? format(new Date(selectedDoc.created_date), 'PPP') : '—'],
              ['Health Score', selectedDoc.health_score],
            ].map(([label, val]) => val ? (
              <div key={label} className="flex justify-between">
                <span style={{ color: 'var(--hf-text-muted)' }}>{label}</span>
                <span className="font-semibold capitalize" style={{ color: 'var(--hf-text)' }}>{val}</span>
              </div>
            ) : null)}
            {selectedDoc.ai_summary && (
              <div className="mt-4 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-text-muted)' }}>AI Summary</p>
                <p className="text-xs" style={{ color: 'var(--hf-text)' }}>{selectedDoc.ai_summary}</p>
              </div>
            )}
          </div>
        )}
      </AdaptiveOverlay>
    </AdminLayout>
  );
}