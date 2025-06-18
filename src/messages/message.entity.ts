// src/users/user.entity.ts
export class Message {
  id: number;
  recipient: string;
  sender: string; // Optionnel, car le mot de passe haché ne devrait pas être exposé souvent
  content: string; // Optionnel, car le mot de passe haché ne devrait pas être exposé souvent
 
  // Vous pouvez ajouter d'autres champs comme 'name', 'roles', etc.

  constructor(id: number, recipient: string, sender: string, content : string ) {
    this.id = id;
    this.recipient = recipient;
    this.sender = sender;
    this.content = content;
  }
}