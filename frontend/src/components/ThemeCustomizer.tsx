import React, { useState } from 'react';
import { Sun, Moon, Palette, Check, RotateCcw, X } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'custom';

export interface CustomThemeColors {
  name: string;
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

export const CURATED_PRESETS: CustomThemeColors[] = [
  {
    name: 'Nebius Cyber-Violet',
    bg: '#0d0917',
    surface: '#161129',
    card: '#1d1636',
    border: '#322659',
    text: '#f5f3ff',
    muted: '#a78bfa',
    accent: '#8b5cf6',
  },
  {
    name: 'Snyk Daylight Cobalt',
    bg: '#f4f6fb',
    surface: '#e8ecf7',
    card: '#ffffff',
    border: '#d5ddec',
    text: '#0f172a',
    muted: '#475569',
    accent: '#2563eb',
  },
  {
    name: 'Sentry Midnight Plum',
    bg: '#0f0c1b',
    surface: '#18132a',
    card: '#211b38',
    border: '#362c59',
    text: '#faf5ff',
    muted: '#c4b5fd',
    accent: '#e11d48',
  },
  {
    name: 'Solarized Warm Paper',
    bg: '#fdf6e3',
    surface: '#eee8d5',
    card: '#fffdf7',
    border: '#dfd6b8',
    text: '#073642',
    muted: '#586e75',
    accent: '#0d9488',
  },
  {
    name: 'Oceanic Deep Teal',
    bg: '#07171c',
    surface: '#0c252e',
    card: '#11323d',
    border: '#1d4d5c',
    text: '#ecfeff',
    muted: '#67e8f9',
    accent: '#06b6d4',
  },
];

interface ThemeCustomizerProps {
  themeMode: ThemeMode;
  customColors: CustomThemeColors;
  onChangeMode: (mode: ThemeMode) => void;
  onChangeCustomColors: (colors: CustomThemeColors) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  themeMode,
  customColors,
  onChangeMode,
  onChangeCustomColors,
}) => {
  const [openDrawer, setOpenDrawer] = useState(false);

  const handleColorInput = (key: keyof CustomThemeColors, val: string) => {
    onChangeMode('custom');
    onChangeCustomColors({
      ...customColors,
      name: 'Custom User Theme',
      [key]: val,
    });
  };

  return (
    <div className="relative">
      {/* 3-Mode Pill Switcher (Light / Dark / Custom) */}
      <div className="flex items-center pf-surface border pf-border rounded-xl p-1 gap-0.5">
        <button
          type="button"
          onClick={() => {
            onChangeMode('light');
            setOpenDrawer(false);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            themeMode === 'light'
              ? 'pf-card pf-text shadow-sm border pf-border'
              : 'pf-muted hover:opacity-80'
          }`}
          title="Switch to Crisp Daylight Mode"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Light</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeMode('dark');
            setOpenDrawer(false);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            themeMode === 'dark'
              ? 'pf-card pf-text shadow-sm border pf-border'
              : 'pf-muted hover:opacity-80'
          }`}
          title="Switch to Midnight Indigo Dark Mode"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Dark</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeMode('custom');
            setOpenDrawer((prev) => !prev);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            themeMode === 'custom'
              ? 'pf-accent-bg shadow-sm'
              : 'pf-muted hover:opacity-80'
          }`}
          title="Customize Theme Colors & Presets"
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Customize</span>
        </button>
      </div>

      {/* Interactive Theme Customizer Popover */}
      {openDrawer && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl pf-card border pf-border p-4 z-50 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b pf-border pb-2.5">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 pf-accent-text" />
              <span className="text-xs font-bold pf-text uppercase tracking-wider">
                Theme Studio & Presets
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDrawer(false)}
              className="pf-muted hover:pf-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 5 Curated Industry Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold pf-muted block">
              Curated Flagship Palettes
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {CURATED_PRESETS.map((preset) => {
                const isSelected =
                  themeMode === 'custom' && customColors.name === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      onChangeMode('custom');
                      onChangeCustomColors(preset);
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition ${
                      isSelected
                        ? 'pf-accent-border pf-surface pf-text font-bold'
                        : 'pf-border hover:opacity-90 pf-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center -space-x-1">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.bg }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.card }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <span>{preset.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 pf-accent-text" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Color Pickers */}
          <div className="space-y-2.5 pt-2 border-t pf-border">
            <span className="text-[11px] font-semibold pf-muted block">
              Fine-Tune Custom Colors
            </span>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center justify-between p-2 rounded-lg pf-surface border pf-border cursor-pointer">
                <span className="pf-text font-medium">Accent</span>
                <input
                  type="color"
                  value={customColors.accent}
                  onChange={(e) => handleColorInput('accent', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg pf-surface border pf-border cursor-pointer">
                <span className="pf-text font-medium">Canvas</span>
                <input
                  type="color"
                  value={customColors.bg}
                  onChange={(e) => handleColorInput('bg', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg pf-surface border pf-border cursor-pointer">
                <span className="pf-text font-medium">Card</span>
                <input
                  type="color"
                  value={customColors.card}
                  onChange={(e) => handleColorInput('card', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg pf-surface border pf-border cursor-pointer">
                <span className="pf-text font-medium">Text Ink</span>
                <input
                  type="color"
                  value={customColors.text}
                  onChange={(e) => handleColorInput('text', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>
            </div>
          </div>

          <div className="pt-1 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                onChangeMode('light');
                setOpenDrawer(false);
              }}
              className="text-[11px] pf-muted hover:pf-text flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Default Light
            </button>
            <button
              type="button"
              onClick={() => setOpenDrawer(false)}
              className="px-3 py-1 rounded-lg pf-accent-bg text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
