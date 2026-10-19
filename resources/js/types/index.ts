import { LucideIcon } from 'lucide-react';

/** A dashboard section a user can be given (User::PERMISSIONS on the server). */
export type Permission = 'projects' | 'site' | 'inbox' | 'media' | 'users';

export interface Auth {
    user: User;
    permissions: Permission[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Shown only to users holding it. */
    permission?: Permission;
}

export interface SharedData {
    name: string;
    siteUrl: string;
    flash?: { success?: string | null; error?: string | null };
    maintenance?: boolean;
    unreadMessages?: number;
    notifications?: { unread: number; items: AppNotification[] } | null;
    auth: Auth;
    [key: string]: unknown;
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
