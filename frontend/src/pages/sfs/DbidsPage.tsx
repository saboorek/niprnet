import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faSearch,
    faTimes,
    faIdCard,
    faUser,
    faShieldAlt,
    faCalendarAlt,
    faCheck,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';

interface EmployeeOption {
    characterId: string;
    firstName: string;
    lastName: string;
    doDId: string;
    rank: string;
}

interface DbidsEntry {
    _id: string;
    passNumber: string;
    passType: 'CAC' | 'VCC';
    holderName: string;
    rankOrStatus: string;
    issueDate: string;
    expirationDate: string;
    status: 'active' | 'expired' | 'revoked';
    issuedBy?: string;
    notes?: string;
}

export const DbidsPage = () => {
    const canAddPass = usePermission('canAddPass');
    const canRemovePass = usePermission('canRemovePass');

    const [entries, setEntries] = useState<DbidsEntry[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [passType, setPassType] = useState<'CAC' | 'VCC'>('CAC');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    const [passNumber, setPassNumber] = useState('');
    const [holderName, setHolderName] = useState('');
    const [rankOrStatus, setRankOrStatus] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDbidsEntries();
        fetchEmployees();
    }, []);

    const fetchDbidsEntries = async () => {
        try {
            const res = await fetch(`${config.URL}/dbids`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            }
        } catch {
            toast.error('Błąd podczas pobierania bazy DBIDS');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${config.URL}/employees`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch {
            console.error('Błąd pobierania listy pracowników');
        }
    };

    const handleTypeChange = (type: 'CAC' | 'VCC') => {
        setPassType(type);
        setSelectedEmployeeId('');
        setHolderName('');
        setRankOrStatus('');
        setExpirationDate('');
        setNotes('');

        if (type === 'VCC') {
            const randomNum = Math.floor(10000 + Math.random() * 90000);
            const currentYear = new Date().getFullYear();
            setPassNumber(`VIS-${currentYear}-${randomNum}`);
            setRankOrStatus('CYWIL');
        } else {
            setPassNumber('');
        }
    };

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find(e => e.characterId === empId || (e as any)._id === empId);

        if (emp) {
            setPassNumber(emp.doDId);
            setHolderName(`${emp.firstName} ${emp.lastName}`);
            setRankOrStatus(emp.rank);
        } else {
            setPassNumber('');
            setHolderName('');
            setRankOrStatus('');
        }
    };

    const handleOpenModal = () => {
        handleTypeChange('CAC');
        setShowModal(true);
    };

    const handleCreateEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passNumber || !holderName) {
            toast.error('Uzupełnij wymagane pola');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${config.URL}/dbids`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    passNumber,
                    passType,
                    holderName,
                    rankOrStatus,
                    expirationDate: passType === 'VCC' && expirationDate ? expirationDate : null,
                    notes: passType === 'VCC' ? notes : ''
                }),
            });

            if (res.ok) {
                toast.success('Pomyślnie zarejestrowano przepustkę DBIDS');
                setShowModal(false);
                fetchDbidsEntries();
            } else {
                toast.error('Błąd podczas zapisywania przepustki');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Czy na pewno chcesz unieważnić/usunąć tę przepustkę?')) return;

        try {
            const res = await fetch(`${config.URL}/dbids/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Usunięto wpis z bazy DBIDS');
                setEntries(prev => prev.filter(e => e._id !== id));
            } else {
                toast.error('Błąd podczas usuwania wpisu');
            }
        } catch {
            toast.error('Błąd serwera');
        }
    };

    const filteredEntries = entries.filter(e =>
        e.holderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.passNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.rankOrStatus.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6">
            {/* Nagłówek i Przycisk Dodawania */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <PageHeader title="DBIDS — Defense Biometric Identification System" />

                {canAddPass && (
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-amber-600/20 shrink-0"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Wystaw Przepustkę
                    </button>
                )}
            </div>

            {/* Pasek Wyszukiwania i Statystyki */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-3 text-stone-500 text-sm" />
                    <input
                        type="text"
                        placeholder="Szukaj po nazwisku, nr przepustki..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:border-amber-600/60"
                    />
                </div>

                <div className="flex items-center gap-4 text-xs text-stone-400">
                    <span>Łącznie wpisów: <strong className="text-white">{entries.length}</strong></span>
                    <span>•</span>
                    <span>CAC: <strong className="text-amber-400">{entries.filter(e => e.passType === 'CAC').length}</strong></span>
                    <span>•</span>
                    <span>VCC: <strong className="text-blue-400">{entries.filter(e => e.passType === 'VCC').length}</strong></span>
                </div>
            </div>

            {/* DUŻA TABELA DBIDS */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl">
                {loading ? (
                    <p className="text-stone-400 text-center py-12 text-sm italic">Ładowanie bazy przepustek DBIDS...</p>
                ) : filteredEntries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-stone-300">
                            <thead className="bg-stone-950 text-stone-400 uppercase text-[11px] font-semibold tracking-wider border-b border-stone-800">
                            <tr>
                                <th className="py-3.5 px-4">Typ</th>
                                <th className="py-3.5 px-4">Nr Przepustki / DoD ID</th>
                                <th className="py-3.5 px-4">Imię i Nazwisko</th>
                                <th className="py-3.5 px-4">Stopień / Rola</th>
                                <th className="py-3.5 px-4">Data Wygaśnięcia</th>
                                <th className="py-3.5 px-4">Status</th>
                                {canRemovePass && <th className="py-3.5 px-4 text-right">Akcje</th>}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/60">
                            {filteredEntries.map(entry => (
                                <tr key={entry._id} className="hover:bg-stone-800/40 transition-colors">
                                    <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
                                                entry.passType === 'CAC'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                <FontAwesomeIcon icon={faIdCard} className="text-[10px]" />
                                                {entry.passType}
                                            </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                                        {entry.passNumber}
                                    </td>
                                    <td className="py-3.5 px-4 font-medium text-stone-100">
                                        {entry.holderName}
                                    </td>
                                    <td className="py-3.5 px-4 text-stone-400">
                                        {entry.rankOrStatus}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-mono text-stone-400">
                                        {entry.expirationDate
                                            ? new Date(entry.expirationDate).toLocaleDateString('pl-PL')
                                            : 'BEZTERMINOWO'
                                        }
                                    </td>
                                    <td className="py-3.5 px-4">
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                                                AKTYWNA
                                            </span>
                                    </td>
                                    {canRemovePass && (
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => handleDeleteEntry(entry._id)}
                                                className="text-stone-500 hover:text-red-400 transition-colors p-1"
                                                title="Unieważnij przepustkę"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-stone-500 text-sm">
                        Brak zarejestrowanych przepustek w bazie danych.
                    </div>
                )}
            </div>

            {/* MODAL REJESTRACJI PRZEPUSTKI DBIDS */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-6">

                        {/* Header Modala */}
                        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faShieldAlt} className="text-amber-500" />
                                Rejestracja Przepustki DBIDS
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEntry} className="space-y-4">

                            {/* Wybór Typu: CAC vs VCC */}
                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-2">Typ Przepustki</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTypeChange('CAC')}
                                        className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                                            passType === 'CAC'
                                                ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                                                : 'bg-stone-800/50 border-stone-700/60 text-stone-400 hover:text-stone-200'
                                        }`}
                                    >
                                        <span>CAC</span>
                                        <span className="text-[10px] font-normal opacity-80">Stała dla Żołnierzy</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTypeChange('VCC')}
                                        className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                                            passType === 'VCC'
                                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                : 'bg-stone-800/50 border-stone-700/60 text-stone-400 hover:text-stone-200'
                                        }`}
                                    >
                                        <span>VCC</span>
                                        <span className="text-[10px] font-normal opacity-80">Czasowa dla Cywili</span>
                                    </button>
                                </div>
                            </div>

                            {/* Wypis dla CAC — Wybór Żołnierza */}
                            {passType === 'CAC' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                                        Wybierz Żołnierza z Bazy
                                    </label>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={e => handleEmployeeSelect(e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                        required
                                    >
                                        <option value="">-- Wybierz pracownika --</option>
                                        {employees.map(emp => (
                                            <option key={emp.characterId || (emp as any)._id} value={emp.characterId || (emp as any)._id}>
                                                {emp.rank} {emp.firstName} {emp.lastName} (DoD ID: {emp.doDId})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                                        Imię i Nazwisko Cywila
                                    </label>
                                    <input
                                        type="text"
                                        value={holderName}
                                        onChange={e => setHolderName(e.target.value)}
                                        placeholder="np. John Doe"
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                        required
                                    />
                                </div>
                            )}

                            {/* Wygenerowany / Pobrany Numer Przepustki */}
                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-1">
                                    <FontAwesomeIcon icon={faIdCard} className="mr-1" />
                                    Numer Przepustki / DoD ID
                                </label>
                                <input
                                    type="text"
                                    value={passNumber}
                                    readOnly
                                    placeholder={passType === 'CAC' ? "Wybierz żołnierza z listy..." : ""}
                                    className="w-full bg-stone-950 border border-stone-800 text-amber-400 font-mono font-bold rounded-lg px-3 py-2 text-sm outline-none cursor-not-allowed"
                                />
                            </div>

                            {/* Stopień / Rola */}
                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-1">
                                    <FontAwesomeIcon icon={faUser} className="mr-1" />
                                    Stopień / Rola
                                </label>
                                <input
                                    type="text"
                                    value={rankOrStatus}
                                    onChange={e => setRankOrStatus(e.target.value)}
                                    readOnly={passType === 'CAC'}
                                    placeholder={passType === 'CAC' ? "Wybierz żołnierza z listy..." : "np. Kontrahent, Dostawca"}
                                    className={`w-full border text-sm rounded-lg px-3 py-2 outline-none ${
                                        passType === 'CAC'
                                            ? 'bg-stone-950 border-stone-800 text-stone-300 font-semibold cursor-not-allowed'
                                            : 'bg-stone-800 border-stone-700 text-white focus:border-amber-500'
                                    }`}
                                    required
                                />
                            </div>

                            {/* Sekcje widoczne TYLKO dla VCC (Data i Uwagi) */}
                            {passType === 'VCC' && (
                                <>
                                    {/* Data Wygaśnięcia */}
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-400 mb-1">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                                            Data Ważności
                                        </label>
                                        <input
                                            type="date"
                                            value={expirationDate}
                                            onChange={e => setExpirationDate(e.target.value)}
                                            className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                            required
                                        />
                                    </div>

                                    {/* Uwagi / Cel wizyty */}
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-400 mb-1">Uwagi / Cel wizyty</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="np. Dostawa zaopatrzenia, Gość bazy..."
                                            className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 resize-none"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Przyciski Akcji */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Zapisywanie...' : 'Zatwierdź i Wystaw'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};