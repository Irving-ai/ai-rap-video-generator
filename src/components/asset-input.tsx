'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './studio.module.css';

interface AssetInputProps {
  kind: 'portrait' | 'audio';
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}

export function AssetInput({ kind, file, disabled, onChange }: AssetInputProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const portrait = kind === 'portrait';

  useEffect(() => {
    if (!file) {
      setUrl(null);
      if (input.current) input.current.value = '';
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function select(next: File | undefined) {
    if (!next) return;
    const allowed = portrait
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a'];
    if (!allowed.includes(next.type) || next.size > (portrait ? 5 : 15) * 1024 * 1024) {
      setError(portrait ? 'Choose a JPG, PNG, or WebP file no larger than 5 MB.' : 'Choose an MP3, WAV, or M4A file no larger than 15 MB.');
      if (input.current) input.current.value = '';
      return;
    }
    setError('');
    onChange(next);
  }

  return (
    <div className={styles.asset}>
      <div className={styles.assetTop}>
        <span className={styles.label}>{portrait ? 'Portrait reference' : 'Rap audio'} <small>Optional</small></span>
        {file && <button className={styles.textButton} disabled={disabled} onClick={() => {
          onChange(null); setError(''); if (input.current) input.current.value = '';
        }} type="button">Remove</button>}
      </div>
      <input
        ref={input}
        className={styles.fileInput}
        id={`asset-${kind}`}
        type="file"
        disabled={disabled}
        accept={portrait ? 'image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a'}
        onChange={(event) => select(event.target.files?.[0])}
      />
      {!file ? (
        <label htmlFor={`asset-${kind}`} className={styles.upload} aria-disabled={disabled}>
          <span className={styles.uploadIcon} aria-hidden="true">{portrait ? '+' : '♪'}</span>
          <span>{portrait ? 'Choose a portrait' : 'Choose rap audio'}<small>{portrait ? 'JPG / PNG / WebP · 5 MB' : 'MP3 / WAV / M4A · 15 MB'}</small></span>
          <span aria-hidden="true">↗</span>
        </label>
      ) : (
        <div className={styles.assetPreview}>
          {portrait && url && <img src={url} alt="Local portrait preview" className={styles.portrait} />}
          <span className={styles.filename}>{file.name}</span>
          {!portrait && url && <audio src={url} controls preload="metadata" aria-label="Local rap audio preview" />}
        </div>
      )}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );
}
