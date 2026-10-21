import { useState, useEffect } from 'react';

export class SettingsManager {
  static instance = null;
  static STORAGE_KEY = 'aquila_operator_preferences';

  constructor() {
    if (SettingsManager.instance) {
      return SettingsManager.instance;
    }
    this.defaults = {
      alarmSound: true,
      browserPush: true,
      dailyDigest: false,
      theme: 'light',
      textScale: 100,
      highContrast: false,
      reduceMotion: false,
      volumeUnit: 'liters',
      clockFormat: '12h',
      language: 'en',
      firstName: 'System',
      lastName: 'Admin',
      nickname: 'Admin',
      emergencyPhone: '+63 917 000 0001'
    };
    this.committed = { ...this.defaults };
    this.draft = { ...this.defaults };
    this.listeners = new Set();
    this.load();
    this.applyToDOM(this.committed);
    SettingsManager.instance = this;
  }

  static getInstance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  load() {
    try {
      const raw = localStorage.getItem(SettingsManager.STORAGE_KEY);
      this.committed = raw
        ? { ...this.defaults, ...JSON.parse(raw) }
        : { ...this.defaults };
    } catch {
      this.committed = { ...this.defaults };
    }
    this.draft = { ...this.committed };
  }

  /**
   * Applies visual & accessibility preferences directly to the live HTML document
   */
  applyToDOM(prefs = this.draft) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // 1. Dynamic Text Scale (85% to 130% -> scales root rem size from 13.6px to 20.8px)
    const scale = Number(prefs.textScale) || 100;
    root.style.fontSize = `${(16 * scale) / 100}px`;

    // 2. Theme (Light / Dark / System)
    let effectiveTheme = prefs.theme || 'light';
    if (effectiveTheme === 'system') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', effectiveTheme);

    // 3. High Contrast (Glare Mode)
    root.setAttribute('data-contrast', prefs.highContrast ? 'high' : 'normal');

    // 4. Reduce Motion
    root.setAttribute('data-motion', prefs.reduceMotion ? 'reduced' : 'normal');

    // 5. Language attribute
    root.setAttribute('lang', prefs.language === 'fil' ? 'tl' : 'en');
  }

  get(key, fallback = null) {
    return this.draft[key] ?? fallback ?? this.defaults[key] ?? null;
  }

  setDraft(key, value) {
    this.draft[key] = value;
    // Live preview visual changes immediately
    this.applyToDOM(this.draft);
    this.notify();
  }

  isDirty() {
    return JSON.stringify(this.committed) !== JSON.stringify(this.draft);
  }

  saveDraft() {
    this.committed = { ...this.draft };
    this.applyToDOM(this.committed);
    try {
      localStorage.setItem(
        SettingsManager.STORAGE_KEY,
        JSON.stringify(this.committed)
      );
    } catch (e) {
      console.warn('[SettingsManager] Storage write failed:', e);
    }
    this.notify();
  }

  resetDraft() {
    this.draft = { ...this.committed };
    this.applyToDOM(this.committed);
    this.notify();
  }

  resetRegional() {
    this.setDraft('volumeUnit', 'liters');
    this.setDraft('clockFormat', '12h');
    this.setDraft('language', 'en');
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({
        committed: { ...this.committed },
        draft: { ...this.draft },
        isDirty: this.isDirty()
      });
    }
  }

  /**
   * Dual-tone emergency P1 siren using Web Audio API
   */
  playTestChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      // Two-pulse emergency chime (880Hz -> 660Hz -> 880Hz)
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.18);
      osc.frequency.setValueAtTime(880, now + 0.36);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }
  }

  /**
   * Fires both audible siren and native desktop notification if enabled in Settings
   */
  triggerEmergencyAlert(title, message) {
    if (this.committed.alarmSound) {
      this.playTestChime();
    }
    if (
      this.committed.browserPush &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(title, { body: message });
    }
  }
}

export const settingsManager = SettingsManager.getInstance();

/**
 * Reactive Hook so any component can read live operator preferences
 */
export function useSettings() {
  const [prefs, setPrefs] = useState(() => ({ ...settingsManager.draft }));

  useEffect(() => {
    return settingsManager.subscribe((state) => {
      setPrefs({ ...state.draft });
    });
  }, []);

  return prefs;
}