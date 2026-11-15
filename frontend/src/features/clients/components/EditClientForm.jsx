
import { useState } from "react";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { updateClient } from "../services/clients.api.js";

export default function EditClientForm({
    client,
    onClientUpdated,
    onCancel,
}) {
    // Obtenemos el JWT del administrador.
    const { token } = useAuth();

    // El formulario comienza con el nombre actual.
    const [name, setName] = useState(client.name);

    const [documentNumber, setDocumentNumber] = useState(
        client.documentNumber || ""
    );

    const [email, setEmail] = useState(client.email || "");

    const [phone, setPhone] = useState(client.phone || "");

    const [address, setAddress] = useState(
        client.address || ""
    );

    // Estados para controlar la petición.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Enviamos únicamente el nuevo nombre.

            const clientData = {
                name: name.trim(),
                documentNumber: documentNumber.trim(),
            };

            // Agregamos los datos opcionales que tengan contenido.
            if (email.trim()) {
                clientData.email = email.trim();
            }

            if (phone.trim()) {
                clientData.phone = phone.trim();
            }

            if (address.trim()) {
                clientData.address = address.trim();
            }

            // Enviamos los datos al backend.
            const updatedClient = await updateClient(
                token,
                client._id,
                clientData
            );

            // Avisamos a la página que se actualizó.
            onClientUpdated(updatedClient);

        } catch (err) {
            setError(err.message);

        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                display: "grid",
                gap: "12px",
                maxWidth: "400px",
                marginTop: "24px",
            }}
        >
            <h2>Editar cliente</h2>

            <label htmlFor="edit-client-name">
                Nombre completo
            </label>

            <input
                id="edit-client-name"
                type="text"
                value={name}
                onChange={(event) =>
                    setName(event.target.value)
                }
                required
            />


            <label htmlFor="edit-document">
                Número de documento *
            </label>
            <input
                id="edit-document"
                type="text"
                value={documentNumber}
                onChange={(event) =>
                    setDocumentNumber(event.target.value)
                }
                required
            />

            <label htmlFor="edit-email">
                Correo electrónico
            </label>
            <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="edit-phone">
                Teléfono
            </label>
            <input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
            />

            <label htmlFor="edit-address">
                Dirección
            </label>
            <input
                id="edit-address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
            />


            {error && (
                <p role="alert" style={{ color: "#c62828" }}>
                    {error}
                </p>
            )}

            <button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
                type="button"
                onClick={onCancel}
                disabled={loading}
            >
                Cancelar
            </button>
        </form>
    );
}
