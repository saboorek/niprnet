import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import config from '../../utils/config.ts';
import { usePermission } from '../../hooks/usePermission.ts';
import { useCharacter } from '../../context/CharacterContext.tsx';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { Menu, MenuButton, MenuItem, MenuItems, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers,
    faPlus,
    faTrash,
    faCog,
    faUserPlus,
    faUserMinus,
    faSlidersH,
    faTimes,
    faSignal,
    faLock,
    faClock,
    faEdit
} from '@fortawesome/free-solid-svg-icons';

interface UnitType {
    _id: string;
    name: string;
}

interface UnitStatus {
    _id: string;
    name: string;
    color?: string;
}

interface UnitMember {
    characterId: string;
    firstName: string;
    lastName: string;
}

interface CadUnit {
    _id: string;
    callsign: string;
    unitType: string;
    status: string;
    createdBy?: string;
    members: UnitMember[];
    createdAt?: string;
}

const formatShortName = (firstName: string, lastName: string): string => {
    if (!firstName || !lastName) return `${firstName || ''} ${lastName || ''}`.trim();
    return `${firstName.charAt(0).toUpperCase()}. ${lastName}`;
};

export const CadPage = () => {
    const { selectedCharacter } = useCharacter();

    const canEditUnitType = usePermission('canEditUnitType');
    const canEditStatus = usePermission('canEditStatus');

    const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
    const [unitStatuses, setUnitStatuses] = useState<UnitStatus[]>([]);

    const [units, setUnits] = useState<CadUnit[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [callsign, setCallsign] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const [currentTime, setCurrentTime] = useState<string>('');

    const [showDictModal, setShowDictModal] = useState<boolean>(false);
    const [activeDictTab, setActiveDictTab] = useState<'type' | 'status'>('type');
    const [newTypeName, setNewTypeName] = useState<string>('');
    const [newStatusName, setNewStatusName] = useState<string>('');

    const currentCharId = String(selectedCharacter?.id || selectedCharacter?._id || '');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('pl-PL'));
        };
        updateClock();
        const intervalId = setInterval(updateClock, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [typesRes, statusesRes, unitsRes] = await Promise.all([
                fetch(`${config.URL}/cad/types`, { credentials: 'include' }),
                fetch(`${config.URL}/cad/statuses`, { credentials: 'include' }),
                fetch(`${config.URL}/cad/units`, { credentials: 'include' })
            ]);

            if (typesRes.ok) setUnitTypes(await typesRes.json());
            if (statusesRes.ok) setUnitStatuses(await statusesRes.json());
            if (unitsRes.ok) setUnits(await unitsRes.json());
        } catch {
            toast.error('Błąd podczas pobierania danych CAD');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const myUnit = units.find(u =>
        u.members.some(m => String(m.characterId) === currentCharId)
    );

    useEffect(() => {
        if (myUnit) {
            setCallsign(myUnit.callsign);
            setSelectedType(myUnit.unitType);
            setSelectedStatus(myUnit.status);
        }
    }, [myUnit]);

    const handleSaveUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharacter || !currentCharId) {
            toast.error('Nie wybrano aktywnej postaci!');
            return;
        }

        if (!callsign.trim() || !selectedType || !selectedStatus) {
            toast.error('Wypełnij wszystkie pola formularza jednostki!');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                callsign: callsign.trim(),
                unitType: selectedType,
                status: selectedStatus,
                characterId: currentCharId,
                firstName: selectedCharacter.firstName,
                lastName: selectedCharacter.lastName
            };

            const url = myUnit
                ? `${config.URL}/cad/units/${myUnit._id}`
                : `${config.URL}/cad/units`;

            const method = myUnit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(myUnit ? 'Zaktualizowano status jednostki CAD' : 'Zarejestrowano jednostkę CAD');
                fetchData();
            } else {
                toast.error('Błąd podczas zapisywania jednostki CAD');
            }
        } catch {
            toast.error('Błąd serwera podczas zapisywania jednostki CAD');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUnit = async (unitId: string) => {
        try {
            const res = await fetch(`${config.URL}/cad/units/${unitId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Usunięto jednostkę z systemu CAD');
                if (myUnit && myUnit._id === unitId) {
                    setCallsign('');
                    setSelectedType('');
                    setSelectedStatus('');
                }
                fetchData();
            } else {
                toast.error('Nie udało się usunąć jednostki');
            }
        } catch {
            toast.error('Błąd połączenia podczas usuwania jednostki');
        }
    };

    const handleJoinUnit = async (unitId: string) => {
        if (!selectedCharacter || !currentCharId) return;
        try {
            const res = await fetch(`${config.URL}/cad/units/${unitId}/join`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: currentCharId,
                    firstName: selectedCharacter.firstName,
                    lastName: selectedCharacter.lastName
                })
            });

            if (res.ok) {
                toast.success('Dołączono do składu jednostki');
                fetchData();
            } else {
                toast.error('Nie udało się dołączyć do jednostki');
            }
        } catch {
            toast.error('Błąd połączenia');
        }
    };

    const handleLeaveUnit = async (unitId: string) => {
        if (!selectedCharacter || !currentCharId) return;
        try {
            const res = await fetch(`${config.URL}/cad/units/${unitId}/leave`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: currentCharId
                })
            });

            if (res.ok) {
                toast.success('Opuszczono skład jednostki');
                setCallsign('');
                setSelectedType('');
                setSelectedStatus('');
                fetchData();
            } else {
                toast.error('Nie udało się opuścić jednostki');
            }
        } catch {
            toast.error('Błąd połączenia');
        }
    };

    const handleAddType = async () => {
        if (!newTypeName.trim()) return;
        try {
            const res = await fetch(`${config.URL}/cad/types`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTypeName.trim() })
            });
            if (res.ok) {
                toast.success('Dodano typ jednostki');
                setNewTypeName('');
                fetchData();
            }
        } catch {
            toast.error('Błąd dodawania typu');
        }
    };

    const handleDeleteType = async (id: string) => {
        try {
            const res = await fetch(`${config.URL}/cad/types/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                toast.success('Usunięto typ');
                fetchData();
            }
        } catch {
            toast.error('Błąd usuwania');
        }
    };

    const handleAddStatus = async () => {
        if (!newStatusName.trim()) return;
        try {
            const res = await fetch(`${config.URL}/cad/statuses`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newStatusName.trim() })
            });
            if (res.ok) {
                toast.success('Dodano status jednostki');
                setNewStatusName('');
                fetchData();
            }
        } catch {
            toast.error('Błąd dodawania statusu');
        }
    };

    const handleDeleteStatus = async (id: string) => {
        try {
            const res = await fetch(`${config.URL}/cad/statuses/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                toast.success('Usunięto status');
                fetchData();
            }
        } catch {
            toast.error('Błąd usuwania');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader title="System Rejestracji Jednostek (CAD)" />

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs font-mono text-stone-400">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faSignal} className="text-emerald-500" />
                        GPS: <strong className="text-emerald-400">ACTIVE (CONNECTION-OK)</strong>
                    </span>
                    <span className="flex items-center gap-2 border-l border-stone-800 pl-6">
                        <FontAwesomeIcon icon={faLock} className="text-amber-500" />
                        ENCRYPTION: <strong className="text-stone-200">AES-256</strong>
                    </span>
                    <span className="flex items-center gap-2 border-l border-stone-800 pl-6">
                        <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
                        UNITS: <strong className="text-stone-200">{String(units.length).padStart(2, '0')}</strong>
                    </span>
                </div>
                <div className="flex items-center gap-2 text-stone-400">
                    <FontAwesomeIcon icon={faClock} />
                    <span>{currentTime}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                        <h3 className="text-md font-semibold text-white flex items-center gap-2">
                            <FontAwesomeIcon icon={faUsers} className="text-amber-500" />
                            Aktywne jednostki w służbie
                        </h3>

                        <button
                            onClick={() => setShowDictModal(true)}
                            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs px-3 py-1.5 rounded-lg border border-stone-700 transition-colors"
                        >
                            <FontAwesomeIcon icon={faSlidersH} className="text-amber-500" />
                            <span>Zarządzaj słownikami</span>
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-stone-400 text-center py-8 text-sm">Ładowanie jednostek CAD...</p>
                    ) : units.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-stone-800 rounded-xl text-stone-500 text-sm">
                            Brak zarejestrowanych jednostek w systemie.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-stone-300">
                                <thead className="bg-stone-950/60 text-stone-400 text-xs uppercase tracking-wider border-b border-stone-800">
                                <tr>
                                    <th className="py-3 px-4">Callsign</th>
                                    <th className="py-3 px-4">Typ</th>
                                    <th className="py-3 px-4">Skład</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-center">Akcja</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800/60">
                                {units.map((unit) => {
                                    const isCreator = String(unit.createdBy) === currentCharId;
                                    const isMember = unit.members.some(m => String(m.characterId) === currentCharId);

                                    return (
                                        <tr key={unit._id} className="hover:bg-stone-800/30 transition-colors">
                                            <td className="py-3 px-4 font-bold text-white font-mono">
                                                {unit.callsign}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-stone-400">
                                                    <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-medium">
                                                        {unit.unitType}
                                                    </span>
                                            </td>
                                            <td className="py-3 px-4 text-stone-200 text-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {unit.members.map((m, idx) => (
                                                        <span key={idx} className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 font-medium">
                                                                {formatShortName(m.firstName, m.lastName)}
                                                            </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        {unit.status}
                                                    </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Menu as="div" className="inline-block text-left">
                                                    <MenuButton className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors">
                                                        <FontAwesomeIcon icon={faCog} className="text-sm" />
                                                    </MenuButton>

                                                    <MenuItems anchor="bottom end" className="w-48 bg-stone-950 border border-stone-800 rounded-xl shadow-2xl py-1 z-50 focus:outline-none">
                                                        {!isMember && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => handleJoinUnit(unit._id)}
                                                                        className={`${active ? 'bg-stone-800 text-white' : 'text-stone-300'} flex items-center gap-2 w-full px-4 py-2 text-xs font-medium`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faUserPlus} className="text-emerald-400" />
                                                                        <span>Dołącz do jednostki</span>
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        )}

                                                        {isMember && !isCreator && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => handleLeaveUnit(unit._id)}
                                                                        className={`${active ? 'bg-stone-800 text-amber-400' : 'text-amber-500'} flex items-center gap-2 w-full px-4 py-2 text-xs font-medium`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faUserMinus} />
                                                                        <span>Opuść skład</span>
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        )}

                                                        {(isCreator || canEditStatus || canEditUnitType) && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <button
                                                                        onClick={() => handleDeleteUnit(unit._id)}
                                                                        className={`${active ? 'bg-stone-800 text-red-400' : 'text-red-500'} flex items-center gap-2 w-full px-4 py-2 text-xs font-medium border-t border-stone-800/80`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} />
                                                                        <span>Usuń jednostkę</span>
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        )}
                                                    </MenuItems>
                                                </Menu>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 flex flex-col justify-between">
                    <div>
                        <div className="border-b border-stone-800 pb-3 mb-4 flex items-center gap-2">
                            <FontAwesomeIcon icon={faCog} className="text-amber-500" />
                            <h3 className="text-md font-semibold text-white">
                                {myUnit ? 'Zarządzanie własną jednostką' : 'Rejestracja Nowej Jednostki'}
                            </h3>
                        </div>

                        <form onSubmit={handleSaveUnit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">
                                    Callsign jednostki
                                </label>
                                <input
                                    type="text"
                                    value={callsign}
                                    onChange={(e) => setCallsign(e.target.value)}
                                    placeholder="np. Bravo 1, Air 3..."
                                    required
                                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">
                                    Typ jednostki (Unit Type)
                                </label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    required
                                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Wybierz typ --</option>
                                    {unitTypes.map((t) => (
                                        <option key={t._id} value={t.name}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">
                                    Status jednostki
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    required
                                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Wybierz status --</option>
                                    {unitStatuses.map((s) => (
                                        <option key={s._id} value={s.name}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 shadow-md"
                                >
                                    <FontAwesomeIcon icon={myUnit ? faEdit : faPlus} />
                                    <span>{myUnit ? 'Zaktualizuj dane w CAD' : 'Zarejestruj jednostkę w CAD'}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {myUnit && (
                        <div className="mt-6 pt-4 border-t border-stone-800">
                            <button
                                type="button"
                                onClick={() => handleDeleteUnit(myUnit._id)}
                                className="w-full flex items-center justify-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 py-2 px-4 rounded-lg font-medium text-xs transition-colors"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                                <span>Usuń swoją jednostkę z systemu CAD</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showDictModal} onClose={() => setShowDictModal(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-lg border border-stone-800 p-6">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                                <FontAwesomeIcon icon={faSlidersH} className="text-amber-500" />
                                <span>Zarządzanie Słownikami CAD</span>
                            </DialogTitle>
                            <button onClick={() => setShowDictModal(false)} className="text-stone-400 hover:text-white">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <div className="flex border-b border-stone-800 mb-4 gap-4">
                            <button
                                onClick={() => setActiveDictTab('type')}
                                className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
                                    activeDictTab === 'type'
                                        ? 'border-amber-500 text-amber-400'
                                        : 'border-transparent text-stone-400 hover:text-stone-200'
                                }`}
                            >
                                Typy Jednostek
                            </button>
                            <button
                                onClick={() => setActiveDictTab('status')}
                                className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
                                    activeDictTab === 'status'
                                        ? 'border-amber-500 text-amber-400'
                                        : 'border-transparent text-stone-400 hover:text-stone-200'
                                }`}
                            >
                                Statusy Jednostek
                            </button>
                        </div>

                        {activeDictTab === 'type' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.target.value)}
                                        placeholder="Nazwa nowego typu (np. Patrol, Air Unit)..."
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                    />
                                    <button
                                        onClick={handleAddType}
                                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                                    >
                                        Dodaj
                                    </button>
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {unitTypes.map((t) => (
                                        <div key={t._id} className="flex items-center justify-between p-2.5 bg-stone-950 rounded-lg border border-stone-800 text-xs text-stone-200">
                                            <span>{t.name}</span>
                                            <button
                                                onClick={() => handleDeleteType(t._id)}
                                                className="text-stone-500 hover:text-red-400 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeDictTab === 'status' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newStatusName}
                                        onChange={(e) => setNewStatusName(e.target.value)}
                                        placeholder="Nazwa statusu (np. En Route, Available)..."
                                        className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                                    />
                                    <button
                                        onClick={handleAddStatus}
                                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                                    >
                                        Dodaj
                                    </button>
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {unitStatuses.map((s) => (
                                        <div key={s._id} className="flex items-center justify-between p-2.5 bg-stone-950 rounded-lg border border-stone-800 text-xs text-stone-200">
                                            <span>{s.name}</span>
                                            <button
                                                onClick={() => handleDeleteStatus(s._id)}
                                                className="text-stone-500 hover:text-red-400 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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