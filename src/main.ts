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
  app.enableCors({
       origin: '', // <-- Corrigé pour permettre credentials
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
       credentials: true,
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
  const PORT = process.env.PORT || 5000; // <-- Assurez-vous que c'est le port attendu par votre client
  await app.listen(PORT);
  // console.log(`Les fichiers statiques du dossier '${uploadsPath}' sont servis sous le préfixe '/uploads/'`);
  // console.log(`Application API REST/WebSocket running on: ${await app.getUrl()} on port ${PORT}`);
}
bootstrap();