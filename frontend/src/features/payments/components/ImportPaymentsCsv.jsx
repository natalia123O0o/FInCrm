
import { useRef, useState } from "react";

const API_URL = "http://localhost:4000";

export default function ImportPaymentsCsv({ token, onImported }) {
    const inputRef = useRef(null);

    const [archivo, setArchivo] = useState(null);
    const [vistaPrevia, setVistaPrevia] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");
    const [error, setError] = useState("");

    // Seleccionar un archivo CSV.
    function seleccionarArchivo(evento) {
        const seleccionado = evento.target.files?.[0] || null;

        setArchivo(seleccionado);
        setVistaPrevia(null);
        setError("");
        setMensajeExito("");
    }

    // Revisar el CSV sin registrar abonos.
    async function revisarArchivo() {
        if (!archivo) {
            setError("Selecciona primero un archivo CSV.");
            return;
        }

        if (!archivo.name.toLowerCase().endsWith(".csv")) {
            setError("El archivo debe tener extensión .csv");
            return;
        }

        if (archivo.size > 1024 * 1024) {
            setError("El archivo supera el máximo de 1 MB.");
            return;
        }

        try {
            setCargando(true);
            setError("");
            setVistaPrevia(null);

            const formData = new FormData();
            formData.append("file", archivo);

            const respuesta = await fetch(
                `${API_URL}/api/payments/import/preview`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const tipoContenido =
                respuesta.headers.get("content-type") || "";

            if (!tipoContenido.includes("application/json")) {
                throw new Error(
                    "El servidor no devolvió una respuesta JSON."
                );
            }

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.message || "No fue posible revisar el CSV."
                );
            }

            setVistaPrevia(datos);
        } catch (err) {
            setError(err.message || "Error al revisar el archivo.");
        } finally {
            setCargando(false);
        }
    }

    // Limpiar el formulario.
    function limpiar() {
        setArchivo(null);
        setVistaPrevia(null);
        setError("");
        setMensajeExito("");

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }


    async function confirmarImportacion() {
        // Solo se permite confirmar un archivo validado.
        if (!archivo || !vistaPrevia?.puedeImportar) {
            setError("Primero debes validar un CSV sin errores.");
            return;
        }

        if (confirmando || cargando) return;

        const aceptar = window.confirm(
            `¿Confirmas registrar ${vistaPrevia.cantidadValidos} abonos? ` +
            "Esta operación modificará los saldos de las deudas."
        );

        if (!aceptar) return;

        try {
            setConfirmando(true);
            setError("");
            setMensajeExito("");

            const formData = new FormData();
            formData.append("file", archivo);

            const respuesta = await fetch(
                "http://localhost:4000/api/payments/import/confirm",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const tipo =
                respuesta.headers.get("content-type") || "";

            if (!tipo.includes("application/json")) {
                throw new Error(
                    "El servidor no devolvió una respuesta JSON."
                );
            }

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.message || "No fue posible importar los abonos."
                );
            }

            // La confirmación fue aceptada por el backend.
            setMensajeExito(
                `Se registraron ${datos.totalImportados} abonos correctamente.`
            );

            // Evitar que se confirme otra vez la misma vista previa.
            setArchivo(null);
            setVistaPrevia(null);

            if (inputRef.current) {
                inputRef.current.value = "";
            }

            // Actualizar las deudas y el historial de pagos.
            // Si falla la actualización visual, los pagos ya se guardaron.
            try {
                if (onImported) {
                    await onImported();
                }
            } catch {
                setError(
                    "Los abonos se guardaron, pero no se pudo actualizar " +
                    "la información en pantalla. Recarga la página."
                );
            }
        } catch (err) {
            setError(err.message || "Error al importar abonos.");

            // La vista previa puede haber quedado desactualizada.
            setVistaPrevia(null);
        } finally {
            setConfirmando(false);
        }
    }


    return (
        <section
            style={{
                marginTop: "24px",
                padding: "20px",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
            }}
        >
            <h2>Importar abonos desde CSV</h2>

            <p>
                Selecciona un archivo para revisar los abonos
                antes de registrarlos.
            </p>

            <p>
                <strong>Columnas esperadas:</strong>
            </p>

            <code
                style={{
                    display: "block",
                    overflowWrap: "anywhere",
                    marginBottom: "12px",
                }}
            >
                externalReference,amount,paymentDate,paymentMethod,
                reference,importReference
            </code>

            <p>Máximo 500 abonos y 1 MB por archivo.</p>

            <label htmlFor="archivo-abonos">
                Archivo CSV de abonos
            </label>

            <div style={{ marginTop: "8px" }}>
                <input
                    id="archivo-abonos"
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={seleccionarArchivo}
                />
            </div>

            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "16px",
                    flexWrap: "wrap",
                }}
            >
                <button
                    type="button"
                    disabled={cargando || !archivo}
                    onClick={revisarArchivo}
                    style={{
                        padding: "10px 16px",
                        backgroundColor: "#142c49",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                    }}
                >
                    {cargando ? "Revisando..." : "Revisar archivo CSV"}
                </button>

                <button
                    type="button"
                    onClick={limpiar}
                    disabled={cargando}
                    style={{
                        padding: "10px 16px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        cursor: "pointer",
                    }}
                >
                    Limpiar
                </button>
            </div>

            {error && (
                <p role="alert" style={{ color: "#b91c1c" }}>
                    {error}
                </p>
            )}

            {vistaPrevia && (
                <div style={{ marginTop: "24px" }}>
                    <h3>Resultado de la validación</h3>

                    <p>Total: {vistaPrevia.total}</p>
                    <p>Abonos válidos: {vistaPrevia.cantidadValidos}</p>
                    <p>Abonos con errores: {vistaPrevia.cantidadErrores}</p>

                    {vistaPrevia.validos?.length > 0 && (
                        <>
                            <h4>Abonos válidos</h4>

                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th>Fila</th>
                                            <th>Deuda</th>
                                            <th>Abono</th>
                                            <th>Saldo actual</th>
                                            <th>Método</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {vistaPrevia.validos.map((abono) => (
                                            <tr key={abono.fila}>
                                                <td>{abono.fila}</td>
                                                <td>{abono.externalReference}</td>
                                                <td>${abono.amount.toLocaleString("es-CO")}</td>
                                                <td>
                                                    ${abono.saldoActual.toLocaleString("es-CO")}
                                                </td>
                                                <td>{abono.paymentMethod}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {vistaPrevia.errores?.length > 0 && (
                        <>
                            <h4 style={{ color: "#b91c1c" }}>
                                Abonos con errores
                            </h4>

                            {vistaPrevia.errores.map((abono) => (
                                <div
                                    key={abono.fila}
                                    style={{
                                        padding: "10px",
                                        marginBottom: "8px",
                                        border: "1px solid #fecaca",
                                        borderRadius: "8px",
                                    }}
                                >
                                    <strong>Fila {abono.fila}</strong>

                                    <p>{abono.externalReference}</p>

                                    <ul>
                                        {abono.motivos.map((motivo, indice) => (
                                            <li key={indice}>{motivo}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </>
                    )}


                    {vistaPrevia.puedeImportar ? (
                        <div>
                            <p style={{ color: "#166534" }}>
                                El archivo superó las validaciones.
                                Puedes confirmar la importación.
                            </p>

                            <button
                                type="button"
                                disabled={confirmando || cargando}
                                onClick={confirmarImportacion}
                                style={{
                                    padding: "12px 18px",
                                    backgroundColor: "#166534",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                {confirmando
                                    ? "Registrando abonos..."
                                    : `Confirmar importación de ${vistaPrevia.cantidadValidos} abonos`}
                            </button>
                        </div>
                    ) : (
                        <p style={{ color: "#b91c1c" }}>
                            Corrige los errores antes de importar.
                        </p>
                    )}


                    <p>
                        <strong>Importante:</strong> esta es una vista
                        previa. No se ha modificado ningún saldo.
                    </p>
                </div>
            )}
        </section>
    );
}
