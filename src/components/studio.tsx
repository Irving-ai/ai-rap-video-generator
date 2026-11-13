'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { exportPlan } from '@/lib/export';
import { createPlan, shotOffset, totalDuration } from '@/lib/planner';
import { buildPrompt, buildShotRequest } from '@/lib/prompt-builder';
import { DEFAULT_CONFIG, ENERGY_OPTIONS, getStyle, STYLE_TEMPLATES } from '@/lib/templates';
import { isCreativeConfig, isCreativePlan } from '@/lib/validation';
import { isTaskActive, requestFingerprint } from '@/lib/workflow';
import type { CreativeConfig, LocalAssets, ProviderStatus, Shot, TaskStatus } from '@/lib/types';
import { AssetInput } from './asset-input';
import { BriefEditor } from './brief-editor';
import { ShotEditor } from './shot-editor';
import { useLocalDraft } from './use-local-draft';
import { useVideoWorkflow } from './use-video-workflow';
import styles from './studio.module.css';

const TABS = [
  { id: 'brief', name: 'Creative brief', number: '01' },
  { id: 'shots', name: 'Shot editor', number: '02' },
  { id: 'prompt', name: 'Prompts', number: '03' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TASK_LABELS: Record<TaskStatus, string> = {
  submitting: 'Submitting', queued: 'Queued', processing: 'Generating',
  succeeded: 'Generation complete', failed: 'Generation failed', unknown: 'Submission unconfirmed',
};

export function Studio() {
  const { config, setConfig, plan, setPlan, ready, saveStatus } = useLocalDraft();
  const workflow = useVideoWorkflow();
  const [tab, setTab] = useState<TabId>('shots');
  const [selectedId, setSelectedId] = useState('shot-01');
  const [assets, setAssets] = useState<LocalAssets>({ portrait: null, audio: null, audioStartSeconds: 0 });
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [providerError, setProviderError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    fetch('/api/video/config', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Configuration unavailable');
        const value = await response.json() as ProviderStatus;
        if (current) setProvider(value);
      })
      .catch(() => { if (current) setProviderError('Unable to load video API configuration'); })
      .finally(() => window.clearTimeout(timeout));
    return () => { current = false; controller.abort(); window.clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const selectedIndex = Math.max(0, plan.shots.findIndex((shot) => shot.id === selectedId));
  const shot = plan.shots[selectedIndex];
  const context = useMemo(() => ({
    useIdentityReference: Boolean(assets.portrait),
    useAudioReference: Boolean(assets.audio && provider?.configured && provider.capabilities.audioReference),
  }), [assets.portrait, assets.audio, provider]);
  const prompt = buildPrompt(plan, shot, context);
  const request = buildShotRequest(plan, shot, context, assets.audioStartSeconds);
  const fingerprint = requestFingerprint(request, assets);
  const task = workflow.tasks[shot.id];
  const staleResult = Boolean(task && task.fingerprint !== fingerprint);
  const pendingConfig = JSON.stringify(config) !== JSON.stringify(plan.config);
  const validPlan = isCreativePlan(plan);
  const locked = !ready || workflow.busy;
  const duration = totalDuration(plan);

  function updateConfig<K extends keyof CreativeConfig>(key: K, value: CreativeConfig[K]) {
    setConfig((previous) => ({ ...previous, [key]: value }));
  }

  function updateShot(next: Shot) {
    setPlan((previous) => ({ ...previous, shots: previous.shots.map((item) => item.id === next.id ? next : item) }));
  }

  function generatePlan() {
    if (locked || !isCreativeConfig(config)) { setNotice('Enter a theme and performer description.'); return; }
    setPlan(createPlan(config));
    setSelectedId('shot-01');
    workflow.clear();
    setTab('brief');
    setNotice('The brief and shots have been rebuilt using the current settings.');
  }

  function loadExample() {
    if (locked) return;
    setConfig({ ...DEFAULT_CONFIG });
    setPlan(createPlan(DEFAULT_CONFIG));
    setSelectedId('shot-01');
    setAssets({ portrait: null, audio: null, audioStartSeconds: 0 });
    workflow.clear();
    setNotice('The rainy street example is loaded.');
  }

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  }

  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); }
    catch { setNotice('Clipboard access is unavailable. Select the prompt text and copy it manually.'); }
  }

  const generationBlock = !provider?.configured
    ? providerError || 'Connect your video API to generate individual shots.'
    : pendingConfig ? 'Apply the updated creative settings first.'
      : !validPlan ? 'Complete the creative brief and shot details.'
        : assets.portrait && !provider.capabilities.identityReference ? 'Portrait references are not enabled for this model. Use a compatible configuration or remove the photo.'
          : assets.audio && !provider.capabilities.audioReference ? 'Audio references are not enabled for this model. Use a compatible configuration or remove the audio.'
            : !provider.capabilities.aspectRatios.includes(plan.config.aspectRatio) ? 'This model does not support the selected aspect ratio.'
              : !provider.capabilities.durationsSeconds.includes(shot.durationSeconds) ? 'This model does not support the selected shot duration.'
                : '';

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <a href="#main" className={styles.brand} aria-label="AI Rap Video Generator workspace">
          <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /><i /></span>
          <span>AI RAP VIDEO<span className={styles.brandSub}>GENERATOR / CREATIVE WORKSPACE</span></span>
        </a>
        <span className={styles.headerNote}>FROM A VERSE TO A VISION</span>
        <span className={`${styles.providerBadge} ${provider?.configured ? styles.connected : ''}`}>
          <i aria-hidden="true" />{provider?.message ?? (providerError || 'Loading API configuration')}
        </span>
      </header>

      <main id="main" className={styles.main}>
        <section className={styles.hero} aria-labelledby="page-title">
          <div><p className={styles.eyebrow}>THE DIRECTOR’S DESK / YOUR CREATIVE WORKSPACE</p>
            <h1 id="page-title">Set the tone.<br /><span>Build the scene.</span></h1>
            <p className={styles.heroDescription}>Turn an idea into a rap video plan.<br />Shape the concept, shots, and prompts.</p>
          </div>
          <div className={styles.heroAside} aria-hidden="true"><span>IDEA</span><i>↘</i><span>FRAME</span><i>↘</i><span className={styles.heroAccent}>MOTION.</span></div>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.sidebar} aria-label="Creative inputs">
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>INPUT / 01</span><h2>Start with an idea</h2></div><button type="button" className={styles.textButton} disabled={locked} onClick={loadExample}>Load example ↗</button></div>
            <fieldset disabled={locked} className={styles.configFields}>
              <label className={styles.field}><span>Theme <small>Required</small></span><textarea rows={4} maxLength={1200} value={config.theme} onChange={(e) => updateConfig('theme', e.target.value)} placeholder="What should viewers remember?" /></label>
              <label className={styles.field}><span>Lyrics <small>Optional</small></span><textarea rows={2} maxLength={2400} value={config.lyrics} onChange={(e) => updateConfig('lyrics', e.target.value)} placeholder="Add context for your visual direction" /></label>
              <label className={styles.field}><span>Performer description</span><textarea rows={2} maxLength={600} value={config.performer} onChange={(e) => updateConfig('performer', e.target.value)} /></label>
              <div className={styles.field}>
                <span id="style-label">Visual style</span>
                <div className={styles.styleChoices} role="group" aria-labelledby="style-label">
                  {STYLE_TEMPLATES.map((style, index) => <button key={style.id} type="button" aria-pressed={config.styleId === style.id} className={`${styles.styleChoice} ${config.styleId === style.id ? styles.activeStyle : ''}`} onClick={() => updateConfig('styleId', style.id)}>
                    <span className={`${styles.styleSwatch} ${styles[style.id]}`} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span><strong>{style.name}</strong><small>{style.description}</small></span>
                    <span className={styles.radioDot} aria-hidden="true" />
                  </button>)}
                </div>
              </div>
              <div className={styles.configRow}>
                <label className={styles.field}><span>Length</span><select value={config.durationSeconds} onChange={(e) => updateConfig('durationSeconds', Number(e.target.value) as CreativeConfig['durationSeconds'])}><option value={15}>15 s</option><option value={30}>30 s</option><option value={45}>45 s</option></select></label>
                <label className={styles.field}><span>Aspect ratio</span><select value={config.aspectRatio} onChange={(e) => updateConfig('aspectRatio', e.target.value as CreativeConfig['aspectRatio'])}><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="1:1">1:1</option></select></label>
                <label className={styles.field}><span>Energy</span><select value={config.energy} onChange={(e) => updateConfig('energy', e.target.value as CreativeConfig['energy'])}>{ENERGY_OPTIONS.map((energy) => <option key={energy.id} value={energy.id}>{energy.name}</option>)}</select></label>
              </div>
            </fieldset>
            <div className={styles.assets}>
              <AssetInput kind="portrait" file={assets.portrait} disabled={locked} onChange={(portrait) => setAssets((previous) => ({ ...previous, portrait }))} />
              <AssetInput kind="audio" file={assets.audio} disabled={locked} onChange={(audio) => setAssets((previous) => ({ ...previous, audio, audioStartSeconds: 0 }))} />
              {assets.audio && <label className={styles.field}><span>Audio start / seconds</span><input type="number" min={0} max={86000} step={0.1} disabled={locked} value={assets.audioStartSeconds} onChange={(e) => setAssets((previous) => ({ ...previous, audioStartSeconds: Math.max(0, Math.min(86000, Number(e.target.value) || 0)) }))} /></label>}
              <p className={styles.helper}>Files are previewed locally and sent to the configured service only when you generate a shot. Select them again after refreshing the page.</p>
            </div>
            <button type="button" className={styles.primaryButton} disabled={locked || !isCreativeConfig(config)} onClick={generatePlan}>Build creative plan <span aria-hidden="true">↗</span></button>
            <p className={styles.helper}>Built from editable templates and rules. Rebuilding replaces the current brief and shots.</p>
          </aside>

          <section className={styles.board} aria-label="Creative plan">
            <div className={styles.boardHeading}>
              <div><p className={styles.eyebrow}>YOUR TREATMENT / 02</p><h2>Your idea, shot by shot</h2></div>
              <span className={styles.planTag}>{getStyle(plan.config.styleId).englishName}</span>
            </div>
            <div className={styles.stats}><span><b>{String(plan.shots.length).padStart(2, '0')}</b> shots</span><span><b>{duration}</b> s</span><span><b>{plan.config.aspectRatio}</b> Aspect ratio</span><span className={styles.saveStatus}>{saveStatus}</span></div>
            {pendingConfig && <div className={styles.inlineNotice}>Your creative settings have changed. Select “Build creative plan” to apply them. The previous plan is still shown below.</div>}
            <div className={styles.tabs} role="tablist" aria-label="Creative workflow steps">
              {TABS.map((item, index) => <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onKeyDown={(event) => tabKey(event, index)} onClick={() => setTab(item.id)} className={tab === item.id ? styles.activeTab : ''}><small>{item.number}</small>{item.name}</button>)}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={styles.tabPanel}>
              {tab === 'brief' ? <>
                <div className={styles.panelIntro}><h3>One direction for every shot.</h3><p>These settings are included in every prompt and update as you edit.</p></div>
                <BriefEditor brief={plan.brief} disabled={locked} onChange={(brief) => setPlan((previous) => ({ ...previous, brief }))} />
              </> : <>
                <div className={styles.shotStrip} aria-label="Choose a shot">{plan.shots.map((item, index) => <button key={item.id} type="button" aria-pressed={item.id === shot.id} onClick={() => { setSelectedId(item.id); setCopied(false); }} className={item.id === shot.id ? styles.selectedShot : ''}>
                  <span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title || 'Untitled shot'}</strong><small>{shotOffset(plan, item.id)}–{shotOffset(plan, item.id) + item.durationSeconds}s</small>
                </button>)}</div>
                {tab === 'shots' ? <ShotEditor shot={shot} index={selectedIndex} styleId={plan.config.styleId} disabled={locked} onChange={updateShot} /> : <>
                  <div className={styles.promptHeading}><div><h3>Shot {String(selectedIndex + 1).padStart(2, '0')} / {shot.title}</h3><p>Shared settings and shot directions, combined as you edit.</p></div><button type="button" className={styles.secondaryButton} onClick={() => void copyPrompt()}>{copied ? 'Copied ✓' : 'Copy prompt'}</button></div>
                  <textarea className={styles.promptText} value={prompt} readOnly spellCheck={false} aria-label="Complete generation prompt" />
                  <div className={styles.promptMeta}><span>{plan.config.aspectRatio}</span><span>Target: {shot.durationSeconds}s</span><span>{context.useIdentityReference ? 'Portrait reference included' : 'Text-based character description'}</span><span>{context.useAudioReference ? `Audio starts at ${request.audioStartSeconds}s` : 'No audio-reference instructions'}</span></div>
                  <p className={styles.helper}>Duration and aspect ratio are passed as API parameters. Audio-reference instructions require a configured model that supports them.</p>
                </>}
              </>}
            </div>

            <div className={styles.generation}>
              <div className={styles.generationTop}><div><span className={styles.eyebrow}>VIDEO / SHOT {String(selectedIndex + 1).padStart(2, '0')}</span><h3>{task ? TASK_LABELS[task.status] : 'Ready when you are.'}</h3></div>
                <button type="button" className={styles.darkButton} disabled={Boolean(generationBlock) || locked || (task?.status === 'succeeded' && !staleResult)} onClick={() => void workflow.submit(request, assets)}>
                  {task?.status === 'failed' ? 'Retry shot' : task?.status === 'succeeded' && !staleResult ? 'Shot generated' : 'Generate shot'} <span aria-hidden="true">↗</span>
                </button>
              </div>
              <p className={styles.helper}>{generationBlock || (workflow.busy ? 'A task is active, so creative settings are locked. Keep this page open.' : 'Generate one representative shot to confirm the direction, then continue with the others.')}</p>
              {task && <div className={styles.taskDetails}>
                {staleResult && <p className={styles.inlineNotice}>The settings have changed. The task below belongs to an earlier version of this shot.</p>}
                {task.error && <p className={styles.error} role="status">{task.error}</p>}
                {isTaskActive(task) && task.status !== 'submitting' && <button type="button" className={styles.secondaryButton} onClick={() => void workflow.refresh(shot.id)}>{task.status === 'unknown' ? 'Recover submission' : 'Refresh status'}</button>}
                <details className={styles.taskReference}><summary>Task identifiers</summary><code>Request: {task.requestId}</code>{task.job && <code>Task: {task.job.id}</code>}</details>
                {task.job?.status === 'succeeded' && task.job.videoUrl && <div className={styles.videoResult}><video controls playsInline preload="metadata" src={task.job.videoUrl} aria-label={`${shot.title} — generated video`} /><a href={task.job.videoUrl} target="_blank" rel="noreferrer">Open original video ↗</a></div>}
              </div>}
            </div>

            <footer className={styles.boardFooter}><div><strong>Keep your creative direction.</strong><p>Export the brief, shot plan, and prompts.</p></div><div className={styles.exportButtons}><button type="button" className={styles.secondaryButton} disabled={!ready || !validPlan} onClick={() => exportPlan(plan, context, assets, 'markdown')}>Export Markdown ↓</button><button type="button" className={styles.secondaryButton} disabled={!ready || !validPlan} onClick={() => exportPlan(plan, context, assets, 'json')}>JSON ↓</button></div></footer>
            <p className={styles.announcement} aria-live="polite">{notice}</p>
          </section>
        </div>
        <footer className={styles.pageFooter}><span>AI RAP VIDEO GENERATOR</span><span>Your vision, one shot at a time.</span><span>IDEA → FRAME → MOTION</span></footer>
      </main>
    </div>
  );
}
