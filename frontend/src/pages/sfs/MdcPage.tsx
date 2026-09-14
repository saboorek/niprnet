import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faPlus,
    faArrowLeft,
    faUser,
    faPhone,
    faShieldHalved,
    faChevronLeft,
    faChevronRight,
    faTimes,
    faStickyNote,
    faExclamationTriangle,
    faFileContract,
    faGavel,
    faEraser
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';

type RecordType = 'Ostrzeżenie' | 'Cytacja' | 'Areszt' | 'Notatka';

interface MdcRecord {
    _id: string;
    type: RecordType;
    description: string;
    createdAt: string;
    createdBy?: string;
}

interface Employee {
    _id: string;
    characterId: string;
    firstName: string;
    lastName: string;
    doDId: string;
    rank: string;
    phone?: string;
    avatarUrl?: string;
    records?: MdcRecord[];
}

export const MdcPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Paginacja wpisów
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 3;

    // Modal dodawania wpisu
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recordType, setRecordType] = useState<RecordType>('Notatka');
    const [recordDescription, setRecordDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchEmployees = async (query: string) => {
        if (!query.trim()) {
            toast.error('Wpisz imię lub nazwisko postaci przed wyszukaniem');
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const endpoint = `${config.URL}/mdc/search?query=${encodeURIComponent(query)}`;
            const res = await fetch(endpoint, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            } else {
                toast.error('Błąd pobierania danych z bazy MDC');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchEmployees(searchTerm);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setEmployees([]);
        setHasSearched(false);
    };

    const handleSelectEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setCurrentPage(1);
    };

    const handleAddRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setSubmitting(true);
        try {
            const targetId = selectedEmployee.characterId || selectedEmployee._id;
            const res = await fetch(`${config.URL}/mdc/employee/${targetId}/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    type: recordType,
                    description: recordDescription
                })
            });

            if (res.ok) {
                const updatedRecords: MdcRecord[] = await res.json();
                toast.success('Dodano wpis do kartoteki MDC');

                const updatedEmp = { ...selectedEmployee, records: updatedRecords };
                setSelectedEmployee(updatedEmp);
                setEmployees(prev => prev.map(emp => emp._id === updatedEmp._id ? updatedEmp : emp));

                setRecordDescription('');
                setShowRecordModal(false);
            } else {
                toast.error('Błąd podczas zapisywania wpisu');
            }
        } catch {
            toast.error('Błąd serwera');
        } finally {
            setSubmitting(false);
        }
    };

    const getRecordStyle = (type: RecordType) => {
        switch (type) {
            case 'Ostrzeżenie':
                return {
                    border: 'border-yellow-500/80 bg-yellow-950/20',
                    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
                    icon: faExclamationTriangle
                };
            case 'Cytacja':
                return {
                    border: 'border-orange-500/80 bg-orange-950/20',
                    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
                    icon: faFileContract
                };
            case 'Areszt':
                return {
                    border: 'border-red-600/80 bg-red-950/20',
                    badge: 'bg-red-600/20 text-red-400 border-red-500/40',
                    icon: faGavel
                };
            case 'Notatka':
            default:
                return {
                    border: 'border-stone-200/80 bg-stone-900/40 text-stone-100',
                    badge: 'bg-stone-200/20 text-stone-200 border-stone-300/40',
                    icon: faStickyNote
                };
        }
    };

    const records = selectedEmployee?.records || [];
    const totalPages = Math.ceil(records.length / recordsPerPage) || 1;
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <PageHeader title="Mobile Data Computer — Kartoteka Wojskowa" />
                {selectedEmployee && (
                    <button
                        onClick={() => setSelectedEmployee(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-all"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Powrót do wyszukiwarki
                    </button>
                )}
            </div>

            {/* WIDOK 1: WYSZUKIWARKA I LISTA OSOBOWA */}
            {!selectedEmployee ? (
                <div className="space-y-6">
                    {/* PANEL WYSZUKIWANIA */}
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-xl space-y-4">
                        <div className="flex items-center gap-2 text-stone-300 text-sm font-semibold border-b border-stone-800 pb-3">
                            <FontAwesomeIcon icon={faShieldHalved} className="text-amber-500" />
                            Wyszukiwarka Kartotek Osobowych
                        </div>

                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Wpisz imię, nazwisko lub imię i nazwisko postaci..."
                                    className="w-full bg-stone-950 border border-stone-800 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors"
                                />
                                <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-3.5 text-stone-500 text-xs" />
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button
                                    type="submit"
                                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-md"
                                >
                                    <FontAwesomeIcon icon={faSearch} />
                                    Wyszukaj
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs px-4 py-2.5 rounded-lg transition-all border border-stone-700"
                                >
                                    <FontAwesomeIcon icon={faEraser} />
                                    Wyczyść
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* WYNIKI WYSZUKIWANIA */}
                    {hasSearched && (
                        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-xl overflow-hidden">
                            {loading ? (
                                <p className="text-stone-400 text-center py-12 text-sm italic">Przeszukiwanie baz danych MDC...</p>
                            ) : employees.length === 0 ? (
                                <p className="text-stone-500 text-center py-12 text-sm">Brak znalezionych rekordów dla podanej frazy.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                        <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 text-xs uppercase tracking-wider">
                                            <th className="p-4">Imię i Nazwisko</th>
                                            <th className="p-4">Stopień</th>
                                            <th className="p-4">Telefon</th>
                                            <th className="p-4 text-right">Akcja</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-800/60 text-sm">
                                        {employees.map(emp => (
                                            <tr
                                                key={emp._id}
                                                onClick={() => handleSelectEmployee(emp)}
                                                className="hover:bg-stone-800/50 cursor-pointer transition-colors group"
                                            >
                                                <td className="p-4 font-semibold text-stone-100 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center overflow-hidden shrink-0">
                                                        {emp.avatarUrl ? (
                                                            <img src={emp.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FontAwesomeIcon icon={faUser} className="text-stone-500 text-xs" />
                                                        )}
                                                    </div>
                                                    {emp.firstName} {emp.lastName}
                                                </td>
                                                <td className="p-4 text-amber-400 font-medium">{emp.rank}</td>
                                                <td className="p-4 text-stone-400">{emp.phone || 'Brak'}</td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectEmployee(emp);
                                                        }}
                                                        className="text-xs bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white px-3 py-1.5 rounded-lg border border-amber-600/30 font-semibold transition-all"
                                                    >
                                                        Otwórz profil →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* WIDOK 2: PROFIL KARTOTEKI OSOBY */
                <div className="space-y-6">
                    {/* DANE OSOBOWE */}
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-stone-300 border-b border-stone-800 pb-3 flex items-center gap-2">
                            <FontAwesomeIcon icon={faUser} className="text-amber-500" />
                            Dane Kartotekowe Postaci
                        </h3>

                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-32 h-40 bg-stone-950 border border-stone-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                                {selectedEmployee.avatarUrl ? (
                                    <img src={selectedEmployee.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <FontAwesomeIcon icon={faUser} className="text-stone-700 text-4xl" />
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1 w-full">
                                <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3">
                                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Imię i Nazwisko</label>
                                    <p className="text-sm font-bold text-stone-100 mt-1">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                                </div>

                                <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3">
                                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Stopień Wojskowy</label>
                                    <p className="text-sm font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
                                        {selectedEmployee.rank}
                                    </p>
                                </div>

                                <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3">
                                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Numer Telefonu</label>
                                    <p className="text-sm font-bold text-stone-200 mt-1 flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faPhone} className="text-xs text-stone-500" />
                                        {selectedEmployee.phone || 'Nie wprowadzono'}
                                    </p>
                                </div>

                                <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3">
                                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">DoD ID</label>
                                    <p className="text-sm font-bold text-stone-300 mt-1 font-mono">
                                        {selectedEmployee.doDId && selectedEmployee.doDId !== 'N/A' ? selectedEmployee.doDId : 'Nie dotyczy'}
                                    </p>
                                </div>

                                <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 sm:col-span-2">
                                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Łączna liczba wpisów w MDC</label>
                                    <p className="text-sm font-bold text-stone-300 mt-1">{(selectedEmployee.records || []).length} wpis(ów)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WPISY I NOTATKI */}
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                            <h3 className="text-sm font-bold text-stone-300 flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileContract} className="text-amber-500" />
                                Historia Rejestru MDC
                            </h3>

                            <button
                                onClick={() => setShowRecordModal(true)}
                                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-md"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                Dodaj wpis
                            </button>
                        </div>

                        {records.length === 0 ? (
                            <div className="bg-stone-950/40 border border-stone-800/80 rounded-lg p-8 text-center text-stone-500 text-xs italic">
                                Brak wpisów kartotecznych dla tej postaci.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {currentRecords.map(rec => {
                                    const style = getRecordStyle(rec.type);
                                    return (
                                        <div
                                            key={rec._id}
                                            className={`border rounded-xl p-4 transition-all shadow-md ${style.border}`}
                                        >
                                            <div className="flex items-center justify-between border-b border-stone-800/50 pb-2.5 mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${style.badge}`}>
                                                        <FontAwesomeIcon icon={style.icon} className="text-[10px]" />
                                                        [{rec.type.toUpperCase()}]
                                                    </span>
                                                    {rec.createdBy && (
                                                        <span className="text-[11px] text-stone-400 font-medium">
                                                            Wystawił: <strong className="text-stone-300">{rec.createdBy}</strong>
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-stone-400 font-mono">
                                                    {new Date(rec.createdAt).toLocaleString('pl-PL')}
                                                </span>
                                            </div>

                                            <p className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed">
                                                {rec.description}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {records.length > recordsPerPage && (
                            <div className="flex items-center justify-between border-t border-stone-800 pt-4 mt-4">
                                <span className="text-xs text-stone-500">
                                    Strona <strong className="text-stone-300">{currentPage}</strong> z <strong className="text-stone-300">{totalPages}</strong>
                                </span>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-stone-800 text-stone-300 rounded-lg text-xs transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                                currentPage === page
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-stone-800 text-stone-300 rounded-lg text-xs transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DODAWANIA WPISU */}
            {showRecordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faPlus} className="text-amber-500" />
                                Nowy wpis w kartotece MDC
                            </h3>
                            <button
                                onClick={() => setShowRecordModal(false)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <form onSubmit={handleAddRecord} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-1">Typ Wpisu</label>
                                <select
                                    value={recordType}
                                    onChange={e => setRecordType(e.target.value as RecordType)}
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                                >
                                    <option value="Notatka">Notatka (Biały)</option>
                                    <option value="Ostrzeżenie">Ostrzeżenie (Żółty)</option>
                                    <option value="Cytacja">Cytacja (Pomarańczowy)</option>
                                    <option value="Areszt">Areszt (Czerwony)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-400 mb-1">Szczegóły / Powód wpisu</label>
                                <textarea
                                    value={recordDescription}
                                    onChange={e => setRecordDescription(e.target.value)}
                                    rows={4}
                                    placeholder="Wpisz powód, artykuły, opis zdarzenia lub szczegóły notatki..."
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors resize-none"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                                <button
                                    type="button"
                                    onClick={() => setShowRecordModal(false)}
                                    className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs hover:bg-stone-700 transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors"
                                >
                                    {submitting ? 'Zapisywanie...' : 'Dodaj wpis'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};