import "./ChatbotMessage.css";
import ReactMarkdown from "react-markdown";

export default function ChatbotMessage({ mensaje }) {
    // Identificamos quién escribió el mensaje.
    const esUsuario = mensaje.rol === "usuario";

    return (
        <div
            className={
                esUsuario
                    ? "chatbot-message chatbot-message-user"
                    : "chatbot-message chatbot-message-assistant"
            }
        >
            <strong>
                {esUsuario ? "Tú" : "FinCRM IA"}
            </strong>

            <div className="chatbot-message-content">
                {esUsuario ? (
                    mensaje.contenido
                ) : (
                    <ReactMarkdown>
                        {mensaje.contenido}
                    </ReactMarkdown>
                )}
            </div>
        </div>
    );
}
