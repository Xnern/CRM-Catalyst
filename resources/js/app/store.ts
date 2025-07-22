// resources/js/app/store.ts

import { configureStore } from '@reduxjs/toolkit';
import { contactsApi } from '@/services/api'; // Assurez-vous que ce chemin est correct vers votre fichier api.ts

export const store = configureStore({
  // 'reducer' est un objet qui contient tous les 'slices' et les 'API reducers' de votre application.
  // Chaque clé correspondra à la 'slice name' ou 'reducerPath' de votre API.
  reducer: {
    // Ajoutez le reducer de votre API ici, en utilisant la clé 'reducerPath' définie dans createApi.
    [contactsApi.reducerPath]: contactsApi.reducer,
    // Si vous avez d'autres 'slices' (pour gérer l'état de l'authentification, UI, etc.),
    // vous les ajouteriez ici également, par exemple:
    // auth: authReducer,
    // ui: uiReducer,
  },
  // 'middleware' est une fonction qui ajoute des fonctionnalités supplémentaires au store.
  // RTK Query nécessite son propre middleware pour gérer le caching, l'invalidation, etc.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(contactsApi.middleware),

  // 'devTools' est activé par défaut en développement pour utiliser l'extension Redux DevTools.
  // Vous pouvez le désactiver en production si vous le souhaitez.
  devTools: process.env.NODE_ENV !== 'production',
});

// Facultatif mais recommandé pour un typage fort:
// Déduisez le type `RootState` et `AppDispatch` du store lui-même.
// Cela vous permettra d'avoir des types précis pour `useSelector` et `useDispatch`.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
