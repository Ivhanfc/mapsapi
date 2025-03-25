require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración CORS amplia para desarrollo y producción móvil
const corsOptions = {
  origin: '*', // Permite todas las origenes (ajusta en producción)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar pre-flight para todas las rutas
app.use(bodyParser.json());

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

if (!accountSid || !authToken || !serviceSid) {
  console.error('Faltan variables de entorno de Twilio');
  process.exit(1);
}

const client = new Twilio(accountSid, authToken);

// Middleware para validar número de teléfono
const validatePhoneNumber = (req, res, next) => {
  const { phoneNumber } = req.body;
  const phoneRegex = /^\+[1-9]\d{1,14}$/; // Formato E.164
  
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({ 
      error: 'Formato inválido',
      message: 'El número debe incluir código de país (ej. +521234567890)' 
    });
  }
  next();
};

// Ruta para enviar código de verificación
app.post('/send-verification', validatePhoneNumber, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const verification = await client.verify.v2.services(serviceSid)
      .verifications
      .create({ 
        to: phoneNumber, 
        channel: 'sms',
        locale: 'es' // Para mensajes en español
      });

    res.json({
      status: 'success',
      message: 'Código enviado correctamente',
      verificationSid: verification.sid,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en send-verification:', {
      code: error.code,
      message: error.message,
      moreInfo: error.more_info,
      phoneNumber: req.body.phoneNumber
    });

    let statusCode = 500;
    let errorMessage = 'Error al enviar el código';
    
    // Manejo específico de error 21608 (número no verificado)
    if (error.code === 21608) {
      statusCode = 403;
      errorMessage = 'El número no está verificado. Prueba con un número autorizado.';
    }

    res.status(statusCode).json({
      status: 'error',
      error: errorMessage,
      details: error.message,
      twilioCode: error.code
    });
  }
});

// Ruta para verificar código
app.post('/verify-code', validatePhoneNumber, async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'El código debe tener 6 dígitos'
      });
    }

    const verificationCheck = await client.verify.v2.services(serviceSid)
      .verificationChecks
      .create({ to: phoneNumber, code: code });

    if (verificationCheck.status === 'approved') {
      res.json({
        status: 'success',
        message: 'Código verificado correctamente',
        phoneNumber: verificationCheck.to,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        status: 'error',
        error: 'Código incorrecto',
        details: verificationCheck.status
      });
    }
  } catch (error) {
    console.error('Error en verify-code:', error);
    res.status(500).json({
      status: 'error',
      error: 'Error al verificar el código',
      details: error.message
    });
  }
});

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().to
