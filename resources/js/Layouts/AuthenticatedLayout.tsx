import React, { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard,
  Contact,
  Building2,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

// --- MOCK COMPONENTS AND FUNCTIONS FOR STANDALONE DEMONSTRATION ---
// IMPORTANT: Dans votre projet Laravel/Inertia.js, supprimez ces définitions de mock.
// Vous devriez importer vos composants réels et vous fier aux fonctions `route` et `usePage` d'Inertia.js.

// Mock ApplicationLogo component
const ApplicationLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 316 316" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M305.32 186.27c-3.11-20.73-10.8-37.5-23.75-50.55-14.75-15.5-35.3-23.3-61.65-23.3h-1.5c-2.3 0-4.5.1-6.7.2a12.63 12.63 0 0 1-12.7-12.7c.3-1.6.4-3.2.4-4.8 0-16.7-6.2-31.5-18.6-44.5-12.8-13.3-29.4-20-49.8-20-20.4 0-37 6.7-49.8 20-12.4 13-18.6 27.8-18.6 44.5 0 1.6.1 3.2.4 4.8a12.63 12.63 0 0 1-12.7 12.7c-2.2-.1-4.4-.2-6.7-.2h-1.5c-26.35 0-46.9 7.8-61.65 23.3-12.95 13.05-20.64 29.82-23.75 50.55-3.1 20.72-3.6 40.54-1.6 59.43 2 18.9 7.2 35.8 15.6 50.75 8.4 14.96 19.3 27.8 32.7 38.6 13.4 10.8 29.7 18.9 49.1 24.3 19.4 5.4 41.2 7.7 65.4 7 24.2-.7 46-4.5 65.4-11.4 19.4-6.9 36.6-17.1 51.5-30.6 14.9-13.5 27.5-29.8 37.8-49.1 10.3-19.3 18.1-41.2 23.4-65.7 5.3-24.5 7.6-50.1 6.9-76.8z" fill="currentColor" />
    </svg>
);

// Mock NavLink component
interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    active: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, active, children, className = '', ...props }) => (
    <Link
        href={href}
        className={`transition duration-150 ease-in-out focus:outline-none ${className}`}
        {...props}
    >
        {children}
    </Link>
);

// MODIFICATIONS PRINCIPALES ICI - Dropdown et ses composants
interface DropdownProps {
    children: React.ReactElement[]; // Expecting Trigger and Content
}

interface DropdownSubComponentProps {
    children: React.ReactNode;
    className?: string;
}

interface DropdownTriggerProps extends DropdownSubComponentProps {
    isOpen?: boolean;
}

interface DropdownLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    method?: 'get' | 'post' | 'put' | 'delete';
    as?: 'a' | 'button';
}

const Dropdown: React.FC<DropdownProps> & {
    Trigger: React.FC<DropdownTriggerProps>;
    Content: React.FC<DropdownSubComponentProps>;
    Link: React.FC<DropdownLinkProps>;
} = ({ children }) => {
    const [open, setOpen] = useState(false);

    const toggleOpen = () => {
        setOpen((prev) => !prev);
    };

    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (open && event.target instanceof Node && !event.target.closest('.relative')) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [open]);

    return (
        <div className="relative">
            <div onClick={toggleOpen}>
                {React.cloneElement(children[0], { isOpen: open })}
            </div>
            {open && (
                <div
                    className="absolute z-50 rounded-md w-full bottom-full mb-2 bg-white ring-1 ring-black ring-opacity-5"
                    onClick={handleContentClick}
                >
                    {children[1]}
                </div>
            )}
        </div>
    );
};

// Modification du Trigger pour accepter isOpen et gérer les fonctions enfants
Dropdown.Trigger = ({ children, isOpen }: DropdownTriggerProps) => {
    if (typeof children === 'function') {
        return <>{children({ isOpen })}</>;
    }
    return <>{children}</>;
};

Dropdown.Content = ({ children, className = '' }) => (
    <div className={`rounded-md bg-white ring-1 ring-black ring-opacity-5 ${className}`}>
        {children}
    </div>
);

Dropdown.Link = ({ href, children, method = 'get', as = 'a', className = '', ...props }) => {
    if (as === 'button') {
        return (
            <button
                type="button"
                onClick={() => window.location.href = href}
                className={`block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition duration-150 ease-in-out ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
    return (
        <Link
            href={href}
            className={`block px-4 py-2 text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition duration-150 ease-in-out ${className}`}
            {...props}
        >
            {children}
        </Link>
    );
};
// --- END MOCK COMPONENTS AND FUNCTIONS ---

// Mock Inertia's `route` and `usePage` for demonstration purposes
// In your actual project, these would be provided by Inertia.js directly.
declare function route(name: string, params?: Record<string, any>): string;
declare namespace route {
    function current(name?: string, params?: Record<string, any>): boolean;
}

// Implement mock route if not available globally (for standalone testing)
if (typeof window !== 'undefined' && typeof (window as any).route === 'undefined') {
    (window as any).route = (name: string) => {
        const routes: { [key: string]: string } = {
            'dashboard': '/',
            'contacts.index': '/contacts',
            'profile.edit': '/profile',
            'logout': '/logout',
        };
        return routes[name] || '#';
    };

    (window as any).route.current = (name?: string) => {
        const currentPath = window.location.pathname;
        const targetPath = (window as any).route(name || '');
        return currentPath === targetPath || (name === 'dashboard' && currentPath === '/');
    };
}


interface UserProps {
    name: string;
    email: string;
    // Ajoutez d'autres propriétés utilisateur si nécessaire
}

interface PageProps {
    auth: {
        user: UserProps;
    };
    // Ajoutez d'autres propriétés de page si nécessaire
}

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { props: { auth: { user } } } = usePage<PageProps>();
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const savedState = localStorage.getItem('sidebarCollapsed');
            return savedState !== null ? JSON.parse(savedState) : false;
        }
        return false;
    });
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
        }
    }, [sidebarCollapsed]);

    interface NavLinkItem {
        id: string;
        label: string;
        icon: ReactNode;
        route: string;
    }

    const navLinks: NavLinkItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, route: 'dashboard' },
        { id: 'contacts', label: 'Contacts', icon: <Contact size={20} />, route: 'contacts.indexInertia' },
        { id: 'companies', label: 'Entreprises', icon: <Building2 size={20} />, route: 'contacts.index' },
        { id: 'kanban', label: 'Kanban', icon: <Building2 size={20} />, route: 'kanban.indexInertia' },
        { id: 'calendar', label: 'Calendrier', icon: <Calendar size={20} />, route: 'calendar.indexInertia' },
        { id: 'documents', label: 'Documents', icon: <FileText size={20} />, route: 'contacts.index' },
        { id: 'settings', label: 'Paramètres', icon: <Settings size={20} />, route: 'contacts.index' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex font-inter z-50">
            {/* Sidebar Desktop */}
            <div
                className={`hidden md:flex flex-col h-screen fixed bg-card border-r border-border transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'w-20' : 'w-64'
                }`}
            >
                {/* Logo Section */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-center">
                        {/* Always render icon and text span, control visibility with classes */}
                        <div className="bg-primary rounded-lg p-2">
                            <LayoutDashboard className="text-primary-foreground" size={24} />
                        </div>
                        <span
                            className={`text-xl font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out origin-left ${
                                sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-2'
                            }`}
                        >
                            CRM Pro
                        </span>
                    </div>
                </div>

                {/* Main Navigation Links */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-1 px-2">
                        {navLinks.map((link) => (
                            <li key={link.id}>
                                <NavLink
                                    href={route(link.route)}
                                    active={route().current(link.route)}
                                    className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                                        route().current(link.route)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted text-foreground'
                                    }`}
                                >
                                    <span className={`flex-shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`}>
                                        {link.icon}
                                    </span>
                                    {/* Animate label text */}
                                    <span
                                        className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out origin-left ${
                                            sidebarCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'
                                        }`}
                                    >
                                        {link.label}
                                    </span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom Section: User Profile Dropdown and Collapse Button */}
                <div className="p-4 border-t border-border">
                    {/* User Profile Dropdown */}
                    <Dropdown>
                        <Dropdown.Trigger>
                            {({ isOpen }) => (
                                <button
                                    className={`w-full flex items-center p-3 rounded-lg hover:bg-muted transition-colors duration-200 text-foreground ${
                                        sidebarCollapsed ? 'justify-center' : 'justify-between'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <div className="bg-primary rounded-sm p-1 w-8 h-8 flex items-center justify-center">
                                            <span className="text-primary-foreground text-sm font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className={`truncate whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out origin-left ${
                                            sidebarCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'
                                        }`}>
                                            {user.name}
                                        </span>
                                    </div>
                                    {!sidebarCollapsed && (
                                        <svg
                                            className={`-me-0.5 ms-2 h-4 w-4 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180' : ''
                                            }`}
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </Dropdown.Trigger>

                        {/* Dropdown Content - styled to open UPWARDS */}
                        <Dropdown.Content>
                            <Dropdown.Link href={route('profile.edit')} className='w-full top-0'>
                                Profile
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                            >
                                Log Out
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>

                    {/* Sidebar Collapse/Expand Button */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`mt-4 flex items-center justify-center w-8 h-8 p-2 text-teal-600 hover:text-white rounded-lg bg-muted hover:bg-teal-600 transition-colors duration-200 text-foreground absolute bottom-32 -right-4 shadow-lg`}
                    >
                        <ChevronLeft size={24} className={`${sidebarCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:hidden ${
                    mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Mobile Sidebar Header */}
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <div className="bg-primary rounded-lg p-2">
                                <LayoutDashboard className="text-primary-foreground" size={24} />
                            </div>
                            <span className="text-xl font-bold">CRM Pro</span> {/* No animation needed here as mobile sidebar always shows full text */}
                        </div>
                        <button
                            onClick={() => setMobileSidebarOpen(false)}
                            className="p-2 rounded-lg hover:bg-muted text-foreground"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Mobile Navigation Links */}
                    <nav className="flex-1 py-4 overflow-y-auto">
                        <ul className="space-y-1 px-2">
                            {navLinks.map((link) => (
                                <li key={link.id}>
                                    <NavLink
                                        href={route(link.route)}
                                        active={route().current(link.route)}
                                        className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                                            route().current(link.route)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted text-foreground'
                                        }`}
                                    >
                                        <span className="flex-shrink-0">{link.icon}</span>
                                        <span className="ml-3 font-medium">{link.label}</span> {/* No animation needed here */}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Mobile User Profile Dropdown */}
                    <div className="p-4 border-t border-border">
                        <Dropdown>
                            <Dropdown.Trigger>
                                {({ isOpen }) => (
                                    <button
                                        className={`w-full flex items-center p-3 rounded-lg hover:bg-muted transition-colors duration-200 text-foreground`}
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-primary rounded-full p-1">
                                                <span className="text-primary-foreground text-sm font-bold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="ml-3 truncate">{user.name}</span> {/* No animation needed here */}
                                        </div>
                                    </button>
                                )}
                            </Dropdown.Trigger>

                            {/* Dropdown Content for Mobile - styled to open UPWARDS */}
                            <Dropdown.Content className="bottom-full mb-2 origin-bottom-right right-0 w-48">
                                <Dropdown.Link href={route('profile.edit')}>
                                    Profile
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                >
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out overflow-x-hidden ${
                sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
            }`}>
                {/* Top Navigation Bar (visible on mobile only) */}
                <nav className="border-b border-border bg-card md:hidden">
                    <div className="mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between items-center">
                            <div className="flex items-center">
                                <button
                                    onClick={() => setMobileSidebarOpen(true)}
                                    className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted focus:outline-none"
                                >
                                    <Menu size={24} />
                                </button>
                                <div className="flex shrink-0 items-center ml-4">
                                    <Link href="/">
                                        <ApplicationLogo className="block h-9 w-auto fill-current text-foreground" />
                                    </Link>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        {({ isOpen }) => (
                                            <span className="inline-flex rounded-md">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-md border border-transparent bg-transparent px-3 py-2 text-sm font-medium leading-4 text-foreground transition duration-150 ease-in-out hover:bg-muted focus:outline-none"
                                                >
                                                    {user.name}
                                                    <svg
                                                        className={`-me-0.5 ms-2 h-4 w-4 transition-transform duration-200 ${
                                                            isOpen ? 'rotate-180' : ''
                                                        }`}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </span>
                                        )}
                                    </Dropdown.Trigger>

                                    {/* This dropdown opens downwards (standard behavior for top bar) */}
                                    <Dropdown.Content className="origin-top-right right-0 mt-2 w-48">
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>
                    </div>
                </nav>

                {header && (
                    <header className="bg-card shadow">
                        <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                <main className="flex-1 p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
