import type { Shot, StyleId } from '@/lib/types';
import styles from './studio.module.css';

export function ShotEditor({ shot, index, styleId, disabled, onChange }: {
  shot: Shot;
  index: number;
  styleId: StyleId;
  disabled: boolean;
  onChange: (shot: Shot) => void;
}) {
  return (
    <div className={styles.shotEditor}>
      <div className={`${styles.shotSlate} ${styles[styleId]}`}>
        <div className={styles.slateTop}><span>SHOT / {String(index + 1).padStart(2, '0')}</span><span>{shot.durationSeconds} SEC</span></div>
        <div className={styles.slateGraphic} aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className={styles.slateBottom}><span>{shot.title}</span><small>Shot concept · Not a generated frame</small></div>
      </div>
      <fieldset disabled={disabled} className={styles.shotFields}>
        <div className={styles.shotTitleRow}>
          <label className={styles.field}><span>Shot name</span><input value={shot.title} maxLength={80} onChange={(e) => onChange({ ...shot, title: e.target.value })} /></label>
          <label className={styles.field}><span>Seconds</span><input type="number" min={1} max={20} step={1} value={shot.durationSeconds} onChange={(e) => onChange({ ...shot, durationSeconds: Math.max(1, Math.min(20, Math.round(Number(e.target.value) || 1))) })} /></label>
        </div>
        <label className={styles.field}><span>Purpose</span><textarea rows={2} maxLength={1600} value={shot.purpose} onChange={(e) => onChange({ ...shot, purpose: e.target.value })} /></label>
        <label className={styles.field}><span>Action</span><textarea rows={3} maxLength={1600} value={shot.action} onChange={(e) => onChange({ ...shot, action: e.target.value })} /></label>
        <label className={styles.field}><span>Framing and camera</span><textarea rows={3} maxLength={1600} value={shot.camera} onChange={(e) => onChange({ ...shot, camera: e.target.value })} /></label>
      </fieldset>
    </div>
  );
}
