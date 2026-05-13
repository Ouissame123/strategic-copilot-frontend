/**
 * Point d’extension pour la synchro auth / routing.
 *
 * Auparavant, un `useEffect` sur `pathname` appelait `syncSession()` à chaque navigation.
 * Or `syncSession` efface la session en cas d’erreur sur `/me` : tout échec transitoire
 * (401 après refresh, réseau, endpoint indisponible) déconnectait l’utilisateur à chaque
 * changement de page. L’hydratation et la validation initiale sont gérées dans `AuthProvider`.
 */
export function AuthRouteSync() {
    return null;
}
