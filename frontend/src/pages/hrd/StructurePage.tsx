import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faSitemap,
    faUserShield,
    faLayerGroup,
    faTimes,
    faChevronRight,
    faChevronDown,
    faUserCheck,
    faTrash,
    faUsers,
    faUser
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';

interface EmployeeOption {
    characterId: string;
    firstName: string;
    lastName: string;
    rank: string;
    squadronId?: string | null;
    sectionId?: string | null;
}

interface StructureSection {
    _id: string;
    name: string;
    commanderId?: string | null;
    deputyCommanderId?: string | null;
}

interface StructureSquadron {
    _id: string;
    name: string;
    commanderId?: string | null;
    deputyCommanderId?: string | null;
    sections: StructureSection[];
}

export const StructurePage = () => {
    const canAddStructure = usePermission('canAddStructure');
    const canRemoveStructure = usePermission('canRemoveStructure');
    const canEditStructure = usePermission('canEditStructure');

    const [squadrons, setSquadrons] = useState<StructureSquadron[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);

    const [collapsedSquadrons, setCollapsedSquadrons] = useState<Record<string, boolean>>({});

    const [showSquadronModal, setShowSquadronModal] = useState(false);
    const [showSectionModal, setShowSectionModal] = useState<string | null>(null);
    const [newUnitName, setNewUnitName] = useState('');

    const [leadershipModal, setLeadershipModal] = useState<{
        open: boolean;
        level: 'squadron' | 'section';
        targetId: string;
        title: string;
        commanderId: string;
        deputyCommanderId: string;
    }>({
        open: false,
        level: 'squadron',
        targetId: '',
        title: '',
        commanderId: '',
        deputyCommanderId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [strRes, empRes] = await Promise.all([
                fetch(`${config.URL}/structure`, { credentials: 'include' }),
                fetch(`${config.URL}/employees`, { credentials: 'include' })
            ]);

            if (strRes.ok) setSquadrons(await strRes.json());
            if (empRes.ok) setEmployees(await empRes.json());
        } catch {
            toast.error('Błąd ładowania struktury');
        } finally {
            setLoading(false);
        }
    };

    const toggleSquadronCollapse = (squadronId: string) => {
        setCollapsedSquadrons(prev => ({
            ...prev,
            [squadronId]: !prev[squadronId]
        }));
    };

    const getEmployeeName = (id?: string | null) => {
        if (!id) return 'Brak / Nieobsadzone';
        const emp = employees.find(e => e.characterId === id || (e as any)._id === id);
        return emp ? `${emp.rank} ${emp.firstName} ${emp.lastName}` : 'Nieznana postać';
    };

    const getSectionMembers = (squadronId: string, sectionId: string) => {
        return employees.filter(
            e => String(e.squadronId) === String(squadronId) && String(e.sectionId) === String(sectionId)
        );
    };

    const handleCreateSquadron = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${config.URL}/structure/squadron`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newUnitName })
            });

            if (res.ok) {
                toast.success('Utworzono Eskadrę');
                setNewUnitName('');
                setShowSquadronModal(false);
                fetchData();
            }
        } catch {
            toast.error('Błąd serwera');
        }
    };

    const handleCreateSection = async (e: React.FormEvent, squadronId: string) => {
        e.preventDefault();
        try {
            const res = await fetch(`${config.URL}/structure/squadron/${squadronId}/section`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newUnitName })
            });

            if (res.ok) {
                toast.success('Dodano Sekcję/Lot');
                setNewUnitName('');
                setShowSectionModal(null);
                fetchData();
            }
        } catch {
            toast.error('Błąd serwera');
        }
    };

    const handleDelete = async (type: 'squadron' | 'section', id: string, name: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć "${name}"?`)) return;

        try {
            const res = await fetch(`${config.URL}/structure/${type}/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success(`Usunięto pomyślnie`);
                fetchData();
            } else {
                toast.error('Błąd podczas usuwania');
            }
        } catch {
            toast.error('Błąd serwera');
        }
    };

    const handleSaveLeadership = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${config.URL}/structure/leadership`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    level: leadershipModal.level,
                    targetId: leadershipModal.targetId,
                    commanderId: leadershipModal.commanderId || null,
                    deputyCommanderId: leadershipModal.deputyCommanderId || null
                })
            });

            if (res.ok) {
                toast.success('Zaktualizowano strukturę dowodzenia');
                setLeadershipModal(prev => ({ ...prev, open: false }));
                fetchData();
            }
        } catch {
            toast.error('Błąd zapisu dowództwa');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <PageHeader title="Struktura Organizacyjna — Eskadry & Sekcje" />

                {canAddStructure && (
                    <button
                        onClick={() => { setNewUnitName(''); setShowSquadronModal(true); }}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-amber-600/20"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Stwórz Eskadrę
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-stone-400 text-center py-12 text-sm italic">Ładowanie struktury dowodzenia...</p>
            ) : squadrons.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-12 text-center text-stone-500 text-sm">
                    Brak zdefiniowanych eskadr w systemie.
                </div>
            ) : (
                <div className="space-y-6">
                    {squadrons.map(sq => {
                        const isCollapsed = collapsedSquadrons[sq._id];

                        return (
                            <div key={sq._id} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-6 shadow-xl transition-all">
                                {/* ESKADRA HEADER */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleSquadronCollapse(sq._id)}>
                                        <button className="text-stone-400 hover:text-amber-400 transition-colors">
                                            <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronDown} className="text-base" />
                                        </button>
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <FontAwesomeIcon icon={faSitemap} className="text-amber-500" />
                                                {sq.name}
                                            </h2>
                                            <div className="flex items-center gap-4 text-xs text-stone-400 mt-1">
                                                <span>Dowódca: <strong className="text-amber-400">{getEmployeeName(sq.commanderId)}</strong></span>
                                                <span>•</span>
                                                <span>Zastępca: <strong className="text-stone-200">{getEmployeeName(sq.deputyCommanderId)}</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {canEditStructure && (
                                            <button
                                                onClick={() => setLeadershipModal({
                                                    open: true,
                                                    level: 'squadron',
                                                    targetId: sq._id,
                                                    title: sq.name,
                                                    commanderId: sq.commanderId || '',
                                                    deputyCommanderId: sq.deputyCommanderId || ''
                                                })}
                                                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faUserShield} className="mr-1 text-amber-500" />
                                                Ustaw strukturę
                                            </button>
                                        )}

                                        {canAddStructure && (
                                            <button
                                                onClick={() => { setNewUnitName(''); setShowSectionModal(sq._id); }}
                                                className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-xs font-semibold border border-amber-500/30 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                                                Dodaj Sekcję
                                            </button>
                                        )}

                                        {canRemoveStructure && (
                                            <button
                                                onClick={() => handleDelete('squadron', sq._id, sq.name)}
                                                className="p-1.5 text-stone-500 hover:text-red-400 transition-colors ml-1"
                                                title="Usuń Eskadrę"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* SEKCJE / LOTY */}
                                {!isCollapsed && (
                                    <div className="pl-4 sm:pl-6 border-l-2 border-stone-800 space-y-4 transition-all">
                                        {sq.sections.length === 0 ? (
                                            <p className="text-xs text-stone-500 italic">Brak podpiętych sekcji.</p>
                                        ) : (
                                            sq.sections.map(sec => {
                                                const members = getSectionMembers(sq._id, sec._id);

                                                return (
                                                    <div key={sec._id} className="bg-stone-950/60 border border-stone-800/80 rounded-lg p-4 space-y-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
                                                            <div>
                                                                <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                                                                    <FontAwesomeIcon icon={faLayerGroup} className="text-blue-400 text-xs" />
                                                                    {sec.name}
                                                                </h3>
                                                                <p className="text-[11px] text-stone-400 mt-0.5">
                                                                    Dowódca Sekcji: <strong className="text-stone-200">{getEmployeeName(sec.commanderId)}</strong> | Zastępca: <strong className="text-stone-300">{getEmployeeName(sec.deputyCommanderId)}</strong>
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {canEditStructure && (
                                                                    <button
                                                                        onClick={() => setLeadershipModal({
                                                                            open: true,
                                                                            level: 'section',
                                                                            targetId: sec._id,
                                                                            title: sec.name,
                                                                            commanderId: sec.commanderId || '',
                                                                            deputyCommanderId: sec.deputyCommanderId || ''
                                                                        })}
                                                                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors"
                                                                    >
                                                                        Ustaw strukturę
                                                                    </button>
                                                                )}

                                                                {canRemoveStructure && (
                                                                    <button
                                                                        onClick={() => handleDelete('section', sec._id, sec.name)}
                                                                        className="text-stone-500 hover:text-red-400 p-1 transition-colors"
                                                                        title="Usuń Sekcję"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* PRZYPISANI PRACOWNICY / PERSONEL */}
                                                        <div className="space-y-2">
                                                            <h4 className="text-[11px] font-semibold text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                                <FontAwesomeIcon icon={faUsers} className="text-amber-500/80 text-[10px]" />
                                                                Personel Sekcji ({members.length})
                                                            </h4>

                                                            {members.length === 0 ? (
                                                                <p className="text-[11px] text-stone-600 italic">Brak przypisanych żołnierzy / pracowników.</p>
                                                            ) : (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                                                    {members.map(member => (
                                                                        <div
                                                                            key={member.characterId || (member as any)._id}
                                                                            className="bg-stone-900/90 border border-stone-800 rounded px-3 py-2 flex items-center gap-2 text-xs text-stone-200 shadow-sm"
                                                                        >
                                                                            <FontAwesomeIcon icon={faUser} className="text-stone-500 text-[10px]" />
                                                                            <span className="font-medium text-amber-400">{member.rank}</span>
                                                                            <span className="truncate">{member.firstName} {member.lastName}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL STRUKTURY DOWÓDZTWA */}
            {leadershipModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faUserCheck} className="text-amber-500" />
                                Ustaw Strukturę Dowodzenia
                            </h3>
                            <button onClick={() => setLeadershipModal(prev => ({ ...prev, open: false }))} className="text-stone-400 hover:text-white">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <p className="text-xs text-stone-400">
                            Jednostka: <strong className="text-amber-400">{leadershipModal.title}</strong>
                        </p>

                        <form onSubmit={handleSaveLeadership} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-1">Dowódca</label>
                                <select
                                    value={leadershipModal.commanderId}
                                    onChange={e => setLeadershipModal(prev => ({ ...prev, commanderId: e.target.value }))}
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Wybierz postać --</option>
                                    {employees.map(emp => (
                                        <option key={emp.characterId || (emp as any)._id} value={emp.characterId || (emp as any)._id}>
                                            {emp.rank} {emp.firstName} {emp.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-1">Zastępca Dowódcy</label>
                                <select
                                    value={leadershipModal.deputyCommanderId}
                                    onChange={e => setLeadershipModal(prev => ({ ...prev, deputyCommanderId: e.target.value }))}
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Wybierz postać --</option>
                                    {employees.map(emp => (
                                        <option key={emp.characterId || (emp as any)._id} value={emp.characterId || (emp as any)._id}>
                                            {emp.rank} {emp.firstName} {emp.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                                <button
                                    type="button"
                                    onClick={() => setLeadershipModal(prev => ({ ...prev, open: false }))}
                                    className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs"
                                >
                                    Zapisz Dowództwo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE DODAWANIA */}
            {(showSquadronModal || showSectionModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-base font-bold text-white">
                            {showSquadronModal && 'Dodaj Nową Eskadrę'}
                            {showSectionModal && 'Dodaj Sekcję / Lot'}
                        </h3>
                        <form onSubmit={e => {
                            if (showSquadronModal) handleCreateSquadron(e);
                            if (showSectionModal) handleCreateSection(e, showSectionModal);
                        }} className="space-y-4">
                            <input
                                type="text"
                                value={newUnitName}
                                onChange={e => setNewUnitName(e.target.value)}
                                placeholder="Nazwa..."
                                className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowSquadronModal(false); setShowSectionModal(null); }}
                                    className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs"
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg text-xs">
                                    Stwórz
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};