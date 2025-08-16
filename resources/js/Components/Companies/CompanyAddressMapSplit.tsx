import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
import { debounce } from 'lodash';

const customMarkerIcon = new L.Icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIconRetinaPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

interface MapEventHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  currentMarker: [number, number] | null;
}

function MapEventHandler({ onMapClick, currentMarker }: MapEventHandlerProps) {
  const map = useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  useEffect(() => {
    if (currentMarker) {
      map.setView(currentMarker, map.getZoom() > 10 ? map.getZoom() : 13);
    }
  }, [currentMarker, map]);
  return null;
}

export interface SplitAddress {
  address: string;
  city: string;
  zipcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props extends SplitAddress {
  onChange: (values: SplitAddress) => void;
  mapHeightClass?: string; // e.g. "h-64"
}

export default function CompanyAddressMapSplit({
  address,
  city,
  zipcode,
  country,
  latitude,
  longitude,
  onChange,
  mapHeightClass = 'h-64',
}: Props) {
  const [addr, setAddr] = useState(address || '');
  const [localCity, setLocalCity] = useState(city || '');
  const [zip, setZip] = useState(zipcode || '');
  const [ctry, setCtry] = useState(country || '');
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null
  );

  const addressInputRef = useRef<HTMLInputElement>(null);
  const mapCenter: [number, number] = markerPosition || [48.8566, 2.3522];

  const pushChange = (partial: Partial<SplitAddress>) => {
    onChange({
      address: partial.address !== undefined ? partial.address : addr,
      city: partial.city !== undefined ? partial.city : localCity,
      zipcode: partial.zipcode !== undefined ? partial.zipcode : zip,
      country: partial.country !== undefined ? partial.country : ctry,
      latitude: partial.latitude !== undefined ? partial.latitude : (markerPosition ? markerPosition[0] : null),
      longitude: partial.longitude !== undefined ? partial.longitude : (markerPosition ? markerPosition[1] : null),
    });
  };

  const extractPartsFromNominatim = (obj: any) => {
    const a = obj?.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const cityPart = a.city || a.town || a.village || a.municipality || a.city_district || '';
    const postcode = a.postcode || '';
    const countryPart = a.country || '';
    return { street, cityPart, postcode, countryPart };
  };

  // Adresse → coords (avec addressdetails=1)
  const geocodeAddress = useCallback(debounce(async (fullAddr: string) => {
    if (!fullAddr) {
      setMarkerPosition(null);
      pushChange({ address: '', city: '', zipcode: '', country: '', latitude: null, longitude: null });
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddr)}&format=json&addressdetails=1&limit=1`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const { street, cityPart, postcode, countryPart } = extractPartsFromNominatim(item);

        setMarkerPosition([lat, lon]);
        setAddr(street || fullAddr);
        setLocalCity(cityPart);
        setZip(postcode);
        setCtry(countryPart);

        pushChange({
          address: street || fullAddr,
          city: cityPart,
          zipcode: postcode,
          country: countryPart,
          latitude: lat,
          longitude: lon,
        });
      }
    } catch (e) {
      console.error('Erreur geocoding:', e);
    }
  }, 700), []);

  // Coords → adresse (reverse)
  const reverseGeocode = useCallback(debounce(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
      const data = await res.json();
      const { street, cityPart, postcode, countryPart } = extractPartsFromNominatim(data);

      setAddr(street);
      setLocalCity(cityPart);
      setZip(postcode);
      setCtry(countryPart);

      if (addressInputRef.current) addressInputRef.current.value = street;

      pushChange({
        address: street,
        city: cityPart,
        zipcode: postcode,
        country: countryPart,
        latitude: lat,
        longitude: lng,
      });
    } catch (e) {
      console.error('Erreur reverse geocoding:', e);
    }
  }, 500), []);

  // Sync props → state
  useEffect(() => {
    setAddr(address || '');
    setLocalCity(city || '');
    setZip(zipcode || '');
    setCtry(country || '');
    setMarkerPosition(latitude != null && longitude != null ? [latitude, longitude] : null);
  }, [address, city, zipcode, country, latitude, longitude]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="street">Adresse</Label>
        <Input
          id="street"
          ref={addressInputRef}
          value={addr}
          onChange={(e) => {
            const v = e.target.value;
            setAddr(v);
            pushChange({ address: v });
            geocodeAddress(v);
          }}
          placeholder="ex: 10 rue de la Paix"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            value={localCity}
            onChange={(e) => {
              const v = e.target.value;
              setLocalCity(v);
              pushChange({ city: v });
            }}
            placeholder="ex: Paris"
          />
        </div>
        <div>
          <Label htmlFor="zipcode">Code postal</Label>
          <Input
            id="zipcode"
            value={zip}
            onChange={(e) => {
              const v = e.target.value;
              setZip(v);
              pushChange({ zipcode: v });
            }}
            placeholder="ex: 75002"
          />
        </div>
        <div>
          <Label htmlFor="country">Pays</Label>
          <Input
            id="country"
            value={ctry}
            onChange={(e) => {
              const v = e.target.value;
              setCtry(v);
              pushChange({ country: v });
            }}
            placeholder="ex: France"
          />
        </div>
      </div>

      <div className={`mt-1 w-full rounded-md overflow-hidden border ${mapHeightClass}`}>
        <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable
              icon={customMarkerIcon}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  setMarkerPosition([lat, lng]);
                  reverseGeocode(lat, lng);
                }
              }}
            />
          )}
          <MapEventHandler
            onMapClick={(lat, lng) => {
              setMarkerPosition([lat, lng]);
              reverseGeocode(lat, lng);
            }}
            currentMarker={markerPosition}
          />
        </MapContainer>
      </div>
    </div>
  );
}
