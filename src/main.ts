// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io'; // <-- Décommenter l'import
import { NestExpressApplication } from '@nestjs/platform-express'; // Importez NestExpressApplication
import * as path from 'path'; // Importez le module path de Node.js
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  // Spécifiez NestExpressApplication comme type pour l'application pour avoir accès à useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Configuration CORS pour permettre la connexion depuis votre frontend (HTML)
  // --- CORS complet pour API REST & WebSocket (localhost + prod) ---

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost:3000',
        'http://127.0.0.1:5500',
        'https://wise-technology.onrender.com',
        'https://wise-hosting.onrender.com',
        'https://localhost:1000',
        'http://localhost:5000',
      ];
      // Autoriser les requêtes sans origin (ex: curl, tests locaux)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200 // Correction: 200 pour éviter les 204 sur preflight
  });
  // Utiliser ValidationPipe globalement
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  const uploadsPath = path.join(__dirname, '..', 'uploads');
    app.useStaticAssets(uploadsPath, {
    prefix: '/uploads', // Ce préfixe doit correspondre à celui utilisé dans pictureUrl
    fallthrough: false, // Pour que les erreurs soient catchées ici
  });
  // **ACTIVER L'ADAPTATEUR SOCKET.IO**
  // Cette ligne lie l'adaptateur Socket.IO à votre application NestJS
  app.useWebSocketAdapter(new IoAdapter(app)); // <-- Ajouter cette ligne !

  // Définir le port d'écoute
  const port = process.env.PORT || 5000; // Use a port allowed by Render.com
  await app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
bootstrap();