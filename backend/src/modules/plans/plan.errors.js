'use strict';

class PlanError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PlanError';
    this.status = status;
    this.code = code;
  }
}

function sendError(res, error) {
  if (error instanceof PlanError) return res.status(error.status).json({ code: error.code, message: error.message });
  if (error.code === 11000) return res.status(409).json({ code: 'DUPLICATE_RECORD', message: 'Ya existe un registro con esos datos únicos.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ code: 'INVALID_DATA', message: 'Revisa el formato y los campos obligatorios.' });
  }
  console.error('Administración de planes:', error.message);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'No se pudo guardar el cambio. Intenta nuevamente.' });
}

module.exports = { PlanError, sendError };
