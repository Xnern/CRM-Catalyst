import { useAppSettings } from './useAppSettings';

export function useThemeColors() {
    const settings = useAppSettings();
    
    const primaryColor = settings?.branding?.primary_color || '#3b82f6';
    const secondaryColor = settings?.branding?.secondary_color || '#64748b';
    
    return {
        primary: primaryColor,
        secondary: secondaryColor,
        getPrimaryClasses: (variant: 'text' | 'bg' | 'border' | 'hover-bg' = 'text') => {
            // For dynamic colors, we need to use style attribute instead of classes
            return {
                style: {
                    ...(variant === 'text' && { color: primaryColor }),
                    ...(variant === 'bg' && { backgroundColor: primaryColor }),
                    ...(variant === 'border' && { borderColor: primaryColor }),
                    ...(variant === 'hover-bg' && { '--hover-bg': primaryColor }),
                }
            };
        },
        getSecondaryClasses: (variant: 'text' | 'bg' | 'border' | 'hover-bg' = 'text') => {
            return {
                style: {
                    ...(variant === 'text' && { color: secondaryColor }),
                    ...(variant === 'bg' && { backgroundColor: secondaryColor }),
                    ...(variant === 'border' && { borderColor: secondaryColor }),
                    ...(variant === 'hover-bg' && { '--hover-bg': secondaryColor }),
                }
            };
        }
    };
}