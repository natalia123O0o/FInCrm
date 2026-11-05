
const DEFAULT_CHANNELS = ["email", "sms"];

// Convertir una hora como "07:30" a minutos
const toMinutes = (time) => {
  if (
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

// Validar horario y canal de contacto
const validateBasicContactRules = ({
  channel,
  date = new Date(),
  tenantSettings = {}
}) => {
  const collection = tenantSettings.collection || {};

  // 1. Verificar el canal
  const allowedChannels = Array.isArray(collection.allowedChannels)
    ? collection.allowedChannels
    : DEFAULT_CHANNELS;

  if (!allowedChannels.includes(channel)) {
    return {
      valid: false,
      message: "Canal de contacto no permitido"
    };
  }

  // 2. Obtener la fecha y hora de la empresa
  let parts;

  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tenantSettings.timezone || "America/Bogota",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
  } catch (error) {
    return {
      valid: false,
      message: "Fecha o zona horaria no válida"
    };
  }

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value;

  const day = getPart("weekday");
  const currentMinutes =
    Number(getPart("hour")) * 60 +
    Number(getPart("minute"));

  // 3. No permitir contactos los domingos
  if (day === "Sun") {
    return {
      valid: false,
      message: "No se permiten contactos los domingos"
    };
  }

  // 4. Establecer horarios máximos
  const isSaturday = day === "Sat";

  const legalStart = isSaturday ? "08:00" : "07:00";
  const legalEnd = isSaturday ? "15:00" : "19:00";

  const companyStart = isSaturday
    ? collection.saturdayStart || legalStart
    : collection.weekdaysStart || legalStart;

  const companyEnd = isSaturday
    ? collection.saturdayEnd || legalEnd
    : collection.weekdaysEnd || legalEnd;

  // La empresa puede restringir el horario,
  // pero no ampliarlo más allá del límite general.
  const start = Math.max(
    toMinutes(legalStart),
    toMinutes(companyStart)
  );

  const end = Math.min(
    toMinutes(legalEnd),
    toMinutes(companyEnd)
  );

  if (!Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start >= end) {
    return {
      valid: false,
      message: "Configuración de horarios no válida"
    };
  }

  // 5. Comprobar el horario
  if (currentMinutes < start || currentMinutes >= end) {
    return {
      valid: false,
      message: "Contacto fuera del horario permitido"
    };
  }

  return {
    valid: true,
    message: "Horario y canal permitidos"
  };
};

module.exports = {
  validateBasicContactRules
};
