import React, { useState, useEffect, useCallback } from 'react';
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
    faEraser,
    faTrash,
    faCoins,
    faSlidersH
} from '@fortawesome/free-solid-svg-icons';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { useCharacter } from '../../context/CharacterContext';
import { usePermission } from '../../hooks/usePermission.ts';

type RecordType = 'Ostrzeżenie' | 'Cytacja' | 'Areszt' | 'Notatka';
type LegalCodeType = 'PC' | 'VC' | 'UCMJ';

interface LegalArticle {
    _id: string;
    codeType: LegalCodeType;
    code: string;
    title: string;
}

interface MdcRecord {
    _id: string;
    type: RecordType;
    description: string;
    amount?: number | null;
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
    const { selectedCharacter } = useCharacter();
    const permissions = selectedCharacter?.permissions;

    // Flagi uprawnień
    const canAddRecord = Boolean(permissions?.canAddMDCRecord || permissions?.hasAdminAccess);
    const canRemoveRecord = Boolean(permissions?.canRemoveMDCRecord || permissions?.hasAdminAccess);

    // Uprawnienia do zarządzania słownikiem przepisów
    const canAddCode = usePermission('canAddMDCReqCode') || Boolean(permissions?.hasAdminAccess);
    const canRemoveCode = usePermission('canRemoveMDCReqCode') || Boolean(permissions?.hasAdminAccess);

    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Dynamiczna baza artykułów z backendu
    const [legalArticles, setLegalArticles] = useState<LegalArticle[]>([]);

    // Paginacja wpisów
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 3;

    // Modal dodawania wpisu w kartotece
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recordType, setRecordType] = useState<RecordType>('Notatka');
    const [recordDescription, setRecordDescription] = useState('');
    const [recordAmount, setRecordAmount] = useState<string>('');
    const [selectedCode, setSelectedCode] = useState<LegalCodeType>('UCMJ');
    const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Modal zarządzania słownikami przepisów
    const [showDictModal, setShowDictModal] = useState(false);
    const [activeDictTab, setActiveDictTab] = useState<LegalCodeType>('PC');
    const [newArticleCode, setNewArticleCode] = useState('');
    const [newArticleTitle, setNewArticleTitle] = useState('');

    // Pobieranie artykułów prawnych z API
    const fetchLegalArticles = useCallback(async () => {
        try {
            const res = await fetch(`${config.URL}/mdc/legal-codes`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLegalArticles(data);
            }
        } catch {
            toast.error('Błąd podczas pobierania bazy przepisów prawnych');
        }
    }, []);

    useEffect(() => {
        fetchLegalArticles();
    }, [fetchLegalArticles]);

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

    const handleArticlesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedArticles(options);

        // Generowanie sekcji kwalifikacji
        const qualificationText = options.length > 0
            ? `Kwalifikacje:\n${options.map(art => `- ${art}`).join('\n')}`
            : '';

        setRecordDescription(prev => {
            const cleanPrev = prev.replace(/^Kwalifikacje:\n.*(\n- .*)*(\n\n)?/g, '').trim();
            if (!qualificationText) return cleanPrev;
            return cleanPrev ? `${qualificationText}\n\n${cleanPrev}` : qualificationText;
        });
    };

    const handleCodeChange = (code: LegalCodeType) => {
        setSelectedCode(code);
        setSelectedArticles([]);
    };

    const handleAddRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !canAddRecord) return;

        setSubmitting(true);
        try {
            const targetId = selectedEmployee.characterId || selectedEmployee._id;
            const res = await fetch(`${config.URL}/mdc/employee/${targetId}/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    type: recordType,
                    description: recordDescription,
                    amount: recordType === 'Cytacja' && recordAmount ? Number(recordAmount) : undefined
                })
            });

            if (res.ok) {
                const updatedRecords: MdcRecord[] = await res.json();
                toast.success('Dodano wpis do kartoteki MDC');

                const updatedEmp = { ...selectedEmployee, records: updatedRecords };
                setSelectedEmployee(updatedEmp);
                setEmployees(prev => prev.map(emp => emp._id === updatedEmp._id ? updatedEmp : emp));

                setRecordDescription('');
                setRecordAmount('');
                setSelectedArticles([]);
                setShowRecordModal(false);
            } else {
                const errData = await res.json();
                toast.error(errData.message || 'Błąd podczas zapisywania wpisu');
            }
        } catch {
            toast.error('Błąd serwera');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (!selectedEmployee || !canRemoveRecord) return;

        if (!confirm('Czy na pewno chcesz usunąć ten wpis z kartoteki?')) return;

        try {
            const targetId = selectedEmployee.characterId || selectedEmployee._id;
            const res = await fetch(`${config.URL}/mdc/employee/${targetId}/record/${recordId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                const updatedRecords: MdcRecord[] = await res.json();
                toast.success('Usunięto wpis z kartoteki MDC');

                const updatedEmp = { ...selectedEmployee, records: updatedRecords };
                setSelectedEmployee(updatedEmp);
                setEmployees(prev => prev.map(emp => emp._id === updatedEmp._id ? updatedEmp : emp));

                const remainingCount = updatedRecords.length;
                const maxPage = Math.ceil(remainingCount / recordsPerPage) || 1;
                if (currentPage > maxPage) {
                    setCurrentPage(maxPage);
                }
            } else {
                const errData = await res.json();
                toast.error(errData.message || 'Nie udało się usunąć wpisu');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        }
    };

    // Obsługa słowników przepisów (Dodawanie / Usuwanie)
    const handleAddLegalArticle = async () => {
        if (!newArticleCode.trim() || !newArticleTitle.trim()) {
            toast.error('Wypełnij kod artykułu oraz jego tytuł!');
            return;
        }

        try {
            const res = await fetch(`${config.URL}/mdc/legal-codes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    codeType: activeDictTab,
                    code: newArticleCode.trim(),
                    title: newArticleTitle.trim()
                })
            });

            if (res.ok) {
                toast.success(`Dodano artykuł do słownika ${activeDictTab}`);
                setNewArticleCode('');
                setNewArticleTitle('');
                fetchLegalArticles();
            } else {
                toast.error('Błąd podczas dodawania artykułu');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        }
    };

    const handleDeleteLegalArticle = async (id: string) => {
        try {
            const res = await fetch(`${config.URL}/mdc/legal-codes/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Usunięto artykuł ze słownika');
                fetchLegalArticles();
            } else {
                toast.error('Nie udało się usunąć artykułu');
            }
        } catch {
            toast.error('Błąd połączenia');
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

    const recordStats = records.reduce(
        (acc, rec) => {
            if (rec.type === 'Ostrzeżenie') acc.warnings += 1;
            else if (rec.type === 'Cytacja') acc.citations += 1;
            else if (rec.type === 'Areszt') acc.arrests += 1;
            else if (rec.type === 'Notatka') acc.notes += 1;
            return acc;
        },
        { warnings: 0, citations: 0, arrests: 0, notes: 0 }
    );

    const totalPages = Math.ceil(records.length / recordsPerPage) || 1;
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

    // Artykuły przefiltrowane po kodzie dla formularza wpisu i dla słownika
    const filteredArticlesForForm = legalArticles.filter(art => art.codeType === selectedCode);
    const filteredArticlesForDict = legalArticles.filter(art => art.codeType === activeDictTab);

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <PageHeader title="Mobile Data Computer — Kartoteka Wojskowa" />

                <div className="flex items-center gap-3">
                    {canAddCode && (
                        <button
                            onClick={() => setShowDictModal(true)}
                            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs px-3.5 py-2 rounded-xl border border-stone-700 transition-all font-semibold shadow-md"
                        >
                            <FontAwesomeIcon icon={faSlidersH} className="text-amber-500" />
                            <span>Zarządzaj słownikami</span>
                        </button>
                    )}

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
            </div>

            {/* WIDOK 1: WYSZUKIWARKA I LISTA OSOBOWA */}
            {!selectedEmployee ? (
                <div className="space-y-6">
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
                                    <p className="text-sm font-bold text-stone-300 mt-1">
                                        {records.length} wpis(ów){' '}
                                        <span className="text-xs font-normal text-stone-400">
                                            (ostrzeżenie: <strong className="text-yellow-400">{recordStats.warnings}</strong>, cytacja:{' '}
                                            <strong className="text-orange-400">{recordStats.citations}</strong>, areszt:{' '}
                                            <strong className="text-red-400">{recordStats.arrests}</strong>)
                                        </span>
                                    </p>
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

                            {canAddRecord && (
                                <button
                                    onClick={() => setShowRecordModal(true)}
                                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-md"
                                >
                                    <FontAwesomeIcon icon={faPlus} />
                                    Dodaj wpis
                                </button>
                            )}
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
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${style.badge}`}>
                                                        <FontAwesomeIcon icon={style.icon} className="text-[10px]" />
                                                        [{rec.type.toUpperCase()}]
                                                    </span>

                                                    {rec.type === 'Cytacja' && rec.amount !== undefined && rec.amount !== null && (
                                                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 font-mono">
                                                            <FontAwesomeIcon icon={faCoins} className="text-[10px]" />
                                                            ${rec.amount.toLocaleString('en-US')}
                                                        </span>
                                                    )}

                                                    {rec.createdBy && (
                                                        <span className="text-[11px] text-stone-400 font-medium">
                                                            Wystawił: <strong className="text-stone-300">{rec.createdBy}</strong>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] text-stone-400 font-mono">
                                                        {new Date(rec.createdAt).toLocaleString('pl-PL')}
                                                    </span>

                                                    {canRemoveRecord && (
                                                        <button
                                                            onClick={() => handleDeleteRecord(rec._id)}
                                                            title="Usuń wpis"
                                                            className="text-stone-500 hover:text-red-400 p-1 transition-colors"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                        </button>
                                                    )}
                                                </div>
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
            {showRecordModal && canAddRecord && (
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

                            {recordType === 'Cytacja' && (
                                <div>
                                    <label className="block text-xs font-semibold text-stone-400 mb-1">Kwota grzywny ($)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={recordAmount}
                                            onChange={e => setRecordAmount(e.target.value)}
                                            placeholder="Wprowadź kwotę mandatu/cytacji..."
                                            className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                                            required
                                        />
                                        <FontAwesomeIcon icon={faCoins} className="absolute left-3 top-3 text-orange-400 text-xs" />
                                    </div>
                                </div>
                            )}

                            {/* SEKCJA PRZEPISÓW PRAWNYCH DLA CYTACJI I ARESZTU */}
                            {(recordType === 'Cytacja' || recordType === 'Areszt') && (
                                <div className="space-y-3 p-3 bg-stone-950/60 border border-stone-800 rounded-lg">
                                    <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider">
                                        Podstawa Prawna / Przepisy
                                    </label>

                                    <div className="flex items-center gap-4">
                                        {(['PC', 'VC', 'UCMJ'] as LegalCodeType[]).map(codeKey => (
                                            <label key={codeKey} className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="legalCode"
                                                    checked={selectedCode === codeKey}
                                                    onChange={() => handleCodeChange(codeKey)}
                                                    className="accent-amber-500"
                                                />
                                                {codeKey}
                                            </label>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-stone-400 mb-1">
                                            Wybierz artykuły z {selectedCode} (Użyj Ctrl + Click dla wielu):
                                        </label>
                                        <select
                                            multiple
                                            size={4}
                                            value={selectedArticles}
                                            onChange={handleArticlesChange}
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-lg p-2 text-xs outline-none focus:border-amber-500 transition-colors"
                                        >
                                            {filteredArticlesForForm.length === 0 ? (
                                                <option disabled value="" className="text-stone-500 p-2">
                                                    Brak artykułów dla wybranego kodeksu.
                                                </option>
                                            ) : (
                                                filteredArticlesForForm.map(art => (
                                                    <option key={art._id} value={`${art.code} - ${art.title}`} className="py-1">
                                                        {art.code} — {art.title}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}

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

            {/* MODAL ZARZĄDZANIA SŁOWNIKAMI KODEKSÓW PRAWNYCH */}
            <Dialog open={showDictModal} onClose={() => setShowDictModal(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-lg border border-stone-800 p-6">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faSlidersH} className="text-amber-500" />
                                <span>Zarządzanie Słownikami Przepisów MDC</span>
                            </DialogTitle>
                            <button onClick={() => setShowDictModal(false)} className="text-stone-400 hover:text-white">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <div className="flex border-b border-stone-800 mb-4 gap-4">
                            {(['PC', 'VC', 'UCMJ'] as LegalCodeType[]).map((code) => (
                                <button
                                    key={code}
                                    onClick={() => setActiveDictTab(code)}
                                    className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
                                        activeDictTab === code
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-transparent text-stone-400 hover:text-stone-200'
                                    }`}
                                >
                                    {code === 'PC' && 'Penal Code (PC)'}
                                    {code === 'VC' && 'Vehicle Code (VC)'}
                                    {code === 'UCMJ' && 'UCMJ'}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {canAddCode && (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newArticleCode}
                                            onChange={(e) => setNewArticleCode(e.target.value)}
                                            placeholder="Kod (np. PC 101, Art. 86)..."
                                            className="w-1/3 bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                        />
                                        <input
                                            type="text"
                                            value={newArticleTitle}
                                            onChange={(e) => setNewArticleTitle(e.target.value)}
                                            placeholder="Tytuł / Opis artykułu..."
                                            className="w-2/3 bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddLegalArticle}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        Dodaj artykuł do {activeDictTab}
                                    </button>
                                </div>
                            )}

                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {filteredArticlesForDict.length === 0 ? (
                                    <p className="text-center py-6 text-stone-500 text-xs italic">
                                        Brak dodanych artykułów dla tego kodeksu.
                                    </p>
                                ) : (
                                    filteredArticlesForDict.map((art) => (
                                        <div key={art._id} className="flex items-center justify-between p-2.5 bg-stone-950 rounded-lg border border-stone-800 text-xs text-stone-200">
                                            <div>
                                                <span className="font-bold text-amber-400 mr-2">{art.code}</span>
                                                <span>{art.title}</span>
                                            </div>

                                            {canRemoveCode && (
                                                <button
                                                    onClick={() => handleDeleteLegalArticle(art._id)}
                                                    className="text-stone-500 hover:text-red-400 transition-colors ml-2"
                                                    title="Usuń artykuł"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-stone-800 mt-4">
                            <button
                                onClick={() => setShowDictModal(false)}
                                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors"
                            >
                                Zamknij
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </div>
    );
};