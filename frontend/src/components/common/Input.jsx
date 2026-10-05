export default function Input({ label, error, id, ...rest }) {
  return (
    <div className="cf__field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} {...rest} />
      {error && <small className="cf__error" aria-live="polite">{error}</small>}
    </div>
  );
}