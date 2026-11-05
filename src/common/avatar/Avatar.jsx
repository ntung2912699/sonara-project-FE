export function Avatar({ user, size = 'medium' }) {
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || 'S';
  return user?.avatar_url
    ? <img className={`avatar avatar-${size}`} src={user.avatar_url} alt="" />
    : <span className={`avatar avatar-${size} avatar-fallback`}>{initial}</span>;
}
