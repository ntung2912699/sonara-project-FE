import { navigation } from '../../common/config/navigation.js';
import { Avatar } from '../../common/avatar/Avatar.jsx';
import { AudioLines, ChevronRight, LogOut, Sparkles, X } from '../../common/icons/index.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';
export function Sidebar({ page, navigate, profile, onLogout, mobileOpen, closeMobile }) {
  const { t } = usePreferences();
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || profile?.role === 'admin');
  const groups = [...new Set(visibleNavigation.map((item) => t(item.group)))];
  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <button className="brand-lockup" onClick={() => navigate('discover')}><span className="brand-mark"><AudioLines size={19} /></span><span>sonora</span></button>
        <button className="icon-button close-nav" aria-label="Close navigation" onClick={closeMobile}><X size={18} /></button>
      </div>
      <div className="sidebar-caption">{t('YOUR SPACE')}</div>
      {groups.map((group) => (
        <div className="nav-group" key={group}>
          <div className="nav-label">{group}</div>
          {visibleNavigation.filter((item) => t(item.group) === group).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'nav-active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={page === id ? 2.2 : 1.8} /><span>{t(label)}</span>
              {id === 'favorites' && page !== id && <span className="nav-accent-dot" />}
            </button>
          ))}
        </div>
      ))}
      <div className="sidebar-promo">
        <div className="promo-icon"><Sparkles size={17} /></div><div className="promo-title">{t('Your sound, your rules')}</div>
        <p>{t('Every catalog track includes clear licensing information.')}</p>
        <button onClick={() => navigate('discover')}>{t('Explore the catalog')} <ChevronRight size={14} /></button>
        <div className="promo-orb" />
      </div>
      <button className="sidebar-account" onClick={() => navigate('profile')}>
        <Avatar user={profile} size="medium" /><span className="account-copy"><strong>{profile?.name || 'Music lover'}</strong><small>{t('Personal account')}</small></span><ChevronRight size={15} />
      </button>
      <button className="sidebar-logout" onClick={onLogout}><LogOut size={16} /> {t('Sign out')}</button>
    </aside>
  );
}
