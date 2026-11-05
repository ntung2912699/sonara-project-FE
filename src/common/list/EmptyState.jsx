import { Music2 } from '../icons/index.js';
import { usePreferences } from '../preferences/PreferencesContext.jsx';
export function EmptyState({ icon: Icon = Music2, title, text, action }) {
  const { t } = usePreferences();
  return <div className="empty-state"><div className="empty-icon"><Icon size={25} /></div><h3>{t(title)}</h3><p>{t(text)}</p>{action}</div>;
}
