"use client";
import { useEffect, useState } from 'react';
import { warmTinyBert } from '../tinybert-client';

/** Preparation reflects actual asset caching; ordinary keyword chat stays available. */
export default function OfflineLanguageStatus({offline}:{offline:boolean}) {
  const [ready,setReady]=useState<boolean|null>(null);
  const [preparing,setPreparing]=useState(false);
  useEffect(()=>{
    let active=true, warmed=false;
    const sync=()=>{
      const saved=document.documentElement.dataset.offlineAiReady==='true';
      setReady(saved);setPreparing(document.documentElement.dataset.offlineAiPreparing==='true');
      if ((saved || process.env.NODE_ENV==='development') && !warmed) {
        warmed=true;
        warmTinyBert().catch(()=>{warmed=false;});
      }
    };
    sync();
    if ('caches' in window) caches.match('/offline-ai.json').then(response=>{
      if (active && response?.headers.get('X-WattSnap-Offline-AI')) {
        document.documentElement.dataset.offlineAiReady='true';sync();
      }
    }).catch(()=>{});
    window.addEventListener('wattsnap-offline-ready',sync);
    return()=>{active=false;window.removeEventListener('wattsnap-offline-ready',sync);};
  },[]);
  if (ready!==false || (process.env.NODE_ENV==='development' && !offline)) return null;
  return <p className="chat-offline-status" role="status">{offline ? 'Basic offline chat is available. Reconnect to save support for more ways of asking questions.' : preparing ? 'Saving language support for offline questions. You can keep chatting.' : 'Basic local chat is available. Offline language support will save when the connection is ready.'}</p>;
}
