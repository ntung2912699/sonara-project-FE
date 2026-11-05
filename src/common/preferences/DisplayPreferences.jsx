import { Languages, Moon, Sun } from '../icons/index.js';
import { usePreferences } from './PreferencesContext.jsx';

export function DisplayPreferences({ className = '' }) {
  const { language, setLanguage, theme, toggleTheme, t } = usePreferences();

  return <div className={`display-preferences ${className}`}>
    <label className="preference-language"><Languages size={15} /><span className="visually-hidden">{t('Language')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Language')}>
        <option value="en">{t('English')}</option>
        <option value="vi">{t('Vietnamese')}</option>
      </select>
    </label>
    <button className="theme-toggle" onClick={toggleTheme} aria-label={`${t('Theme')}: ${t(theme === 'dark' ? 'Dark' : 'Light')}`} title={`${t('Theme')}: ${t(theme === 'dark' ? 'Dark' : 'Light')}`}>
      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  </div>;
}
