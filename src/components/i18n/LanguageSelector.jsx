/**
 * LanguageSelector — compact dropdown to switch app language.
 * Drop into AccountHub or Settings page.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = [
  { code: 'en',       label: 'English' },
  { code: 'te',       label: 'తెలుగు (Telugu)' },
  { code: 'hi',       label: 'हिंदी (Hindi)' },
  { code: 'tinglish', label: 'Tinglish' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('hf_lang', lang);
  };

  return (
    <Select value={i18n.language} onValueChange={handleChange}>
      <SelectTrigger className="w-48 rounded-xl h-10 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map(l => (
          <SelectItem key={l.code} value={l.code} className="text-sm">{l.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}