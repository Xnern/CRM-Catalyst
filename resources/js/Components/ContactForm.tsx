// src/Components/ContactForm.tsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/Components/ui/form';
import { useAddContactMutation, useUpdateContactMutation } from '@/services/api';
import { Contact } from '@/types/Contact';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Regex pour le numéro de téléphone: permet chiffres, espaces, tirets, et un '+' en début.
// Gère aussi les cas où le champ est vide ou seulement des espaces pour la validation côté client.
const phoneRegex = new RegExp(
  /^([+]?\d{1,3}[-. ]?)?(\(?\d{3}\)?[-. ]?)?\d{3}[-. ]?\d{4}$/
);

// Schéma de validation avec Zod
const contactFormSchema = z.object({
  name: z.string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(50, { message: "Le nom ne doit pas dépasser 50 caractères." }),

  email: z.string()
    .email({ message: "Veuillez entrer une adresse email valide." })
    .max(100, { message: "L'email ne doit pas dépasser 100 caractères." })
    .optional()
    .or(z.literal('')),

  phone: z.string()
    .max(20, { message: "Le numéro de téléphone ne doit pas dépasser 20 caractères." })
    .optional()
    .or(z.literal(''))
    .refine((val) => {
        if (val && val.trim() !== '') {
            return phoneRegex.test(val);
        }
        return true;
    }, "Le numéro de téléphone n'est pas valide (chiffres, +, espaces, tirets autorisés)."),
});

interface ContactFormProps {
  contact?: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ contact, onSuccess, onCancel }) => {
  const isEditMode = !!contact;
  const [createContact, { isLoading: isCreating }] = useAddContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();

  const form = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
    },
  });

  useEffect(() => {
    if (isEditMode && contact) {
      form.reset({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
      });
    } else if (!isEditMode) {
      form.reset({
        name: '',
        email: '',
        phone: '',
      });
    }
  }, [contact, isEditMode, form.reset]);


  const onSubmit = async (values: z.infer<typeof contactFormSchema>) => {
    const payload = {
      name: values.name,
      email: values.email === '' ? null : values.email,
      phone: values.phone === '' ? null : values.phone,
    };

    try {
      if (isEditMode && contact) {
        await updateContact({ id: contact.id, ...payload }).unwrap();
        toast.success("Le contact a été modifié avec succès !");
      } else {
        await createContact(payload).unwrap();
        toast.success("Le contact a été créé avec succès !");
      }
      onSuccess();
    } catch (err: any) {
      console.error('Échec de la soumission du contact:', err);

      // Si l'erreur provient du backend et contient des erreurs de validation
      if (err.status === 422 && err.data && err.data.errors) {
        // Parcours les erreurs renvoyées par Laravel et les assigne aux champs du formulaire
        for (const field in err.data.errors) {
          // 'field' correspond au nom du champ (ex: 'email', 'name', 'phone')
          // err.data.errors[field][0] est le premier message d'erreur pour ce champ
          form.setError(field as keyof z.infer<typeof contactFormSchema>, {
            type: 'server', // Type d'erreur pour indiquer qu'elle vient du serveur
            message: err.data.errors[field][0],
          });
        }
        toast.error("Veuillez corriger les erreurs dans le formulaire.");
      } else {
        // Pour les autres types d'erreurs (419 CSRF, 500 interne, etc.)
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Nom du contact" {...field} />
              </FormControl>
              <FormMessage /> {/* Ce composant affichera l'erreur */}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} type="email" />
              </FormControl>
              <FormMessage /> {/* Ce composant affichera l'erreur */}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone</FormLabel>
              <FormControl>
                <Input placeholder="0123456789" {...field} type="tel" />
              </FormControl>
              <FormMessage /> {/* Ce composant affichera l'erreur */}
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer les modifications' : 'Créer le contact'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ContactForm;
