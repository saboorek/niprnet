import { useState, useEffect } from 'react';
import { useCharacter } from '../../context/CharacterContext';
import config from '../../utils/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser, faCheck } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import type { Permissions } from '../../types/permissions';

interface Character {
    _id: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: Permissions;
    avatarUrl?: string | null;
}

export const CharacterSelectModal = () => {
    const { setSelectedCharacter } = useCharacter();

    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`${config.URL}/characters`, { credentials: 'include' })
            .then(r => r.json())
            .then((data: Character[]) => {
                setCharacters(data);
                setLoading(false);
                if (data.length === 0) setShowForm(true);
            })
            .catch(() => {
                setError('Nie można załadować postaci');
                setLoading(false);
            });
    }, []);

    const handleAddCharacter = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${config.URL}/characters`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName }),
            });
            if (!res.ok) throw new Error();
            const newChar: Character = await res.json();
            setCharacters(prev => [...prev, newChar]);
            setFirstName('');
            setLastName('');
            setShowForm(false);
            toast.success(`Postać ${newChar.firstName} ${newChar.lastName} została utworzona`);
        } catch {
            setError('Nie udało się dodać postaci');
            toast.error('Nie udało się dodać postaci');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-120 max-h-[80vh] flex flex-col p-6">
                <h2 className="text-2xl font-bold text-white mb-1">Wybierz postać</h2>
                <p className="text-gray-400 text-sm mb-5">
                    Musisz wybrać postać, aby kontynuować.
                </p>

                {loading && (
                    <p className="text-gray-400 text-center py-8">Ładowanie postaci...</p>
                )}

                {error && (
                    <p className="text-red-400 text-center py-4">{error}</p>
                )}

                {/* Lista postaci */}
                {!loading && !showForm && characters.length > 0 && (
                    <div className="flex flex-col gap-3 overflow-y-auto mb-4">
                        {characters.map(char => (
                            <button
                                key={char._id}
                                onClick={() => setSelectedCharacter(char)}
                                className="flex items-center gap-4 bg-gray-800 hover:bg-blue-700 transition-colors rounded-lg p-4 text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                                    {char.avatarUrl ? (
                                        <img src={char.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faUser} className="text-white" />
                                    )}
                                </div>
                                <span className="text-white font-semibold text-lg">
                                    {char.firstName} {char.lastName}
                                </span>
                                <FontAwesomeIcon
                                    icon={faCheck}
                                    className="ml-auto text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* Formularz dodania postaci */}
                {!loading && showForm && (
                    <form onSubmit={handleAddCharacter} className="flex flex-col gap-4">
                        <div>
                            <label className="text-gray-300 text-sm mb-1 block">Imię</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                placeholder="np. Jan"
                                required
                                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-gray-300 text-sm mb-1 block">Nazwisko</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                placeholder="np. Kowalski"
                                required
                                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-3 mt-2">
                            {characters.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                                >
                                    Anuluj
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Dodawanie...' : 'Dodaj postać'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Przycisk "Dodaj nową" gdy są już postacie */}
                {!loading && !showForm && characters.length > 0 && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-2 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Dodaj nową postać
                    </button>
                )}
            </div>
        </div>
    );
};