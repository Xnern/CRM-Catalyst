// src/Components/ContactForm.tsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/Components/ui/form';
import { useCreateContactMutation, useUpdateContactMutation, Contact } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // <-- IMPORT DE LA FONCTION toast DE SONNER

// Schéma de validation avec Zod (inchangé)
const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }).max(50, { message: "Le nom ne doit pas dépasser 50 caractères." }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }).max(100, { message: "L'email ne doit pas dépasser 100 caractères." }).optional().or(z.literal('')),
  phone: z.string().max(20, { message: "Le numéro de téléphone ne doit pas dépasser 20 caractères." }).optional().or(z.literal('')),
});

interface ContactFormProps {
  contact?: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ contact, onSuccess, onCancel }) => {
  // Pas besoin de "const { toast } = useToast();" ici, on utilise directement la fonction importée.

  const isEditMode = !!contact;
  const [createContact, { isLoading: isCreating }] = useCreateContactMutation();
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
    try {
      if (isEditMode && contact) {
        await updateContact({ id: contact.id, ...values }).unwrap();
        toast.success("Le contact a été modifié avec succès !"); // <-- Utilisation de toast.success
      } else {
        await createContact(values).unwrap();
        toast.success("Le contact a été créé avec succès !"); // <-- Utilisation de toast.success
      }
      onSuccess();
    } catch (err: any) {
      console.error('Échec de la soumission du contact:', err);
      if (err.data && err.data.errors) {
        for (const field in err.data.errors) {
          form.setError(field as keyof z.infer<typeof contactFormSchema>, {
            type: 'server',
            message: err.data.errors[field][0],
          });
        }
        toast.error("Veuillez corriger les champs invalides."); // <-- Utilisation de toast.error
      } else {
        toast.error("Une erreur est survenue lors de la soumission. Veuillez réessayer."); // <-- Utilisation de toast.error
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
              <FormMessage />
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
              <FormMessage />
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
              <FormMessage />
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
