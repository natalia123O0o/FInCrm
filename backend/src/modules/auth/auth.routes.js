const express = require('express');
const router = express.Router();

const { login } = require('./auth.controller');
const protect = require('../../middlewares/auth.middleware')

router.post('/login', login);// le indica a express que cuando llegue una peticion de POST debe ejecutar la funcion de login

router.get('/me', protect, (req, res) => { //primero se ejecuta protect y solamente si autoriza el acceso se ejecuta la función que devuelve los datos del usuario.
    res.status(200).json({
        message: 'Usuario autenticado',
        user:{
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            tenantId: req.user.tenantId
        }
    });
})

module.exports = router;