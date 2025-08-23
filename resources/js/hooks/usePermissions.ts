import { usePage } from '@inertiajs/react';

interface PageProps {
    auth: {
        user: any;
        permissions: string[];
        roles: string[];
    };
}

export function usePermissions() {
    const { auth } = usePage<PageProps>().props;

    const can = (permission: string): boolean => {
        return auth?.permissions?.includes(permission) || false;
    };

    const canAny = (permissions: string[]): boolean => {
        return permissions.some(permission => can(permission));
    };

    const canAll = (permissions: string[]): boolean => {
        return permissions.every(permission => can(permission));
    };

    const hasRole = (role: string): boolean => {
        return auth?.roles?.includes(role) || false;
    };

    const hasAnyRole = (roles: string[]): boolean => {
        return roles.some(role => hasRole(role));
    };

    const isAdmin = (): boolean => {
        return hasAnyRole(['super-admin', 'admin']);
    };

    const isSuperAdmin = (): boolean => {
        return hasRole('super-admin');
    };

    return {
        can,
        canAny,
        canAll,
        hasRole,
        hasAnyRole,
        isAdmin,
        isSuperAdmin,
        permissions: auth?.permissions || [],
        roles: auth?.roles || [],
        user: auth?.user,
    };
}