// src/chat/chat.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service'; // Exemple d'authentification
import { MessagesService } from '../messages/messages.service';
import { User } from '../entity/users/user.schema'; // Exemple d'entité utilisateur
import { Message } from '../entity/messages/message.schema'; // Exemple d'entité message
import { UsersService } from '../users/users.service';
import {BotService} from "../bot/bot.service"; // Exemple de service de bot
// Le port doit correspondre à celui où Socket.IO écoute sur votre backend
// (souvent le même port que l'API REST si vous utilisez l'adaptateur par défaut)
@WebSocketGateway({
    cors: {
        origin: '*', // Ex: 'http://localhost:3000' (Adaptez à votre frontend)
        credentials: true,
    },
    // Optionnel: spécifier un chemin ou namespace si nécessaire
    // namespace: '/chat',
    maxHttpBufferSize: 25 * 1024 * 1024 // 25 Mo pour supporter les gros fichiers
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer() server: Server; // Instance du serveur Socket.IO

    private logger: Logger = new Logger('ChatGateway');

    // Map pour faire le lien entre userId et socketId (multi-socket)
    private userSocketMap: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

    constructor(
        private readonly botService: BotService, // Service pour le bot
        private readonly authService: AuthService, // Service pour l'authentification
        private readonly usersService: UsersService, // Service pour la gestion des utilisateurs
        private readonly messagesService: MessagesService, // Service pour la gestion des messages et conversations
    ) { }

    // --- Cycle de vie de la Gateway ---

    // Cette méthode est appelée une fois que la gateway a été initialisée
    afterInit(server: Server) {
        this.logger.log('Gateway Chat initialisée');
        console.log('Gateway Chat initialisée');
        // --- Middleware d'authentification pour les connexions WebSocket ---
        // Ce middleware s'exécute AVANT qu'une connexion ne soit établie et AVANT
        // que OnGatewayConnection ne soit appelé. Il permet de valider l'utilisateur
        // avant même qu'il ne puisse envoyer des messages ou rejoindre des rooms.
        server.use(async (socket: Socket & { data?: { user?: User } }, next) => {
            // Note: J'ai ajouté une annotation de type simple pour 'socket'
            // afin de mieux représenter l'ajout de 'data.user', bien que
            // l'extension complète de l'interface Socket soit plus complexe.
            const token = socket.handshake.auth.token; // Récupère le token envoyé par le frontend
            if (!token) {
                // Si aucun token n'est fourni, refuse la connexion avec une erreur
                this.logger.warn(`Tentative de connexion sans token d'authentification: ${socket.id}`);
                return next(new Error('Authentication token not provided'));
            }

            try {
                // Validez le token et récupérez l'utilisateur via votre AuthService
                // Cette méthode doit retourner l'objet utilisateur s'il est valide, ou null/undefined sinon.
                const user = await this.authService.validateWebSocketConnection(token); // Adaptez le nom de la méthode dans votre AuthService

                if (!user) {
                    // Si la validation échoue (token invalide ou expiré)
                    this.logger.warn(`Échec de l'authentification pour le token: ${token}`);
                    return next(new Error('Authentication failed'));
                }

                // Attachez les informations de l'utilisateur au socket pour un accès facile
                // dans les méthodes handleConnection, handleDisconnect et SubscribeMessage.
                // L'objet 'data' est un bon endroit pour stocker des informations personnalisées.
                socket.data.user = user;
                // afficher le username et email du user 
                this.logger.log(`Utilisateur authentifié: ${user.email} (${user.id}) connecté via socket ${socket.id}`);

                // L'utilisateur est authentifié, la connexion peut continuer
                next();
            } catch (error) {
                // Gère les erreurs potentielles pendant le processus de validation (ex: erreur BD)
                this.logger.error(`Erreur d'authentification WebSocket pour le token ${token}: ${error.message}`, error.stack);
                next(new Error('Authentication failed')); // Refuse la connexion en cas d'erreur
            }
        });
        // -----------------------------------------------------------------
    }

    // Cette méthode est appelée pour chaque client dont le middleware d'authentification a réussi
    handleConnection(client: Socket & { data?: { user?: User } }, ...args: any[]) {
        const user = client.data.user;
        this.logger.log(`Client connecté: ${client.id}`);
        if (user) {
            const userId = (user.id || (user as any)._id || '').toString();
            if (!this.userSocketMap.has(userId)) this.userSocketMap.set(userId, new Set());
            this.userSocketMap.get(userId)!.add(client.id);
            this.logger.log(`[SOCKET MAP] userId ${userId} sockets: ${Array.from(this.userSocketMap.get(userId)!)}`);
        }
    }

    // Cette méthode est appelée lorsqu'un client se déconnecte
    handleDisconnect(client: Socket & { data?: { user?: User } }) {
        const user = client.data.user;
        this.logger.log(`Client déconnecté: ${client.id}`);
        if (user) {
            const userId = (user.id || (user as any)._id || '').toString();
            if (this.userSocketMap.has(userId)) {
                this.userSocketMap.get(userId)!.delete(client.id);
                if (this.userSocketMap.get(userId)!.size === 0) {
                    this.userSocketMap.delete(userId);
                }
                this.logger.log(`[SOCKET MAP] Après déconnexion, userId ${userId} sockets: ${Array.from(this.userSocketMap.get(userId) || [])}`);
            }
        }
        // If the user was an admin and in the admin-chatroom, emit updated list
        // Correction : utiliser la bonne API pour vérifier la présence dans la room
        const adminRoom = this.server.sockets.adapter.rooms.get('admin-chatroom');
        if (adminRoom && adminRoom.has && adminRoom.has(client.id)) {
            this.emitAdminRoomUsers();
        }
    }

    // --- Gestion des messages entrants (@SubscribeMessage) ---

    // Écoute l'événement 'joinRoom' émis par le frontend lorsqu'un utilisateur souhaite rejoindre une conversation
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @MessageBody() data: { roomId: string }, // Les données envoyées par le frontend
        @ConnectedSocket() client: Socket & { data?: { user?: User } }, // L'instance du socket client
    ): Promise<void> { // Pas besoin de retourner une valeur directement au client qui a émis, on utilise emit
        const user = client.data.user; // L'utilisateur authentifié attaché au socket

        // Vérification de sécurité supplémentaire, bien que le middleware s'en charge
        if (!user) {
            this.logger.warn(`Tentative de rejoindre la room ${data.roomId} par un client non authentifié: ${client.id}`);
            client.emit('error', { message: 'Authentication required' }); // Informer le client
            return;
        }

        if (!data || !data.roomId) {
            this.logger.warn(`Données 'joinRoom' incomplètes reçues du client ${client.id}`);
            client.emit('error', { message: 'Invalid room data' });
            return;
        }

        this.logger.log(`${user.email || user.id} (${user.id}) tente de rejoindre la room ${data.roomId}`);

        // Vérifier si l'utilisateur a le droit de rejoindre cette conversation (via MessagesService ou ConversationsService)
        // Ceci est crucial pour la sécurité et la logique métier.
        const canJoin = await this.messagesService.canAccessConversation(data.roomId, user.id);
        if (!canJoin) {
            this.logger.warn(`${user.email || user.id} (${user.id}) n'a pas le droit de rejoindre la room ${data.roomId}`);
            client.emit('error', { message: 'Unauthorized to join this room' }); // Informer le client
            return;
        }

        // Ajouter le socket client à la room Socket.IO.
        // Tous les événements diffusés à cette room ('to(roomId)') seront reçus par ce socket.
        client.join(data.roomId);
        this.logger.log(`${user.email || user.id} (${user.id}) a rejoint la room ${data.roomId}`);

        // Envoyer l'historique des messages de cette room UNIQUEMENT AU CLIENT QUI VIENT DE REJOINDRE
        // Ceci évite de spammer les autres utilisateurs de la room.
        const history = await this.messagesService.getMessagesForConversation(data.roomId);
        // 'messageHistory' doit correspondre à l'événement que le frontend écoute pour charger l'historique.
        client.emit('messageHistory', history);

        // Optionnel : Notifier les autres membres de la room que cet utilisateur a rejoint
        // (utile pour afficher "X a rejoint la conversation").
        // client.to(data.roomId).emit('userJoined', { roomId: data.roomId, userId: user.id, userName: user.name }); // Adaptez 'user.name'
    }

    // Optionnel : Écoute l'événement 'leaveRoom' si le frontend permet de quitter explicitement une conversation
    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ): void {
        const user = client.data.user;
        if (!user || !data || !data.roomId) {
            this.logger.warn(`Tentative de quitter une room avec données incomplètes ou sans authentification du client ${client.id}`);
            return; // Ne fait rien ou émet une erreur si jugé nécessaire
        }

        this.logger.log(`${user.email || user.id} (${user.id}) quitte la room ${data.roomId}`);
        // Retire le socket client de la room Socket.IO
        client.leave(data.roomId);

        // Optionnel : Notifier les autres membres de la room que cet utilisateur a quitté
        // client.to(data.roomId).emit('userLeft', { roomId: data.roomId, userId: user.id, userName: user.name }); // Adaptez 'user.name'
    }


    // Écoute l'événement 'sendMessage' émis par le frontend lorsqu'un utilisateur envoie un nouveau message
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() data: { roomId: string; content: string; senderId?: string },
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ): Promise<void> {
        const user = client.data.user;

        // Vérification de sécurité
        if (!user) {
            this.logger.warn(`Tentative d'envoi de message par un client non authentifié: ${client.id}`);
            client.emit('error', { message: 'Authentication required to send message' });
            return;
        }

        // Validation des données reçues
        if (!data || !data.roomId || !data.content) {
            this.logger.warn(`Données de message incomplètes reçues du client ${client.id} (room: ${data?.roomId}, content: ${data?.content ? 'présent' : 'absent'})`);
            client.emit('error', { message: 'Message data incomplete' });
            return;
        }

        // Validation cruciale : S'assurer que l'expéditeur est bien l'utilisateur authentifié.
        // On ignore data.senderId si fourni et on utilise user.id
        if (data.senderId && user.id !== data.senderId) {
            this.logger.warn(`Usurpation d'identité potentielle: ${user.email || user.id} (${user.id}) tente d'envoyer un message comme ${data.senderId}`);
            // Vous pourriez choisir de simplement utiliser user.id sans émettre d'erreur,
            // mais émettre une erreur peut aider à débugguer un frontend mal configuré.
            // client.emit('error', { message: 'Invalid sender ID: You can only send messages as yourself.' });
            // return; // Refuser le message si vous êtes strict sur la validation du senderId envoyé par le client
        }


        this.logger.log(`Message reçu de ${user.email || user.id} (${user.id}) pour la room ${data.roomId}`);
        try {
            const savedMessage = await this.messagesService.saveMessage({
                roomId: data.roomId,
                content: data.content,
                senderId: user.id,
                timestamp: new Date(),
            });
            this.server.to(data.roomId).emit('newMessage', savedMessage);
            this.logger.log(`Message sauvegardé et diffusé dans la room ${data.roomId}`);
        } catch (error) {
            this.logger.error(`Erreur lors de la sauvegarde ou de la diffusion du message dans la room ${data.roomId}: ${error.message}`, error.stack);
            client.emit('error', { message: 'Failed to send message' });
        }
    }

    // Écouteur direct pour l'événement 'newMessage' (émis par le client)
    @SubscribeMessage('newMessage')
    async handleNewMessage(
        @MessageBody() data: { userId: string; text: string }, // userId = destinataire (mais ici on va répondre au sender)
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ): Promise<void> {
        // 1. Authentification de l'expéditeur (sender)
        const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) {
            this.logger.warn('Tentative de newMessage sans token');
            client.emit('error', { message: 'Authentication token required' });
            return;
        }
        const sender = await this.authService.validateWebSocketConnection(token); // expéditeur
        if (!sender) {
            this.logger.warn('Token invalide pour newMessage');
            client.emit('error', { message: 'Invalid or expired token' });
            return;
        }
        const senderId = (sender.id || (sender as any)._id || '').toString();
        // On récupère le destinataire pour l'affichage dans le 'from'
        const recipient = await this.usersService.findById(data.userId);
        let fromField;
        if (senderId === data.userId) {
            fromField = {
                id: senderId,
                name: (sender as any).name || sender.email || '',
                email: sender.email || ''
            };
        } else if (recipient) {
            fromField = {
                id: (recipient.id || (recipient as any)._id || '').toString(),
                name: (recipient as any).name || recipient.email || '',
                email: recipient.email || ''
            };
        } else {
            fromField = { id: data.userId, name: '', email: '' };
        }
        this.logger.log(`Message reçu de ${sender.email || senderId} : ${data.text}`);
        // 3. Appel du bot sur le message reçu
        const botResponse = await this.botService.predilect(data.text);
        // 4. Envoi de la réponse du bot à TOUS les sockets du sender
        const senderSocketIds = Array.from(this.userSocketMap.get(senderId) || []);
        const recipientSocketIds = Array.from(this.userSocketMap.get(data.userId) || []);
        senderSocketIds.forEach(socketId => {
            this.server.to(socketId).emit('receiveMessage', {
                from: fromField,
                text: botResponse,
                date: new Date().toISOString()
            });
        });
        // Si le destinataire est différent, envoie aussi à tous ses sockets
        if (senderId !== data.userId) {
            recipientSocketIds.forEach(socketId => {
                this.server.to(socketId).emit('receiveMessage', {
                    from: fromField,
                    text: botResponse,
                    date: new Date().toISOString()
                });
            });
        }
        this.logger.log(`[SOCKET] Réponse du bot envoyée à ${sender.email || senderId} (sockets: ${senderSocketIds}) : ${botResponse}`);
    }

    // --- Chatroom Admin : écoute et diffusion des messages des admins ---
    @SubscribeMessage('adminChatRoomMessage')
    async handleAdminChatRoomMessage(
        @MessageBody() data: { content: string },
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ): Promise<void> {
        const user = client.data.user;
        if (!user || user.isAdmin !== true) {
            this.logger.warn(`Tentative d'envoi dans le chatroom admin par un non-admin (${user?.email || 'inconnu'})`);
            client.emit('error', { message: 'Seuls les administrateurs peuvent envoyer des messages dans ce chat.' });
            return;
        }
        if (!data || !data.content || typeof data.content !== 'string' || !data.content.trim()) {
            this.logger.warn(`[adminChatRoomMessage] Message vide ou invalide reçu du client ${client.id}`);
            client.emit('error', { message: 'Message vide ou invalide.' });
            return;
        }
        this.logger.log(`[adminChatRoomMessage] Message reçu de ${user.email || user.id} (${user.id}): ${data.content}`);
        // Optionnel : sauvegarder le message en base si besoin
        // await this.messagesService.saveAdminChatRoomMessage({ senderId: user.id, content: data.content, timestamp: new Date() });
        // Diffuse à tous les membres de la room 'admin-chatroom'
        this.server.to('admin-chatroom').emit('adminChatRoomMessage', {
            from: {
                id: user._id,
                name: (user as any).username || '',
                email: user.email || '',
                profileUrl : user.profileUrl || '',
                isGoogleAuth : user.isGoogleAuth || false,
                isAdmin: user.isAdmin || false
            },
            content: data.content,
            date: new Date().toISOString()
        });
    }

    // Permet à un admin de rejoindre la room admin-chatroom (à appeler côté front après vérif isAdmin)
    @SubscribeMessage('joinAdminChatRoom')
    handleJoinAdminChatRoom(
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ) {
        const user = client.data.user;
        if (!user || user.isAdmin !== true) {
            client.emit('error', { message: 'Seuls les administrateurs peuvent rejoindre ce chat.' });
            return;
        }
        client.join('admin-chatroom');
        this.logger.log(`${user.email || user._id} a rejoint la room admin-chatroom`);
        // EXTRA LOGGING: List all socket IDs in the admin-chatroom after join
        const adminRoom = this.server.sockets.adapter.rooms.get('admin-chatroom');
        if (adminRoom) {
            this.logger.log(`[ADMIN ROOM] Sockets in admin-chatroom after join: ${Array.from(adminRoom).join(', ')}`);
        } else {
            this.logger.warn('[ADMIN ROOM] admin-chatroom does not exist after join');
        }
        client.emit('adminChatRoomJoined'); // Confirmation côté front
        this.emitAdminRoomUsers(); // MAJ présence admins
    }

    // --- ADMIN PRESENCE ---
    // Émet la liste des admins connectés à la room admin-chatroom
    private async emitAdminRoomUsers() {
        // Récupère tous les sockets de la room admin-chatroom
        const adminRoom = this.server.sockets.adapter.rooms.get('admin-chatroom');
        if (!adminRoom) {
            this.server.to('admin-chatroom').emit('adminRoomUsers', []);
            return;
        }
        const adminSockets = Array.from(adminRoom);
        const adminUsers = [];
        for (const socketId of adminSockets) {
            const socket = this.server.sockets.sockets.get(socketId);
            const user = socket?.data?.user;
            if (user && user.isAdmin === true) {
                adminUsers.push({
                    id: user._id,
                    name: (user as any).username || '',
                    email: user.email || '',
                    profileUrl: user.profileUrl || '',
                    isGoogleAuth: user.isGoogleAuth || false,
                    isAdmin: user.isAdmin || false
                });
            }
        }
        this.server.to('admin-chatroom').emit('adminRoomUsers', adminUsers);
    }

    // Optionnel : gestion leave explicite de la room admin
    @SubscribeMessage('leaveAdminChatRoom')
    handleLeaveAdminChatRoom(
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ) {
        const user = client.data.user;
        if (!user || user.isAdmin !== true) return;
        client.leave('admin-chatroom');
        this.logger.log(`${user.email || user._id} a quitté la room admin-chatroom`);
        this.emitAdminRoomUsers();
    }

    // --- Autres méthodes selon les besoins (ex: gérer les utilisateurs en ligne) ---
    // Vous pourriez ajouter ici des méthodes pour gérer les statuts "en ligne", "hors ligne",
    // ou d'autres événements liés au chat.

    // Permet de notifier tous les clients qu'un utilisateur s'est déconnecté (appelé par le controller logout)
    notifyUserLogout(userId: string) {
        if (!userId) return;
        this.logger.log(`Notification de déconnexion pour userId: ${userId}`);
        // Supprimer tous les sockets de ce user
        if (this.userSocketMap.has(userId)) {
            this.userSocketMap.get(userId)!.forEach(socketId => {
                const client = this.server.sockets.sockets.get(socketId);
                if (client) client.disconnect(true);
            });
            this.userSocketMap.delete(userId);
        }
        this.server.emit('userLogout', { userId });
    }

    @SubscribeMessage('identify')
    handleIdentify(
        @MessageBody() data: { userId: string },
        @ConnectedSocket() client: Socket
    ) {
        if (data && data.userId) {
            // Avant d'ajouter, supprimer ce socketId de tous les autres userId (évite mapping multiple)
            for (const [uid, sockets] of this.userSocketMap.entries()) {
                if (sockets.has(client.id) && uid !== data.userId) {
                    sockets.delete(client.id);
                    if (sockets.size === 0) this.userSocketMap.delete(uid);
                }
            }
            if (!this.userSocketMap.has(data.userId)) this.userSocketMap.set(data.userId, new Set());
            this.userSocketMap.get(data.userId)!.add(client.id);
            this.logger.log(`[IDENTIFY] Mapping userId ${data.userId} -> socketId ${client.id}`);
            this.logger.log(`[SOCKET MAP] userId ${data.userId} sockets: ${Array.from(this.userSocketMap.get(data.userId)!)}`);
        } else {
            this.logger.warn('[IDENTIFY] userId manquant dans identify');
        }
    }

    @SubscribeMessage('adminChatRoomFile')
    async handleAdminChatRoomFile(
        @MessageBody() data: { type: 'audio' | 'video' | 'file' | 'image'; content: string; filename: string; tempId?: string; size?: number },
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ): Promise<void> {
        const user = client.data.user;
        if (!user || user.isAdmin !== true) {
            this.logger.warn(`Tentative d'envoi de fichier dans le chatroom admin par un non-admin (${user?.email || 'inconnu'})`);
            client.emit('error', { message: 'Seuls les administrateurs peuvent envoyer des fichiers dans ce chat.' });
            return;
        }
        if (!data || !data.content || !data.type || !data.filename) {
            this.logger.warn(`[adminChatRoomFile] Fichier ou données invalides reçues du client ${client.id}`);
            client.emit('error', { message: 'Fichier ou données invalides.' });
            return;
        }

        let fileContent = data.content;
        let isCompressed = false;
        let filename = data.filename;
        // Compression uniquement pour les fichiers non médias
        if (data.type === 'file') {
            try {
                const buffer = Buffer.from(data.content.split(',')[1] || data.content, 'base64');
                const zlib = require('zlib');
                const compressed = zlib.gzipSync(buffer);
                fileContent = 'data:application/gzip;base64,' + compressed.toString('base64');
                isCompressed = true;
                filename = data.filename + '.gz';
            } catch (err) {
                this.logger.warn(`[adminChatRoomFile] Compression échouée pour ${data.filename}: ${err.message}`);
                fileContent = data.content;
                isCompressed = false;
                filename = data.filename;
            }
        }
        // Pour les vidéos, images, audio : ne rien modifier, mais transmettre la taille si possible
        // (le frontend doit envoyer size dans data)

        this.server.to('admin-chatroom').emit('adminChatRoomFile', {
            from: {
                id: user._id,
                name: (user as any).username || '',
                email: user.email || '',
                profileUrl: user.profileUrl || '',
                isGoogleAuth: user.isGoogleAuth || false,
                isAdmin: user.isAdmin || false
            },
            type: data.type,
            content: fileContent, // base64 ou base64 compressé
            filename: filename,
            date: new Date().toISOString(),
            tempId: data.tempId,
            isCompressed,
            size: data.size || null // Ajout de la taille pour tous les types
        });
    }
}