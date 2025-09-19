import { CABIN_TYPES } from '@/types/inspection';

// Photo specification as per segmento-06 requirements
export const PHOTO_SPECIFICATION = {
  photos: [
    {
      id: 'foto1',
      name: 'fachada',
      label: 'FOTO 1 - Fachada',
      description: 'Enviar foto à distância mostrando a Fachada do cliente',
      required: true,
      maxPhotos: 1,
      orientation: 'landscape',
      exifPolicy: 'required_with_fallback' as const,
    },
    {
      id: 'foto2', 
      name: 'proximidade',
      label: 'FOTO 2 - Proximidade/Trafo',
      description: 'Vista próxima do transformador e equipamentos',
      required: true,
      maxPhotos: 1,
      orientation: 'landscape',
      exifPolicy: 'required_with_fallback' as const,
    },
    {
      id: 'foto3',
      name: 'placa',
      label: 'FOTO 3 - Placa/Tags', 
      description: 'Placas de identificação e etiquetas',
      required: true,
      maxPhotos: 1,
      orientation: 'landscape',
      exifPolicy: 'required_with_fallback' as const,
    },
    {
      id: 'foto4',
      name: 'quadro_geral',
      label: 'FOTO 4 - Quadro Geral',
      description: 'Vista geral do quadro elétrico principal',
      required: true,
      maxPhotos: 1,
      orientation: 'landscape',
      exifPolicy: 'required_with_fallback' as const,
    }
  ],
  filename_pattern: '{client_legal_name}_{data}_{fotoN}.jpg',
  exif_policy: {
    geotag: 'required_with_fallback',
    orientation: 'preserved',
    compression: {
      quality: 0.8,
      preserve_exif: true,
    }
  },
  compression: {
    quality: 0.8,
    preserve_exif: true,
    max_size_mb: 5,
  }
};

// Cabin types specification as per segmento-07 requirements
export const CABIN_TYPES_SPECIFICATION = {
  cabine_types: CABIN_TYPES.map(type => ({
    key: type.key,
    label: type.label,
    description: type.description,
    aliases: type.aliases,
    conditional_items: type.conditional_items,
  }))
};

// Validation functions
export const validatePhotoRequirements = (photos: Record<string, string[]>): {
  isValid: boolean;
  missingPhotos: string[];
  gpsStatus: { total: number; withGps: number; needsManual: boolean };
} => {
  const missingPhotos: string[] = [];
  
  // Check required photos
  PHOTO_SPECIFICATION.photos.forEach(photoSpec => {
    if (photoSpec.required && (!photos[photoSpec.name] || photos[photoSpec.name].length === 0)) {
      missingPhotos.push(photoSpec.label);
    }
  });

  // Mock GPS status calculation (would be real in implementation)
  const totalPhotos = Object.values(photos).flat().length;
  const photosWithGps = Math.floor(totalPhotos * 0.7); // Simulate 70% with GPS
  
  return {
    isValid: missingPhotos.length === 0,
    missingPhotos,
    gpsStatus: {
      total: totalPhotos,
      withGps: photosWithGps,
      needsManual: totalPhotos > 0 && (photosWithGps / totalPhotos) < 0.5,
    }
  };
};

export const getCabinTypeConditionalFields = (cabinType: string): {
  fields: string[];
  photos: string[];
  modules: string[];
} => {
  const config = CABIN_TYPES.find(type => type.key === cabinType);
  
  if (!config) {
    return { fields: [], photos: [], modules: [] };
  }
  
  return {
    fields: config.conditional_items.fields || [],
    photos: config.conditional_items.photos || [],
    modules: config.conditional_items.modules || [],
  };
};