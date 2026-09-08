import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { useCharacter } from '../../context/CharacterContext.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faFileAlt,
    faTimes,
    faTrash,
    faUserCheck,
    faCalendarAlt,
    faExclamationTriangle,
    faEye,
    faHashtag
} from '@fortawesome/free-solid-svg-icons';

export interface ReportItem {
    _id: string;
    reportNumber?: string;
    title?: string;
    type: 'Incident Report';
    authorId: string | { _id: string; firstName?: string; lastName?: string; rank?: string };
    authorName?: string;
    authorRank?: string;
    description: string;
    createdAt: string;
}

export const ReportsPage = () => {
    const { selectedCharacter } = useCharacter();
    const canAddReport = usePermission('canAddReport');
    const canRemoveReport = usePermission('canRemoveReport');

    const [reports, setReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [reportType, setReportType] = useState<'Incident Report'>('Incident Report');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

    const activeCharId = selectedCharacter ? ((selectedCharacter as any).characterId || selectedCharacter._id) : null;
    const activeCharRank = selectedCharacter ? ((selectedCharacter as any).rank || '') : '';
    const activeCharName = selectedCharacter
        ? `${activeCharRank} ${selectedCharacter.firstName} ${selectedCharacter.lastName}`.trim()
        : 'Brak aktywnej postaci';

    const fetchReports = async () => {
        try {
            const res = await fetch(`${config.URL}/reports`, { credentials: 'include' });
            if (res.ok) {
                const data: ReportItem[] = await res.json();
                setReports(data);
            } else {
                toast.error('Nie udało się pobrać listy raportów');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const totalPages = Math.ceil(reports.length / itemsPerPage) || 1;
    const paginatedReports = reports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handleCreateReport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeCharId) {
            toast.error('Brak wybranej aktywnej postaci!');
            return;
        }

        if (!description.trim()) {
            toast.error('Wypełnij treść raportu');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${config.URL}/reports`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: reportType,
                    type: reportType,
                    authorId: activeCharId,
                    description,
                }),
            });

            if (res.ok) {
                toast.success('Pomyślnie złożono nowy raport');
                setIsCreateModalOpen(false);
                setDescription('');
                fetchReports();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Błąd podczas tworzenia raportu');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReport = async (id: string) => {
        if (!confirm('Czy na pewno chcesz usunąć ten raport? Akcja jest nieodwracalna.')) return;

        try {
            const res = await fetch(`${config.URL}/reports/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (res.ok) {
                toast.success('Usunięto raport');
                setReports(prev => prev.filter(r => r._id !== id));
                if (selectedReport?._id === id) {
                    setSelectedReport(null);
                }
            } else {
                toast.error('Nie udało się usunąć raportu');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader title="Rejestr Raportów i Incydentów" />

                {canAddReport && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md text-sm"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Dodaj Raport
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-stone-400 text-center py-12">Ładowanie rejestru raportów...</p>
            ) : reports.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-12 text-center space-y-2">
                    <FontAwesomeIcon icon={faFileAlt} className="text-4xl text-stone-700" />
                    <p className="text-stone-400">Brak zarejestrowanych raportów w bazie.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                        {paginatedReports.map(report => {
                            let authorName = report.authorName || 'Nieznany';
                            let authorRank = report.authorRank || '';

                            if (typeof report.authorId === 'object' && report.authorId !== null) {
                                authorName = `${report.authorId.firstName || ''} ${report.authorId.lastName || ''}`;
                                authorRank = report.authorId.rank || '';
                            }

                            const reportNumberDisplay = report.reportNumber || 'IR-2026-???';

                            return (
                                <div
                                    key={report._id}
                                    onClick={() => setSelectedReport(report)}
                                    className="bg-stone-900 border border-stone-800 hover:border-stone-700 p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-stone-850 shadow-md group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                                    {report.type}
                                                </span>
                                                <h4 className="text-white font-mono font-bold text-base group-hover:text-amber-400 transition-colors tracking-wide">
                                                    {reportNumberDisplay}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-stone-400 mt-1 flex items-center gap-3">
                                                <span>
                                                    Sporządził: <strong className="text-stone-300">{authorRank} {authorName}</strong>
                                                </span>
                                                <span>•</span>
                                                <span>{formatDate(report.createdAt)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {canRemoveReport && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteReport(report._id);
                                                }}
                                                className="text-stone-500 hover:text-red-400 p-2 transition-colors"
                                                title="Usuń raport"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        )}
                                        <FontAwesomeIcon icon={faEye} className="text-stone-600 group-hover:text-stone-300 transition-colors" />
                                    </div>
                                </div>
                            );
                        })}
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

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileAlt} className="text-amber-500" />
                                Nowy Raport Incydentu
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateReport} className="space-y-4">
                            <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-lg flex items-center justify-between text-xs text-stone-300">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faUserCheck} className="text-amber-500" />
                                    <span>Wystawiający: <strong>{activeCharName}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 text-stone-400">
                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                    <span>{formatDate(new Date().toISOString())}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">
                                    Typ Raportu
                                </label>
                                <select
                                    value={reportType}
                                    onChange={e => setReportType(e.target.value as 'Incident Report')}
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                >
                                    <option value="Incident Report">Incident Report (IR)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">
                                    Opis i Szczegóły Incydentu <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={6}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Opisz dokładnie przebieg zdarzenia, zaangażowane osoby i podjęte kroki..."
                                    required
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !selectedCharacter}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Zapisywanie...' : 'Złóż Raport'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 max-w-2xl w-full flex flex-col gap-5 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-mono font-bold px-3 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faHashtag} className="text-xs" />
                                    {selectedReport.reportNumber || 'IR-2026-???'}
                                </span>
                                <h3 className="text-lg font-bold text-white">
                                    {selectedReport.title || selectedReport.type}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-stone-800/50 p-3 rounded-lg border border-stone-800 text-xs">
                            <div>
                                <span className="text-stone-400 block">Autor Raportu:</span>
                                <span className="text-stone-200 font-semibold">
                                    {typeof selectedReport.authorId === 'object' && selectedReport.authorId !== null
                                        ? `${selectedReport.authorId.rank || ''} ${selectedReport.authorId.firstName || ''} ${selectedReport.authorId.lastName || ''}`
                                        : `${selectedReport.authorRank || ''} ${selectedReport.authorName || 'Nieznany'}`
                                    }
                                </span>
                            </div>
                            <div>
                                <span className="text-stone-400 block">Data wystawienia:</span>
                                <span className="text-stone-200 font-semibold">{formatDate(selectedReport.createdAt)}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Opis zdarzenia</h4>
                            <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-4 text-stone-300 text-sm whitespace-pre-wrap min-h-[140px] max-h-[300px] overflow-y-auto leading-relaxed">
                                {selectedReport.description}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-stone-800">
                            {canRemoveReport ? (
                                <button
                                    onClick={() => handleDeleteReport(selectedReport._id)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 rounded-lg transition-colors"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                    Usuń raport
                                </button>
                            ) : <div />}

                            <button
                                onClick={() => setSelectedReport(null)}
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