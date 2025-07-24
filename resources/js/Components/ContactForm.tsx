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
    errors?: FormErrors; // Accepte une prop 'errors'
}

// --- NOUVELLE FONCTION UTILITAIRE POUR LE FORMATAGE CÔTÉ FRONTEND ---
const formatPhoneNumberForDisplay = (phoneNumber: string | null | undefined): string => {
    if (!phoneNumber) {
        return '';
    }

    // Ensures only digits are left, even if there are spaces, dashes, etc.
    // Handles an optional leading '+'
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const hasPlus = cleaned.startsWith('+');
    let digitsOnly = hasPlus ? cleaned.substring(1) : cleaned;

    // Check if it's a 10-digit French number (0X XX XX XX XX or +33 X XX XX XX XX)
    if (digitsOnly.length === 10) {
        return `${hasPlus ? '+' : ''}${digitsOnly.substring(0, 2)} ${digitsOnly.substring(2, 4)} ${digitsOnly.substring(4, 6)} ${digitsOnly.substring(6, 8)} ${digitsOnly.substring(8, 10)}`;
    }
    // For other lengths or international numbers, return it as is (cleaned but unformatted)
    // For more complex international formatting, consider a library like `libphonenumber-js`.
    return phoneNumber;
};
// --- FIN NOUVELLE FONCTION UTILITAIRE ---


export default function ContactForm({ initialData, onSubmit, isLoading = false, errors }: ContactFormProps) {
    // Initialise l'état avec le numéro formaté pour l'affichage
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(formatPhoneNumberForDisplay(initialData?.phone)); // Utilise la fonction de formatage
    const [address, setAddress] = useState(initialData?.address || '');

    // Réinitialise les champs quand initialData change (ex: passer de "Ajouter" à "Modifier" ou vice-versa)
    useEffect(() => {
        setName(initialData?.name || '');
        setEmail(initialData?.email || '');
        // Met à jour le champ téléphone en le formatant si initialData change
        setPhone(formatPhoneNumberForDisplay(initialData?.phone)); // Utilise la fonction de formatage
        setAddress(initialData?.address || '');
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // N'envoie PAS le numéro formaté.
        // Envoie la valeur brute du champ input. Le backend se chargera de la nettoyer.
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
                    className={`col-span-3 ${errors?.name ? 'border-red-500' : ''}`}
                    required
                    disabled={isLoading}
                />
                {errors?.name && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.name[0]}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`col-span-3 ${errors?.email ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                />
                {errors?.email && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.email[0]}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Téléphone</Label>
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`col-span-3 ${errors?.phone ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                />
                {errors?.phone && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.phone[0]}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Adresse</Label>
                <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`col-span-3 ${errors?.address ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                />
                {errors?.address && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.address[0]}</p>}
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
