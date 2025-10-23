'use client';

import * as React from 'react';
import { ChartControls, type TransformKind } from './Charts';

/**
 * Compatibility wrapper:
 * - NEW usage:
 *     <TransformControls
 *        transform setTransform
 *        forecast setForecast
 *        smooth setSmooth
 *     />
 * - LEGACY usage:
 *     <TransformControls
 *        defaultTransform="none|level|yoy|index"
 *        onChange={(t)=>...}
 *        onToggleTrend={(b)=>...}
 *     />
 */
type NewProps = {
  transform: TransformKind;
  setTransform: (v: TransformKind) => void;
  forecast: number;
  setForecast: (n: number) => void;
  smooth: boolean;
  setSmooth: (b: boolean) => void;
};

type LegacyProps = {
  defaultTransform?: 'none' | 'level' | 'yoy' | 'index';
  onChange: (v: TransformKind) => void;
  onToggleTrend?: (b: boolean) => void;
};

function isNewProps(p: any): p is NewProps {
  return p && 'transform' in p && 'setTransform' in p;
}

/* ----------- New API passthrough (all hooks inside this branch only) ----------- */
function ControlsNew(p: NewProps) {
  return (
    <ChartControls
      transform={p.transform}
      setTransform={p.setTransform}
      forecast={p.forecast}
      setForecast={p.setForecast}
      smooth={p.smooth}
      setSmooth={p.setSmooth}
    />
  );
}

/* ----------- Legacy API (self managed) ----------- */
function ControlsLegacy(p: LegacyProps) {
  const initial = (p.defaultTransform === 'none' ? 'level' : (p.defaultTransform as TransformKind)) || 'level';
  const [transform, setTransform] = React.useState<TransformKind>(initial);
  const [smooth, setSmooth] = React.useState(false);
  const [forecast, setForecast] = React.useState(0);
  const [showTrend, setShowTrend] = React.useState(true);

  // Notify legacy callbacks (lint suppressed on purpose; mapping legacy API)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { p.onChange(transform); }, [transform]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { p.onToggleTrend?.(showTrend); }, [showTrend]);

  return (
    <div className="flex flex-wrap items-center gap-3 my-3 text-sm">
      <label className="flex items-center gap-2">Transform:
        <select
          value={transform}
          onChange={e => setTransform(e.target.value as TransformKind)}
          className="border rounded px-2 py-1"
        >
          <option value="level">Level</option>
          <option value="yoy">YoY %</option>
          <option value="index">Index (2015=100)</option>
        </select>
      </label>

      <label className="flex items-center gap-2">Forecast:
        <select
          value={forecast}
          onChange={e => setForecast(parseInt(e.target.value))}
          className="border rounded px-2 py-1"
        >
          <option value="0">Off</option>
          <option value="3">3y</option>
          <option value="5">5y</option>
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={smooth} onChange={e => setSmooth(e.target.checked)} />
        Smooth (3-yr)
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showTrend} onChange={e => setShowTrend(e.target.checked)} />
        Show trendline
      </label>
    </div>
  );
}

/* ----------- Single entry; no hooks here, so no conditional-hooks warnings ----------- */
export type { TransformKind } from './Charts';
export default function TransformControls(props: NewProps | LegacyProps) {
  return isNewProps(props) ? <ControlsNew {...props} /> : <ControlsLegacy {...props} />;
}
