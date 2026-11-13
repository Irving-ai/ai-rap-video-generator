'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isTaskActive, queryJob, requestFingerprint, submitShot, taskFromJob } from '@/lib/workflow';
import type { LocalAssets, ShotRequest, ShotTask } from '@/lib/types';

export function useVideoWorkflow() {
  const [tasks, setTasks] = useState<Record<string, ShotTask>>({});
  const tasksRef = useRef(tasks);
  const submitting = useRef(false);
  const querying = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const update = useCallback((task: ShotTask) => {
    if (!mounted.current) return;
    tasksRef.current = { ...tasksRef.current, [task.shotId]: task };
    setTasks(tasksRef.current);
  }, []);

  const refresh = useCallback(async (shotId: string) => {
    const task = tasksRef.current[shotId];
    if (!task || querying.current.has(shotId)) return;
    querying.current.add(shotId);
    try {
      const job = await queryJob(task);
      if (tasksRef.current[shotId]?.requestId !== task.requestId) return;
      update(job ? taskFromJob(task, job) : {
        ...task,
        error: 'No matching task was found. Submission is still unconfirmed. Check again shortly.',
      });
    } catch {
      if (tasksRef.current[shotId]?.requestId === task.requestId) {
        update({ ...task, error: 'The status check was interrupted. The task is not marked as failed; you can check again.' });
      }
    } finally {
      querying.current.delete(shotId);
    }
  }, [update]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      Object.values(tasksRef.current).forEach((task) => {
        if (task.job && ['queued', 'processing'].includes(task.status)) void refresh(task.shotId);
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const submit = useCallback(async (input: ShotRequest, assets: LocalAssets) => {
    if (submitting.current || Object.values(tasksRef.current).some(isTaskActive)) return;
    submitting.current = true;
    const task: ShotTask = {
      shotId: input.shotId,
      requestId: crypto.randomUUID(),
      fingerprint: requestFingerprint(input, assets),
      status: 'submitting',
    };
    update(task);
    try {
      const response = await submitShot(input, assets, task.requestId);
      if (response.job) update(taskFromJob(task, response.job));
      else update({
        ...task,
        status: response.rejected ? 'failed' : 'unknown',
        retryable: Boolean(response.rejected),
        error: response.error,
      });
    } catch {
      update({ ...task, status: 'unknown', error: 'No valid submission response was received. Recover the task before submitting again.' });
    } finally {
      submitting.current = false;
    }
  }, [update]);

  const clear = useCallback(() => {
    if (Object.values(tasksRef.current).some(isTaskActive)) return;
    tasksRef.current = {};
    setTasks({});
  }, []);

  return { tasks, busy: Object.values(tasks).some(isTaskActive), submit, refresh, clear };
}
