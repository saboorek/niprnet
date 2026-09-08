import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import config from '../../utils/config';
import { useCharacter } from '../../context/CharacterContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPlus, faXmark, faChevronDown, faChevronUp, faPen, faCheck } from '@fortawesome/free-solid-svg-icons';

interface Role {
    _id: string;
    name: string;
}

interface Character {
    _id: string;
    firstName: string;
    lastName: string;
    discordId: string;
    discordUsername?: string | null;
    discordAvatarHash?: string | null;
    roles: Role[];
    avatarUrl?: string | null;
}

interface DiscordGroup {
    discordId: string;
    discordUsername?: string | null;
    discordAvatarHash?: string | null;
    characters: Character[];
}

function getDiscordAvatarUrl(discordId: string, avatarHash?: string | null): string {
    if (avatarHash) {
        const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}`;
    }
    try {
        const index = Number(BigInt(discordId) >> 22n) % 6;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
        return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
}

export const CharactersPage = () => {
    const { refreshPermissions } = useCharacter();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDiscordId, setExpandedDiscordId] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');

    const fetchData = async () => {
        try {
            const [charsRes, rolesRes] = await Promise.all([
                fetch(`${config.URL}/characters/all`, { credentials: 'include' }),
                fetch(`${config.URL}/roles`, { credentials: 'include' }),
            ]);
            setCharacters(await charsRes.json());
            setRoles(await rolesRes.json());
        } catch {
            toast.error('Nie można załadować danych');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const discordGroups: DiscordGroup[] = Object.values(
        characters.reduce<Record<string, DiscordGroup>>((acc, char) => {
            if (!acc[char.discordId]) {
                acc[char.discordId] = {
                    discordId: char.discordId,
                    discordUsername: char.discordUsername,
                    discordAvatarHash: char.discordAvatarHash,
                    characters: [],
                };
            }
            acc[char.discordId].characters.push(char);
            return acc;
        }, {})
    );

    const handleAssign = async (characterId: string) => {
        if (!selectedRoleId) return;
        const res = await fetch(`${config.URL}/roles/assign`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId, roleId: selectedRoleId }),
        });
        if (res.ok) {
            toast.success('Rola została przypisana');
            await refreshPermissions();
        } else {
            toast.error('Nie udało się przypisać roli');
        }
        setAssigningId(null);
        setSelectedRoleId('');
        await fetchData();
    };

    const handleRevoke = async (characterId: string, roleId: string, roleName: string) => {
        if (!confirm(`Czy na pewno chcesz odebrać rolę "${roleName}"?`)) return;
        const res = await fetch(`${config.URL}/roles/revoke`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId, roleId }),
        });
        if (res.ok) {
            toast.success(`Rola "${roleName}" została odebrana`);
            await refreshPermissions();
        } else {
            toast.error('Nie udało się odebrać roli');
        }
        await fetchData();
    };

    const handleEditName = async (characterId: string) => {
        if (!editFirstName.trim() || !editLastName.trim()) {
            toast.error('Imię i nazwisko są wymagane');
            return;
        }
        const res = await fetch(`${config.URL}/characters/${characterId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                avatarUrl: editAvatarUrl.trim() || null,
            }),
        });
        if (res.ok) {
            toast.success('Dane postaci zostały zaktualizowane');
            setEditingId(null);
            await fetchData();
        } else {
            toast.error('Nie udało się zaktualizować postaci');
        }
    };

    const openEditName = (char: Character) => {
        setEditingId(char._id);
        setEditFirstName(char.firstName);
        setEditLastName(char.lastName);
        setEditAvatarUrl(char.avatarUrl ?? '');
    };

    const toggleExpand = (discordId: string) => {
        setExpandedDiscordId(prev => prev === discordId ? null : discordId);
        setAssigningId(null);
        setEditingId(null);
    };

    if (loading) return <p className="text-gray-400 text-center py-12">Ładowanie...</p>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Zarządzanie postaciami</h1>
                <span className="text-gray-400 text-sm">{discordGroups.length} użytkowników · {characters.length} postaci</span>
            </div>

            <div className="flex flex-col gap-3">
                {discordGroups.map(group => {
                    const isExpanded = expandedDiscordId === group.discordId;
                    const avatarUrl = getDiscordAvatarUrl(group.discordId, group.discordAvatarHash);

                    return (
                        <div key={group.discordId} className="bg-gray-900 rounded-xl overflow-hidden">
                            <button
                                onClick={() => toggleExpand(group.discordId)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-800 flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                            src={avatarUrl}
                                            alt="discord avatar"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-semibold">
                                            {group.discordUsername ?? 'Nieznany użytkownik'}
                                        </p>
                                        <p className="text-gray-500 text-xs font-mono">{group.discordId}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                                        {group.characters.length} {group.characters.length === 1 ? 'postać' : 'postacie'}
                                    </span>
                                    <FontAwesomeIcon
                                        icon={isExpanded ? faChevronUp : faChevronDown}
                                        className="text-gray-400 text-sm shrink-0"
                                    />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
                                    {group.characters.map(char => {
                                        const isAssigning = assigningId === char._id;
                                        const isEditing = editingId === char._id;
                                        const availableRoles = roles.filter(r => !char.roles.some(cr => cr._id === r._id));

                                        return (
                                            <div key={char._id} className="px-5 py-4 flex flex-col gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {char.avatarUrl ? (
                                                            <img src={char.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FontAwesomeIcon icon={faUser} className="text-white text-xs" />
                                                        )}
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="flex-1 flex flex-col gap-2">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={editFirstName}
                                                                    onChange={e => setEditFirstName(e.target.value)}
                                                                    placeholder="Imię"
                                                                    className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-600 text-sm"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={editLastName}
                                                                    onChange={e => setEditLastName(e.target.value)}
                                                                    placeholder="Nazwisko"
                                                                    className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-600 text-sm"
                                                                />
                                                            </div>
                                                            <input
                                                                type="url"
                                                                value={editAvatarUrl}
                                                                onChange={e => setEditAvatarUrl(e.target.value)}
                                                                placeholder="URL avatara (opcjonalne)"
                                                                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-600 text-sm"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleEditName(char._id)}
                                                                    className="bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                                                                >
                                                                    <FontAwesomeIcon icon={faCheck} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                                                >
                                                                    <FontAwesomeIcon icon={faXmark} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex items-center gap-3">
                                                            <span className="text-white font-medium">{char.firstName} {char.lastName}</span>
                                                            <button
                                                                onClick={() => openEditName(char)}
                                                                className="text-gray-500 hover:text-white transition-colors"
                                                            >
                                                                <FontAwesomeIcon icon={faPen} className="text-xs" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {!isEditing && (
                                                    <div className="pl-11">
                                                        {char.roles.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {char.roles.map(role => (
                                                                    <div key={role._id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                                                                        <span className="text-white text-xs">{role.name}</span>
                                                                        <button
                                                                            onClick={() => handleRevoke(char._id, role._id, role.name)}
                                                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                                                        >
                                                                            <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {isAssigning ? (
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={selectedRoleId}
                                                                    onChange={e => setSelectedRoleId(e.target.value)}
                                                                    className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-600 text-sm"
                                                                >
                                                                    <option value="">Wybierz rolę...</option>
                                                                    {availableRoles.map(role => (
                                                                        <option key={role._id} value={role._id}>{role.name}</option>
                                                                    ))}
                                                                </select>
                                                                <button
                                                                    onClick={() => handleAssign(char._id)}
                                                                    disabled={!selectedRoleId}
                                                                    className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                                                                >
                                                                    Przypisz
                                                                </button>
                                                                <button
                                                                    onClick={() => { setAssigningId(null); setSelectedRoleId(''); }}
                                                                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                                                                >
                                                                    <FontAwesomeIcon icon={faXmark} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setAssigningId(char._id); setSelectedRoleId(''); }}
                                                                disabled={availableRoles.length === 0}
                                                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                <FontAwesomeIcon icon={faPlus} />
                                                                {availableRoles.length === 0 ? 'Wszystkie role przypisane' : 'Przypisz rolę'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {discordGroups.length === 0 && (
                    <p className="text-gray-400 text-center py-12">Brak postaci w bazie</p>
                )}
            </div>
        </div>
    );
};