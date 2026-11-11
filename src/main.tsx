import { render } from 'preact';
import { App } from './App.tsx';
import { applySettings, loadSettings } from './settings.ts';
import './style.css';

// Theme and density before first paint, so a forced light or dark theme does not flash.
applySettings(loadSettings());
render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
