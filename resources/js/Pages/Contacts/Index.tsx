import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Ajustez ce chemin si votre layout est différent
import { Head } from '@inertiajs/react'; // Pour gérer le <head> de la page
import ContactTable from '@/Components/ContactTable'; // Assurez-vous que le chemin est correct. Utilisez '@/Components' si configuré.
import { Button } from '@/Components/ui/button'; // Shadcn UI Button

// Définition des props passées par Inertia.js depuis le contrôleur Laravel
interface IndexProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            // Ajoutez d'autres propriétés de l'utilisateur si elles sont passées par Inertia
            // ex: roles: string[]; permissions: string[];
        };
    };
    canCreateContact: boolean; // Permet de savoir si l'utilisateur peut créer un contact
}

const ContactPageIndex: React.FC<IndexProps> = ({ auth, canCreateContact }) => {
    // Fonctionnalité pour créer un contact (à implémenter)
    const handleCreateContact = () => {
        // Ici, vous pourriez ouvrir une modale de création de contact
        // ou rediriger vers une page de formulaire.
        alert('Action: Créer un nouveau contact!');
        console.log('User has permission to create contact:', canCreateContact);
    };

    return (
        // AuthenticatedLayout est le layout principal de votre application (si vous utilisez Breeze/Jetstream ou similaire)
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Gestion des Contacts</h2>}
        >
            {/* Gère le titre de la page dans l'onglet du navigateur */}
            <Head title="Contacts" />

            {/* Conteneur principal de la page */}
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        {/* Section du haut avec le bouton de création */}
                        <div className="flex justify-end mb-4">
                            {/* Afficher le bouton "Créer un contact" seulement si l'utilisateur a la permission */}
                            {canCreateContact && (
                                <Button onClick={handleCreateContact}>
                                    Créer un nouveau contact
                                </Button>
                            )}
                        </div>

                        {/* Intégration du composant ContactTable */}
                        {/* Ce composant gérera l'affichage des données, la pagination, le tri, etc.,
                            en interagissant avec RTK Query */}
                        <ContactTable />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default ContactPageIndex;
