// Importa el modelo 'Client' para poder interactuar con la colección de clientes en MongoDB
const Client = require('./client.model');

/**
 * Controlador para registrar un nuevo cliente de forma segura y controlada.
 * Utiliza async/await para manejar operaciones asíncronas con la base de datos.
 */
const createClient = async (req, res) => {
  try {

    // 1. Obtiene el identificador de la empresa del usuario autenticado (extraído del token o middleware previo)
    const tenantId = req.user.tenantId;

    // Verifica de seguridad: comprueba que el usuario realmente tenga una empresa asignada
    if (!tenantId) {
      return res.status(403).json({
        message: 'El usuario no tiene una empresa asignada'
      });
    }

    // 2. Extrae los datos enviados en el cuerpo de la petición (ej. desde Postman o el Frontend)
    const {
      name,
      documentNumber,
      email,
      phone,
      address
    } = req.body;

    // 3. Valida campos obligatorios a nivel de lógica de negocio antes de consultar la base de datos
    if (!name || !documentNumber) {
      return res.status(400).json({
        message: 'El nombre y el documento son obligatorios'
      });
    }

    // 4. Comprobación previa: verifica si ya existe un cliente con ese mismo documento dentro de la misma empresa
    const existingClient = await Client.findOne({
      tenantId: tenantId,
      documentNumber: documentNumber
    });

    // Si ya existe, interrumpe la ejecución y responde con un código 409 (Conflict)
    if (existingClient) {
      return res.status(409).json({
        message: 'El cliente ya está registrado en esta empresa'
      });
    }

    // 5. Crea y guarda el nuevo cliente en la base de datos con los datos proporcionados
    const client = await Client.create({
      tenantId: tenantId,
      name: name,
      documentNumber: documentNumber,
      email: email,
      phone: phone,
      address: address
    });

    // 6. Envía una respuesta exitosa al cliente HTTP con el código 201 (Created)
    return res.status(201).json({
      message: 'Cliente registrado correctamente',
      client: client
    });

  } catch (error) {
    // Manejo de errores de MongoDB: El código 11000 indica violación de índice único (duplicidad)
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'El cliente ya está registrado en esta empresa'
      });
    }

    // Si ocurre cualquier otro error inesperado, lo registra en la consola del servidor
    console.error(error);

    // Responde con un error genérico de servidor (500)
    return res.status(500).json({
      message: 'Error al registrar el cliente'
    });
  }
};


const getClients = async (req, res) => {
  try {
    // 1. Obtener la empresa del administrador autenticado
    const tenantId = req.user.tenantId;

    // 2. Verificar que tenga una empresa asignada
    if (!tenantId) {
      return res.status(403).json({
        message: "El usuario no tiene una empresa asignada"
      });
    }

    // 3. Buscar únicamente clientes de su empresa
    const clients = await Client.find({
      tenantId: tenantId,
      isActive: true
    }).sort({ createdAt: -1 });

    // 4. Devolver la lista de clientes
    return res.status(200).json({
      message: "Clientes obtenidos correctamente",
      total: clients.length,
      clients: clients
    });

  } catch (error) {
    console.error("Error al consultar clientes:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


const mongoose = require("mongoose");

// Consultar un cliente por su ID
const getClientById = async (req, res) => {
  try {
    // 1. Obtener la empresa del administrador
    const tenantId = req.user.tenantId;

    // 2. Obtener el ID del cliente desde la URL
    const { id } = req.params;

    // 3. Verificar que el administrador tenga empresa
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 4. Validar que el ID tenga formato correcto
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de cliente inválido"
      });
    }

    // 5. Buscar el cliente únicamente en su empresa
    const client = await Client.findOne({
      _id: id,
      tenantId: tenantId,
      isActive: true
    });

    // 6. Si no existe o pertenece a otra empresa
    if (!client) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 7. Respuesta exitosa
    return res.status(200).json({
      message: "Cliente obtenido correctamente",
      client: client
    });

  } catch (error) {
    console.error("Error al consultar cliente:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


const updateClient = async (req, res) => {
  try {
    // 1. Obtener la empresa y el ID del cliente
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // 2. Verificar que el usuario tenga empresa
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 3. Validar el ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de cliente inválido"
      });
    }

    // 4. Campos que se pueden modificar
    const allowedFields = [
      "name",
      "documentNumber",
      "email",
      "phone",
      "address"
    ];

    // 5. Validar los datos recibidos
    const data = req.body;

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).length === 0 ||
      Object.keys(data).some(
        key => !allowedFields.includes(key)
      )
    ) {
      return res.status(400).json({
        message: "Datos de actualización inválidos"
      });
    }

    // 6. Comprobar los valores
    for (const [key, value] of Object.entries(data)) {
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return res.status(400).json({
          message: `Valor inválido para ${key}`
        });
      }
    }

    // 7. Buscar el cliente en la empresa
    const client = await Client.findOne({
      _id: id,
      tenantId: tenantId,
      isActive: true
    });

    if (!client) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 8. Actualizar únicamente los campos permitidos
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        client[key] = data[key].trim();
      }
    }

    // Si cambia el correo, su verificación anterior ya no es válida.
    if (data.email !== undefined && client.isModified('email')) {
      client.emailVerifiedAt = null;
    }

    // 9. Guardar cambios en MongoDB
    await client.save();

    // 10. Respuesta exitosa
    return res.status(200).json({
      message: "Cliente actualizado correctamente",
      client: client
    });

  } catch (error) {

    // Documento duplicado
    if (error.code === 11000) {
      return res.status(409).json({
        message: "El documento ya existe en esta empresa"
      });
    }

    console.error("Error al actualizar cliente:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


const deleteClient = async (req, res) => {
  try {
    // 1. Obtener la empresa del administrador
    const tenantId = req.user.tenantId;

    // 2. Obtener el ID del cliente
    const { id } = req.params;

    // 3. Verificar que tenga empresa asignada
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 4. Validar el formato del ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de cliente inválido"
      });
    }

    // 5. Buscar únicamente en su empresa
    const client = await Client.findOne({
      _id: id,
      tenantId: tenantId,
      isActive: true
    });

    // 6. Verificar que el cliente exista
    if (!client) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 7. Desactivar el cliente
    client.isActive = false;

    // 8. Guardar el cambio en MongoDB
    await client.save();

    // 9. Responder correctamente
    return res.status(200).json({
      message: "Cliente desactivado correctamente",
      client: {
        _id: client._id,
        name: client.name,
        isActive: client.isActive
      }
    });

  } catch (error) {
    console.error("Error al desactivar cliente:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


// Exporta el controlador como un objeto para que pueda ser utilizado en las rutas de la aplicación
module.exports = { 
    createClient ,
    getClients,
    getClientById,
    updateClient,
    deleteClient
};