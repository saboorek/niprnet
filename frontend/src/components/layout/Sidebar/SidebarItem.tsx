import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface Props {
    href:   string;
    label:  string;
    icon?:  IconDefinition;
    indent?: boolean;
}

export const SidebarItem = ({ href, label, icon, indent = false }: Props) => {
    return (
        <li>
            <NavLink
                to={href}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm
                    ${indent ? 'pl-6' : ''}
                    ${isActive
                        ? 'bg-gradient-to-r from-emerald-950 to-emerald-800 text-white font-semibold border border-emerald-700/60 shadow-sm'
                        : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`
                }
            >
                {icon && <FontAwesomeIcon icon={icon} className="w-4 shrink-0 text-emerald-500/80" />}
                {label}
            </NavLink>
        </li>
    );
};