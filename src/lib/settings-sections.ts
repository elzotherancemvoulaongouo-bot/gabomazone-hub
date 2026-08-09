export const SETTINGS_SECTIONS: Record<string, { title: string; description: string; icon: string }> = {
  profile: {
    title: "Informations personnelles",
    description: "Photo, nom, date de naissance, ville, contacts",
    icon: "user-circle",
  },
  security: {
    title: "Mot de passe et sécurité",
    description: "Changer votre mot de passe, gérer vos sessions",
    icon: "shield",
  },
  activity: {
    title: "Activité du compte",
    description: "Vos publications, j'aime et commentaires",
    icon: "history",
  },
  privacy: {
    title: "Qui peut voir mes publications",
    description: "Visibilité par défaut de vos nouvelles publications",
    icon: "eye",
  },
  contact: {
    title: "Qui peut me contacter",
    description: "Messages et demandes d'amis",
    icon: "user-cog",
  },
  blocks: { title: "Blocages", description: "Personnes que vous avez bloquées", icon: "ban" },
  notifications: {
    title: "Notifications",
    description: "Messages, j'aime, commentaires, demandes d'amis",
    icon: "bell",
  },
  feed: {
    title: "Préférences du fil d'actualité",
    description: "Ordre d'affichage des publications",
    icon: "newspaper",
  },
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