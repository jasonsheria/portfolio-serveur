import { Injectable, Logger } from '@nestjs/common';
// Assurez-vous que l'import de votre modèle Mongoose est correct.
// Cela dépend de comment vous avez configuré Mongoose dans votre application NestJS.
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose'; // Assurez-vous d'avoir mongoose installé (npm install mongoose)
// Importez l'interface/type de votre document Message Mongoose.
// Adaptez le chemin si nécessaire pour qu'il pointe vers votre fichier message.schema.ts
import { Message } from '../entity/messages/message.schema';
// Importez l'interface/type de votre document User si vous en avez besoin pour la vérification d'accès.
// Adaptez le chemin si nécessaire.
// import { UserDocument } from '../entity/users/user.schema';
// Si vous avez une entité ou un schéma Conversation, importez-le aussi
// import { Conversation, ConversationDocument } from '../entity/conversations/conversation.schema';


@Injectable()
export class MessagesService {

    // Ajoutez un logger pour ce service afin de tracer les opérations
    private readonly logger = new Logger(MessagesService.name);

    // Injectez le modèle Mongoose pour l'entité Message.
    // NestJS injectera automatiquement l'instance du modèle enregistrée via MongooseModule.forFeature().
    constructor(
        @InjectModel(Message.name) private messageModel: Model<Message>,
        // Si nécessaire, injectez d'autres services ou modèles pour vérifier les permissions
        // par exemple, un modèle Conversation si vous gérez les participants dans une collection séparée
        // @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
        // @InjectModel(User.name) private userModel: Model<UserDocument>, // Si vous avez besoin de l'info User ici
    ) {
        // L'array 'private message: Message[]= []' de votre squelette
        // a été retiré car un service de persistance comme celui-ci
        // doit interagir avec une base de données, pas stocker en mémoire.
    }

    /**
     * Vérifie si un utilisateur donné (userId) a le droit d'accéder à une conversation (roomId).
     * C'est une étape de sécurité cruciale appelée par la Gateway avant de laisser l'utilisateur rejoindre une room Socket.IO.
     * La logique dépend fortement de votre modèle de données (où stockez-vous qui participe à quelle conversation ?).
     * @param roomId L'ID de la conversation à laquelle accéder.
     * @param userId L'ID de l'utilisateur demandant l'accès.
     * @returns Promise<boolean> Une promesse qui résout en `true` si l'accès est autorisé, `false` sinon.
     */
    async canAccessConversation(roomId: string, userId: string): Promise<boolean> {
        this.logger.debug(`Checking access for user ${userId} to conversation ${roomId}`);
        // --- Logique réelle de vérification d'accès ---
        // C'est ici que vous implémentez la logique de votre application.
        // Par exemple, vous pourriez vérifier :
        // 1. Si la conversation existe.
        // 2. Si l'utilisateur est listé comme participant dans l'entité Conversation correspondante.
        // 3. Si la conversation est publique (et si les utilisateurs non authentifiés peuvent y accéder, bien que la gateway l'interdise déjà).

        try {
            // --- Exemple conceptuel (à adapter à votre schéma Conversation) ---
            // Supposons que vous ayez un modèle 'Conversation' avec un champ 'participants: string[]'
            // const conversation = await this.conversationModel.findById(roomId).exec();
            // if (!conversation) {
            //     this.logger.warn(`Conversation ${roomId} not found for access check.`);
            //     return false; // La conversation n'existe pas
            // }
            // // Vérifiez si l'userId est dans le tableau des participants
            // const isParticipant = conversation.participants.map(p => p.toString()).includes(userId.toString());
            // if (!isParticipant) {
            //     this.logger.warn(`User ${userId} is not a participant of conversation ${roomId}. Access denied.`);
            // }
            // return isParticipant;

            // --- Si vous n'avez pas d'entité Conversation, vous pourriez faire une vérification très basique
            //    basée sur les messages existants, mais c'est MOINS SÛR et moins précis.
            //    Ex: Vérifier si l'utilisateur est l'expéditeur d'au moins un message dans cette room.
            //    const existingMessage = await this.messageModel.findOne({ roomId: roomId, sender: userId }).exec();
            //    return !!existingMessage; // Renvoie true s'il trouve au moins un message de cet expéditeur

            // --- REMPLACEZ CECI par votre VRAIE LOGIQUE DE VÉRIFICATION DE PERMISSION ---
            // Pour les besoins de l'exemple, on suppose que l'accès est toujours autorisé APRÈS authentification.
            // MAIS CECI N'EST PAS SÛR POUR UNE APPLICATION RÉELLE AVEC DES CONVERSATIONS PRIVÉES !
            this.logger.warn(`LOGIQUE D'ACCÈS À LA CONVERSATION ${roomId} POUR L'UTILISATEUR ${userId} NON IMPLÉMENTÉE. ACCÈS AUTORISÉ PAR DÉFAUT.`);
            return true; // !!! À REMPLACER PAR VOTRE VRAIE LOGIQUE !!!

        } catch (error) {
            this.logger.error(`Erreur lors de la vérification d'accès à la conversation ${roomId} pour ${userId}: ${error.message}`, error.stack);
            // En cas d'erreur technique lors de la vérification, refuser l'accès par sécurité
            return false;
        }
    }

    /**
     * Récupère l'historique des messages pour une conversation donnée.
     * Cette fonction est appelée lorsque la gateway doit envoyer les messages existants à un client qui rejoint la room.
     * @param roomId L'ID de la conversation.
     * @returns Promise<Message[]> Une promesse qui résout en un tableau de documents Message Mongoose, triés par date.
     */
    async getMessagesForConversation(roomId: string): Promise<Message[]> {
        this.logger.debug(`Workspaceing messages for conversation ${roomId}`);
        try {
            // Trouver tous les documents Message où le champ 'roomId' correspond à l'ID donné.
            // Utiliser .populate() si vous avez des références vers d'autres documents (ex: l'expéditeur)
            const messages = await this.messageModel.find({ roomId: roomId })
                // .populate('sender', 'name email') // Exemple: pour récupérer les infos de l'expéditeur
                .sort({ timestamp: 1 }) // Trier les messages par timestamp en ordre croissant (les plus anciens en premier)
                // .limit(100) // Optionnel: Limiter le nombre de messages récupérés initialement pour des raisons de performance
                .exec(); // Exécute la requête Mongoose

            this.logger.debug(`Found ${messages.length} messages for conversation ${roomId}`);
            return messages; // Retourne le tableau de documents Message
        } catch (error) {
             this.logger.error(`Erreur lors de la récupération des messages pour la conversation ${roomId}: ${error.message}`, error.stack);
             // En cas d'erreur, il est préférable de lancer l'erreur pour que la gateway puisse la gérer
             // (par exemple, en émettant un événement 'error' au client).
             throw new Error(`Could not fetch messages for conversation ${roomId}: ${error.message}`);
             // Alternativement, retourner un tableau vide: return [];
        }
    }

    /**
     * Sauvegarde un nouveau message en base de données.
     * Cette fonction est appelée par la gateway lorsqu'un nouveau message est reçu via le socket.
     * @param messageData Les données du message à sauvegarder (doit inclure roomId, content, senderId, potentiellement timestamp).
     * @returns Promise<Message> Une promesse qui résout en le document Message Mongoose sauvegardé (avec son _id, timestamp final, etc.).
     */
    async saveMessage(messageData: { roomId: string; content: string; senderId: string; timestamp?: Date }): Promise<Message> {
         this.logger.debug(`Attempting to save message for room ${messageData.roomId} by sender ${messageData.senderId}`);
         try {
             // Créer une nouvelle instance du modèle Message avec les données reçues.
             // Mongoose ajoutera automatiquement les champs comme _id et le timestamp si configured dans le schéma.
             const newMessage = new this.messageModel({
                 roomId: messageData.roomId,
                 content: messageData.content,
                 // Important : Utiliser senderId provenant de l'utilisateur AUTHENTIFIÉ dans la gateway,
                 // et non un senderId potentiellement envoyé par le client dans messageData.
                 sender: messageData.senderId, // Assurez-vous que le nom du champ dans votre schéma Mongoose est bien 'sender'
                 timestamp: messageData.timestamp || new Date(), // Utilise le timestamp fourni ou génère la date actuelle
                 // Ajoutez ici d'autres champs par défaut ou calculés si nécessaire
             });

             // Sauvegarder le document dans la base de données MongoDB.
             const savedMessage = await newMessage.save();

             this.logger.log(`Message saved successfully with ID: ${savedMessage._id} in room ${savedMessage.id}`);

             // Retourner le document sauvegardé. La gateway l'utilisera pour le diffuser.
             return savedMessage;
         } catch (error) {
             this.logger.error(`Erreur lors de la sauvegarde du message dans la conversation ${messageData.roomId}: ${error.message}`, error.stack);
             // Lancer l'erreur pour que la gateway puisse la gérer et informer le client.
             throw new Error(`Could not save message in conversation ${messageData.roomId}: ${error.message}`);
         }
    }

    // Ajoutez ici d'autres méthodes utiles pour votre service de messages, par exemple :
    // - marquer un message comme lu
    // - supprimer un message
    // - gérer les notifications (si cela relève de ce service)
    // - gérer les pièces jointes aux messages
}