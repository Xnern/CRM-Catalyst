export interface Contact {
    id: number;
    user_id: number;
    name: string;
    email: string | null; // Assurez-vous que `null` est autorisé si votre DB l'autorise
    phone: string | null; // Idem
    address: string | null; // Idem
    latitude?: number | null;
    longitude?: number | null;
    created_at: string;
    updated_at: string;
    // Si la relation 'user' est incluse par Laravel, elle doit être ici !
    user?: { // Utilisez '?' si la relation n'est pas toujours chargée (non incluse)
        id: number;
        name: string;
        email: string;
        // Ajoutez d'autres propriétés de l'utilisateur si nécessaire
    };
    // Ajoutez d'autres propriétés si votre API les renvoie pour un contact
}
