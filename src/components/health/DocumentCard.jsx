import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Image, MoreVertical, Loader2, AlertCircle, CheckCircle, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { AdaptiveMenu } from '@/components/ui/adaptive-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DocumentCard({ document, compact = false, onView, onDelete, onReprocess }) {
  const getFileIcon = (fileType) => {
    if (fileType?.includes('image')) return <Image className="h-6 w-6 text-[var(--hf-lemon)]" />;
    if (fileType?.includes('pdf')) return <FileText className="h-6 w-6 text-[var(--hf-lemon)]" />;
    return <FileText className="h-6 w-6 text-[var(--hf-text-muted)]" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="border-none bg-sky-400/15 text-sky-200">
            Processing <Loader2 className="ml-1 h-3 w-3 animate-spin" />
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="border-none bg-[var(--hf-lemon-soft)] text-[var(--hf-lemon)]">
            Processed <CheckCircle className="ml-1 h-3 w-3" />
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="border-none bg-red-400/15 text-red-200">
            Failed <AlertCircle className="ml-1 h-3 w-3" />
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="border-none bg-white/8 text-[var(--hf-text-muted)]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="glass-card active-press overflow-hidden rounded-2xl border-white/10 transition-all hover:-translate-y-0.5 hover:border-[var(--hf-border-strong)] sm:rounded-3xl">
      <CardContent className="p-0">
        <div className="flex">
          <div className="flex-grow cursor-pointer" onClick={() => onView(document)}>
            <div
              className={cn(
                'flex items-center gap-2 p-3 sm:gap-3 sm:p-4',
                compact ? 'flex-row' : 'flex-col items-start'
              )}
            >
              <div className={compact ? 'flex min-w-0 flex-1 items-center gap-2 sm:gap-3' : 'mb-2 w-full sm:mb-3'}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--hf-border)] bg-[linear-gradient(180deg,rgba(200,240,49,0.18),rgba(200,240,49,0.08))] sm:h-12 sm:w-12 sm:rounded-2xl">
                  {getFileIcon(document.file_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-semibold text-[var(--hf-text)]', compact ? 'text-sm' : 'text-sm sm:text-base')}>
                    {document.title}
                  </p>
                  {!compact && document.facility_name && (
                    <p className="mt-0.5 truncate text-xs text-[var(--hf-text-muted)] sm:mt-1 sm:text-sm">
                      {document.facility_name}
                    </p>
                  )}
                </div>
              </div>
              <div className={cn('flex flex-col gap-1.5 sm:gap-2', compact ? 'flex-shrink-0 items-end' : 'w-full')}>
                <div className="flex flex-wrap gap-1.5">
                  {document.document_date && (
                    <Badge variant="outline" className="border-white/10 bg-white/6 text-xs text-[var(--hf-text-muted)]">
                      {format(new Date(document.document_date), compact ? 'MMM d' : 'MMM d, yyyy')}
                    </Badge>
                  )}
                  {!compact && document.document_type && (
                    <Badge
                      variant="outline"
                      className="border-white/10 bg-white/6 text-xs capitalize text-[var(--hf-text-muted)]"
                    >
                      {document.document_type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                {getStatusBadge(document.status)}
              </div>
            </div>
          </div>
          <AdaptiveMenu
            align="end"
            trigger={
              <Button variant="ghost" size="icon" className="glass-button m-2 h-10 w-10 flex-shrink-0 rounded-xl hover:bg-white/10 sm:h-12 sm:w-12">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
            items={[
              { label: 'View Details', icon: Eye, onClick: () => onView(document) },
              { label: 'Reprocess Document', icon: RefreshCw, onClick: () => onReprocess(document), hidden: document.status !== 'failed' || !onReprocess },
              { label: 'Delete', icon: Trash2, variant: 'destructive', onClick: () => onDelete(document), separator: true },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
