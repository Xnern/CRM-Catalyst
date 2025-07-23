// resources/js/Pages/Contacts/Index.tsx

import React, { useState } from 'react'; // Importer useState
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ContactTable from '@/Components/ContactTable';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog'; // Shadcn Dialog components
import ContactForm from '@/Components/ContactForm'; // Nous allons créer ce composant ensuite

interface IndexProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    canCreateContact: boolean;
}

const ContactPageIndex: React.FC<IndexProps> = ({ auth, canCreateContact }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // État pour la modale de création

    const handleCreateContact = () => {
        setIsCreateModalOpen(true); // Ouvre la modale
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false); // Ferme la modale
    };

    // Fonction pour gérer la soumission réussie du formulaire de création
    const handleContactCreated = () => {
        handleCloseCreateModal(); // Ferme la modale après succès
        // Pas besoin de rafraîchir manuellement la table ici, RTK Query gérera l'invalidation du cache
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Gestion des Contacts</h2>}
        >
            <Head title="Contacts" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-end mb-4">
                            {canCreateContact && (
                                <Button onClick={handleCreateContact}>
                                    Créer un nouveau contact
                                </Button>
                            )}
                        </div>

                        <ContactTable />
                    </div>
                </div>
            </div>

            {/* Modale de création de contact */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Créer un nouveau contact</DialogTitle>
                        <DialogDescription>
                            Remplissez les informations ci-dessous pour créer un nouveau contact.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Le formulaire de contact sera rendu ici */}
                    <ContactForm
                        onSuccess={handleContactCreated}
                        onCancel={handleCloseCreateModal}
                    />
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
};

export default ContactPageIndex;
