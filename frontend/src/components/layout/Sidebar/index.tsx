import logo from '../../../assets/logo/logoNIPRNet.png';
import { SidebarItem } from './SidebarItem.tsx';
import { SidebarSection } from './SidebarSection.tsx';
import { sidebarItems } from '../../../data/sidebarData.ts';
import { useCharacter } from '../../../context/CharacterContext.tsx';
import type { SidebarChildItem, SidebarItemDef } from '../../../data/sidebarData.ts';
import { CommitInfo } from '../../ui/CommitInfo.tsx';

interface Props {
    isOpen: boolean;
}

export const Sidebar = ({ isOpen }: Props) => {
    const { selectedCharacter } = useCharacter();
    const perms = selectedCharacter?.permissions as any;
    const characterRoles = (selectedCharacter?.roles as any[]) ?? [];

    const hasPerm = (permission: string): boolean => {
        if (!perms) return false;
        if (typeof perms[permission] === 'boolean') return perms[permission];
        for (const category of Object.values(perms)) {
            if (typeof category === 'object' && category !== null) {
                if ((category as any)[permission] === true) return true;
            }
        }
        return false;
    };

    const hasRole = (roles: string[]): boolean => {
        return roles.some(r => characterRoles.some((role: any) => role.name === r));
    };

    const isItemVisible = (item: SidebarChildItem | SidebarItemDef): boolean => {
        if (item.permission) return hasPerm(item.permission);
        if (item.roles && item.roles.length > 0) return hasRole(item.roles);
        return true;
    };

    const isSectionVisible = (item: SidebarItemDef): boolean => {
        if (!isItemVisible(item)) return false;
        if (item.children) {
            return item.children.some(child => isChildVisible(child));
        }
        return true;
    };

    const isChildVisible = (child: SidebarChildItem): boolean => {
        if (child.permission) return hasPerm(child.permission);
        if (child.roles && child.roles.length > 0) return hasRole(child.roles);
        return true;
    };


    return (
        <aside className={`flex flex-col h-screen bg-gray-800 border-r border-gray-700/50 shrink-0 transition-all duration-300 overflow-hidden ${
            isOpen ? 'w-64' : 'w-0'
        }`}>
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 px-6 py-5 border-b border-gray-700/50">
                <img src={logo} alt="Logo" className="h-auto w-auto" />
            </div>

            {/* Nawigacja */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                    {sidebarItems.map((item, idx) => {
                        if (item.type === 'item') {
                            if (!isItemVisible(item)) return null;
                            return (
                                <SidebarItem
                                    key={idx}
                                    href={item.href!}
                                    label={item.title}
                                    icon={item.icon}
                                />
                            );
                        }

                        if (item.type === 'section' && item.children) {
                            if (!isSectionVisible(item)) return null;

                            const visibleChildren = item.children.filter(c => isChildVisible(c));
                            if (visibleChildren.length === 0) return null;

                            return (
                                <SidebarSection
                                    key={idx}
                                    title={item.title}
                                    children={visibleChildren}
                                />
                            );
                        }

                        return null;
                    })}
                </ul>
            </nav>

            {/* Stopka */}
            <div className="border-t border-gray-700/50 px-4 py-3">
                <div className="relative group flex justify-center">
                    <a
                        href="https://github.com/saboorek/niprnet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 text-center cursor-pointer hover:text-gray-300 transition-colors"
                    >
                        NIPRNet 1.0
                    </a>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        <CommitInfo />
                    </div>
                </div>
            </div>
        </aside>
    );
};