import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import type { ReactNode } from 'react';

interface Props {
    title: string;
    actionLabel?: string;
    actionIcon?: IconDefinition;
    onAction?: () => void;
    showAction?: boolean;
    children?: ReactNode;
}

export const PageHeader = ({title, actionLabel, actionIcon = faPlus, onAction, showAction = true, children,}: Props) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <div className="flex items-center gap-3">
                {children}
                {showAction && onAction && actionLabel && (
                    <button
                        onClick={onAction}
                        className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                        <FontAwesomeIcon icon={actionIcon} />
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
};