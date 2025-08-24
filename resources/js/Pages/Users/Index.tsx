import { useState, useEffect, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { FiUser, FiMail, FiShield, FiEdit2, FiTrash2, FiPlus, FiSearch, FiKey, FiLock, FiUsers, FiCheckCircle, FiXCircle, FiAlertCircle, FiFilter, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useThemeColors } from '@/hooks/useThemeColors';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    created_at: string;
    roles: Array<{ id: number; name: string }>;
    permissions: Array<{ id: number; name: string }>;
}

interface Role {
    id: number;
    name: string;
}

interface Permission {
    id: number;
    name: string;
    label: string;
}

// Default avatar placeholder URL
const DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#E5E7EB;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#D1D5DB;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#grad)"/>
        <circle cx="100" cy="75" r="32" fill="#9CA3AF"/>
        <ellipse cx="100" cy="145" rx="55" ry="35" fill="#9CA3AF"/>
        <text x="100" y="185" text-anchor="middle" fill="#6B7280" font-family="Arial" font-size="12">Avatar</text>
    </svg>`
)}`;

const translateRole = (role: string): string => {
    const translations: { [key: string]: string } = {
        'super-admin': 'Super Administrateur',
        'admin': 'Administrateur',
        'manager': 'Manager',
        'sales': 'Commercial',
        'support': 'Support',
    };
    return translations[role] ?? role;
};

const translatePermission = (permission: string): string => {
    const translations: { [key: string]: string } = {
        // Contacts
        'create contact': 'Créer un contact',
        'manage contacts': 'Gérer les contacts',
        'view all contacts': 'Voir tous les contacts',
        'view contacts': 'Voir les contacts',
        'view own contacts': 'Voir ses propres contacts',
        'delete contacts': 'Supprimer les contacts',
        'create contacts': 'Créer des contacts',
        'edit contacts': 'Modifier les contacts',
        'import contacts': 'Importer des contacts',
        'export contacts': 'Exporter des contacts',

        // Documents
        'create document': 'Créer un document',
        'manage documents': 'Gérer les documents',
        'delete documents': 'Supprimer les documents',
        'view all documents': 'Voir tous les documents',
        'view documents': 'Voir les documents',
        'view own documents': 'Voir ses propres documents',
        'upload documents': 'Téléverser des documents',
        'edit documents': 'Modifier les documents',
        'download documents': 'Télécharger les documents',

        // Entreprises
        'create company': 'Créer une entreprise',
        'view own companies': 'Voir ses propres entreprises',
        'view companies': 'Voir les entreprises',
        'view all companies': 'Voir toutes les entreprises',
        'manage companies': 'Gérer les entreprises',
        'delete companies': 'Supprimer les entreprises',
        'create companies': 'Créer des entreprises',
        'edit companies': 'Modifier les entreprises',

        // Paramètres CRM
        'view crm settings': 'Voir les paramètres CRM',
        'manage crm settings': 'Gérer les paramètres CRM',

        // Tableau de bord
        'view dashboard': 'Voir le tableau de bord',
        'view all stats': 'Voir toutes les statistiques',

        // Opportunités
        'view opportunities': 'Voir les opportunités',
        'view all opportunities': 'Voir toutes les opportunités',
        'create opportunities': 'Créer des opportunités',
        'edit opportunities': 'Modifier les opportunités',
        'delete opportunities': 'Supprimer les opportunités',
        'change opportunity stage': 'Changer le statut des opportunités',

        // Calendrier
        'view calendar': 'Voir le calendrier',
        'manage calendar events': 'Gérer les événements du calendrier',

        // Utilisateurs
        'view users': 'Voir les utilisateurs',
        'create users': 'Créer des utilisateurs',
        'edit users': 'Modifier les utilisateurs',
        'delete users': 'Supprimer les utilisateurs',
        'assign roles': 'Assigner des rôles',

        // Rapports
        'view reports': 'Voir les rapports',
        'export reports': 'Exporter les rapports',
        'generate advanced reports': 'Générer des rapports avancés',

        // Settings
        'view settings': 'Voir les paramètres',
        'manage settings': 'Gérer les paramètres',
        'manage integrations': 'Gérer les intégrations',

        // Import/Export
        'import data': 'Importer des données',
        'export data': 'Exporter des données',
        'bulk operations': 'Opérations en masse',
    };

    return translations[permission] ?? permission;
};

const getPermissionCategory = (permission: string): string => {
    if (permission.includes('contact')) return 'Contacts';
    if (permission.includes('compan')) return 'Entreprises';
    if (permission.includes('opportunit')) return 'Opportunités';
    if (permission.includes('document')) return 'Documents';
    if (permission.includes('calendar') || permission.includes('event')) return 'Calendrier';
    if (permission.includes('user') || permission.includes('role') || permission.includes('permission')) return 'Utilisateurs';
    if (permission.includes('report') || permission.includes('analytics')) return 'Rapports';
    if (permission.includes('setting') || permission.includes('crm')) return 'Paramètres';
    if (permission.includes('dashboard') || permission.includes('stats')) return 'Tableau de bord';
    if (permission.includes('activit')) return 'Activités';
    return 'Autres';
};

export default function UsersIndex({ auth }: PageProps) {
    const themeColors = useThemeColors();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'support'
    });
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchRolesAndPermissions();
    }, [search, selectedRole, currentPage]);

    const fetchUsers = async () => {
        if (!isRefreshing) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (selectedRole) params.append('role', selectedRole);
            params.append('page', currentPage.toString());

            const response = await axios.get(`/api/users?${params}`);
            setUsers(response.data.data);
            setTotalPages(response.data.last_page);
        } catch (error) {
            console.error('Erreur lors du chargement des utilisateurs:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchUsers();
        toast.info('Actualisation de la liste...');
    };

    const fetchRolesAndPermissions = async () => {
        try {
            const response = await axios.get('/api/users/roles-permissions');
            setRoles(response.data.roles);
            setPermissions(response.data.permissions);
        } catch (error) {
            console.error('Erreur lors du chargement des rôles et permissions:', error);
        }
    };

    const handleCreateUser = async () => {
        try {
            await axios.post('/api/users', formData);
            setShowCreateModal(false);
            setFormData({
                name: '',
                email: '',
                password: '',
                password_confirmation: '',
                role: 'support'
            });
            fetchUsers();
            toast.success('Utilisateur créé avec succès');
        } catch (error: any) {
            console.error('Erreur lors de la création:', error);
            if (error.response?.status === 422 && error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error(Array.isArray(firstError) ? firstError[0] : firstError as string);
            } else {
                toast.error(error.response?.data?.message || 'Erreur lors de la création');
            }
        }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        try {
            const updateData: any = {
                name: formData.name,
                email: formData.email
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            await axios.put(`/api/users/${selectedUser.id}`, updateData);
            setShowEditModal(false);
            setSelectedUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                password_confirmation: '',
                role: 'support'
            });
            fetchUsers();
            toast.success('Utilisateur modifié avec succès');
        } catch (error: any) {
            console.error('Erreur lors de la mise à jour:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
        }
    };

    const handleUpdateRoles = async () => {
        if (!selectedUser) return;

        try {
            await axios.put(`/api/users/${selectedUser.id}/roles`, {
                roles: selectedRoles
            });
            setShowRolesModal(false);
            setSelectedUser(null);
            setSelectedRoles([]);
            fetchUsers();
            toast.success('Rôles mis à jour avec succès');
        } catch (error: any) {
            console.error('Erreur lors de la mise à jour des rôles:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des rôles');
        }
    };

    const handleUpdatePermissions = async () => {
        if (!selectedUser) return;

        try {
            await axios.put(`/api/users/${selectedUser.id}/permissions`, {
                permissions: selectedPermissions
            });
            setShowPermissionsModal(false);
            setSelectedUser(null);
            setSelectedPermissions([]);
            fetchUsers();
            toast.success('Permissions mises à jour avec succès');
        } catch (error: any) {
            console.error('Erreur lors de la mise à jour des permissions:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des permissions');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

        try {
            await axios.delete(`/api/users/${userId}`);
            fetchUsers();
            toast.success('Utilisateur supprimé avec succès');
        } catch (error: any) {
            console.error('Erreur lors de la suppression:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
        }
    };

    const handleSendVerificationEmail = async (userId: number) => {
        try {
            await axios.post(`/api/users/${userId}/send-verification`);
            toast.success('Email de vérification envoyé avec succès');
        } catch (error: any) {
            console.error('Erreur lors de l\'envoi:', error);
            toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi de l\'email');
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            password_confirmation: '',
            role: user.roles[0]?.name || 'support'
        });
        setShowEditModal(true);
    };

    const openRolesModal = async (user: User) => {
        // Fetch complete user details
        try {
            const response = await axios.get(`/api/users/${user.id}`);
            const fullUser = response.data.user;
            setSelectedUser(fullUser);
            setSelectedRoles(fullUser.roles.map((r: any) => r.name));
            setShowRolesModal(true);
        } catch (error) {
            console.error('Erreur lors du chargement des détails:', error);
            toast.error('Erreur lors du chargement des rôles');
        }
    };

    const openPermissionsModal = async (user: User) => {
        // Fetch complete user details
        try {
            const response = await axios.get(`/api/users/${user.id}`);
            const fullUser = response.data.user;
            setSelectedUser(fullUser);
            
            // Store role-inherited permissions to display differently
            const rolePermissions = fullUser.role_permissions || [];
            const directPermissions = fullUser.direct_permissions || [];
            
            // Store inherited permissions in state for display
            (fullUser as any).rolePermissionNames = rolePermissions.map((p: any) => p.name);
            
            // Select user's direct permissions
            setSelectedPermissions(directPermissions.map((p: any) => p.name));
            
            // Load all available permissions
            if (response.data.allPermissions) {
                setPermissions(response.data.allPermissions);
            }
            
            setShowPermissionsModal(true);
        } catch (error) {
            console.error('Erreur lors du chargement des détails:', error);
            toast.error('Erreur lors du chargement des permissions');
        }
    };

    const getRoleBadgeColor = (roleName: string) => {
        const colors = {
            'super-admin': 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
            'admin': 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
            'manager': `bg-gradient-to-r text-white`,
            'sales': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
            'support': 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
        };
        return colors[roleName as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const getRoleIcon = (roleName: string) => {
        switch (roleName) {
            case 'super-admin': return '👑';
            case 'admin': return '🛡️';
            case 'manager': return '📊';
            case 'sales': return '💼';
            case 'support': return '💬';
            default: return '👤';
        }
    };

    // Optimized statistics calculation with corrected total
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    useEffect(() => {
        // Fetch total number of users
        axios.get('/api/users?page=1').then(response => {
            setTotalUsersCount(response.data.total || response.data.data?.length || 0);
        });
    }, []);

    const stats = useMemo(() => {
        const verifiedUsers = users.filter(u => u.email_verified_at).length;
        const adminUsers = users.filter(u => u.roles.some(r => r.name === 'admin' || r.name === 'super-admin')).length;
        const recentUsers = users.filter(u => {
            const createdDate = new Date(u.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return createdDate > thirtyDaysAgo;
        }).length;

        return { totalUsers: totalUsersCount, verifiedUsers, adminUsers, recentUsers };
    }, [users, totalUsersCount]);

    // Grouper les permissions par catégorie pour l'affichage
    const groupPermissionsByCategory = (permissions: Permission[]) => {
        return permissions.reduce((acc, permission) => {
            const category = getPermissionCategory(permission.name);
            if (!acc[category]) acc[category] = [];
            acc[category].push(permission);
            return acc;
        }, {} as Record<string, Permission[]>);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-2xl text-gray-800 dark:text-gray-200">
                            Gestion des utilisateurs
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Gérez les utilisateurs, leurs rôles et permissions
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                            {totalUsersCount} utilisateur{totalUsersCount !== 1 ? 's' : ''} au total
                        </span>
                    </div>
                </div>
            }
        >
            <Head title="Gestion des utilisateurs" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Cartes de statistiques */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total utilisateurs</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalUsers}</p>
                                </div>
                                <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-lg">
                                    <FiUsers className="text-primary-600 dark:text-primary-400 w-6 h-6" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Vérifiés</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.verifiedUsers}</p>
                                </div>
                                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                                    <FiCheckCircle className="text-green-600 dark:text-green-400 w-6 h-6" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Administrateurs</p>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.adminUsers}</p>
                                </div>
                                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                                    <FiShield className="text-purple-600 dark:text-purple-400 w-6 h-6" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Nouveaux (30j)</p>
                                    <p className="text-2xl font-bold mt-1" style={{ color: themeColors.primary }}>{stats.recentUsers}</p>
                                </div>
                                <div className="p-3 rounded-lg" style={{ backgroundColor: `${themeColors.primary}20` }}>
                                    <FiAlertCircle className="w-6 h-6" style={{ color: themeColors.primary }} />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Panneau principal */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            {/* Barre d'outils améliorée */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                    <div className="relative flex-1 sm:flex-initial">
                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Rechercher par nom ou email..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2.5 w-full sm:w-80 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                        />
                                    </div>

                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                                    >
                                        <FiFilter className="w-5 h-5 mr-2" />
                                        Filtres
                                        {selectedRole && (
                                            <span className="ml-2 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full text-xs">1</span>
                                        )}
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className="flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                                    >
                                        <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </button>

                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="flex items-center px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                                    >
                                        <FiPlus className="w-5 h-5 mr-2" />
                                        Nouvel utilisateur
                                    </button>
                                </div>
                            </div>

                            {/* Filtres avancés */}
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                                >
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setSelectedRole('')}
                                                className={`px-4 py-2 rounded-lg transition-all ${
                                                    selectedRole === ''
                                                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 border-2 border-primary-300 dark:border-primary-700'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                Tous les rôles
                                            </button>
                                            {roles.map(role => (
                                                <button
                                                    key={role.id}
                                                    onClick={() => setSelectedRole(role.name)}
                                                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                                        selectedRole === role.name
                                                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 border-2 border-primary-300 dark:border-primary-700'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                                >
                                                    <span>{getRoleIcon(role.name)}</span>
                                                    <span>{translateRole(role.name)}</span>
                                                </button>
                                            ))}
                                        </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Table des utilisateurs améliorée */}
                        <div className="overflow-hidden">
                            {loading && !isRefreshing ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                                        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                    </div>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des utilisateurs...</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <FiUsers className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun utilisateur trouvé</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                                        {search || selectedRole
                                            ? "Aucun utilisateur ne correspond à vos critères de recherche."
                                            : "Commencez par créer un nouvel utilisateur."}
                                    </p>
                                    {(search || selectedRole) && (
                                        <button
                                            onClick={() => { setSearch(''); setSelectedRole(''); }}
                                            className="mt-4 px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                    Utilisateur
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                    Rôles
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                    Permissions
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                    Statut
                                                </th>
                                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {users.map((user, index) => (
                                                <motion.tr
                                                    key={user.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="relative">
                                                                {(user as any).avatar ? (
                                                                    <img
                                                                        src={(user as any).avatar}
                                                                        alt={user.name}
                                                                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                                                        <img
                                                                            src={DEFAULT_AVATAR}
                                                                            alt="Avatar par défaut"
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {user.email_verified_at && (
                                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                                                                        <FiCheckCircle className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {user.name}
                                                                    {user.id === auth.user.id && (
                                                                        <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">(Vous)</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                    <FiMail className="w-3 h-3" />
                                                                    {user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {user.roles.length > 0 ? user.roles.map((role) => (
                                                                <span
                                                                    key={role.id}
                                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${role.name === 'manager' ? 'bg-gradient-to-r text-white' : getRoleBadgeColor(role.name)} shadow-sm`}
                                                                    style={role.name === 'manager' ? { 
                                                                        background: `linear-gradient(45deg, ${themeColors.primary}, #06b6d4)` 
                                                                    } : {}}
                                                                >
                                                                    <span>{getRoleIcon(role.name)}</span>
                                                                    <span>{translateRole(role.name)}</span>
                                                                </span>
                                                            )) : (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Aucun rôle</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {(user as any).total_permissions_count || 0}
                                                                    </span>
                                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                        permission{((user as any).total_permissions_count || 0) !== 1 ? 's' : ''} au total
                                                                    </span>
                                                                </div>
                                                                {(user as any).direct_permissions_count > 0 && (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        dont {(user as any).direct_permissions_count} directe{(user as any).direct_permissions_count > 1 ? 's' : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {user.permissions && user.permissions.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {user.permissions.slice(0, 2).map((p: any, idx: number) => (
                                                                        <span key={p.id || idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                                                                            {translatePermission(p.name).split(' ').slice(0, 2).join(' ')}
                                                                        </span>
                                                                    ))}
                                                                    {user.permissions.length > 2 && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-medium">
                                                                            +{user.permissions.length - 2} directes
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            {user.email_verified_at ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                                                    <FiCheckCircle className="w-3 h-3" />
                                                                    Vérifié
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                                                    <FiAlertCircle className="w-3 h-3" />
                                                                    Non vérifié
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {new Date(user.created_at).toLocaleDateString('fr-FR', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => openEditModal(user)}
                                                                className="p-2 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                                                                title="Modifier"
                                                            >
                                                                <FiEdit2 className="w-4 h-4" />
                                                            </button>
                                                            {!user.email_verified_at && (
                                                                <button
                                                                    onClick={() => handleSendVerificationEmail(user.id)}
                                                                    className="p-2 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-all"
                                                                    title="Envoyer email de vérification"
                                                                >
                                                                    <FiMail className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openRolesModal(user)}
                                                                className="p-2 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                                                                title="Gérer les rôles"
                                                            >
                                                                <FiShield className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openPermissionsModal(user)}
                                                                className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                                                                title="Gérer les permissions"
                                                            >
                                                                <FiKey className="w-4 h-4" />
                                                            </button>
                                                            {user.id !== auth.user.id && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                                    title="Supprimer"
                                                                >
                                                                    <FiTrash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Pagination améliorée */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        Affichage de <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> à{' '}
                                        <span className="font-medium">
                                            {Math.min(currentPage * 10, users.length + (currentPage - 1) * 10)}
                                        </span>{' '}
                                        utilisateurs
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Précédent
                                        </button>
                                        <div className="flex gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                                            currentPage === pageNum
                                                                ? 'bg-primary-600 text-white'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Suivant
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Modal Créer utilisateur améliorée */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="bg-primary-600 p-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FiPlus className="w-6 h-6" />
                                Créer un nouvel utilisateur
                            </h3>
                        </div>
                        <div className="p-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmer le mot de passe</label>
                                <input
                                    type="password"
                                    value={formData.password_confirmation}
                                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôle</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {roles.map(role => (
                                        <option key={role.id} value={role.name}>{translateRole(role.name)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                            >
                                Créer l'utilisateur
                            </button>
                        </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Éditer utilisateur améliorée */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="bg-primary-600 p-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FiEdit2 className="w-6 h-6" />
                                Modifier l'utilisateur
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nouveau mot de passe (laisser vide pour ne pas changer)
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleUpdateUser}
                                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                                >
                                    Enregistrer les modifications
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Gérer les rôles améliorée */}
            {showRolesModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="bg-purple-600 p-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FiShield className="w-6 h-6" />
                                Gérer les rôles
                            </h3>
                            <p className="text-purple-100 text-sm mt-1">{selectedUser.name}</p>
                        </div>
                        <div className="p-6">
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {roles.map(role => (
                                    <label
                                        key={role.id}
                                        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all ${
                                            selectedRoles.includes(role.name)
                                                ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                                                : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedRoles.includes(role.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedRoles([...selectedRoles, role.name]);
                                                } else {
                                                    setSelectedRoles(selectedRoles.filter(r => r !== role.name));
                                                }
                                            }}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-md mr-3 flex items-center justify-center transition-all ${
                                            selectedRoles.includes(role.name)
                                                ? 'bg-primary-600'
                                                : 'bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500'
                                        }`}>
                                            {selectedRoles.includes(role.name) && (
                                                <FiCheckCircle className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getRoleIcon(role.name)}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {translateRole(role.name)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {role.name}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setShowRolesModal(false)}
                                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleUpdateRoles}
                                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                                >
                                    Enregistrer les rôles
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Gérer les permissions améliorée */}
            {showPermissionsModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
                    >
                        <div className="bg-green-600 p-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FiKey className="w-6 h-6" />
                                Gérer les permissions
                            </h3>
                            <p className="text-green-100 text-sm mt-1">{selectedUser.name}</p>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} directe{selectedPermissions.length !== 1 ? 's' : ''} sélectionnée{selectedPermissions.length !== 1 ? 's' : ''}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: themeColors.primary }}></div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Via rôle</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-green-600 rounded"></div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Permission directe</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedPermissions(permissions.map(p => p.name));
                                                toast.success('Toutes les permissions sélectionnées');
                                            }}
                                            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-all"
                                        >
                                            Tout sélectionner
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedPermissions([]);
                                                toast.info('Toutes les permissions désélectionnées');
                                            }}
                                            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-all"
                                        >
                                            Tout désélectionner
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {Object.entries(groupPermissionsByCategory(permissions)).map(([category, perms]) => (
                                    <div key={category}>
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sticky top-0 bg-white dark:bg-gray-800 py-2">
                                            {category}
                                        </h4>
                                        <div className="space-y-2">
                                            {perms.map(permission => {
                                                const isFromRole = selectedUser && (selectedUser as any).rolePermissionNames?.includes(permission.name);
                                                const isDirectlySelected = selectedPermissions.includes(permission.name);
                                                
                                                return (
                                                    <label
                                                        key={permission.id}
                                                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                                                            isDirectlySelected
                                                                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                                                                : isFromRole
                                                                ? 'border-2'
                                                                : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                        style={isFromRole && !isDirectlySelected ? { 
                                                            backgroundColor: `${themeColors.primary}0d`,
                                                            borderColor: `${themeColors.primary}50`
                                                        } : {}}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isDirectlySelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedPermissions([...selectedPermissions, permission.name]);
                                                                } else {
                                                                    setSelectedPermissions(selectedPermissions.filter(p => p !== permission.name));
                                                                }
                                                            }}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-5 h-5 rounded-md mr-3 flex items-center justify-center transition-all ${
                                                            isDirectlySelected
                                                                ? 'bg-green-600'
                                                                : isFromRole
                                                                ? ''
                                                                : 'bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500'
                                                        }`}
                                                        style={isFromRole && !isDirectlySelected ? { 
                                                            backgroundColor: themeColors.primary 
                                                        } : {}}>
                                                            {(isDirectlySelected || isFromRole) && (
                                                                <FiCheckCircle className="w-3 h-3 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {permission.label || translatePermission(permission.name)}
                                                                </span>
                                                                {isFromRole && !isDirectlySelected && (
                                                                    <span 
                                                                        className="text-xs px-2 py-0.5 rounded-full"
                                                                        style={{ 
                                                                            backgroundColor: `${themeColors.primary}20`,
                                                                            color: themeColors.primary 
                                                                        }}
                                                                    >
                                                                        Via rôle
                                                                    </span>
                                                                )}
                                                                {isFromRole && isDirectlySelected && (
                                                                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                                        Directe + Rôle
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {permission.label && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {permission.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setShowPermissionsModal(false)}
                                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleUpdatePermissions}
                                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                                >
                                    Enregistrer les permissions
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
