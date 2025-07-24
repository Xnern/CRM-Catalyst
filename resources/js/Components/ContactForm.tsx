import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Contact } from '@/types/Contact';
import { Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Styles Leaflet
import L from 'leaflet'; // Import Leaflet
import { debounce } from 'lodash';

// --- FIX ROBUSTE POUR LES IMAGES DES ICÔNES LEAFLET ---
// Importe directement les chemins des images des marqueurs Leaflet.
// Vite va alors les traiter comme des assets et les servir correctement.
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Crée une instance d'icône personnalisée avec les chemins importés
const customMarkerIcon = new L.Icon({
    iconUrl: markerIconPng,
    iconRetinaUrl: markerIconRetinaPng,
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],   // Taille de l'icône (largeur, hauteur)
    iconAnchor: [12, 41], // Point de l'icône qui correspond aux coordonnées du marqueur
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});
// --- FIN FIX ROBUSTE ---


// Interface pour les erreurs de validation du backend
interface FormErrors {
    [key: string]: string[];
}

interface ContactFormProps {
    initialData?: Contact | null;
    onSubmit: (values: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'user'>) => void;
    isLoading?: boolean;
    errors?: FormErrors;
}

// Fonction utilitaire pour le formatage du numéro de téléphone (inchangée)
const formatPhoneNumberForDisplay = (phoneNumber: string | null | undefined): string => {
    if (!phoneNumber) { return ''; }
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const hasPlus = cleaned.startsWith('+');
    let digitsOnly = hasPlus ? cleaned.substring(1) : cleaned;
    if (digitsOnly.length === 10) {
        return `${hasPlus ? '+' : ''}${digitsOnly.substring(0, 2)} ${digitsOnly.substring(2, 4)} ${digitsOnly.substring(4, 6)} ${digitsOnly.substring(6, 8)} ${digitsOnly.substring(8, 10)}`;
    }
    return phoneNumber;
};


// --- Composant interne pour gérer les événements de la carte ---
interface MapEventHandlerProps {
    onMapClick: (lat: number, lng: number) => void;
    currentMarker: [number, number] | null;
}

function MapEventHandler({ onMapClick, currentMarker }: MapEventHandlerProps) {
    const map = useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });

    // Centre la carte sur le marqueur si le marqueur change
    useEffect(() => {
        if (currentMarker) {
            map.setView(currentMarker, map.getZoom() > 10 ? map.getZoom() : 13);
        }
    }, [currentMarker, map]);

    return null;
}
// --- Fin Composant interne ---


export default function ContactForm({ initialData, onSubmit, isLoading = false, errors }: ContactFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(formatPhoneNumberForDisplay(initialData?.phone));
    const [address, setAddress] = useState(initialData?.address || '');
    const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
        (initialData?.latitude && initialData?.longitude) ? [initialData.latitude, initialData.longitude] : null
    );

    const addressInputRef = useRef<HTMLInputElement>(null);

    const mapCenter: [number, number] = markerPosition || [48.8566, 2.3522]; // Paris par défaut

    // --- Géocodage (adresse vers Lat/Lng) ---
    const geocodeAddress = useCallback(debounce(async (addr: string) => {
        if (!addr) {
            setMarkerPosition(null);
            return;
        }
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setMarkerPosition([lat, lon]);
            } else {
                setMarkerPosition(null);
            }
        } catch (error) {
            console.error("Erreur de géocodage:", error);
            setMarkerPosition(null);
        }
    }, 800), []);

    // --- Géocodage inversé (Lat/Lng vers adresse) ---
    const reverseGeocode = useCallback(debounce(async (lat: number, lng: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await response.json();
            if (data && data.display_name) {
                setAddress(data.display_name);
                if (addressInputRef.current) {
                    addressInputRef.current.value = data.display_name;
                }
            } else {
                setAddress('');
            }
        } catch (error) {
            console.error("Erreur de géocodage inversé:", error);
            setAddress('');
        }
    }, 500), []);

    // Réinitialise les champs quand initialData change
    useEffect(() => {
        setName(initialData?.name || '');
        setEmail(initialData?.email || '');
        setPhone(formatPhoneNumberForDisplay(initialData?.phone));
        setAddress(initialData?.address || '');
        setMarkerPosition((initialData?.latitude && initialData?.longitude) ? [initialData.latitude, initialData.longitude] : null);
        if (initialData?.address && !(initialData?.latitude && initialData?.longitude)) {
            geocodeAddress(initialData.address);
        }
    }, [initialData, geocodeAddress]);

    // Gère le changement de l'Input d'adresse
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAddress = e.target.value;
        setAddress(newAddress);
        geocodeAddress(newAddress);
    };

    // Gère le clic sur la carte pour le géocodage inversé
    const handleMapClick = (lat: number, lng: number) => {
        setMarkerPosition([lat, lng]);
        reverseGeocode(lat, lng);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            email,
            phone,
            address,
            latitude: markerPosition ? markerPosition[0] : null,
            longitude: markerPosition ? markerPosition[1] : null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            {/* Champ Nom */}
            <div className="flex flex-col space-y-1"> {/* Changé pour empiler label et input */}
                <Label htmlFor="name">Nom</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={errors?.name ? 'border-red-500' : ''}
                    required
                    disabled={isLoading}
                />
                {errors?.name && <p className="text-red-500 text-sm mt-1">{errors.name[0]}</p>}
            </div>
            {/* Champ Email */}
            <div className="flex flex-col space-y-1"> {/* Changé pour empiler label et input */}
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors?.email ? 'border-red-500' : ''}
                    disabled={isLoading}
                />
                {errors?.email && <p className="text-red-500 text-sm mt-1">{errors.email[0]}</p>}
            </div>
            {/* Champ Téléphone */}
            <div className="flex flex-col space-y-1"> {/* Changé pour empiler label et input */}
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={errors?.phone ? 'border-red-500' : ''}
                    disabled={isLoading}
                />
                {errors?.phone && <p className="text-red-500 text-sm mt-1">{errors.phone[0]}</p>}
            </div>

            {/* Champ Adresse avec carte */}
            <div className="flex flex-col space-y-1"> {/* Changé pour empiler label et input */}
                <Label htmlFor="address">Adresse</Label>
                <Input
                    id="address"
                    ref={addressInputRef}
                    value={address}
                    onChange={handleAddressChange}
                    className={errors?.address ? 'border-red-500' : ''}
                    disabled={isLoading}
                />
                {errors?.address && <p className="text-red-500 text-sm mt-1">{errors.address[0]}</p>}
            </div>

            {/* Conteneur de la carte */}
            <div className="col-span-full mt-2 h-64 w-full rounded-md overflow-hidden border"> {/* Utilise col-span-full pour prendre toute la largeur de la grille parent */}
                <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {markerPosition && (
                        <Marker
                            position={markerPosition}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const { lat, lng } = e.target.getLatLng();
                                    handleMapClick(lat, lng);
                                },
                            }}
                            icon={customMarkerIcon}
                        />
                    )}
                    <MapEventHandler onMapClick={handleMapClick} currentMarker={markerPosition} />
                </MapContainer>
            </div>
            {errors?.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude[0]}</p>}
            {errors?.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude[0]}</p>}


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
