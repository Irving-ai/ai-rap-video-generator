import { getEnergy, getStyle } from './templates';
import type { CreativeConfig, CreativePlan, Shot } from './types';

const SHOT_PATTERNS: Omit<Shot, 'id' | 'durationSeconds'>[] = [
  {
    title: 'Establish the performer',
    purpose: 'Introduce the performer and setting, leaving room for the mood to develop.',
    action: 'The performer stands in partial shadow, slowly raises their head and looks toward the camera.',
    camera: 'A stable waist-up frontal composition. Hold the camera still.',
  },
  {
    title: 'Begin the performance',
    purpose: 'Focus attention on the performance and the attitude behind it.',
    action: 'The performer faces the camera with natural upper-body gestures. Keep the face clearly visible.',
    camera: 'Slowly push from a waist-up framing to a chest-up framing in one continuous movement.',
  },
  {
    title: 'Change the angle',
    purpose: 'Change the viewing angle while maintaining continuity of the performer and setting.',
    action: 'The performer continues the performance from a three-quarter angle, keeping their face unobstructed.',
    camera: 'A steady three-quarter medium shot. No orbit or sudden reframing.',
  },
  {
    title: 'Show the setting',
    purpose: 'Bring the setting into view and give the performance room to breathe.',
    action: 'The performer holds a grounded stance in the same setting, with subtle hand movement.',
    camera: 'A wide full-body shot with a slow, controlled lateral slide.',
  },
  {
    title: 'Focus on the details',
    purpose: 'Add visual variety through wardrobe details and a natural hand gesture.',
    action: 'Show a brief natural gesture near the jacket, keeping the same wardrobe and lighting.',
    camera: 'A static detail shot of the upper torso and hands. No face close-up.',
  },
  {
    title: 'Return to the performer',
    purpose: 'Return to the performer and bring the emotion back into focus.',
    action: 'The performer returns to direct eye contact with the camera and a controlled, assured gesture.',
    camera: 'An eye-level medium close-up, steady and centered.',
  },
  {
    title: 'Widen the frame',
    purpose: 'Use a wider frame to build toward the ending.',
    action: 'The performer takes one deliberate step into a clearer area of the same setting.',
    camera: 'A stable medium-wide shot. Keep the full gesture inside the frame.',
  },
  {
    title: 'Hold the emotion',
    purpose: 'Hold the intensity of the performance without adding unnecessary movement.',
    action: 'The performer holds eye contact, with one measured hand gesture and a still posture afterward.',
    camera: 'A gentle push toward a chest-up shot, ending with a stable frame.',
  },
];

const ENDING: Omit<Shot, 'id' | 'durationSeconds'> = {
  title: 'Hold the closing shot',
  purpose: 'Complete the emotional arc and leave a steady frame for the ending.',
  action: 'The performer settles into a slightly brighter area of the same setting and looks directly at the camera. Hold the final pose.',
  camera: 'A stable chest-up composition. Keep the final moment still.',
};

export function createPlan(config: CreativeConfig): CreativePlan {
  const count = config.durationSeconds / 5;
  const patterns = [...SHOT_PATTERNS.slice(0, count - 1), ENDING];
  return {
    version: 1,
    config: { ...config },
    brief: {
      concept: config.theme.trim(),
      performer: config.performer.trim(),
      ...getStyle(config.styleId).brief,
      emotionalArc: getEnergy(config.energy).arc,
    },
    shots: patterns.map((pattern, index) => ({
      ...pattern,
      id: `shot-${String(index + 1).padStart(2, '0')}`,
      durationSeconds: 5,
    })),
  };
}

export function shotOffset(plan: CreativePlan, shotId: string): number {
  const index = plan.shots.findIndex((shot) => shot.id === shotId);
  return plan.shots.slice(0, Math.max(index, 0)).reduce((sum, shot) => sum + shot.durationSeconds, 0);
}

export function totalDuration(plan: CreativePlan): number {
  return plan.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0);
}
