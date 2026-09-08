interface Employee {
    characterId: string;
    firstName: string;
    lastName: string;
    doDId: string;
    rank: string;
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    phone?: string | null;
}

interface Props {
    employee: Employee;
    onClick: () => void;
}

const STATUS_LABELS = {
    active: { label: 'Aktywny', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    on_leave: { label: 'Urlop', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    suspended: { label: 'Zawieszony', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    terminated: { label: 'Zwolniony', class: 'bg-stone-500/10 text-stone-400 border-stone-500/20' },
};

export const EmployeeListItem = ({ employee, onClick }: Props) => {
    const statusInfo = STATUS_LABELS[employee.status] ?? STATUS_LABELS.active;

    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-4 bg-stone-800/60 border border-stone-700/50 rounded-xl hover:bg-stone-800 hover:border-stone-600/60 transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-4">
                <div className="px-3 py-2 rounded-lg bg-stone-900/80 flex flex-col items-center justify-center border border-stone-700/60">
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">DoD ID</span>
                    <span className="text-xs font-mono font-bold text-stone-200">{employee.doDId}</span>
                </div>
                <div>
                    <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                        {employee.rank} {employee.firstName} {employee.lastName}
                    </h3>
                    {employee.phone && (
                        <p className="text-xs text-stone-400">
                            Tel: <span className="text-stone-300">{employee.phone}</span>
                        </p>
                    )}
                </div>
            </div>

            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusInfo.class}`}>
                {statusInfo.label}
            </span>
        </div>
    );
};