import { BRIEF_LABELS } from '@/lib/export';
import type { CreativeBrief } from '@/lib/types';
import styles from './studio.module.css';

export function BriefEditor({ brief, disabled, onChange }: {
  brief: CreativeBrief;
  disabled: boolean;
  onChange: (brief: CreativeBrief) => void;
}) {
  return (
    <fieldset disabled={disabled} className={styles.briefGrid}>
      {(Object.keys(BRIEF_LABELS) as (keyof CreativeBrief)[]).map((key) => (
        <label key={key} className={`${styles.field} ${key === 'concept' ? styles.fullWidth : ''}`}>
          <span>{BRIEF_LABELS[key]}</span>
          <textarea
            value={brief[key]}
            rows={key === 'concept' ? 3 : 4}
            maxLength={1600}
            onChange={(event) => onChange({ ...brief, [key]: event.target.value })}
          />
        </label>
      ))}
    </fieldset>
  );
}
