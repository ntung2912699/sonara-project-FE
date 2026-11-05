import { Input } from './Input.jsx';

export function FormField({ label, name, icon: Icon, className = '', ...props }) {
  return <Input id={name} name={name} label={label} icon={Icon} className={className} {...props} />;
}
