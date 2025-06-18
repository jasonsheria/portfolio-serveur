// src/users/user.entity.ts
export class User {
  id: number;
  email: string;
  username?: string; // Ajouté pour compatibilité avec AuthUserResponse et le reste du code
  password?: string; // Optionnel, car le mot de passe haché ne devrait pas être exposé souvent

  // Nouveau code ajouté
  secondName?: string;
  telephone?: string;
  dateOfBirth?: string;
  city?: string;
  country?: string;
  description?: string;
  adresse?: string;
  experience?: string;
  domaine?: string;
  expertise?: string;
  languesParlees?: string;
  sport?: string;
  objectifs?: string;
  website?: string;
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
  companyEmail?: string;
  companyAdresse?: string;
  companyPhone?: string;
  linkedin?: string;
  github?: string;
  facebook?: string;
  whatsapp?: string;
  instagram?: string;
  profileImage1?: string;
  profileImage2?: string;
  profileImage3?: string;
  cvFile?: string;
  logoFile?: string;
  postalCardFile?: string;
  companyLogoFile?: string;

  constructor(
    id: number,
    email: string,
    username?: string,
    password?: string,
    secondName?: string,
    telephone?: string,
    dateOfBirth?: string,
    city?: string,
    country?: string,
    description?: string,
    adresse?: string,
    experience?: string,
    domaine?: string,
    expertise?: string,
    languesParlees?: string,
    sport?: string,
    objectifs?: string,
    website?: string,
    companyName?: string,
    companyWebsite?: string,
    companyDescription?: string,
    companyEmail?: string,
    companyAdresse?: string,
    companyPhone?: string,
    linkedin?: string,
    github?: string,
    facebook?: string,
    whatsapp?: string,
    instagram?: string,
    profileImage1?: string,
    profileImage2?: string,
    profileImage3?: string,
    cvFile?: string,
    logoFile?: string,
    postalCardFile?: string,
    companyLogoFile?: string
  ) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.password = password;
    this.secondName = secondName;
    this.telephone = telephone;
    this.dateOfBirth = dateOfBirth;
    this.city = city;
    this.country = country;
    this.description = description;
    this.adresse = adresse;
    this.experience = experience;
    this.domaine = domaine;
    this.expertise = expertise;
    this.languesParlees = languesParlees;
    this.sport = sport;
    this.objectifs = objectifs;
    this.website = website;
    this.companyName = companyName;
    this.companyWebsite = companyWebsite;
    this.companyDescription = companyDescription;
    this.companyEmail = companyEmail;
    this.companyAdresse = companyAdresse;
    this.companyPhone = companyPhone;
    this.linkedin = linkedin;
    this.github = github;
    this.facebook = facebook;
    this.whatsapp = whatsapp;
    this.instagram = instagram;
    this.profileImage1 = profileImage1;
    this.profileImage2 = profileImage2;
    this.profileImage3 = profileImage3;
    this.cvFile = cvFile;
    this.logoFile = logoFile;
    this.postalCardFile = postalCardFile;
    this.companyLogoFile = companyLogoFile;
  }
}