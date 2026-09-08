interface FilterOption<T extends string> {
    value: T;
    label: string;
}

interface Props<T extends string> {
    options: FilterOption<T>[];
    value: T;
    onChange: (val: T) => void;
}

export const FilterButtons = <T extends string>({ options, value, onChange }: Props<T>) => {
    return (
        <div className="flex gap-2">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        value === opt.value
                            ? 'bg-red-700 text-white'
                            : 'bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};