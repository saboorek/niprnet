import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { useCharacter } from '../../context/CharacterContext.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faSave,
    faUserShield,
    faPhone,
    faFileAlt,
    faIdCard,
    faGraduationCap,
    faImage,
    faAward,
    faPlus,
    faTrash,
    faTimes,
    faSitemap,
    faExternalLinkAlt,
    faExclamationTriangle,
    faCheckCircle,
    faArrowUp,
    faArrowDown,
    faXmark,
    faKey
} from '@fortawesome/free-solid-svg-icons';
import { ribbonsMap, ribbonGroups, type RibbonGroup } from '../../utils/ribbonsMap.ts';

const rankIcons = import.meta.glob<{ default: string }>('../../assets/icons/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
});

interface StructureElement {
    _id: string;
    name: string;
}

interface StructureSection {
    _id: string;
    name: string;
    icon?: string | null;
    elements?: StructureElement[];
}

interface StructureSquadron {
    _id: string;
    name: string;
    icon?: string | null;
    sections: StructureSection[];
}

interface EmployeeNote {
    _id?: string;
    type?: 'note' | 'reprimand' | 'praise' | 'promotion' | 'demotion';
    content: string;
    author: string;
    createdAt?: string;
}

interface RoleOption {
    _id: string;
    name: string;
    type: 'role' | 'rank';
}

interface EmployeeDetails {
    _id?: string;
    characterId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    doDId: string;
    rank: string;
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    phone: string;
    notes?: EmployeeNote[];
    ribbons?: string[];
    squadronId?: string | null;
    sectionId?: string | null;
    elementId?: string | null;
}

const stripPaygradePrefix = (text: string): string => {
    return text
        .trim()
        .toLowerCase()
        .replace(/^(?:[a-z]{1,2}[-_\s]?\d{1,2}[-_\s]?)/i, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
};

const getRankIconUrl = (rankName: string): string | null => {
    if (!rankName) return null;
    const cleanRank = stripPaygradePrefix(rankName);

    for (const path in rankIcons) {
        const rawFileName = path.split('/').pop()?.split('.')[0] || '';
        const cleanFileName = stripPaygradePrefix(rawFileName);

        if (cleanFileName === cleanRank && cleanRank.length > 0) {
            return rankIcons[path].default;
        }
    }
    return null;
};

const RenderRankIcon = ({ rankName }: { rankName: string }) => {
    const iconSrc = getRankIconUrl(rankName);
    if (iconSrc) {
        return <img src={iconSrc} alt={rankName} className="w-6 h-6 object-contain inline-block" />;
    }
    return <FontAwesomeIcon icon={faGraduationCap} className="text-emerald-400" />;
};

export const EmployeeDetailsPage = () => {
    const params = useParams<{ characterId?: string; id?: string }>();
    const characterId = params.characterId || params.id;

    const navigate = useNavigate();
    const { selectedCharacter } = useCharacter();

    const canManage = usePermission('hasHumanResourcesAccess');
    const canAddReprimands = usePermission('canAddReprimands');
    const canAddPraises = usePermission('canAddPraises');
    const canAddPromotions = usePermission('canAddPromotions');
    const canAddDemotes = usePermission('canAddDemotes');

    const canDeleteReprimands = usePermission('canRemoveReprimands');
    const canDeletePraises = usePermission('canRemovePraises');
    const canDeletePromotions = usePermission('canRemovePromotions');
    const canDeleteDemotes = usePermission('canRemoveDemotes');

    const authorName = selectedCharacter
        ? `${selectedCharacter.firstName} ${selectedCharacter.lastName}`
        : 'System / HR';

    const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
    const [squadrons, setSquadrons] = useState<StructureSquadron[]>([]);
    const [ranks, setRanks] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [phone, setPhone] = useState('');
    const [notesList, setNotesList] = useState<EmployeeNote[]>([]);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [ribbons, setRibbons] = useState<string[]>([]);
    const [squadronId, setSquadronId] = useState<string>('');
    const [sectionId, setSectionId] = useState<string>('');
    const [elementId, setElementId] = useState<string>('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [showRibbonModal, setShowRibbonModal] = useState(false);
    const [selectedRibbonGroup, setSelectedRibbonGroup] = useState<RibbonGroup | null>(null);

    const [modalType, setModalType] = useState<'reprimand' | 'praise' | 'promotion' | 'demotion' | null>(null);
    const [noteContent, setNoteContent] = useState('');
    const [selectedRank, setSelectedRank] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);

    const fetchEmployeeAndData = async () => {
        if (!characterId) {
            toast.error('Brak identyfikatora postaci w URL');
            setLoading(false);
            return;
        }

        try {
            const [empRes, strRes, rolesRes] = await Promise.all([
                fetch(`${config.URL}/employees`, { credentials: 'include' }),
                fetch(`${config.URL}/structure`, { credentials: 'include' }),
                fetch(`${config.URL}/roles`, { credentials: 'include' })
            ]);

            if (strRes.ok) {
                const strData = await strRes.json();
                setSquadrons(strData);
            }

            if (rolesRes.ok) {
                const rolesData: RoleOption[] = await rolesRes.json();
                const filteredRanks = rolesData.filter(r => r.type === 'rank');
                setRanks(filteredRanks);
            }

            if (empRes.ok) {
                const data: EmployeeDetails[] = await empRes.json();
                const found = data.find(e =>
                    String(e.characterId) === String(characterId) ||
                    String(e._id) === String(characterId)
                );

                if (found) {
                    setEmployee(found);
                    setPhone(found.phone || '');
                    setNotesList(Array.isArray(found.notes) ? found.notes : []);
                    setAvatarUrl(found.avatarUrl || '');
                    setRibbons(found.ribbons || []);
                    setSquadronId(found.squadronId || '');
                    setSectionId(found.sectionId || '');
                    setElementId(found.elementId || '');
                } else {
                    toast.error('Nie znaleziono teczki pracownika');
                }
            } else {
                toast.error('Błąd podczas pobierania danych teczki');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployeeAndData();
    }, [characterId]);

    const handleSave = async () => {
        if (!characterId) return;
        setSaving(true);

        try {
            const payload = canManage
                ? {
                    phone,
                    avatarUrl,
                    notes: notesList,
                    ribbons,
                    squadronId: squadronId || null,
                    sectionId: sectionId || null,
                    elementId: elementId || null
                }
                : {
                    phone,
                    avatarUrl
                };

            const resEmployee = await fetch(`${config.URL}/employees/${characterId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!resEmployee.ok) {
                toast.error('Wystąpił błąd podczas zapisywania danych');
                return;
            }

            toast.success('Zapisano dane teczki');
            setEmployee(prev => prev ? { ...prev, ...payload } : null);

        } catch {
            toast.error('Błąd serwera podczas zapisywania');
        } finally {
            setSaving(false);
        }
    };

    const handleAddNoteEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalType || !employee) return;

        let finalContent = '';
        if (modalType === 'promotion') {
            if (!selectedRank) {
                toast.error('Wybierz nowy stopień');
                return;
            }
            finalContent = `${employee.firstName} ${employee.lastName} został/a awansowany/a na stopień ${selectedRank}`;
        } else if (modalType === 'demotion') {
            if (!selectedRank) {
                toast.error('Wybierz nowy stopień po degradacji');
                return;
            }
            finalContent = `${employee.firstName} ${employee.lastName} został/a zdegradowany/a na stopień ${selectedRank}`;
        } else {
            if (!noteContent.trim()) {
                toast.error('Wpisz treść uzasadnienia');
                return;
            }
            finalContent = noteContent.trim();
        }

        const newNote: EmployeeNote = {
            type: modalType,
            content: finalContent,
            author: authorName,
            createdAt: new Date().toISOString()
        };

        const updatedNotes = [newNote, ...notesList];
        setSubmittingNote(true);

        try {
            const res = await fetch(`${config.URL}/employees/${characterId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: updatedNotes,
                    ...((modalType === 'promotion' || modalType === 'demotion') ? { rank: selectedRank } : {})
                }),
            });

            if (res.ok) {
                toast.success('Dodano wpis do teczki');
                setNotesList(updatedNotes);
                setCurrentPage(1);
                if (modalType === 'promotion' || modalType === 'demotion') {
                    setEmployee(prev => prev ? { ...prev, rank: selectedRank } : null);
                }
                setModalType(null);
                setNoteContent('');
                setSelectedRank('');
            } else {
                toast.error('Nie udało się dodać wpisu');
            }
        } catch {
            toast.error('Błąd serwera podczas zapisywania wpisu');
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleDeleteNote = async (indexToDelete: number) => {
        const updatedNotes = notesList.filter((_, idx) => idx !== indexToDelete);

        try {
            const res = await fetch(`${config.URL}/employees/${characterId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: updatedNotes }),
            });

            if (res.ok) {
                toast.success('Usunięto wpis z teczki');
                setNotesList(updatedNotes);

                const maxPages = Math.ceil(updatedNotes.length / itemsPerPage) || 1;
                if (currentPage > maxPages) {
                    setCurrentPage(maxPages);
                }
            } else {
                toast.error('Błąd podczas usuwania wpisu');
            }
        } catch {
            toast.error('Błąd serwera podczas usuwania wpisu');
        }
    };

    const canDeleteEntry = (type?: string) => {
        if (type === 'reprimand') return canDeleteReprimands;
        if (type === 'praise') return canDeletePraises;
        if (type === 'promotion') return canDeletePromotions;
        if (type === 'demotion') return canDeleteDemotes;
        return false;
    };

    const handleAddRibbon = (ribbonKey: string) => {
        setRibbons(prev => [...prev, ribbonKey]);
        setShowRibbonModal(false);
        setSelectedRibbonGroup(null);
        toast.success('Dodano odznaczenie do teczki');
    };

    const handleRemoveRibbon = (indexToRemove: number) => {
        if (!canManage) return;
        setRibbons(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const formatRibbonName = (key: string) => {
        return key
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    };

    const renderStatusBadge = (status?: string) => {
        switch (status) {
            case 'on_leave':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Na urlopie</span>;
            case 'suspended':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Zawieszony</span>;
            case 'terminated':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-700 text-stone-400 border border-stone-600">Zwolniony</span>;
            case 'active':
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Aktywny</span>;
        }
    };

    const activeSquadron = squadrons.find(s => s._id === squadronId);
    const activeSection = activeSquadron?.sections.find(sec => sec._id === sectionId);

    const totalPages = Math.ceil(notesList.length / itemsPerPage) || 1;
    const paginatedNotes = notesList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return <p className="text-stone-400 text-center py-12">Ładowanie teczki pracownika...</p>;
    if (!employee) return <p className="text-stone-400 text-center py-12">Brak danych teczki</p>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/hrd/employees')}
                    className="flex items-center gap-2 text-sm text-stone-400 hover:text-white transition-colors"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Powrót do listy pracowników
                </button>
            </div>

            <PageHeader title={`Teczka: ${employee.firstName} ${employee.lastName}`} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full bg-stone-800 flex items-center justify-center overflow-hidden border-2 border-stone-700 shadow-md">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <FontAwesomeIcon icon={faUserShield} className="text-stone-500 text-4xl" />
                        )}
                    </div>

                    <div className="text-center w-full">
                        <h2 className="text-xl font-bold text-white">
                            {employee.firstName} {employee.lastName}
                        </h2>

                        <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm mt-1">
                            <RenderRankIcon rankName={employee.rank} />
                            <span>{employee.rank}</span>
                        </div>
                    </div>

                    <div className="w-full bg-stone-800/60 border border-stone-700/50 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-400 flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faIdCard} /> DoD ID
                            </span>
                            <span className="font-mono font-bold text-stone-200">{employee.doDId}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-700/50">
                            <span className="text-stone-400">Status</span>
                            {renderStatusBadge(employee.status)}
                        </div>
                    </div>

                    {canManage && (
                        <div className="w-full space-y-3 pt-3 border-t border-stone-800">
                            <div>
                                <label className="block text-xs font-medium text-amber-500 mb-1 flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faSitemap} /> Eskadra / Jednostka
                                </label>
                                <select
                                    value={squadronId}
                                    onChange={e => {
                                        setSquadronId(e.target.value);
                                        setSectionId('');
                                        setElementId('');
                                    }}
                                    className="w-full bg-stone-800 border border-stone-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Przypisz do Eskadry --</option>
                                    {squadrons.map(sq => (
                                        <option key={sq._id} value={sq._id}>{sq.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-amber-500/80 mb-1">
                                    Sekcja / Lot
                                </label>
                                <select
                                    value={sectionId}
                                    onChange={e => {
                                        setSectionId(e.target.value);
                                        setElementId('');
                                    }}
                                    disabled={!squadronId}
                                    className="w-full bg-stone-800 border border-stone-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500 disabled:opacity-40"
                                >
                                    <option value="">-- Przypisz do Sekcji --</option>
                                    {activeSquadron?.sections.map(sec => (
                                        <option key={sec._id} value={sec._id}>{sec.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-blue-400 mb-1 flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faKey} className="text-[10px]" /> Element / Klucz
                                </label>
                                <select
                                    value={elementId}
                                    onChange={e => setElementId(e.target.value)}
                                    disabled={!sectionId}
                                    className="w-full bg-stone-800 border border-stone-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500 disabled:opacity-40"
                                >
                                    <option value="">-- Przypisz do Elementu --</option>
                                    {activeSection?.elements?.map(elem => (
                                        <option key={elem._id} value={elem._id}>{elem.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="w-full space-y-3 pt-3 border-t border-stone-800/80">
                        <div>
                            <label className="block text-xs font-medium text-stone-400 mb-1">
                                <FontAwesomeIcon icon={faImage} className="mr-1" /> URL Zdjęcia Postaci
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={avatarUrl}
                                    onChange={e => setAvatarUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                                />
                                {avatarUrl && (
                                    <a
                                        href={avatarUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-500 hover:text-amber-400 shrink-0 p-1"
                                        title="Otwórz link w nowej karcie"
                                    >
                                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-400 mb-1">
                                <FontAwesomeIcon icon={faPhone} className="mr-1" /> Numer telefonu
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="Wpisz numer telefonu..."
                                className="w-full bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3 mb-4">
                            <h3 className="text-md font-semibold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileAlt} className="text-stone-400" />
                                Notatki Służbowe & Historia HR
                            </h3>

                            <div className="flex items-center gap-2">
                                {canAddReprimands && (
                                    <div className="relative group">
                                        <button
                                            onClick={() => setModalType('reprimand')}
                                            className="w-8 h-8 rounded-lg bg-red-700 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow"
                                        >
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs" />
                                        </button>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                            <div className="bg-stone-950 text-white text-[10px] font-medium px-2 py-1 rounded border border-stone-800 whitespace-nowrap shadow-xl">
                                                Dodaj naganę
                                            </div>
                                            <div className="w-2 h-2 bg-stone-950 border-r border-b border-stone-800 transform rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                )}

                                {canAddPraises && (
                                    <div className="relative group">
                                        <button
                                            onClick={() => setModalType('praise')}
                                            className="w-8 h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow"
                                        >
                                            <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                                        </button>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                            <div className="bg-stone-950 text-white text-[10px] font-medium px-2 py-1 rounded border border-stone-800 whitespace-nowrap shadow-xl">
                                                Dodaj pochwałę
                                            </div>
                                            <div className="w-2 h-2 bg-stone-950 border-r border-b border-stone-800 transform rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                )}

                                {canAddPromotions && (
                                    <div className="relative group">
                                        <button
                                            onClick={() => setModalType('promotion')}
                                            className="w-8 h-8 rounded-lg bg-blue-700 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow"
                                        >
                                            <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
                                        </button>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                            <div className="bg-stone-950 text-white text-[10px] font-medium px-2 py-1 rounded border border-stone-800 whitespace-nowrap shadow-xl">
                                                Dodaj awans
                                            </div>
                                            <div className="w-2 h-2 bg-stone-950 border-r border-b border-stone-800 transform rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                )}

                                {canAddDemotes && (
                                    <div className="relative group">
                                        <button
                                            onClick={() => setModalType('demotion')}
                                            className="w-8 h-8 rounded-lg bg-purple-700 hover:bg-purple-600 text-white flex items-center justify-center transition-colors shadow"
                                        >
                                            <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
                                        </button>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                            <div className="bg-stone-950 text-white text-[10px] font-medium px-2 py-1 rounded border border-stone-800 whitespace-nowrap shadow-xl">
                                                Degraduj
                                            </div>
                                            <div className="w-2 h-2 bg-stone-950 border-r border-b border-stone-800 transform rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 min-h-[360px]">
                            {paginatedNotes.length > 0 ? (
                                paginatedNotes.map((item, idx) => {
                                    const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                                    let borderColor = 'border-stone-800 bg-stone-950/60';
                                    let badgeColor = 'bg-stone-800 text-stone-300';
                                    let badgeText = 'Wpis';

                                    if (item.type === 'reprimand') {
                                        borderColor = 'border-red-600/60 bg-red-950/20';
                                        badgeColor = 'bg-red-900/60 text-red-300 border border-red-700/50';
                                        badgeText = 'Nagana';
                                    } else if (item.type === 'praise') {
                                        borderColor = 'border-emerald-600/60 bg-emerald-950/20';
                                        badgeColor = 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50';
                                        badgeText = 'Pochwała';
                                    } else if (item.type === 'promotion') {
                                        borderColor = 'border-blue-600/60 bg-blue-950/20';
                                        badgeColor = 'bg-blue-900/60 text-blue-300 border border-blue-700/50';
                                        badgeText = 'Awans';
                                    } else if (item.type === 'demotion') {
                                        borderColor = 'border-purple-600/60 bg-purple-950/20';
                                        badgeColor = 'bg-purple-900/60 text-purple-300 border border-purple-700/50';
                                        badgeText = 'Degradacja';
                                    }

                                    return (
                                        <div
                                            key={item._id || globalIndex}
                                            className={`p-3.5 rounded-xl border ${borderColor} flex flex-col gap-2 transition-all relative group`}
                                        >
                                            <div className="flex items-center justify-between text-xs border-b border-stone-800/80 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                                        {badgeText}
                                                    </span>
                                                    <span className="text-stone-400 text-[11px]">
                                                        Wystawił: <strong className="text-stone-200">{item.author}</strong>
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-stone-400">
                                                    {item.createdAt && (
                                                        <span className="text-[11px]">{new Date(item.createdAt).toLocaleDateString('pl-PL')}</span>
                                                    )}

                                                    {canDeleteEntry(item.type) && (
                                                        <button
                                                            onClick={() => handleDeleteNote(globalIndex)}
                                                            className="text-stone-500 hover:text-red-400 transition-colors p-1"
                                                            title="Usuń wpis"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-sm text-stone-200 whitespace-pre-wrap leading-relaxed">
                                                {item.content}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-stone-500 text-sm italic text-center py-12 border border-dashed border-stone-800 rounded-xl">
                                    Brak wpisów w historii HR
                                </p>
                            )}
                        </div>

                        {notesList.length > itemsPerPage && (
                            <Pagination
                                page={currentPage}
                                totalPages={totalPages}
                                onPrev={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                onNext={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            />
                        )}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-stone-800 mt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                            <FontAwesomeIcon icon={faSave} />
                            {saving ? 'Zapisywanie...' : 'Zapisz dane'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-md font-semibold text-amber-500 flex items-center gap-2">
                            <FontAwesomeIcon icon={faAward} />
                            Baretki i Odznaczenia Służbowe ({ribbons.length})
                        </h3>

                        <a
                            href="https://docs.google.com/document/d/1ERalHz1xlF7F1nYXNcqLUUqj2fwaWbjq2CY6hlhI5o0/edit?tab=t.0"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 underline decoration-stone-600 underline-offset-2"
                        >
                            <span>Znaczenia baretek</span>
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                        </a>
                    </div>

                    {canManage && (
                        <button
                            onClick={() => setShowRibbonModal(true)}
                            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-amber-600/60 shadow-md"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            Dodaj odznaczenie
                        </button>
                    )}
                </div>

                {ribbons.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {ribbons.map((ribbonKey, idx) => {
                            const titleName = formatRibbonName(ribbonKey);

                            return (
                                <div
                                    key={idx}
                                    title={titleName}
                                    className="relative group bg-stone-950/80 p-2 rounded-lg border border-stone-800/80 flex flex-col items-center justify-center hover:border-amber-600/50 transition-all cursor-pointer"
                                >
                                    {ribbonsMap[ribbonKey] ? (
                                        <img
                                            src={ribbonsMap[ribbonKey]}
                                            alt={titleName}
                                            className="h-8 object-contain transition-transform group-hover:scale-105"
                                        />
                                    ) : (
                                        <span className="text-[10px] text-stone-400 truncate">{titleName}</span>
                                    )}

                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                        <div className="bg-stone-950 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-xl border border-stone-700 whitespace-nowrap">
                                            {titleName}
                                        </div>
                                        <div className="w-2 h-2 bg-stone-950 border-r border-b border-stone-700 transform rotate-45 -mt-1"></div>
                                    </div>

                                    {canManage && (
                                        <button
                                            onClick={() => handleRemoveRibbon(idx)}
                                            className="absolute -top-1.5 -right-1.5 bg-red-900 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                            title="Usuń odznaczenie"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-stone-500 text-sm italic text-center py-6">Brak nadanych baretek i odznaczeń</p>
                )}
            </div>

            <Dialog open={modalType !== null} onClose={() => setModalType(null)} className="relative z-50">
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-lg border border-stone-800 p-6">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                                {modalType === 'reprimand' && (
                                    <>
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />
                                        <span>Dodaj Naganę</span>
                                    </>
                                )}
                                {modalType === 'praise' && (
                                    <>
                                        <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />
                                        <span>Dodaj Pochwałę</span>
                                    </>
                                )}
                                {modalType === 'promotion' && (
                                    <>
                                        <FontAwesomeIcon icon={faArrowUp} className="text-blue-500" />
                                        <span>Dodaj Awans</span>
                                    </>
                                )}
                                {modalType === 'demotion' && (
                                    <>
                                        <FontAwesomeIcon icon={faArrowDown} className="text-purple-500" />
                                        <span>Degraduj Pracownika</span>
                                    </>
                                )}
                            </DialogTitle>
                            <button onClick={() => setModalType(null)} className="text-stone-400 hover:text-white">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <form onSubmit={handleAddNoteEntry} className="space-y-4">
                            {modalType === 'promotion' || modalType === 'demotion' ? (
                                <div>
                                    <label className="block text-xs font-medium text-stone-300 mb-1">
                                        Wybierz nowy stopień z bazy
                                    </label>
                                    <select
                                        value={selectedRank}
                                        onChange={e => setSelectedRank(e.target.value)}
                                        required
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- Wybierz stopień --</option>
                                        {ranks.map(r => (
                                            <option key={r._id} value={r.name}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-stone-300 mb-1">
                                        Opis / Uzasadnienie
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        placeholder={modalType === 'reprimand' ? 'Podaj powód udzielenia nagany...' : 'Podaj powód udzielenia pochwały...'}
                                        required
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-3 text-sm outline-none focus:border-stone-500 resize-none"
                                    />
                                </div>
                            )}

                            <div className="text-xs text-stone-400 bg-stone-950 p-2.5 rounded-lg border border-stone-800/80">
                                Wpisał: <strong className="text-stone-200">{authorName}</strong>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
                                <button
                                    type="button"
                                    onClick={() => setModalType(null)}
                                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingNote}
                                    className={`px-4 py-2 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 ${
                                        modalType === 'reprimand' ? 'bg-red-700 hover:bg-red-600' :
                                            modalType === 'praise' ? 'bg-emerald-700 hover:bg-emerald-600' :
                                                modalType === 'promotion' ? 'bg-blue-700 hover:bg-blue-600' : 'bg-purple-700 hover:bg-purple-600'
                                    }`}
                                >
                                    {submittingNote ? 'Zapisywanie...' : 'Zatwierdź'}
                                </button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </Dialog>

            {showRibbonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-2xl border border-stone-800 p-6 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faAward} className="text-amber-500" />
                                {selectedRibbonGroup ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedRibbonGroup(null)}
                                            className="text-xs text-stone-400 hover:text-white underline mr-2"
                                        >
                                            ← Powrót
                                        </button>
                                        <span>Warianty: {selectedRibbonGroup.baseName}</span>
                                    </div>
                                ) : (
                                    'Wybierz odznaczenie do nadania'
                                )}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowRibbonModal(false);
                                    setSelectedRibbonGroup(null);
                                }}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        {selectedRibbonGroup ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto p-2">
                                {selectedRibbonGroup.variants.map((variant: { key: string; name: string; url: string }) => (
                                    <button
                                        key={variant.key}
                                        onClick={() => {
                                            handleAddRibbon(variant.key);
                                            setSelectedRibbonGroup(null);
                                        }}
                                        className="flex flex-col items-center justify-center p-3 bg-stone-800/80 hover:bg-stone-750 border border-amber-600/40 rounded-xl transition-all hover:scale-105 group"
                                    >
                                        <img
                                            src={variant.url}
                                            alt={variant.name}
                                            className="h-10 object-contain mb-2"
                                        />
                                        <span className="text-[11px] text-stone-300 group-hover:text-white font-medium text-center truncate w-full">
                                            {variant.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto p-2">
                                {ribbonGroups.map((group: RibbonGroup) => {
                                    const mainVariant = group.variants.find((v: { key: string; name: string; url: string }) => v.key === group.baseKey) || group.variants[0];

                                    return (
                                        <button
                                            key={group.baseKey}
                                            onClick={() => {
                                                if (group.variants.length > 1) {
                                                    setSelectedRibbonGroup(group);
                                                } else {
                                                    handleAddRibbon(mainVariant.key);
                                                }
                                            }}
                                            className="relative flex flex-col items-center justify-center p-3 bg-stone-800/80 hover:bg-stone-750 border border-stone-700/60 rounded-xl transition-all hover:scale-105 group"
                                        >
                                            {group.variants.length > 1 && (
                                                <span className="absolute -top-2 -right-2 z-10 bg-stone-900 text-emerald-400 border border-emerald-500/60 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg">
                                                    +{group.variants.length}
                                                </span>
                                            )}

                                            <img
                                                src={mainVariant.url}
                                                alt={group.baseName}
                                                className="h-10 object-contain mb-2"
                                            />
                                            <span className="text-[11px] text-stone-300 group-hover:text-white font-medium text-center truncate w-full">
                                                {group.baseName}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex justify-end border-t border-stone-800 pt-4 mt-4">
                            <button
                                onClick={() => {
                                    setShowRibbonModal(false);
                                    setSelectedRibbonGroup(null);
                                }}
                                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};