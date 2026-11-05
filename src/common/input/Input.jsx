export function Input({ id, label, icon: Icon, className = '', ...props }) {
  return (
    <>
      {label && <label className="field-label" htmlFor={id}>{label}</label>}
      <div className={`input-wrap ${className}`}>
        {Icon && <Icon size={17} />}
        <input id={id} {...props} />
      </div>
    </>
  );
}
