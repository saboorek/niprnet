import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { useCharacter } from '../../context/CharacterContext.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarPlus,
    faCalendarTimes,
    faPlus,
    faTimes,
    faUserCheck,
    faTrash
} from '@fortawesome/free-solid-svg-icons';

interface AbsenceItem {
    _id: string;
    characterId: string | { _id: string; firstName?: string; lastName?: string; rank?: string };
    startDate: string;
    endDate: string;
    reason?: string;
    employeeName?: string;
    employeeRank?: string;
}

export const AbsencesPage = () => {
    const { selectedCharacter } = useCharacter();
    const canAddAbsence = usePermission('canAddAbsence');
    const canRemoveAbsence = usePermission('canRemoveAbsence');

    const [absences, setAbsences] = useState<AbsenceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const activeCharId = selectedCharacter ? ((selectedCharacter as any).characterId || selectedCharacter._id) : null;
    const activeCharRank = selectedCharacter ? ((selectedCharacter as any).rank || '') : '';

    const fetchAbsences = async () => {
        try {
            const res = await fetch(`${config.URL}/absences`, { credentials: 'include' });
            if (res.ok) {
                const absData: AbsenceItem[] = await res.json();
                setAbsences(absData);
            } else {
                toast.error('Nie udało się pobrać listy nieobecności');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAbsences();
    }, []);

    const handleAddAbsence = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeCharId) {
            toast.error('Brak wybranej aktywnej postaci');
            return;
        }

        if (!startDate || !endDate) {
            toast.error('Proszę uzupełnić daty nieobecności');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${config.URL}/absences`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: activeCharId,
                    startDate,
                    endDate,
                    reason,
                }),
            });

            if (res.ok) {
                toast.success('Dodano zgłoszenie nieobecności');
                setShowModal(false);
                setStartDate('');
                setEndDate('');
                setReason('');
                fetchAbsences();
            } else {
                toast.error('Błąd podczas zapisywania nieobecności');
            }
        } catch {
            toast.error('Błąd serwera');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAbsence = async (id: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zgłoszenie?')) return;

        try {
            const res = await fetch(`${config.URL}/absences/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (res.ok) {
                toast.success('Usunięto nieobecność');
                setAbsences(prev => prev.filter(a => a._id !== id));
            } else {
                toast.error('Nie udało się usunąć wpisu');
            }
        } catch {
            toast.error('Błąd połączenia z serwerem');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader title="Ewidencja Nieobecności i Urlopów" />

                {canAddAbsence && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md text-sm"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Dodaj nieobecność
                    </button>
                )}
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl">
                {loading ? (
                    <p className="text-stone-400 text-center py-12">Ładowanie nieobecności...</p>
                ) : absences.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                            <tr className="border-b border-stone-800 bg-stone-950/50 text-stone-400 font-medium">
                                <th className="p-4">Żołnierz / Pracownik</th>
                                <th className="p-4">Data rozpoczęcia</th>
                                <th className="p-4">Data zakończenia</th>
                                <th className="p-4">Powód</th>
                                {canRemoveAbsence && <th className="p-4 text-right">Akcje</th>}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/60 text-stone-300">
                            {absences.map(abs => {
                                let empName = abs.employeeName || 'Nieznany';
                                let empRank = abs.employeeRank || '';

                                if (typeof abs.characterId === 'object' && abs.characterId !== null) {
                                    empName = `${abs.characterId.firstName || ''} ${abs.characterId.lastName || ''}`;
                                    empRank = abs.characterId.rank || '';
                                }

                                return (
                                    <tr key={abs._id} className="hover:bg-stone-800/40 transition-colors">
                                        <td className="p-4 font-medium text-white">
                                            <span className="text-amber-500 mr-2 text-xs">{empRank}</span>
                                            {empName}
                                        </td>
                                        <td className="p-4 text-stone-300">{formatDate(abs.startDate)}</td>
                                        <td className="p-4 text-stone-300">{formatDate(abs.endDate)}</td>
                                        <td className="p-4 text-stone-400 italic">
                                            {abs.reason || 'Brak podanego powodu'}
                                        </td>
                                        {canRemoveAbsence && (
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteAbsence(abs._id)}
                                                    className="text-stone-500 hover:text-red-400 transition-colors p-1"
                                                    title="Usuń"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-stone-500 space-y-2">
                        <FontAwesomeIcon icon={faCalendarTimes} className="text-3xl text-stone-600 mb-2" />
                        <p>Brak zarejestrowanych nieobecności w systemie</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faCalendarPlus} className="text-amber-500" />
                                Zgłoszenie Nieobecności
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <form onSubmit={handleAddAbsence} className="space-y-4">
                            <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-lg flex items-center gap-3">
                                <FontAwesomeIcon icon={faUserCheck} className="text-amber-500 text-lg" />
                                <div>
                                    <p className="text-xs text-stone-400">Zgłaszający (Aktywna postać)</p>
                                    <p className="text-sm font-semibold text-white">
                                        {selectedCharacter
                                            ? `${activeCharRank} ${selectedCharacter.firstName} ${selectedCharacter.lastName}`.trim()
                                            : 'Brak aktywnej postaci'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-stone-400 mb-1">
                                        Data od <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        required
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-400 mb-1">
                                        Data do <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        required
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">
                                    Powód (opcjonalny)
                                </label>
                                <textarea
                                    rows={3}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="np. Sprawy prywatne / urlop wypoczynkowy..."
                                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !selectedCharacter}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Zapisywanie...' : 'Zatwierdź zgłoszenie'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};