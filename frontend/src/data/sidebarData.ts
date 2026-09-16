import {
    faHouse,
    faUserGear,
    faUserTie,
    faUser,
    faIdCard,
    faRectangleList,
    faWindowRestore, faSitemap, faUserXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { Permissions } from "../types/permissions";

export interface SidebarChildItem {
    href: string;
    title: string;
    icon?: IconDefinition;
    roles?: string[];
    permission?: keyof Permissions;
}

export interface SidebarItemDef {
    type: 'item' | 'section';
    title: string;
    href?: string;
    icon?: IconDefinition;
    roles?: string[];
    permission?: keyof Permissions;
    children?: SidebarChildItem[];
}

export const sidebarItems: SidebarItemDef[] = [
    {
        type: 'item',
        href: '/dashboard',
        icon: faHouse,
        title: 'Dashboard',
    },
    {
        type: 'section',
        title: 'Panel Administracyjny',
        permission: 'hasAdminAccess',
        children: [
            { href: '/admin/roles', title: 'Zarządzanie rangami', icon: faUserGear, permission: 'canManagePermission' },
            { href: '/admin/profiles', title: 'Profile postaci', icon: faUserTie, permission: 'canManagePermission' },
        ],
    },
    {
        type: 'section',
        title: 'Human Resources Division',
        children: [
            { href: '/hrd/employees', title: 'Pracownicy', icon: faUser, permission: 'hasEmployeeAccess' },
            { href: '/hrd/structure', title: 'Struktura', icon: faSitemap, permission: 'hasStructureAccess' },
            { href: '/hrd/absences', title: 'Nieobecności', icon: faUserXmark, permission: 'hasAbsenceAccess' },
        ],
    },
    {
        type: 'section',
        title: 'Security Forces Squadron',
        children: [
            { href: '/sfs/dbids', title: 'DBIDS', icon: faIdCard, permission: 'hasDBIDSAccess' },
            { href: '/sfs/reports', title: 'Raporty', icon: faRectangleList, permission: 'hasReportAccess' },
        ],
    },
    {
        type: 'section',
        title: 'Mobile Data Terminal',
        children: [
            { href: '/mdt/cad', title: 'CAD', icon: faWindowRestore, permission: 'hasReportAccess' },
            { href: '/mdt/mdc', title: 'MDC', icon: faWindowRestore, permission: 'hasReportAccess' },
        ],
    },
];