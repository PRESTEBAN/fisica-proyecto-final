const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  }),
});

app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

app.post('/send-notification', async (req, res) => {
  const { message, email } = req.body; // ✅ Extraer ambos parámetros

  if (!message) {
    return res.status(400).json({ 
      error: 'El mensaje es requerido',
      received: req.body 
    });
  }

  try {
    console.log('📤 Enviando notificación:', { message, email });
    
    // Buscar token guardado con ID 'admin' en Firestore
    const tokenDoc = await admin.firestore().collection('tokens').doc('admin').get();

    if (!tokenDoc.exists) {
      console.error('❌ Token no encontrado en Firestore');
      return res.status(404).json({ error: 'Token no encontrado' });
    }

    const token = tokenDoc.data().token;
    console.log('✅ Token encontrado:', token.substring(0, 20) + '...');

    const messagePayload = {
      notification: {
        title: 'Sistema de Acceso',
        body: message,
      },
      android: {
        notification: {
          priority: 'high',
          vibrateTimingsMillis: [0, 500, 1000, 500],
        },
      },
      token: token,
    };

    const result = await admin.messaging().send(messagePayload);
    console.log('✅ Notificación enviada exitosamente:', result);
    
    res.status(200).json({ 
      success: true, 
      message: 'Notificación enviada con éxito',
      messageId: result 
    });
    
  } catch (error) {
    console.error('❌ Error enviando notificación:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    
    res.status(500).json({ 
      error: 'Error enviando notificación', 
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});