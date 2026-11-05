
const authorizeRoles = (...allowedRoles) => { // son los roles los cuales se tiene permiso
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {//rl rol del usaurio autenticado y .includes sirve para comprobar si el rol esta permitido
      return res.status(403).json({
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
