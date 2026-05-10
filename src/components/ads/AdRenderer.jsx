/**
 * AdRenderer — displays a live ad by placement key.
 * Handles banner, video, and interstitial with skip timer, frequency cap (sessionStorage), and analytics events.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Volume2, VolumeX, ExternalLink } from 'lucide-react';

const CAP_PREFIX = 'ad_cap_';

function getTodayCap(adId) {
  const key = CAP_PREFIX + adId + '_' + new Date().toDateString();
  return parseInt(sessionStorage.getItem(key) || '0', 10);
}
function incCap(adId) {
  const key = CAP_PREFIX + adId + '_' + new Date().toDateString();
  sessionStorage.setItem(key, String(getTodayCap(adId) + 1));
}

async function fireEvent(adId, type) {
  const fieldMap = { impression: 'impressions', click: 'clicks', skip: 'skips' };
  const field = fieldMap[type];
  if (!field) return;
  try {
    const current = await base44.entities.Ad.filter({ id: adId });
    if (current.length) {
      const val = (current[0][field] || 0) + 1;
      await base44.entities.Ad.update(adId, { [field]: val });
    }
  } catch { /* non-critical */ }
}

function BannerAd({ ad, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fireEvent(ad.id, 'impression');
    incCap(ad.id);
  }, [ad.id]);

  if (!visible) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden w-full"
      style={{ border: '1px solid var(--hf-border)' }}>
      {ad.media_url && (
        <a href={ad.redirect_url || '#'} target="_blank" rel="noopener noreferrer"
          onClick={() => fireEvent(ad.id, 'click')}>
          <img src={ad.media_url} alt={ad.title}
            className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: 100 }} />
        </a>
      )}
      {!ad.media_url && (
        <a href={ad.redirect_url || '#'} target="_blank" rel="noopener noreferrer"
          onClick={() => fireEvent(ad.id, 'click')}
          className="flex items-center justify-center h-16 text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text)' }}>
          {ad.title} <ExternalLink size={11} className="ml-1.5" />
        </a>
      )}
      <button onClick={() => setVisible(false)}
        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)' }}>
        <X size={11} style={{ color: '#fff' }} />
      </button>
      <span className="absolute bottom-1 left-2 text-[8px] font-bold opacity-50" style={{ color: 'var(--hf-text)' }}>Sponsored</span>
    </div>
  );
}

function VideoAd({ ad, onClose }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [skipLeft, setSkipLeft] = useState(ad.skip_after_seconds || 5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    fireEvent(ad.id, 'impression');
    incCap(ad.id);
    const interval = setInterval(() => {
      setSkipLeft(s => {
        if (s <= 1) { clearInterval(interval); setCanSkip(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ad.id, ad.skip_after_seconds]);

  const handleSkip = () => { fireEvent(ad.id, 'skip'); onClose(); };
  const handleClick = () => { fireEvent(ad.id, 'click'); if (ad.redirect_url) window.open(ad.redirect_url, '_blank'); };

  return (
    <div className="relative rounded-2xl overflow-hidden w-full" style={{ background: '#000' }}>
      <video ref={videoRef} src={ad.media_url} autoPlay muted={muted} loop playsInline
        onClick={handleClick} className="w-full cursor-pointer" style={{ maxHeight: 220 }} />
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <button onClick={() => setMuted(m => !m)}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          {muted ? <VolumeX size={13} style={{ color: '#fff' }} /> : <Volume2 size={13} style={{ color: '#fff' }} />}
        </button>
        {canSkip ? (
          <button onClick={handleSkip}
            className="px-3 h-8 rounded-full text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
            Skip ›
          </button>
        ) : (
          <div className="px-3 h-8 rounded-full text-xs font-bold flex items-center"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
            Skip in {skipLeft}s
          </div>
        )}
      </div>
      <span className="absolute bottom-1 left-2 text-[8px] font-bold opacity-50" style={{ color: '#fff' }}>Sponsored</span>
    </div>
  );
}

function InterstitialAd({ ad, onClose }) {
  const [skipLeft, setSkipLeft] = useState(ad.skip_after_seconds || 5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    fireEvent(ad.id, 'impression');
    incCap(ad.id);
    const interval = setInterval(() => {
      setSkipLeft(s => {
        if (s <= 1) { clearInterval(interval); setCanSkip(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ad.id, ad.skip_after_seconds]);

  const handleSkip = () => { fireEvent(ad.id, 'skip'); onClose(); };
  const handleContinue = () => { fireEvent(ad.id, 'click'); if (ad.redirect_url) window.open(ad.redirect_url, '_blank'); onClose(); };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="relative rounded-[28px] overflow-hidden w-full max-w-sm"
        style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        {ad.media_url ? (
          <img src={ad.media_url} alt={ad.title} className="w-full object-cover" style={{ maxHeight: 320 }} />
        ) : (
          <div className="w-full h-48 flex items-center justify-center text-xl font-black"
            style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text)' }}>
            {ad.title}
          </div>
        )}
        <div className="p-4 space-y-3">
          <p className="text-sm font-black text-center" style={{ color: 'var(--hf-text)' }}>{ad.title}</p>
          <div className="flex gap-3">
            {canSkip ? (
              <button onClick={handleSkip}
                className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                Skip
              </button>
            ) : (
              <div className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center"
                style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
                Skip in {skipLeft}s
              </div>
            )}
            {ad.redirect_url && (
              <button onClick={handleContinue}
                className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ background: '#d7f576', color: '#0a1200' }}>
                Continue →
              </button>
            )}
          </div>
        </div>
        <span className="absolute top-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>Sponsored</span>
      </div>
    </div>
  );
}

export default function AdRenderer({ placement }) {
  const [dismissed, setDismissed] = useState(false);

  const { data: ads = [] } = useQuery({
    queryKey: ['active-ads', placement],
    queryFn: () => base44.entities.Ad.filter({ placement, is_active: true }),
    staleTime: 60000,
  });

  const now = Date.now();
  const eligibleAd = ads.find(ad => {
    if (!ad.is_active) return false;
    if (ad.schedule_start && new Date(ad.schedule_start).getTime() > now) return false;
    if (ad.schedule_end && new Date(ad.schedule_end).getTime() < now) return false;
    const cap = ad.frequency_cap_daily || 3;
    if (getTodayCap(ad.id) >= cap) return false;
    return true;
  });

  if (!eligibleAd || dismissed) return null;

  const handleClose = () => setDismissed(true);

  if (eligibleAd.ad_type === 'banner') return <BannerAd ad={eligibleAd} onClose={handleClose} />;
  if (eligibleAd.ad_type === 'video') return <VideoAd ad={eligibleAd} onClose={handleClose} />;
  if (eligibleAd.ad_type === 'interstitial') return <InterstitialAd ad={eligibleAd} onClose={handleClose} />;
  return null;
}