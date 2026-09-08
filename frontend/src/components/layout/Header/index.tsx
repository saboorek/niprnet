import { useState, useRef, useEffect } from 'react';
import { useCharacter } from '../../../context/CharacterContext.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRightFromBracket, faArrowRightArrowLeft, faChevronDown, faBars, faXmark, faGear } from '@fortawesome/free-solid-svg-icons';
import config from '../../../utils/config.ts';
import { toast } from 'sonner';

interface Props {
    onToggleSidebar: () => void;
    isOpen: boolean;
}

export const Header = ({ onToggleSidebar, isOpen }: Props) => {
    const { selectedCharacter, clearCharacter, updateCharacter } = useCharacter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        await fetch(`${config.URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        clearCharacter();
        toast.success('Wylogowano pomyślnie');
        window.location.href = '/login';
    };

    const handleChangeCharacter = () => {
        setMenuOpen(false);
        clearCharacter();
        toast.info('Wybierz postać aby kontynuować');
    };

    const openSettings = () => {
        setMenuOpen(false);
        setAvatarUrl(selectedCharacter?.avatarUrl ?? '');
        setSettingsOpen(true);
    };

    const handleSaveAvatar = async () => {
        if (!selectedCharacter) return;
        setSaving(true);
        try {
            const res = await fetch(`${config.URL}/characters/${selectedCharacter._id}/avatar`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatarUrl }),
            });

            if (res.ok) {
                updateCharacter({ avatarUrl });
                toast.success('Avatar postaci został zaktualizowany');
                setSettingsOpen(false);
            } else {
                toast.error('Nie udało się zaktualizować avatara');
            }
        } catch {
            toast.error('Błąd serwera');
        } finally {
            setSaving(false);
        }
    };

    const currentAvatar = selectedCharacter?.avatarUrl;

    return (
        <>
            <header className="h-16 bg-gray-800 border-b border-gray-700/50 flex items-center justify-between px-6 shrink-0">
                <button
                    onClick={onToggleSidebar}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
                >
                    <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="text-lg" />
                </button>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(prev => !prev)}
                        className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 transition-colors px-4 py-2 rounded-lg"
                    >
                        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center overflow-hidden shrink-0">
                            {currentAvatar ? (
                                <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <FontAwesomeIcon icon={faUser} className="text-white text-sm" />
                            )}
                        </div>
                        <span className="text-white font-semibold text-sm">
                            {selectedCharacter
                                ? `${selectedCharacter.firstName} ${selectedCharacter.lastName}`
                                : 'Brak postaci'
                            }
                        </span>
                        <FontAwesomeIcon
                            icon={faChevronDown}
                            className={`text-gray-400 text-xs transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                            <button
                                onClick={openSettings}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faGear} className="w-4" />
                                Ustawienia postaci
                            </button>
                            <div className="border-t border-gray-700" />
                            <button
                                onClick={handleChangeCharacter}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faArrowRightArrowLeft} className="w-4" />
                                Zmień postać
                            </button>
                            <div className="border-t border-gray-700" />
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                            >
                                <FontAwesomeIcon icon={faRightFromBracket} className="w-4" />
                                Wyloguj
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {settingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-xl shadow-2xl w-96 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-white">Ustawienia postaci</h2>
                            <button
                                onClick={() => setSettingsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <div className="flex justify-center mb-5">
                            <div className="w-20 h-20 rounded-full bg-orange-600 flex items-center justify-center overflow-hidden">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="podgląd"
                                        className="w-full h-full object-cover"
                                        onError={e => (e.currentTarget.style.display = 'none')}
                                    />
                                ) : (
                                    <FontAwesomeIcon icon={faUser} className="text-white text-3xl" />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-gray-300 text-sm mb-1 block">URL avatara</label>
                                <input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={e => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.png"
                                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-600 text-sm"
                                />
                                <p className="text-gray-500 text-xs mt-1">Zostaw puste aby usunąć avatar</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSettingsOpen(false)}
                                    className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleSaveAvatar}
                                    disabled={saving}
                                    className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-50 text-sm"
                                >
                                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};