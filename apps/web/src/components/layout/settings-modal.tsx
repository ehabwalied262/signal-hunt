'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Sun, Moon } from 'lucide-react';
import {
  useThemeStore,
  LIGHT_BACKGROUNDS,
  DARK_BACKGROUNDS,
  type ThemeMode,
} from '@/store/theme.store';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { mode, lightBg, darkBg, setMode, setLightBg, setDarkBg, applyTheme } =
    useThemeStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Draft state — nothing commits until "Apply"
  const [draftMode, setDraftMode] = useState<ThemeMode>(mode);
  const [draftLightBg, setDraftLightBg] = useState(lightBg);
  const [draftDarkBg, setDraftDarkBg] = useState(darkBg);

  // Reset draft to current saved values whenever modal opens
  useEffect(() => {
    if (open) {
      setDraftMode(mode);
      setDraftLightBg(lightBg);
      setDraftDarkBg(darkBg);
    }
  }, [open, mode, lightBg, darkBg]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const isDark = mode === 'dark';

  // Styles driven by the CURRENT (committed) theme, not the draft,
  // so the modal itself always looks correct for the active theme.
  const cardBg = isDark ? '#2d3238' : '#ffffff';
  const cardBorder = isDark ? '#3d4349' : '#e5e7eb';
  const headingColor = isDark ? '#f3f4f6' : '#111827';
  const labelColor = isDark ? '#d1d5db' : '#374151';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const inactiveBtnBg = isDark ? '#343a40' : 'transparent';
  const inactiveBtnColor = isDark ? '#9ca3af' : '#6b7280';
  const inactiveBtnHoverBg = isDark ? '#3d4349' : '#f9fafb';

  function handleCancel() {
    // Discard draft — no store writes happened
    onClose();
  }

  function handleApply() {
    // Commit all draft values to store (which also writes DOM + localStorage)
    setMode(draftMode);
    if (draftMode === 'light') {
      setLightBg(draftLightBg);
    } else {
      setDarkBg(draftDarkBg);
    }
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: headingColor }}>
            Settings
          </h2>
          <button
            onClick={handleCancel}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: mutedColor }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = inactiveBtnHoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Theme Mode Toggle */}
        <div className="mb-6">
          <label
            className="mb-3 block text-sm font-medium"
            style={{ color: labelColor }}
          >
            Theme Mode
          </label>
          <div className="flex gap-2">
            {/* Light button */}
            <button
              onClick={() => setDraftMode('light')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all"
              style={
                draftMode === 'light'
                  ? {
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      outline: '2px solid #3b82f6',
                      outlineOffset: '0px',
                    }
                  : {
                      backgroundColor: inactiveBtnBg,
                      color: inactiveBtnColor,
                    }
              }
            >
              <Sun className="h-4 w-4" />
              Light
            </button>

            {/* Dark button */}
            <button
              onClick={() => setDraftMode('dark')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all"
              style={
                draftMode === 'dark'
                  ? {
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      outline: '2px solid #3b82f6',
                      outlineOffset: '0px',
                    }
                  : {
                      backgroundColor: inactiveBtnBg,
                      color: inactiveBtnColor,
                    }
              }
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </div>

        {/* Background swatches — only show section relevant to draft mode */}
        {draftMode === 'light' ? (
          <div className="mb-6">
            <label
              className="mb-3 block text-sm font-medium"
              style={{ color: labelColor }}
            >
              Light Mode Background
            </label>
            <div className="flex gap-3">
              {LIGHT_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setDraftLightBg(bg.value)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: bg.value,
                    borderColor:
                      draftLightBg === bg.value ? '#3b82f6' : '#d1d5db',
                    outline:
                      draftLightBg === bg.value
                        ? '2px solid #bfdbfe'
                        : 'none',
                  }}
                  title={bg.label}
                >
                  {draftLightBg === bg.value && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label
              className="mb-3 block text-sm font-medium"
              style={{ color: labelColor }}
            >
              Dark Mode Background
            </label>
            <div className="flex gap-3">
              {DARK_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setDraftDarkBg(bg.value)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: bg.value,
                    borderColor:
                      draftDarkBg === bg.value ? '#3b82f6' : '#4b5563',
                    outline:
                      draftDarkBg === bg.value
                        ? '2px solid #1d4ed8'
                        : 'none',
                  }}
                  title={bg.label}
                >
                  {draftDarkBg === bg.value && (
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div
          className="mb-4 h-px w-full"
          style={{ backgroundColor: cardBorder }}
        />

        {/* Apply / Cancel */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isDark ? '#343a40' : '#f3f4f6',
              color: isDark ? '#d1d5db' : '#374151',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = isDark
                ? '#3d4349'
                : '#e5e7eb')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = isDark
                ? '#343a40'
                : '#f3f4f6')
            }
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#2563eb' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#1d4ed8')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = '#2563eb')
            }
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}