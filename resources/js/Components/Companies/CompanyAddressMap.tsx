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
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  useEffect(() => {
    if (currentMarker) {
      map.setView(currentMarker, map.getZoom() > 10 ? map.getZoom() : 13);
    }
  }, [currentMarker, map]);
  return null;
}

interface Props {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (addr: string, lat: number | null, lng: number | null) => void;
}

export default function CompanyAddressMap({ address, latitude, longitude, onChange }: Props) {
  const [addr, setAddr] = useState(address || '');
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const addressInputRef = useRef<HTMLInputElement>(null);
  const mapCenter: [number, number] = markerPosition || [48.8566, 2.3522];

  const geocodeAddress = useCallback(debounce(async (addr: string) => {
    if (!addr) {
      setMarkerPosition(null);
      onChange(addr, null, null);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMarkerPosition([lat, lon]);
        onChange(addr, lat, lon);
      } else {
        setMarkerPosition(null);
        onChange(addr, null, null);
      }
    } catch (error) {
      console.error("Erreur geocoding:", error);
    }
  }, 800), []);

  const reverseGeocode = useCallback(debounce(async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      if (data?.display_name) {
        setAddr(data.display_name);
        onChange(data.display_name, lat, lng);
        if (addressInputRef.current) {
          addressInputRef.current.value = data.display_name;
        }
      }
    } catch (error) {
      console.error("Erreur reverse geocoding:", error);
    }
  }, 500), []);

  // Sync props→state
  useEffect(() => {
    setAddr(address || '');
    setMarkerPosition(latitude && longitude ? [latitude, longitude] : null);
  }, [address, latitude, longitude]);

  return (
    <div>
      <Label htmlFor="address">Adresse</Label>
      <Input
        ref={addressInputRef}
        id="address"
        value={addr}
        onChange={(e) => {
          setAddr(e.target.value);
          geocodeAddress(e.target.value);
        }}
      />
      <div className="mt-2 h-64 w-full rounded-md overflow-hidden border">
        <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
