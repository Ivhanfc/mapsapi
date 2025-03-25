require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Configuración de Twilio con variables de entorno
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

if (!accountSid || !authToken || !serviceSid) {
    console.error('Faltan variables de entorno de Twilio');
    process.exit(1);
}

const client = new Twilio(accountSid, authToken);

// Rutas
app.get('/', (req, res) => {
    res.json({ 
        mensaje: "Servidor de verificación funcionando",
        endpoints: {
            send: '/send-verification (POST)',
            verify: '/verify-code (POST)'
        }
    });
});

app.post('/send-verification', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Número de teléfono requerido' });
        }

        const verification = await client.verify.v2.services(serviceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });
        
        res.json({ 
            status: 'success',
            message: 'Código enviado correctamente',
            verificationSid: verification.sid
        });
    } catch (error) {
        console.error('Error en send-verification:', error);
        res.status(500).json({ 
            status: 'error',
            error: 'Error al enviar el código',
            details: error.message
        });
    }
});

app.post('/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        if (!phoneNumber || !code) {
            return res.status(400).json({ error: 'Número y código requeridos' });
        }

        const verificationCheck = await client.verify.v2.services(serviceSid)
            .verificationChecks
            .create({ to: phoneNumber, code: code });
        
        if (verificationCheck.status === 'approved') {
            res.json({ 
                status: 'success',
                message: 'Código verificado correctamente'
            });
        } else {
            res.status(400).json({
                status: 'error',
                error: 'Código incorrecto'
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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
