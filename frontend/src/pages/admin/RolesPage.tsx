import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import config from '../../utils/config';
import { PERMISSION_LABELS, emptyPermissions } from '../../types/permissions';
import type { Permissions } from '../../types/permissions';
import { useCharacter } from '../../context/CharacterContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faTrash, faShieldHalved, faAward, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { availableIconNames, roleIconsMap } from '../../utils/roleIcons';

type RoleType = 'role' | 'rank';

interface Role {
    _id: string;
    name: string;
    type?: RoleType;
    icon?: string | null;
    permissions: Permissions;
}

const PERM_COLUMN_SIZE = 5;
const ITEM_COLUMN_SIZE = 5; // Zmieniono z 10 na 5

export const RolesPage = () => {
    const { refreshPermissions } = useCharacter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<RoleType>('role');
    const [icon, setIcon] = useState<string | null>(null);
    const [permissions, setPerms] = useState<Permissions>(emptyPermissions());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isRolesOpen, setIsRolesOpen] = useState(true);
    const [isRanksOpen, setIsRanksOpen] = useState(true);

    const fetchRoles = () =>
        fetch(`${config.URL}/roles`, { credentials: 'include' })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) {
                    toast.error(data.message || 'Błąd podczas pobierania ról');
                    setRoles([]);
                    return;
                }
                if (Array.isArray(data)) {
                    setRoles(data);
                } else {
                    setRoles([]);
                }
            })
            .catch(() => {
                toast.error('Nie można załadować ról');
                setRoles([]);
            });

    useEffect(() => { fetchRoles(); }, []);

    const openCreate = () => {
        setEditRole(null);
        setName('');
        setType('role');
        setIcon(null);
        setPerms(emptyPermissions());
        setShowForm(true);
    };

    const openEdit = (role: Role) => {
        setEditRole(role);
        setName(role.name);
        setType(role.type ?? 'role');
        setIcon(role.icon ?? null);
        setPerms({ ...emptyPermissions(), ...role.permissions });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const url = editRole ? `${config.URL}/roles/${editRole._id}` : `${config.URL}/roles`;
        const method = editRole ? 'PUT' : 'POST';

        const finalPermissions = type === 'rank' ? emptyPermissions() : permissions;

        try {
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type, icon, permissions: finalPermissions }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.message);
                toast.error(data.message);
                return;
            }

            await fetchRoles();
            await refreshPermissions();
            setShowForm(false);
            toast.success(editRole ? `Zaktualizowano ${type === 'rank' ? 'rangę' : 'rolę'} "${name}"` : `Utworzono nową ${type === 'rank' ? 'rangę' : 'rolę'} "${name}"`);
        } catch {
            toast.error('Błąd serwera');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, roleName: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć "${roleName}"? Zostanie odebrana wszystkim postaciom.`)) return;

        const res = await fetch(`${config.URL}/roles/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (res.ok) {
            toast.success(`Pomyślnie usunięto "${roleName}"`);
            await refreshPermissions();
        } else {
            toast.error('Nie udało się usunąć wpisu');
        }
        await fetchRoles();
    };

    const togglePerm = (key: keyof Permissions) => {
        setPerms(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    };

    const permKeys = Object.keys(PERMISSION_LABELS) as (keyof Permissions)[];
    const permColumns = chunkArray(permKeys, PERM_COLUMN_SIZE);

    const safeRoles = Array.isArray(roles) ? roles : [];
    const systemRoles = safeRoles.filter(r => (r.type ?? 'role') === 'role');
    const cosmeticRanks = safeRoles.filter(r => r.type === 'rank');

    const roleColumns = chunkArray(systemRoles, ITEM_COLUMN_SIZE);
    const rankColumns = chunkArray(cosmeticRanks, ITEM_COLUMN_SIZE);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Zarządzanie uprawnieniami i rangami</h1>
                    <p className="text-sm text-stone-400 mt-1">Konfiguracja ról systemowych oraz rang organizacyjnych</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors border border-emerald-700/60 shadow-md"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    Nowy wpis
                </button>
            </div>

            {/* SEKCJA 1: ROLE SYSTEMOWE */}
            <div className="space-y-4">
                <button
                    onClick={() => setIsRolesOpen(!isRolesOpen)}
                    className="w-full flex items-center justify-between text-lg font-semibold text-stone-200 border-b border-stone-800 pb-2 hover:text-white transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-500" />
                        <h2>Role z uprawnieniami ({systemRoles.length})</h2>
                    </div>
                    <FontAwesomeIcon icon={isRolesOpen ? faChevronDown : faChevronRight} className="text-stone-400 text-sm" />
                </button>

                {isRolesOpen && (
                    <>
                        {systemRoles.length > 0 ? (
                            <div
                                className="gap-6 overflow-x-auto pb-2"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${roleColumns.length}, minmax(300px, 1fr))`,
                                }}
                            >
                                {roleColumns.map((col, colIdx) => (
                                    <div key={colIdx} className="flex flex-col gap-3">
                                        {col.map(role => (
                                            <div key={role._id} className="bg-stone-900/90 rounded-xl p-4 flex items-center justify-between border border-stone-800">
                                                <div className="overflow-hidden">
                                                    <div className="flex items-center gap-3">
                                                        {role.icon && roleIconsMap[role.icon] && (
                                                            <img
                                                                src={roleIconsMap[role.icon]}
                                                                alt={role.name}
                                                                className="w-6 h-6 object-contain shrink-0"
                                                            />
                                                        )}
                                                        <p className="text-white font-bold text-base truncate">{role.name}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {(Object.keys(PERMISSION_LABELS) as (keyof Permissions)[]).map(key => (
                                                            role.permissions[key] && (
                                                                <span key={key} className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                                                                    {PERMISSION_LABELS[key]}
                                                                </span>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-3">
                                                    <button
                                                        onClick={() => openEdit(role)}
                                                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors text-sm border border-stone-700/50"
                                                    >
                                                        <FontAwesomeIcon icon={faPen} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(role._id, role.name)}
                                                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-800/80 text-stone-300 hover:text-white transition-colors text-sm border border-stone-700/50"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-stone-500 text-sm italic py-4 text-center">Brak skonfigurowanych ról z uprawnieniami</p>
                        )}
                    </>
                )}
            </div>

            {/* SEKCJA 2: RANGI ORGANIZACYJNE */}
            <div className="space-y-4">
                <button
                    onClick={() => setIsRanksOpen(!isRanksOpen)}
                    className="w-full flex items-center justify-between text-lg font-semibold text-stone-200 border-b border-stone-800 pb-2 hover:text-white transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faAward} className="text-amber-600" />
                        <h2>Rangi organizacyjne ({cosmeticRanks.length})</h2>
                    </div>
                    <FontAwesomeIcon icon={isRanksOpen ? faChevronDown : faChevronRight} className="text-stone-400 text-sm" />
                </button>

                {isRanksOpen && (
                    <>
                        {cosmeticRanks.length > 0 ? (
                            <div
                                className="gap-6 overflow-x-auto pb-2"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${rankColumns.length}, minmax(260px, 1fr))`,
                                }}
                            >
                                {rankColumns.map((col, colIdx) => (
                                    <div key={colIdx} className="flex flex-col gap-3">
                                        {col.map(rank => (
                                            <div key={rank._id} className="bg-stone-900/90 rounded-xl p-3 flex items-center justify-between border border-stone-800">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {rank.icon && roleIconsMap[rank.icon] ? (
                                                        <img
                                                            src={roleIconsMap[rank.icon]}
                                                            alt={rank.name}
                                                            className="w-7 h-7 object-contain shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded bg-stone-800 flex items-center justify-center text-stone-500 shrink-0 text-xs border border-stone-700/50">
                                                            <FontAwesomeIcon icon={faAward} />
                                                        </div>
                                                    )}
                                                    <p className="text-white font-medium text-sm truncate">{rank.name}</p>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <button
                                                        onClick={() => openEdit(rank)}
                                                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors text-xs border border-stone-700/50"
                                                    >
                                                        <FontAwesomeIcon icon={faPen} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rank._id, rank.name)}
                                                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-800/80 text-stone-300 hover:text-white transition-colors text-xs border border-stone-700/50"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-stone-500 text-sm italic py-4 text-center">Brak skonfigurowanych rang organizacyjnych</p>
                        )}
                    </>
                )}
            </div>

            {/* MODAL FORMULARZA */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 border border-stone-800">
                        <h2 className="text-xl font-bold text-white mb-5">
                            {editRole ? 'Edytuj pozycję' : 'Tworzenie nowej pozycji'}
                        </h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div>
                                <label className="text-stone-300 text-sm mb-2 block font-medium">Typ wpisu</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('role')}
                                        className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                                            type === 'role'
                                                ? 'bg-emerald-950/60 border-emerald-700 text-white'
                                                : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-750'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faShieldHalved} className={type === 'role' ? 'text-emerald-500' : 'text-stone-500'} />
                                        <div>
                                            <p className="font-bold text-sm">Rola z uprawnieniami</p>
                                            <p className="text-xs text-stone-400 mt-0.5">Nadaje dostęp do paneli i akcji</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setType('rank')}
                                        className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                                            type === 'rank'
                                                ? 'bg-amber-950/60 border-amber-700 text-white'
                                                : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-750'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faAward} className={type === 'rank' ? 'text-amber-500' : 'text-stone-500'} />
                                        <div>
                                            <p className="font-bold text-sm">Ranga organizacyjna</p>
                                            <p className="text-xs text-stone-400 mt-0.5">Etykieta bez uprawnień systemowych</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-stone-300 text-sm mb-1 block font-medium">Nazwa</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={type === 'role' ? 'np. Administrator' : 'np. Staff Sergeant'}
                                    required
                                    className="w-full bg-stone-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-600 border border-stone-700"
                                />
                            </div>

                            <div>
                                <label className="text-stone-300 text-sm mb-2 block font-medium">Ikona</label>
                                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 bg-stone-800/80 p-3 rounded-lg border border-stone-700 max-h-40 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIcon(null)}
                                        className={`flex items-center justify-center p-2 rounded-lg border transition-all text-xs ${
                                            icon === null
                                                ? 'border-emerald-600 bg-emerald-900/40 text-white font-bold'
                                                : 'border-stone-700 hover:bg-stone-700 text-stone-400'
                                        }`}
                                    >
                                        Brak
                                    </button>
                                    {availableIconNames.map(iconName => (
                                        <button
                                            key={iconName}
                                            type="button"
                                            onClick={() => setIcon(iconName)}
                                            className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                                                icon === iconName
                                                    ? 'border-emerald-600 bg-emerald-900/40 scale-105'
                                                    : 'border-stone-700 hover:bg-stone-700'
                                            }`}
                                        >
                                            <img
                                                src={roleIconsMap[iconName]}
                                                alt={iconName}
                                                className="w-7 h-7 object-contain"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {type === 'role' && (
                                <div>
                                    <p className="text-stone-300 text-sm mb-4 font-medium">Uprawnienia systemowe</p>
                                    <div
                                        className="gap-x-8"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${permColumns.length}, 1fr)`,
                                        }}
                                    >
                                        {permColumns.map((col, colIdx) => (
                                            <div key={colIdx} className="flex flex-col gap-4">
                                                {col.map(key => (
                                                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={permissions[key] ?? false}
                                                            onChange={() => togglePerm(key)}
                                                            className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
                                                        />
                                                        <span className="text-stone-300 group-hover:text-white transition-colors text-sm leading-snug">
                                                            {PERMISSION_LABELS[key]}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors font-medium border border-stone-700/60"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50 border border-emerald-700/60"
                                >
                                    {saving ? 'Zapisz...' : editRole ? 'Zapisz zmiany' : 'Utwórz'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};