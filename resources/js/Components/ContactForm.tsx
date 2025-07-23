// resources/js/Components/ContactForm.tsx (Version adaptative)
import React, { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Contact } from '@/types/Contact'; // Assurez-vous d'importer Contact
import { Loader2 } from 'lucide-react'; // Pour l'icône de chargement

interface ContactFormProps {
    initialData?: Contact | null;
    onSubmit: (values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>) => void;
    isLoading?: boolean; // Pour afficher un indicateur de chargement
}

export default function ContactForm({ initialData, onSubmit, isLoading = false }: ContactFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [address, setAddress] = useState(initialData?.address || '');

    // Réinitialise les champs quand initialData change (ex: passer de "Ajouter" à "Modifier" ou vice-versa)
    useEffect(() => {
        setName(initialData?.name || '');
        setEmail(initialData?.email || '');
        setPhone(initialData?.phone || '');
        setAddress(initialData?.address || '');
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Appelle la fonction onSubmit passée par les props avec les données du formulaire
        onSubmit({ name, email, phone, address });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                    required
                    disabled={isLoading} // Désactiver pendant le chargement
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3"
                    disabled={isLoading}
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Téléphone</Label>
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="col-span-3"
                    disabled={isLoading}
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Adresse</Label>
                <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="col-span-3"
                    disabled={isLoading}
                />
            </div>

            {/* Pas d'erreurs Inertia.js directement ici, elles seraient gérées via les props si nécessaire */}
            {/* Si tu as des erreurs de validation du backend, tu devrais les passer via props à ContactForm */}
            {/* Par exemple, errors={backendErrors} et les afficher ici */}

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sauvegarde...
                        </>
                    ) : (
                        'Sauvegarder'
                    )}
                </Button>
            </div>
        </form>
    );
}
