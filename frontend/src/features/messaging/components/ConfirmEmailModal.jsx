
import { useEffect, useRef } from "react";
import { Send, X, Info, Mail } from "lucide-react";
import "./ConfirmEmailModal.css";

export default function ConfirmEmailModal({
  open,
  onClose,
  onConfirm,
  sending,
  cliente,
  correo,
  plantilla,
}) {
  const cancelButtonRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !sending) {
        onClose();
      }

      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled])'
        );

        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
      previousFocus?.focus?.();
    };
  }, [open, sending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fin-email-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !sending
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="fin-email-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fin-email-modal-title"
        aria-describedby="fin-email-modal-description"
      >
        <div className="fin-email-modal-top">
          <div className="fin-email-modal-icon">
            <Send size={24} />
          </div>

          <button
            type="button"
            className="fin-email-modal-close"
            onClick={onClose}
            disabled={sending}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <h2 id="fin-email-modal-title">
          ¿Confirmar envío del correo?
        </h2>

        <p
          id="fin-email-modal-description"
          className="fin-email-modal-description"
        >
          Estás a punto de enviar una comunicación real
          mediante Brevo. Revisa los detalles antes
          de continuar.
        </p>

        <div className="fin-email-modal-details">
          <div className="fin-email-modal-detail">
            <span>Destinatario</span>
            <strong>{cliente || "No disponible"}</strong>
          </div>

          <div className="fin-email-modal-detail">
            <span>Correo</span>
            <strong>{correo || "No disponible"}</strong>
          </div>

          <div className="fin-email-modal-detail">
            <span>Plantilla</span>
            <strong>{plantilla || "No disponible"}</strong>
          </div>
        </div>

        <div className="fin-email-modal-info">
          <Info size={18} />

          <p>
            <Mail size={15} />
            Se utilizará la plantilla publicada
            en Brevo y los datos del cliente.
          </p>
        </div>

        <div className="fin-email-modal-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="fin-email-modal-cancel"
            onClick={onClose}
            disabled={sending}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="fin-email-modal-confirm"
            onClick={onConfirm}
            disabled={sending}
          >
            <Send size={17} />

            {sending
              ? "Enviando..."
              : "Confirmar envío"}
          </button>
        </div>
      </div>
    </div>
  );
}
