// resources/js/Components/ContactForm.tsx

import React, { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Contact } from '@/types/Contact';
import { Loader2 } from 'lucide-react';

// Interface pour les erreurs reçues
interface FormErrors {
    [key: string]: string[]; // Clé (nom du champ) avec un tableau de messages d'erreur
}

interface ContactFormProps {
    initialData?: Contact | null;
    onSubmit: (values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>) => void;
    isLoading?: boolean;
    errors?: FormErrors; // NOUVEAU: Accepte une prop 'errors'
}

export default function ContactForm({ initialData, onSubmit, isLoading = false, errors }: ContactFormProps) { // Accepte 'errors'
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [address, setAddress] = useState(initialData?.address || '');

    useEffect(() => {
        setName(initialData?.name || '');
        setEmail(initialData?.email || '');
        setPhone(initialData?.phone || '');
        setAddress(initialData?.address || '');
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, email, phone, address });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4 gap-y-2">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`col-span-3 ${errors?.name ? 'border-red-500' : ''}`} // NOUVEAU: Style d'erreur
                    required
                    disabled={isLoading}
                />
                {errors?.name && <p className="col-start-2 col-span-3 text-red-500 text-sm">{errors.name[0]}</p>} {/* NOUVEAU: Affichage de l'erreur */}
            </div>
            <div className="grid grid-cols-4 items-center gap-4 gap-y-2">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`col-span-3 ${errors?.email ? 'border-red-500' : ''}`} // NOUVEAU
                    disabled={isLoading}
                />
                {errors?.email && <p className="col-start-2 col-span-3 text-red-500 text-sm">{errors.email[0]}</p>} {/* NOUVEAU */}
            </div>
            <div className="grid grid-cols-4 items-center gap-4 gap-y-2">
                <Label htmlFor="phone" className="text-right">Téléphone</Label>
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`col-span-3 ${errors?.phone ? 'border-red-500' : ''}`} // NOUVEAU
                    disabled={isLoading}
                />
                {errors?.phone && <p className="col-start-2 col-span-3 text-red-500 text-sm">{errors.phone[0]}</p>} {/* NOUVEAU */}
            </div>
            <div className="grid grid-cols-4 items-center gap-4 gap-y-2">
                <Label htmlFor="address" className="text-right">Adresse</Label>
                <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`col-span-3 ${errors?.address ? 'border-red-500' : ''}`} // NOUVEAU
                    disabled={isLoading}
                />
                {errors?.address && <p className="col-start-2 col-span-3 text-red-500 text-sm">{errors.address[0]}</p>} {/* NOUVEAU */}
            </div>

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
