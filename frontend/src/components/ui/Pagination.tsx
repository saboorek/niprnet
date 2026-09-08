import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
}

export const Pagination = ({ page, totalPages, onPrev, onNext }: PaginationProps) => (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
        <button
            onClick={onPrev}
            disabled={page === 1}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
            <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
            Poprzednia
        </button>
        <span className="text-xs text-gray-500">{page} / {totalPages}</span>
        <button
            onClick={onNext}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
            Następna
            <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
    </div>
);