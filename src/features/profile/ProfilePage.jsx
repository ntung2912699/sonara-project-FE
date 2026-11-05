import { useEffect, useRef, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { Avatar } from '../../common/avatar/Avatar.jsx';
import { InlineMessage } from '../../common/message/Message.jsx';
import { Check, KeyRound, LockKeyhole, ShieldCheck, Upload, UserRound, LoaderCircle } from '../../common/icons/index.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';
export function ProfilePage({ profile, token, onSaved }) {
  const { t } = usePreferences();
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [favoriteItems, setFavoriteItems] = useState((profile?.favorite_items || []).join(', '));
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const avatarInput = useRef(null);

  useEffect(() => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setFavoriteItems((profile?.favorite_items || []).join(', '));
  }, [profile]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const favoriteArray = favoriteItems.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 50);
    try {
      let result;
      if (avatar) {
        const form = new FormData();
        form.append('_method', 'PUT');
        form.append('name', name);
        form.append('bio', bio);
        favoriteArray.forEach((item) => form.append('favorite_items[]', item));
        form.append('avatar', avatar);
        result = await api.upload('/profile', form, token);
      } else {
        result = await api.put('/profile', { name, bio, favorite_items: favoriteArray }, token);
      }
      onSaved(result.data);
      setAvatar(null);
      if (avatarInput.current) avatarInput.current.value = '';
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content profile-page">
      <div className="section-heading collection-heading"><div className="collection-icon profile-icon"><UserRound size={20} /></div><div><div className="eyebrow section-eyebrow">{t('ACCOUNT SETTINGS')}</div><h1>{t('Your profile')}</h1><p>{t('Make your Sonora space feel like yours.')}</p></div></div>
      <form className="profile-form" onSubmit={save}>
        <div className="profile-identity"><Avatar user={profile} size="large" /><div><strong>{profile?.name}</strong><span>{profile?.email || profile?.phone || t('Sonora member')}</span><label className="button button-secondary avatar-upload-button"><Upload size={14} /> {t('Change photo')}<input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => {
          const file = event.target.files[0] || null;
          if (file && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            setAvatar(null);
            setError(t('Choose a JPG, PNG, WebP, or GIF image.'));
            event.target.value = '';
            return;
          }
          if (file && file.size > 5 * 1024 * 1024) {
            setAvatar(null);
            setError(t('Profile photos must be 5 MB or smaller.'));
            event.target.value = '';
            return;
          }
          setError('');
          setAvatar(file);
        }} /></label>{avatar && <small className="selected-avatar-name">{avatar.name}</small>}</div></div>
        <div className="profile-divider" />
        <div className="profile-fields"><label className="field-label" htmlFor="profile-name">{t('Display name')}</label><input id="profile-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
          <label className="field-label" htmlFor="profile-email">{t('Email address')}</label><input id="profile-email" className="text-input input-readonly" value={profile?.email || profile?.phone || ''} readOnly /><small className="field-help">{t('Your sign-in address is managed by your account.')}</small>
          <label className="field-label" htmlFor="profile-bio">{t('A little about you')}</label><textarea id="profile-bio" className="text-input textarea-input" value={bio || ''} onChange={(event) => setBio(event.target.value)} maxLength={1000} placeholder={t('Tell us what you love listening to…')} rows={4} />
          <label className="field-label" htmlFor="profile-favorites">{t('Favorite things')}</label><input id="profile-favorites" className="text-input" value={favoriteItems} onChange={(event) => setFavoriteItems(event.target.value)} placeholder={t('Jazz, road trips, late nights…')} /><small className="field-help">{t('Separate items with commas (up to 50).')}</small>
        </div>
        {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
        <div className="profile-actions"><span><ShieldCheck size={15} /> {t('Your profile details are private.')}</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{busy ? t('Saving…') : t('Save changes')}</button></div>
      </form>
      <div className="account-note"><div className="note-icon"><LockKeyhole size={17} /></div><div><strong>{t('Your account, protected')}</strong><p>{t('Your information is only used to personalize your music experience.')}</p></div><KeyRound size={18} className="note-decoration" /></div>
    </div>
  );
}
