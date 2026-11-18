
const { generarExcelCartera } = require("./reportes.tools");

// GET /api/ai/reportes/cartera
const descargarReporteCartera = async (req, res) => {
  try {
    // Identificamos la empresa autenticada.
    const tenantId = req.user?.tenantId;

    // Evitamos consultas sin empresa asignada.
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada",
      });
    }

    // Generamos el Excel con información real.
    const archivo = await generarExcelCartera(tenantId);

    // Indicamos que la respuesta es un archivo Excel.
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Indicamos que el navegador debe descargarlo.
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="fincrm-cartera.xlsx"'
    );

    // Enviamos el tamaño del archivo.
    res.setHeader("Content-Length", archivo.length);

    // Evitamos almacenar el reporte en cachés compartidas.
    res.setHeader("Cache-Control", "no-store");

    // Entregamos el archivo al navegador.
    return res.status(200).send(archivo);

  } catch (error) {
    console.error(
      "Error al generar reporte de cartera:",
      error.message
    );

    return res.status(500).json({
      message: "No fue posible generar el reporte de cartera",
    });
  }
};

module.exports = { descargarReporteCartera };
