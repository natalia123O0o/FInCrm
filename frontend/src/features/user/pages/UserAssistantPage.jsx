import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../../auth/context/AuthContext.jsx';
import { consultarIA } from '../../ai/services/ai.api.js';
import { PATHS } from '../../../routes/paths.js';
import UserWorkspaceLayout from '../components/UserWorkspaceLayout.jsx';

import '../../activities/pages/ActivitiesPage.css';
import './UserAssistantPage.css';

// Evita títulos H1 dentro de las respuestas: solo la página tiene un H1.
const MARKDOWN_COMPONENTS = {
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h4>{children}</h4>,
};

const SUGGESTED_QUESTIONS = [
  '¿Cómo puedo preparar mejor una reunión con un cliente?',
  '¿Qué puedo hacer si un cliente olvida nuestras reuniones?',
  '¿Cómo retomo una oportunidad comercial sin seguimiento?',
];

export default function UserAssistantPage() {
  const { token } = useAuth();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const nextMessageId = useRef(0);
  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (threadRef.current && (messages.length || loading)) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function createMessage(role, content) {
    nextMessageId.current += 1;
    return { id: nextMessageId.current, role, content };
  }

  async function sendQuestion() {
    const text = question.trim();
    if (!text || loading) return;

    const userMessage = createMessage('user', text);
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setError('');
    setLoading(true);

    try {
      // Conserva el endpoint y el JWT de FinCRM; solo cambia su presentación.
      const answer = await consultarIA(token, text);
      const assistantMessage = createMessage('assistant', answer);
      setMessages((current) => [...current, assistantMessage]);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo consultar el asistente.');
      // Permite reintentar sin volver a escribir la pregunta.
      setQuestion((current) => current || text);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendQuestion();
  }

  function handleKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      sendQuestion();
    }
  }

  function chooseSuggestion(suggestion) {
    setQuestion(suggestion);
    textareaRef.current?.focus();
  }

  async function copyAnswer(message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
    } catch {
      setError('No se pudo copiar la respuesta. Selecciona el texto para copiarlo.');
    }
  }

  function clearConversation() {
    if (loading) return;
    setMessages([]);
    setQuestion('');
    setError('');
    setCopiedId(null);
    textareaRef.current?.focus();
  }

  return (
    <UserWorkspaceLayout>
      <main className="fin-act fin-usr-ai">
        <Link className="fin-act-back" to={PATHS.userDashboard}>
          <ArrowLeft size={18} aria-hidden="true" />
          Volver a mi panel
        </Link>

        <header className="fin-act-page-heading fin-usr-ai-page-heading">
          <div>
            <h1>Asistente inteligente</h1>
            <p>
              Resuelve dudas sobre tus gestiones comerciales y prepara tus
              próximos seguimientos.
            </p>
          </div>
        </header>

        <section className="fin-act-card fin-usr-ai-workspace" aria-labelledby="fin-ai-title">
          <div className="fin-usr-ai-workspace-heading">
            <div className="fin-usr-ai-brand">
              <span className="fin-usr-ai-brand-icon" aria-hidden="true">
                <Sparkles size={24} />
              </span>
              <div>
                <h2 id="fin-ai-title">Conversación con Gemini</h2>
                <p>Asistente de apoyo para tu trabajo en FinCRM</p>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                className="fin-usr-ai-clear"
                onClick={clearConversation}
                disabled={loading}
              >
                <Trash2 size={17} aria-hidden="true" />
                Limpiar conversación
              </button>
            )}
          </div>

          <div
            className="fin-usr-ai-thread"
            role="log"
            aria-label="Mensajes de la conversación"
            aria-live="polite"
            aria-relevant="additions"
            ref={threadRef}
          >
            {messages.length === 0 && !loading && (
              <div className="fin-usr-ai-empty">
                <div className="fin-usr-ai-empty-icon" aria-hidden="true">
                  <MessageCircle size={28} />
                </div>
                <h3>¿En qué puedo ayudarte hoy?</h3>
                <p>
                  Puedes preguntar cómo preparar reuniones, dar seguimiento a
                  clientes o mejorar una conversación comercial.
                </p>
                <div className="fin-usr-ai-suggestions" aria-label="Preguntas sugeridas">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => chooseSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`fin-usr-ai-message fin-usr-ai-message--${message.role}`}
              >
                <span className="fin-usr-ai-avatar" aria-hidden="true">
                  {message.role === 'user' ? (
                    <UserRound size={20} />
                  ) : (
                    <Bot size={21} />
                  )}
                </span>
                <div className="fin-usr-ai-message-content">
                  <div className="fin-usr-ai-speaker">
                    {message.role === 'user' ? 'Tú' : 'FinCRM IA'}
                  </div>
                  <div className="fin-usr-ai-bubble">
                    {message.role === 'assistant' ? (
                      <div className="fin-usr-ai-markdown">
                        {/* Muestra negritas, listas y párrafos reales. No procesa HTML sin sanitizar. */}
                        <ReactMarkdown components={MARKDOWN_COMPONENTS}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  {message.role === 'assistant' && (
                    <button
                      type="button"
                      className="fin-usr-ai-copy"
                      onClick={() => copyAnswer(message)}
                      aria-label="Copiar respuesta de la inteligencia artificial"
                    >
                      {copiedId === message.id ? (
                        <Check size={15} aria-hidden="true" />
                      ) : (
                        <Copy size={15} aria-hidden="true" />
                      )}
                      {copiedId === message.id ? 'Copiado' : 'Copiar respuesta'}
                    </button>
                  )}
                </div>
              </article>
            ))}

            {loading && (
              <div className="fin-usr-ai-message fin-usr-ai-message--assistant" role="status">
                <span className="fin-usr-ai-avatar" aria-hidden="true">
                  <Bot size={21} />
                </span>
                <div className="fin-usr-ai-message-content">
                  <div className="fin-usr-ai-speaker">FinCRM IA</div>
                  <div className="fin-usr-ai-bubble fin-usr-ai-waiting">
                    <LoaderCircle size={18} className="fin-usr-ai-spinner" aria-hidden="true" />
                    Preparando respuesta…
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="fin-act-feedback fin-act-feedback-error fin-usr-ai-error" role="alert">
              {error}
            </div>
          )}

          <form className="fin-usr-ai-composer" onSubmit={handleSubmit}>
            <label htmlFor="fin-ia-question">Escribe tu pregunta</label>
            <div className="fin-usr-ai-compose-box">
              <textarea
                ref={textareaRef}
                id="fin-ia-question"
                required
                rows={2}
                maxLength={1000}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej.: ¿Cómo puedo confirmar una reunión sin incomodar al cliente?"
                aria-describedby="fin-usr-ai-input-help"
              />
              <div className="fin-usr-ai-compose-actions">
                <span id="fin-usr-ai-input-help">
                  Enter para enviar · Shift + Enter para otra línea
                </span>
                <button
                  className="fin-usr-ai-send"
                  type="submit"
                  disabled={!question.trim() || loading}
                >
                  {loading ? (
                    <LoaderCircle size={18} className="fin-usr-ai-spinner" aria-hidden="true" />
                  ) : (
                    <Send size={18} aria-hidden="true" />
                  )}
                  {loading ? 'Consultando…' : 'Preguntar a la IA'}
                </button>
              </div>
            </div>
          </form>

          <div className="fin-usr-ai-footnote">
            <p>
              La IA puede equivocarse. Verifica sus recomendaciones y evita
              compartir contraseñas, documentos o información sensible.
            </p>
            <p>
              ¿Quieres analizar encuentros reales de un cliente? Ve a{' '}
              <Link to={PATHS.userOpportunities}>Mis oportunidades</Link>.
            </p>
          </div>
        </section>
      </main>
    </UserWorkspaceLayout>
  );
}
