import { useEffect, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { FormField } from '../../common/input/FormField.jsx';
import { InlineMessage } from '../../common/message/Message.jsx';
import { ArrowLeft, AudioLines, ChevronRight, Headphones, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, LoaderCircle } from '../../common/icons/index.js';
import { DisplayPreferences } from '../../common/preferences/DisplayPreferences.jsx';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';
export function AuthScreen({ onAuthenticated }) {
  const { language, t } = usePreferences();
  const search = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(search.get('token') ? 'reset' : 'login');
  const [registerChannel, setRegisterChannel] = useState('email');
  const [challenge, setChallenge] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (mode === 'login') {
        const result = await api.post('/login', { email: values.email, password: values.password });
        onAuthenticated(result.data);
      } else if (mode === 'register') {
        const payload = {
          name: values.name,
          channel: values.channel,
          password: values.password,
          password_confirmation: values.password_confirmation,
          ...(values.channel === 'zalo' ? { phone: values.destination } : { email: values.destination }),
        };
        const result = await api.post('/register', payload);
        setChallenge(result.data);
        setCooldown(60);
        setMode('verify');
      } else if (mode === 'verify') {
        const result = await api.post('/register/verify', { challenge_id: challenge.challenge_id, code: values.code });
        onAuthenticated(result.data);
      } else if (mode === 'forgot') {
        await api.post('/forgot-password', { email: values.email });
        setNotice(t('If an account exists for that address, a password reset link is on its way.'));
      } else if (mode === 'reset') {
        await api.post('/reset-password', {
          email: values.email,
          token: search.get('token'),
          password: values.password,
          password_confirmation: values.password_confirmation,
        });
        setNotice(t('Your password has been updated. You can now sign in.'));
        setMode('login');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!challenge || cooldown > 0) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post('/register/resend-otp', { challenge_id: challenge.challenge_id });
      setChallenge(result.data);
      setCooldown(60);
      setNotice(t('A fresh verification code has been sent.'));
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    login: ['Welcome back', 'Your next favorite track is waiting.'],
    register: ['Find your sound', 'Create an account to save the music you love.'],
    verify: ['Check your inbox', `Enter the 6-digit code sent to ${challenge?.destination || 'your contact'}.`],
    forgot: ['Reset your password', 'We’ll send you a secure link to get back in.'],
    reset: ['Choose a new password', 'Make it strong and easy for you to remember.'],
  };
  const [title, subtitle] = titles[mode];
  const translatedSubtitle = mode === 'verify' && language === 'vi'
    ? `Nhập mã gồm 6 chữ số đã gửi đến ${challenge?.destination || 'thông tin liên hệ của bạn'}.`
    : t(subtitle);
  const translatedTitle = t(title);

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <div className="auth-brand"><span className="brand-mark"><AudioLines size={20} /></span> sonora</div>
        <div className="auth-copy">
          <div className="eyebrow"><Sparkles size={14} /> {t('A home for your sound')}</div>
          <h1>{t('Music that')}<br />{t('moves with you.')}</h1>
          <p>{t('Discover licensed sounds, build your collection, and make every playlist feel like yours.')}</p>
        </div>
        <div className="auth-art" aria-hidden="true">
          <div className="art-glow" />
          <div className="art-disc"><div className="disc-grooves" /><div className="disc-label"><AudioLines size={31} /></div></div>
          <div className="art-note note-one">♪</div><div className="art-note note-two">♫</div>
          <div className="art-caption"><span className="playing-bars"><i /><i /><i /><i /></span><span>{t('Find your frequency')}</span><span className="caption-dot" /></div>
        </div>
        <div className="auth-footer">{t('A little more music. A lot more you.')}</div>
      </div>
      <section className="auth-form-wrap">
        <div className="auth-preferences"><DisplayPreferences /></div>
        <div className="auth-mobile-brand"><span className="brand-mark"><AudioLines size={19} /></span> sonora</div>
        <div className="auth-form-card">
          {mode === 'verify' && <button className="text-back" onClick={() => setMode('register')}><ArrowLeft size={16} /> {t('Back')}</button>}
          <div className="auth-heading"><div className="auth-icon"><Headphones size={20} /></div><h2>{translatedTitle}</h2><p>{translatedSubtitle}</p></div>
          {error && <InlineMessage className="form-alert error-alert">{error}</InlineMessage>}
          {notice && <InlineMessage variant="success" className="form-alert success-alert">{notice}</InlineMessage>}
          <form onSubmit={submit} className="auth-form">
            {mode === 'login' && <>
              <FormField label={t('Email address')} name="email" type="email" placeholder="you@example.com" autoComplete="email" required icon={Mail} />
              <FormField label={t('Password')} name="password" type="password" placeholder={t('Enter your password')} autoComplete="current-password" required icon={LockKeyhole} />
              <div className="form-inline"><span /> <button type="button" className="text-link" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>{t('Forgot password?')}</button></div>
            </>}
            {mode === 'register' && <>
              <FormField label={t('Your name')} name="name" placeholder={t('What should we call you?')} autoComplete="name" required icon={UserRound} />
              <label className="field-label">{t('Verification method')}</label>
              <select className="select-input" name="channel" value={registerChannel} onChange={(event) => setRegisterChannel(event.target.value)}>
                <option value="email">{t('Email')}</option><option value="icloud">{t('iCloud email')}</option><option value="zalo">{t('Zalo phone')}</option>
              </select>
              <label className="field-label" htmlFor="destination-input">{registerChannel === 'zalo' ? t('Phone number') : t('Email address')}</label>
              <div className="input-wrap">{registerChannel === 'zalo' ? <UserRound size={17} /> : <Mail size={17} />}<input id="destination-input" name="destination" type={registerChannel === 'zalo' ? 'tel' : 'email'} autoComplete={registerChannel === 'zalo' ? 'tel' : 'email'} placeholder={registerChannel === 'zalo' ? '+84901234567' : 'you@example.com'} required /></div>
              <FormField label={t('Password')} name="password" type="password" placeholder={t('At least 8 characters')} autoComplete="new-password" required minLength={8} icon={LockKeyhole} />
              <FormField label={t('Confirm password')} name="password_confirmation" type="password" placeholder={t('Enter it again')} autoComplete="new-password" required minLength={8} icon={LockKeyhole} />
              <p className="form-hint">{t('We’ll send you a one-time code to verify your account.')}</p>
            </>}
            {mode === 'verify' && <>
              <FormField label={t('6-digit verification code')} name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" autoComplete="one-time-code" required className="otp-field" />
              <button type="button" className="text-link resend-link" disabled={busy || cooldown > 0} onClick={resendCode}>
                {cooldown > 0 ? `${t('Resend code in')} ${cooldown}s` : t('Resend code')}
              </button>
            </>}
            {mode === 'forgot' && <FormField label={t('Email address')} name="email" type="email" placeholder="you@example.com" autoComplete="email" required icon={Mail} />}
            {mode === 'reset' && <>
              <FormField label={t('Email address')} name="email" type="email" defaultValue={search.get('email') || ''} placeholder="you@example.com" autoComplete="email" required icon={Mail} />
              <FormField label={t('New password')} name="password" type="password" placeholder={t('At least 8 characters')} autoComplete="new-password" required minLength={8} icon={LockKeyhole} />
              <FormField label={t('Confirm new password')} name="password_confirmation" type="password" placeholder={t('Enter it again')} autoComplete="new-password" required minLength={8} icon={LockKeyhole} />
            </>}
            <button type="submit" className="button button-primary auth-submit" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : null}
              {busy ? t('Please wait…') : t(({ login: 'Sign in', register: 'Create account', verify: 'Verify & continue', forgot: 'Send reset link', reset: 'Update password' }[mode]))}
              {!busy && <ChevronRight size={17} />}
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? <>{t('New to Sonora?')} <button onClick={() => { setMode('register'); setError(''); setNotice(''); }}>{t('Create an account')}</button></>
              : mode === 'register' ? <>{t('Already have an account?')} <button onClick={() => { setMode('login'); setError(''); }}>{t('Sign in')}</button></>
                : mode === 'verify' ? <span className="fine-print"><ShieldCheck size={14} /> {t('Your account is only created after verification.')}</span>
                  : <button onClick={() => { setMode('login'); setError(''); setNotice(''); }}>{t('Back to sign in')}</button>}
          </div>
          <div className="auth-legal">{t('By continuing, you agree to use music in accordance with its listed license.')}</div>
        </div>
      </section>
    </main>
  );
}
