export default function Button({ variant = 'primary', as: As = 'button', className = '', ...rest }) {
  const cls = `btn btn--${variant} ${className}`;
  return <As className={cls} {...rest} />;
}