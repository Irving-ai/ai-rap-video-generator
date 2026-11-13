'use client';

import { useEffect, useState } from 'react';
import { createPlan } from '@/lib/planner';
import { DEFAULT_CONFIG } from '@/lib/templates';
import { isCreativeConfig, isCreativePlan, parseDraft } from '@/lib/validation';
import type { CreativeConfig, CreativePlan } from '@/lib/types';

const STORAGE_KEY = 'rap-video-workflow.draft.v1';

export function useLocalDraft() {
  const [config, setConfig] = useState<CreativeConfig>({ ...DEFAULT_CONFIG });
  const [plan, setPlan] = useState<CreativePlan>(() => createPlan(DEFAULT_CONFIG));
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Loading saved draft');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && raw.length < 150000) {
        const draft = parseDraft(JSON.parse(raw));
        if (draft) {
          setConfig(draft.config);
          setPlan(draft.plan);
        }
      }
    } catch {
      setSaveStatus('Browser storage is unavailable. Export your plan to save it.');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isCreativeConfig(config) || !isCreativePlan(plan)) {
      setSaveStatus('Complete the required fields to save your draft');
      return;
    }
    setSaveStatus('Saving draft');
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, config, plan }));
        setSaveStatus('Draft text saved in this browser');
      } catch {
        setSaveStatus('Unable to save locally. Export your plan to keep a copy.');
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [config, plan, ready]);

  return { config, setConfig, plan, setPlan, ready, saveStatus };
}
