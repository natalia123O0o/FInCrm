//frontend/src/features/ai/components/ChatbotWidget.jsx

import { useState } from "react";
import { useChatbot } from "../hooks/useChatbot";
import ChatbotMessage from "./ChatbotMessage";
import "./ChatbotWidget.css";
import { descargarReporteCartera } from "../services/reportes.api";

export default function ChatbotWidget({ token }) {
    // Guarda temporalmente lo que escribe el usuario.
    const [texto, setTexto] = useState("");
    const [descargando, setDescargando] = useState(false);
    const [errorDescarga, setErrorDescarga] = useState("");
    const [descargaExitosa, setDescargaExitosa] = useState(false);

    // Obtenemos las funciones y estados del chatbot.
    const {
        mensajes,
        cargando,
        error,
        enviarMensaje,
    } = useChatbot(token);

    // Se ejecuta cuando enviamos el formulario.
    const manejarEnvio = async (evento) => {
        evento.preventDefault();

        const pregunta = texto.trim();

        if (!pregunta || cargando) {
            return;
        }

        setTexto("");
        await enviarMensaje(pregunta);
    };


    const manejarDescarga = async () => {
        if (descargando) return;

        setDescargando(true);
        setErrorDescarga("");
        setDescargaExitosa(false);

        try {
            await descargarReporteCartera(token);
            setDescargaExitosa(true);
        } catch (error) {
            setErrorDescarga(
                error.message || "No fue posible descargar el reporte"
            );
        } finally {
            setDescargando(false);
        }
    };


    return (
        <section className="chatbot-widget">

            <header className="chatbot-header">
                <div className="chatbot-header-content">
                    <div>
                        <h2>Asistente inteligente FinCRM</h2>
                        <p>Consulta información empresarial con IA.</p>
                    </div>

                    <button
                        type="button"
                        className="chatbot-download-button"
                        onClick={manejarDescarga}
                        disabled={descargando || !token}
                    >
                        {descargando
                            ? "Generando Excel..."
                            : "Descargar cartera en Excel"}
                    </button>
                </div>

                {errorDescarga && (
                    <p className="chatbot-download-error" role="alert">
                        {errorDescarga}
                    </p>
                )}

                {descargaExitosa && (
                    <p className="chatbot-download-success" role="status">
                        Descarga iniciada correctamente.
                    </p>
                )}
            </header>

            <div className="chatbot-messages" aria-live="polite">
                {mensajes.length === 0 && (
                    <p>¡Hola! ¿En qué puedo ayudarte?</p>
                )}

                {mensajes.map((mensaje, indice) => (
                    <ChatbotMessage
                        key={indice}
                        mensaje={mensaje}
                    />
                ))}

                {cargando && <p className="chatbot-status">FinCRM está respondiendo...</p>}

                {error && (
                    <p className="chatbot-error" role="alert">
                        {error}
                    </p>
                )}
            </div>

            <form className="chatbot-form" onSubmit={manejarEnvio}>

                <div className="chatbot-input-group">
                    <label htmlFor="pregunta-ia">
                        Escribe tu pregunta
                    </label>

                    <input
                        id="pregunta-ia"
                        type="text"
                        value={texto}
                        onChange={(evento) =>
                            setTexto(evento.target.value)
                        }
                        placeholder="¿Qué es un CRM?"
                        maxLength={1000}
                        disabled={cargando}
                    />
                </div>

                <button
                    className="chatbot-send-button"
                    type="submit"
                    disabled={cargando || !texto.trim()}
                >
                    {cargando ? "Consultando..." : "Enviar"}
                </button>
            </form>
        </section>
    );
}
