import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

export const SearchInput = ({ value, onChange, placeholder = 'Szukaj...' }: Props) => {
    return (
        <div className="relative flex-1 min-w-48">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-gray-900 text-white rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
        </div>
    );
};