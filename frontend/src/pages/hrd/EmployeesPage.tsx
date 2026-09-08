import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { EmployeeListItem } from '../../components/hrd/EmployeeListItem.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUserPlus, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';

interface Employee {
    _id: string;
    characterId: string;
    firstName: string;
    lastName: string;
    doDId: string;
    rank: string;
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    phone?: string | null;
}

interface CharacterOption {
    _id: string;
    firstName: string;
    lastName: string;
}

export const EmployeesPage = () => {
    const navigate = useNavigate();
    const canManage = usePermission('hasHumanResourcesAccess');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableCharacters, setAvailableCharacters] = useState<CharacterOption[]>([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${config.URL}/employees`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            } else {
                toast.error('Nie udało się pobrać listy pracowników');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || (emp.doDId && emp.doDId.toLowerCase().includes(query));
    });

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
    const paginatedEmployees = filteredEmployees.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const handleOpenModal = async () => {
        setIsModalOpen(true);
        try {
            const res = await fetch(`${config.URL}/characters/all`, { credentials: 'include' });
            if (res.ok) {
                const allChars: CharacterOption[] = await res.json();

                const existingCharIds = new Set(employees.map(e => e.characterId));
                const filtered = allChars.filter(c => !existingCharIds.has(c._id));

                setAvailableCharacters(filtered);
                if (filtered.length > 0) {
                    setSelectedCharacterId(filtered[0]._id);
                }
            }
        } catch {
            toast.error('Błąd podczas pobierania listy postaci');
        }
    };

    const handleCreateEmployee = async () => {
        if (!selectedCharacterId) {
            toast.error('Wybierz postać z listy!');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch(`${config.URL}/employees`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: selectedCharacterId }),
            });

            if (res.ok) {
                toast.success('Teczka pracownika została utworzona!');
                setIsModalOpen(false);
                setSelectedCharacterId('');
                fetchEmployees();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Błąd podczas tworzenia teczki');
            }
        } catch {
            toast.error('Błąd serwera');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader title="Kadry & Zarządzanie Pracownikami" />

                {canManage && (
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                        <FontAwesomeIcon icon={faPlus} /> Dodaj Teczkę Pracownika
                    </button>
                )}
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-3 text-stone-500 text-sm" />
                    <input
                        type="text"
                        placeholder="Szukaj po nazwisku, DoD ID..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:border-emerald-600/60"
                    />
                </div>

                <div className="text-xs text-stone-400">
                    Łącznie pracowników: <strong className="text-white">{filteredEmployees.length}</strong>
                </div>
            </div>

            {loading ? (
                <p className="text-stone-400 text-center py-12">Ładowanie listy pracowników...</p>
            ) : filteredEmployees.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-12 text-center">
                    <p className="text-stone-400">Brak zarejestrowanych teczek spełniających kryteria.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-col gap-3">
                        {paginatedEmployees.map(employee => (
                            <EmployeeListItem
                                key={employee._id}
                                employee={employee}
                                onClick={() => navigate(`/hrd/employees/${employee.characterId}`)}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPrev={() => setPage(p => Math.max(1, p - 1))}
                            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                        />
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>

                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FontAwesomeIcon icon={faUserPlus} className="text-emerald-500" /> Tworzenie Teczki
                        </h3>

                        {availableCharacters.length === 0 ? (
                            <p className="text-sm text-stone-400 py-4 text-center">
                                Wszystkie postaci w systemie posiadają już utworzone teczki lub brak postaci w bazie.
                            </p>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-stone-400 mb-2">
                                        Wybierz Postać:
                                    </label>
                                    <select
                                        value={selectedCharacterId}
                                        onChange={e => setSelectedCharacterId(e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-500"
                                    >
                                        {availableCharacters.map(char => (
                                            <option key={char._id} value={char._id}>
                                                {char.firstName} {char.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        onClick={handleCreateEmployee}
                                        disabled={creating}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {creating ? 'Tworzenie...' : 'Utwórz Teczkę'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};