import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Sparkles, X, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function DocumentSearchBar({ profileId, onResultClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery) => {
      if (!profileId) throw new Error('No profile selected for search.');

      const { data } = await base44.functions.invoke('aiDocumentSearch', {
        profile_id: profileId,
        query: searchQuery,
      });
      return data.results;
    },
    onSuccess: (data) => {
      setResults(data);
      setShowResults(true);
    },
    onError: (error) => {
      console.error('AI Document Search failed:', error);
      setResults([]);
      setShowResults(true);
    },
  });

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query);
      return;
    }

    setResults([]);
    setShowResults(false);
  };

  const handleResultClick = (doc) => {
    onResultClick(doc);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative mb-4 sm:mb-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hf-lemon)]" />
          <Input
            placeholder="Smart search documents..."
            className="glass-input h-11 rounded-2xl border-white/10 pl-10 text-sm focus-visible:ring-[var(--hf-lemon)] sm:h-12"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="lemon-button h-11 rounded-2xl px-4 sm:h-12 sm:px-6"
        >
          {searchMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </Button>
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="glass-button h-10 w-10 rounded-2xl text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] sm:h-11 sm:w-11"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="glass-panel-strong absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border-white/10 sm:rounded-3xl">
          <CardContent className="p-0">
            <ScrollArea className="max-h-64 sm:max-h-72">
              {results.map((doc) => (
                <div
                  key={doc.id}
                  className="active-press flex cursor-pointer items-center gap-2 border-b border-white/6 p-3 hover:bg-white/8 last:border-b-0 sm:gap-3 sm:p-4"
                  onClick={() => handleResultClick(doc)}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--hf-border)] bg-[linear-gradient(180deg,rgba(200,240,49,0.18),rgba(200,240,49,0.08))]">
                    <FileText className="h-5 w-5 text-[var(--hf-lemon)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--hf-text)]">{doc.title}</p>
                    <p className="truncate text-xs text-[var(--hf-text-muted)]">
                      {doc.ai_summary ? `${doc.ai_summary.substring(0, 50)}...` : doc.facility_name || 'No details'}
                    </p>
                  </div>
                  {doc.document_date && (
                    <span className="hidden flex-shrink-0 text-xs text-[var(--hf-text-muted)] sm:block">
                      {format(new Date(doc.document_date), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {showResults && results.length === 0 && !searchMutation.isPending && query && (
        <Card className="glass-panel-strong absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border-white/10 p-3 text-center text-sm text-[var(--hf-text-muted)] animate-fade-in sm:p-4">
          No documents found
        </Card>
      )}
    </div>
  );
}
