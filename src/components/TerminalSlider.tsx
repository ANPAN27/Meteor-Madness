import React from 'react';

interface TerminalSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  displayMultiplier?: number;
  displayDecimals?: number;
  variant?: 'amber' | 'teal' | 'red';
  onChange: (val: number) => void;
  quickButtons?: number[];
}

export const TerminalSlider: React.FC<TerminalSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  displayMultiplier = 1,
  displayDecimals = 0,
  variant = 'amber',
  onChange,
  quickButtons
}) => {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const displayVal = (value * displayMultiplier).toLocaleString(undefined, {
    minimumFractionDigits: displayDecimals,
    maximumFractionDigits: displayDecimals
  });

  const accentColor = variant === 'teal' ? '#00d8e6' : variant === 'red' ? '#ef4444' : '#f59e0b';

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[#0e1015] border border-[#1e222b] rounded-[2px] transition-colors hover:border-[#2a303d]">
      {/* Label & Numeric Readout Header */}
      <div className="flex items-center justify-between font-mono text-[10px]">
        <label htmlFor={id} className="text-neutral-400 uppercase tracking-wider font-medium">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            className="w-20 px-1.5 py-0.5 text-right font-mono text-xs font-semibold text-neutral-100 bg-[#14171e] border border-[#1e222b] rounded-[1px] focus:border-[#00d8e6] focus:outline-none tabular-nums"
          />
          <span className="text-neutral-400 font-normal min-w-[28px] text-right">{unit}</span>
        </div>
      </div>

      {/* Track Container with High-Contrast Active Fill */}
      <div className="relative flex items-center h-5">
        {/* Background Track Line */}
        <div className="absolute left-0 right-0 h-[3px] bg-[#1a1e27] border border-[#2a303d] rounded-none pointer-events-none">
          {/* Active Fill Track */}
          <div
            className="h-full transition-[width] duration-75"
            style={{
              width: `${percent}%`,
              backgroundColor: accentColor
            }}
          />
        </div>

        {/* Browser Range Input with Sharp Non-Rounded Thumb */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`terminal-range-slider relative z-10 ${variant === 'teal' ? 'slider-teal' : ''}`}
        />
      </div>

      {/* Min/Max/Quick Step Range Labels */}
      <div className="flex items-center justify-between font-mono text-[9px] text-neutral-400 pt-0.5">
        <span className="tabular-nums">
          {(min * displayMultiplier).toLocaleString()} {unit}
        </span>
        {quickButtons && (
          <div className="flex items-center gap-1">
            {quickButtons.map((btnVal) => (
              <button
                key={btnVal}
                type="button"
                onClick={() => onChange(btnVal)}
                className={`px-1.5 py-0.5 rounded-[1px] text-[9px] border transition-colors ${
                  value === btnVal
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                    : 'border-[#1e222b] bg-[#14171e] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {(btnVal * displayMultiplier).toLocaleString()}
              </button>
            ))}
          </div>
        )}
        <span className="tabular-nums">
          {(max * displayMultiplier).toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
};
