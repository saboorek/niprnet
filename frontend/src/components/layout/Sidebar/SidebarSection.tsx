import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { SidebarItem } from './SidebarItem.tsx';
import type { SidebarChildItem } from '../../../data/sidebarData.ts';

interface Props {
    title:    string;
    children: SidebarChildItem[];
}

export const SidebarSection = ({ title, children }: Props) => {
    return (
        <Disclosure defaultOpen>
            {({ open }) => (
                <li>
                    <DisclosureButton className="flex w-full items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50">
                        <span>{title}</span>
                        <FontAwesomeIcon
                            icon={faChevronDown}
                            className={`w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                    </DisclosureButton>
                    <DisclosurePanel>
                        <ul className="mt-1 space-y-1">
                            {children.map((item, idx) => (
                                <SidebarItem
                                    key={idx}
                                    href={item.href}
                                    label={item.title}
                                    icon={item.icon}
                                    indent
                                />
                            ))}
                        </ul>
                    </DisclosurePanel>
                </li>
            )}
        </Disclosure>
    );
};