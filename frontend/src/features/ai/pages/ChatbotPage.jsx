import { useAuth } from "../../auth/context/AuthContext.jsx";
import ChatbotWidget from "../components/ChatbotWidget.jsx";

export default function ChatbotPage() {
    // Obtenemos el JWT de la sesión actual.
    const { token } = useAuth();

    return (
        <main>
            <ChatbotWidget token={token} />
        </main>
    );
}
