import React, { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { themeStyles } = usePage().props as any;
    
    useEffect(() => {
        if (themeStyles) {
            // Inject theme styles into the document
            const styleId = 'dynamic-theme-styles';
            let styleElement = document.getElementById(styleId) as HTMLStyleElement;
            
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                document.head.appendChild(styleElement);
            }
            
            // Update CSS variables with the theme colors
            styleElement.textContent = `
                :root {
                    --primary: ${themeStyles.primaryHsl};
                    --primary-hex: ${themeStyles.primaryColor};
                    --secondary: ${themeStyles.secondaryHsl};
                    --secondary-hex: ${themeStyles.secondaryColor};
                    --ring: ${themeStyles.primaryHsl};
                }
                
                .dark {
                    --primary: ${themeStyles.primaryHsl};
                    --primary-hex: ${themeStyles.primaryColor};
                    --secondary: ${themeStyles.secondaryHsl};
                    --secondary-hex: ${themeStyles.secondaryColor};
                    --ring: ${themeStyles.primaryHsl};
                }
                
                /* Dynamic primary color classes */
                .bg-primary-600 {
                    background-color: ${themeStyles.primaryColor} !important;
                }
                
                .bg-primary-700 {
                    background-color: ${themeStyles.primaryColor} !important;
                    filter: brightness(0.9);
                }
                
                .hover\\:bg-primary-600:hover {
                    background-color: ${themeStyles.primaryColor} !important;
                }
                
                .hover\\:bg-primary-700:hover {
                    background-color: ${themeStyles.primaryColor} !important;
                    filter: brightness(0.9);
                }
                
                .text-primary-600 {
                    color: ${themeStyles.primaryColor} !important;
                }
                
                .text-primary-700 {
                    color: ${themeStyles.primaryColor} !important;
                    filter: brightness(0.9);
                }
                
                .hover\\:text-primary-600:hover {
                    color: ${themeStyles.primaryColor} !important;
                }
                
                .border-primary-600 {
                    border-color: ${themeStyles.primaryColor} !important;
                }
                
                .border-primary-200 {
                    border-color: ${themeStyles.primaryColor}33 !important;
                }
                
                .bg-primary-50 {
                    background-color: ${themeStyles.primaryColor}11 !important;
                }
                
                .hover\\:bg-primary-50:hover {
                    background-color: ${themeStyles.primaryColor}11 !important;
                }
                
                .focus\\:border-primary-600:focus {
                    border-color: ${themeStyles.primaryColor} !important;
                }
                
                /* Update FullCalendar button colors */
                .fc .fc-button-primary {
                    background-color: ${themeStyles.primaryColor} !important;
                    border-color: ${themeStyles.primaryColor} !important;
                }
                
                .fc .fc-button-primary:hover {
                    filter: brightness(0.9);
                }
                
                .fc .fc-button-primary:not(:disabled):active,
                .fc .fc-button-primary:not(:disabled).fc-button-active {
                    filter: brightness(0.85);
                }
                
                /* Update focus states */
                .input-focus:focus {
                    border-color: hsl(${themeStyles.primaryHsl});
                    box-shadow: 0 0 0 1px hsl(${themeStyles.primaryHsl});
                }
                
                /* Button primary styles */
                .btn-primary {
                    background-color: ${themeStyles.primaryColor} !important;
                    border-color: ${themeStyles.primaryColor} !important;
                }
                
                .btn-primary:hover {
                    filter: brightness(0.9);
                }
            `;
        }
    }, [themeStyles]);
    
    return <>{children}</>;
}