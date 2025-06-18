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
import { BotService } from "../bot/bot.service"; // Exemple de service de bot
import { MessageForum } from '../entity/messages/message_forum.schema';
import { MessageForumService } from '../messages/message_forum.service';
// Le port doit correspondre à celui où Socket.IO écoute sur votre backend
// (souvent le même port que l'API REST si vous utilisez l'adaptateur par défaut)
@WebSocketGateway({
    cors: {
        origin: '*', // Adapt to your frontend URL in production
        credentials: true,
    },
    path: '/socket.io', // Explicitly set the path (default for Socket.IO)
    // namespace: '/', // Use default namespace unless you want a custom one
    maxHttpBufferSize: 25 * 1024 * 1024 // 25 MB
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
        private readonly messageForumService: MessageForumService, // Service pour la gestion des messages forum
    ) { }

    // --- Cycle de vie de la Gateway ---

    // Cette méthode est appelée une fois que la gateway a été initialisée
    afterInit(server: Server) {
        this.logger.log('Gateway Chat initialisée');
        console.log('Gateway Chat initialisée');
        // Log when a new socket attempts to connect (handshake)
        server.on('connection', (socket: Socket) => {
            // Log the handshake details
            this.logger.log(`[SOCKET] Tentative de connexion handshake: socket.id=${socket.id}, ip=${socket.handshake.address}`);
            socket.on('disconnecting', (reason) => {
                this.logger.log(`[SOCKET] Le socket ${socket.id} est en train de se déconnecter. Raison: ${reason}`);
            });
            socket.on('error', (err) => {
                this.logger.error(`[SOCKET] Erreur sur le socket ${socket.id}: ${err?.message || err}`);
            });

        });

        // --- Middleware d'authentification pour les connexions WebSocket ---
        // Ce middleware s'exécute AVANT qu'une connexion ne soit établie et AVANT
        // que OnGatewayConnection ne soit appelé. Il permet de valider l'utilisateur
        // avant même qu'il ne puisse envoyer des messages ou rejoindre des rooms.
        server.use(async (socket: Socket & { data?: { user?: User } }, next) => {
            this.logger.log(`[SOCKET] Middleware d'authentification appelé pour socket.id=${socket.id}`);
            const token = socket.handshake.auth.token;
            if (!token) {
                this.logger.warn(`[SOCKET] Connexion refusée: pas de token pour socket.id=${socket.id}`);
                return next(new Error('Authentication token not provided'));
            }
            try {
                const user = await this.authService.validateWebSocketConnection(token);
                if (!user) {
                    this.logger.warn(`[SOCKET] Authentification échouée pour token: ${token} (socket.id=${socket.id})`);
                    return next(new Error('Authentication failed'));
                }
                socket.data.user = user;
                this.logger.log(`[SOCKET] Utilisateur authentifié: ${user.email} (${user.id}) via socket.id=${socket.id}`);
                next();
            } catch (error) {
                this.logger.error(`[SOCKET] Erreur d'authentification WebSocket pour le token ${token} (socket.id=${socket.id}): ${error.message}`, error.stack);
                next(new Error('Authentication failed'));
            }
        });
        // -----------------------------------------------------------------
    }

    // Cette méthode est appelée pour chaque client dont le middleware d'authentification a réussi
    handleConnection(client: Socket & { data?: { user?: User } }, ...args: any[]) {
        this.logger.log(`[SOCKET] handleConnection appelé pour socket.id=${client.id}`);
        const user = client.data.user;
        if (user) {
            const userId = (user.id || (user as any)._id || '').toString();
            this.logger.log(`[SOCKET] Utilisateur connecté: ${user.email} (${userId}) via socket.id=${client.id}`);
            if (!this.userSocketMap.has(userId)) this.userSocketMap.set(userId, new Set());
            this.userSocketMap.get(userId)!.add(client.id);
            this.logger.log(`[SOCKET MAP] userId ${userId} sockets: ${Array.from(this.userSocketMap.get(userId)!)}`);
        } else {
            this.logger.warn(`[SOCKET] handleConnection: Aucun user attaché au socket.id=${client.id}`);
        }
    }

    // Cette méthode est appelée lorsqu'un client se déconnecte
    handleDisconnect(client: Socket & { data?: { user?: User } }) {
        this.logger.log(`[SOCKET] handleDisconnect appelé pour socket.id=${client.id}`);
        const user = client.data.user;
        if (user) {
            const userId = (user.id || (user as any)._id || '').toString();
            this.logger.log(`[SOCKET] Utilisateur déconnecté: ${user.email} (${userId}) via socket.id=${client.id}`);
            if (this.userSocketMap.has(userId)) {
                this.userSocketMap.get(userId)!.delete(client.id);
                if (this.userSocketMap.get(userId)!.size === 0) {
                    this.userSocketMap.delete(userId);
                }
                this.logger.log(`[SOCKET MAP] Après déconnexion, userId ${userId} sockets: ${Array.from(this.userSocketMap.get(userId) || [])}`);
            }
        } else {
            this.logger.warn(`[SOCKET] handleDisconnect: Aucun user attaché au socket.id=${client.id}`);
        }
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
        @MessageBody() data: { content: string; tempId?: string },
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
        const messagesave = {
            user: user._id,
            content: data.content,
            type: "text",
            date: new Date(),
        };
        const saved = await this.messageForumService.createMessage(messagesave);
        this.server.to('admin-chatroom').emit('adminChatRoomMessage', {
            from: {
                id: user._id,
                name: (user as any).username || '',
                email: user.email || '',
                profileUrl: user.profileUrl || '',
                isGoogleAuth: user.isGoogleAuth || false,
                isAdmin: user.isAdmin || false
            },
            content: data.content,
            date: new Date().toISOString(),
            tempId: data.tempId || null // Ajout du tempId pour l'optimistic UI
        });
    }

    // Permet à un admin de rejoindre la room admin-chatroom (à appeler côté front après vérif isAdmin)
    @SubscribeMessage('joinAdminChatRoom')
    async handleJoinAdminChatRoom(
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
        // --- NOUVEAU : Récupérer et envoyer l'historique des messages admin ---
        // Supposons que vous stockez les messages admin dans la même collection que le forum mais avec un flag/type

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
   async handleIdentify(
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
            const adminMessages = await this.messageForumService.getAllMessages();
            client.emit('adminChatRoomMessages', adminMessages);
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
        // sauverager le fichier dans uploads/admin-chatroom/
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'uploads','profile');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const ext = filename.split('.').pop();
        const newName = `${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const filePathAbs = path.join(uploadDir, newName);
        try {
            // Décoder le base64 et sauvegarder le fichier
            let base64 = fileContent;
            if (base64.startsWith('data:')) base64 = base64.split(',')[1];
            fs.writeFileSync(filePathAbs, Buffer.from(base64, 'base64'));
            console.log(`[ADMIN CHATROOM] Fichier sauvegardé: ${filePathAbs}`);
            // sauvegarder le chemin relatif pour l'envoyer au frontend
            fileContent = `/uploads/profile/${newName}`; // chemin relatif
            // On peut aussi envoyer le chemin complet si nécessaire
            console.log(`[ADMIN CHATROOM] Fichier sauvegardé: ${filePathAbs}`);
            // Optionnel : sauvegarder le message en base de données si nécessaire
            await this.messageForumService.createMessage({
                user: user._id,
                content: fileContent, // chemin relatif ou absolu
                type: data.type,
                filename: filename,
                date: new Date(),
                isCompressed: isCompressed || false, // Indique si le fichier est compressé
                size: data.size || null // Ajout de la taille pour tous les types
            });
        } catch (err) {
            console.log(`[ADMIN CHATROOM] Erreur lors de l'écriture du fichier admin chatroom: ${err.message}`);
            client.emit('error', { message: "Erreur lors de l'enregistrement du fichier dans le chat admin." });
            return;
        }
        // Diffuser à tous les membres de la room 'admin-chatroom'
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
            tempId: data.tempId || null, // Ajout du tempId pour lier l'optimistic UI
            isCompressed,
            size: data.size || null // Ajout de la taille pour tous les types
        });
    }

    // --- Forum Public ---
    @SubscribeMessage('forumMessage')
    async handleForumMessage(
        @MessageBody() data: { content: string; type: string; filename?: string },
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ): Promise<void> {
        const user = client.data.user;
        if (!user) {
            client.emit('error', { message: 'Authentification requise pour le forum.' });
            return;
        }
        if (!data || !data.content || !data.type) {
            client.emit('error', { message: 'Message forum incomplet.' });
            return;
        }
        let saved;
        let filePath = null;
        let fileType = data.type;
        // Si c'est un fichier (image, video, audio, file)
        if (["image", "video", "audio", "file"].includes(data.type) && data.filename) {
            // Décoder le base64 et sauvegarder le fichier dans public/uploads/forum/
            const fs = require('fs');
            const path = require('path');
            const uploadDir = path.join(process.cwd(), '..', '..', 'uploads', 'forum');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const ext = data.filename.split('.').pop();
            const newName = `${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
            const filePathAbs = path.join(uploadDir, newName);
            let base64 = data.content;
            if (base64.startsWith('data:')) base64 = base64.split(',')[1];
            try {
                fs.writeFileSync(filePathAbs, Buffer.from(base64, 'base64'));
                filePath = `/uploads/forum/${newName}`;
                console.log(`[FORUM] Fichier sauvegardé: ${filePathAbs}`);
            } catch (err) {
                console.log(`[FORUM] Erreur lors de l'écriture du fichier forum: ${err.message}`);
                client.emit('error', { message: "Erreur lors de l'enregistrement du fichier forum." });
                return;
            }
            try {
                saved = await this.messageForumService.createMessage({
                    user: user._id,
                    content: filePath, // chemin relatif
                    type: fileType,
                    date: new Date(),
                });
                console.log(`[FORUM] Message forum fichier enregistré en base: ${JSON.stringify(saved)}`);
            } catch (err) {
                console.log(`[FORUM] Erreur lors de l'enregistrement du message forum en base: ${err.message}`);
                client.emit('error', { message: "Erreur lors de l'enregistrement du message forum en base." });
                return;
            }
        } else {
            // Message texte classique
            console.log("le message forum est un texte", data.content);
            try {
                saved = await this.messageForumService.createMessage({
                    user: user._id,
                    content: data.content,
                    type: "text",
                    date: new Date(),
                });
                client.emit('error', { message: "Erreur lors de l'enregistrement du message forum en base." });
                return;
            }
            catch (err) {
                client.emit('error', { message: "Erreur lors de l'enregistrement du message forum en base." });
                return;
            }

        }
        // Diffuser à tous les connectés au forum
        this.server.emit('forumMessage', {
            from: {
                id: user._id,
                name: (user as any).username || '',
                email: user.email || '',
                profileUrl: user.profileUrl || '',
            },
            content: filePath ? filePath : data.content,
            type: data.type,
            filename: data.filename || null,
            date: saved.date,
        });
    }

    // --- Pagination des messages admin ---
    @SubscribeMessage('getOlderAdminMessages')
    async handleGetOlderAdminMessages(
        @MessageBody() data: { before?: string, limit?: number },
        @ConnectedSocket() client: Socket & { data?: { user?: User } },
    ) {
        const user = client.data.user;
        if (!user || user.isAdmin !== true) {
            client.emit('error', { message: 'Seuls les administrateurs peuvent charger les anciens messages.' });
            return;
        }
        let beforeDate: Date | undefined = undefined;
        if (data && data.before) {
            beforeDate = new Date(data.before);
        }
        const limit = data && data.limit ? Math.min(data.limit, 30) : 15;
        const messages = await this.messageForumService.getMessagesPaginated({ before: beforeDate, limit });
        client.emit('olderAdminMessages', messages);
    }
}