// src/users/user.entity.ts
export class User {
  id: number;
  email: string;
  username?: string; // Ajouté pour compatibilité avec AuthUserResponse et le reste du code
  password?: string; // Optionnel, car le mot de passe haché ne devrait pas être exposé souvent
  // Vous pouvez ajouter d'autres champs comme 'name', 'roles', etc.

  constructor(id: number, email: string, username?: string, password?: string) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.password = password;
  }
}