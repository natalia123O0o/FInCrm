// Importa los hooks 'useEffect' y 'useState' de React para manejar efectos secundarios (como llamadas a una API) y estados locales.
import { useEffect, useState } from "react";

// Importa el hook 'useAuth' para acceder al contexto de autenticación y obtener el token de sesión.
import { useAuth } from "../../auth/context/AuthContext.jsx";
// Importa la función 'getPayments' encargada de realizar la petición HTTP al backend para obtener los pagos.
import { getPayments } from "../services/payments.api.js";

// Define y exporta por defecto el componente funcional 'PaymentsHistory' que recibe una propiedad opcional 'refreshKey' (por defecto 0) para forzar actualizaciones.
export default function PaymentsHistory({ refreshKey = 0 }) {
    // Extrae el token de autenticación del contexto global mediante el hook 'useAuth'.
    const { token } = useAuth();

    // Define el estado 'payments' para almacenar la lista de pagos obtenidos del backend (inicia como un arreglo vacío).
    const [payments, setPayments] = useState([]);

    // Define el estado 'loading' para controlar el indicador visual de carga (inicia en true).
    const [loading, setLoading] = useState(true);
    // Define el estado 'error' para almacenar y mostrar posibles mensajes de error si la petición falla.
    const [error, setError] = useState("");

    // Hook 'useEffect' que se ejecuta al montar el componente o cuando cambian 'token' o 'refreshKey'.
    useEffect(() => {
        // Bandera local 'active' para prevenir actualizaciones de estado si el componente se desmonta mientras la petición está en curso.
        let active = true;

        // Función asíncrona interna para cargar los pagos desde la API.
        async function loadPayments() {
            // Activa el estado de carga y limpia cualquier error previo al iniciar la petición.
            setLoading(true);
            setError("");

            try {
                // Realiza la petición asíncrona para obtener los pagos enviando el token de autenticación.
                const data = await getPayments(token);

                // Si el componente sigue montado, guarda los datos obtenidos en el estado 'payments'.
                if (active) {
                    setPayments(data);
                }
            } catch (err) {
                // Si ocurre un error y el componente sigue montado, guarda el mensaje de error en el estado.
                if (active) {
                    setError(err.message);
                }
            } finally {
                // Al terminar (éxito o fallo), si el componente sigue montado, desactiva el estado de carga.
                if (active) {
                    setLoading(false);
                }
            }
        }

        // Ejecuta la función de carga de pagos.
        loadPayments();

        // Función de limpieza que cambia 'active' a falso si el componente se desmonta.
        return () => {
            active = false;
        };
    }, [token, refreshKey]);

    // Función auxiliar para formatear valores numéricos a pesos colombianos (COP).
    function formatMoney(value) {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(value);
    }

    // Función auxiliar para formatear la fecha y hora de un pago al estándar local de Colombia.
    function formatDate(value) {
        // Si no viene fecha, retorna un texto por defecto.
        if (!value) return "Sin fecha";

        // Usa Intl.DateTimeFormat para mostrar fecha mediana y hora corta ajustada a la zona horaria de Bogotá.
        return new Intl.DateTimeFormat("es-CO", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/Bogota",
        }).format(new Date(value));
    }

    // Objeto diccionario para traducir los identificadores de medios de pago del sistema a textos amigables para el usuario.
    const methodLabels = {
        CASH: "Efectivo",
        TRANSFER: "Transferencia",
        CARD: "Tarjeta",
        OTHER: "Otro",
    };

    // Renderiza la estructura visual de la sección del historial de pagos.
    return (
        // Etiqueta semántica de sección con un margen superior de 32px.
        <section style={{ marginTop: "32px" }}>
            {/* Título de la sección */}
            <h2>Historial de pagos</h2>

            {/* Renderizado condicional: muestra un texto de carga si 'loading' es verdadero. */}
            {loading && <p>Cargando pagos...</p>}

            {/* Renderizado condicional: muestra una alerta roja con el error si ocurre alguno. */}
            {error && (
                <p role="alert" style={{ color: "#c62828" }}>
                    {error}
                </p>
            )}

            {/* Renderizado condicional: se muestra solo cuando ya cargó correctamente y no hay errores. */}
            {!loading && !error && (
                <>
                    {/* Muestra la cantidad total de pagos registrados */}
                    <p>Total de pagos: {payments.length}</p>

                    {/* Validación ternaria: si no hay pagos, muestra un mensaje informativo; si hay, dibuja la tabla. */}
                    {payments.length === 0 ? (
                        <p>No hay pagos registrados.</p>
                    ) : (
                        // Contenedor con scroll horizontal para asegurar responsividad en pantallas pequeñas.
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    borderCollapse: "collapse",
                                }}
                            >
                                {/* Cabecera de la tabla con los títulos de las columnas */}
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Deuda</th>
                                        <th>Valor</th>
                                        <th>Medio</th>
                                        <th>Referencia</th>
                                    </tr>
                                </thead>

                                {/* Cuerpo de la tabla: recorre el arreglo 'payments' para generar una fila (tr) por cada pago. */}
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment._id}>
                                            {/* Muestra la fecha del pago formateada */}
                                            <td>
                                                {formatDate(payment.paymentDate)}
                                            </td>

                                            {/* Muestra los últimos 8 caracteres del ID de la deuda asociada y coloca el ID completo en el atributo 'title' como tooltip. */}
                                            <td title={payment.debtId}>
                                                {String(payment.debtId).slice(-8)}
                                            </td>

                                            {/* Muestra el valor del pago formateado como moneda */}
                                            <td>{formatMoney(payment.amount)}</td>

                                            {/* Muestra la etiqueta traducida del medio de pago, o el valor original si no existe coincidencia. */}
                                            <td>
                                                {methodLabels[payment.paymentMethod] ||
                                                    payment.paymentMethod}
                                            </td>

                                            {/* Muestra la referencia del pago o "Sin referencia" si viene vacía o nula. */}
                                            <td>
                                                {payment.reference || "Sin referencia"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}