const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Twilio = require('twilio');

const app = express();
const port = 3000; // Define el puerto

// Permitir solicitudes CORS desde cualquier origen
app.use(cors());
// Rutas
app.get('/api/data', (req, res) => {
    res.json({ mensaje: "Hola desde el servidor en Render!" });
  });
  
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
  
// Configura el body parser para procesar datos JSON
app.use(bodyParser.json());

// Configura tus credenciales de Twilio
const accountSid = 'AC48ef12d5c5611329b071ee368d4669f6'; // Reemplaza con tu Account SID
const authToken = '84af1ee6830eb10d6b2f488e2a0e659e'; // Reemplaza con tu Auth Token
const serviceSid = 'VAa70ed31c8b43069a3a4f831bff9cf011'; // Reemplaza con tu Service SID

const client = Twilio(accountSid, authToken);

// Ruta para enviar el código de verificación
app.post('/send-verification', (req, res) => {
    const { phoneNumber } = req.body;

    client.verify.v2.services(serviceSid) // Cambié "verify.services" a "verify.v2.services"
        .verifications
        .create({ to: phoneNumber, channel: 'sms' })
        .then(verification => {
            res.status(200).send({ message: 'Código enviado correctamente' });
        })
        .catch(error => {
            res.status(500).send({ error: 'Error al enviar el código', details: error });
        });
});

// Ruta para verificar el código
app.post('/verify-code', (req, res) => {
    const { phoneNumber, code } = req.body;

    client.verify.v2.services(serviceSid) // Cambié "verify.services" a "verify.v2.services"
        .verificationChecks
        .create({ to: phoneNumber, code: code })
        .then(verificationCheck => {
            if (verificationCheck.status === 'approved') {
                res.status(200).send({ message: 'Código verificado correctamente' });
            } else {
                res.status(400).send({ error: 'Código incorrecto' });
            }
        })
        .catch(error => {
            res.status(500).send({ error: 'Error al verificar el código', details: error });
        });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
