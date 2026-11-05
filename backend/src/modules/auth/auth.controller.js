const User = require("../users/user.model.js");
const Tenant = require("../tenants/tenant.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  const { email, password } = req.body; //busca en la base datos el correo o la contraseña

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({
      message: "Credenciales incorrectas",
    });
  }

  const isPasswordVaild = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordVaild) {
    return res.status(401).json({
      message: "Credenciales incorrectas",
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      message: "Usuario desactivado",
    });
  }

  if (user.role !== "SUPER_ADMIN") {
    const tenant = await Tenant.findById(user.tenantId);

    if (!tenant || tenant.status !== "ACTIVE") {
      //el estado de la empresa
      return res.status(403).json({
        message: "Acceso no permitido",
      });
    }
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  user.lastLoginAt = new Date();
  await user.save();

  return res.status(200).json({
    message: "Inicio de sesion exitoso",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
};

module.exports = {
  login,
};
