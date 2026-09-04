export type SettingsSection = {
  title: string;
  description: string;
  icon: string;
  /** Sous-options listées sur la page Paramètres */
  items?: string[];
};

/** Les 8 sections principales de la page Paramètres. */
export const MAIN_SECTIONS: Record<string, SettingsSection> = {
  account: {
    title: "Compte",
    description: "E-mail, téléphone, mot de passe, nom d'utilisateur, données",
    icon: "user-circle",
    items: [
      "Modifier l'e-mail et le téléphone",
      "Changer le mot de passe",
      "Nom d'utilisateur",
      "Désactiver ou supprimer le compte",
      "Exporter mes données",
    ],
  },
  privacy: {
    title: "Confidentialité",
    description: "Visibilité, demandes d'amis, commentaires, blocages",
    icon: "eye",
    items: [
      "Visibilité des publications",
      "Demandes d'amis",
      "Visibilité de la liste d'amis",
      "Qui peut commenter",
      "Personnes bloquées",
    ],
  },
  notifications: {
    title: "Notifications",
    description: "Push, e-mail et notifications par catégorie",
    icon: "bell",
    items: ["Notifications push", "Notifications par e-mail", "Par catégorie"],
  },
  security: {
    title: "Sécurité",
    description: "Double authentification, sessions, historique",
    icon: "shield",
    items: ["Authentification à deux facteurs", "Appareils connectés", "Historique de connexion"],
  },
  personalization: {
    title: "Personnalisation",
    description: "Thème, langue, taille du texte",
    icon: "palette",
    items: ["Mode sombre / clair", "Langue", "Taille du texte"],
  },
  feed: {
    title: "Fil d'actualité",
    description: "Ordre du fil, contenus masqués, comptes prioritaires",
    icon: "newspaper",
    items: ["Chronologique ou personnalisé", "Masquer certains contenus", "Amis et pages prioritaires"],
  },
  moderation: {
    title: "Contenu et modération",
    description: "Mots-clés filtrés, signaler un problème",
    icon: "ban",
    items: ["Mots-clés personnels à filtrer", "Signaler un problème"],
  },
  support: {
    title: "Aide et support",
    description: "FAQ, contact, conditions d'utilisation",
    icon: "help",
    items: ["FAQ", "Contacter le support", "Conditions d'utilisation"],
  },
};

/** Sections héritées, toujours accessibles par lien direct. */
export const SETTINGS_SECTIONS: Record<string, SettingsSection> = {
  ...MAIN_SECTIONS,
  profile: {
    title: "Informations personnelles",
    description: "Photo, nom, date de naissance, ville, contacts",
    icon: "user-circle",
  },
  activity: {
    title: "Activité du compte",
    description: "Vos publications, j'aime et commentaires",
    icon: "history",
  },
  contact: {
    title: "Qui peut me contacter",
    description: "Messages et demandes d'amis",
    icon: "user-cog",
  },
  blocks: { title: "Blocages", description: "Personnes que vous avez bloquées", icon: "ban" },
  media: {
    title: "Médias et vidéos",
    description: "Lecture automatique et économiseur de données",
    icon: "image",
  },
  language: { title: "Langue", description: "Langue de l'interface", icon: "globe" },
  saved: {
    title: "Publications enregistrées",
    description: "Retrouvez ce que vous avez enregistré",
    icon: "bookmark",
  },
  appearance: { title: "Apparence", description: "Thème et taille du texte", icon: "palette" },
  accessibility: {
    title: "Accessibilité",
    description: "Animations réduites, contraste élevé",
    icon: "accessibility",
  },
  help: { title: "Aide et assistance", description: "Questions fréquentes et contact", icon: "help" },
  legal: {
    title: "Conditions et confidentialité",
    description: "Conditions d'utilisation et politique de confidentialité",
    icon: "file",
  },
};
