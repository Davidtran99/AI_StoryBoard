/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Scissors, Minus, Waves, RectangleHorizontal } from 'lucide-react';
// FIX: The `Transition` type was incorrect and only used here. It has been removed,
// and the TransitionIcon component now accepts a string to handle all possible values.
import type { Scene } from '../../types';

interface TimelineProps {
  scenes: Scene[];
  fps: number;
  t: (key: any, replacements?: any) => string;
}

// FIX: Updated TransitionIcon to accept `string` and handle a wider range of transition
// types from the constants, resolving the TypeScript error. This also correctly maps
// similar transition types (e.g., all "cut" variants) to the same icon.
const TransitionIcon: React.FC<{ transition: string }> = ({ transition }) => {
  const iconProps = { className: "h-3 w-3 text-slate-400", "aria-hidden": true };
  switch (transition) {
    case 'Hard Cut':
    case 'Match Cut':
    case 'Jump Cut':
    case 'Invisible Cut':
    case 'Smash Cut':
      return <Scissors {...iconProps} />;
    case 'fade': // This is the hardcoded value for short durations
    case 'Fade In / Fade Out':
    case 'Luma Fade':
      return <Minus {...iconProps} />;
    case 'Cross Dissolve':
    case 'Ripple Dissolve':
    case 'Liquid Dissolve':
      return <Waves {...iconProps} />;
    case 'Wipe':
      return <RectangleHorizontal {...iconProps} />;
    default:
      return null;
  }
};


export const Timeline: React.FC<TimelineProps> = ({ scenes, fps, t }) => {
  const totalDuration = scenes.reduce((s, x) => s + (Number(x.duration) || 0), 0);

  if (scenes.length === 0) {
    return (
      <div className="w-full bg-slate-900/70 rounded-xl p-3 shadow-inner shadow-black/30">
        <div className="h-12 flex items-center justify-center text-slate-500 text-base">{t('timelineEmpty')}</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/70 rounded-xl p-3 shadow-inner shadow-black/30 space-y-3">
      <div className="flex flex-nowrap items-stretch h-12 overflow-x-auto pb-2">
        {scenes.map((s, i) => {
          const duration = Number(s.duration) || 0;
          // If duration is less than 3s, force a 'fade' transition for better pacing. Otherwise, use the user-defined transition.
          const effectiveTransition = duration < 3 ? 'fade' : s.transition;
          const isAuto = duration < 3 ? t('autoTransitionSuffix') : '';
          const transitionTitle = t('transitionTooltip', { transition: effectiveTransition, isAuto });

          return (
            <React.Fragment key={s.id}>
              <div
                title={`Cảnh ${i + 1}: ${duration}s`}
                className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg text-sm p-1 overflow-hidden flex items-center justify-center text-white font-bold shadow-md min-w-[2rem] shadow-teal-500/20"
                style={{ flexGrow: duration, flexBasis: 0 }}
              >
                <span className="[text-shadow:_0_1px_2px_rgb(0_0_0_/_0.5)]">{duration}s</span>
              </div>
              {i < scenes.length - 1 && (
                <div className="flex-shrink-0 w-8 flex items-center justify-center" title={transitionTitle}>
                  <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-md">
                    <TransitionIcon transition={effectiveTransition} />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="text-sm text-slate-400 text-center">{t('totalDuration', { duration: totalDuration, fps: fps, frames: Math.round(totalDuration * fps) })}</div>
    </div>
  );
};
