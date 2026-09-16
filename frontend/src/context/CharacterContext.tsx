import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Permissions } from "../types/permissions";
import config from "../utils/config";

// Dodano opcjonalne pole 'id', aby TypeScript nie zgłaszał błędu TS2339
export interface Character {
    _id: string;
    id?: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: Permissions;
    avatarUrl?: string | null;
}

interface CharacterContextType {
    selectedCharacter: Character | null;
    setSelectedCharacter: (char: Character) => void;
    clearCharacter: () => void;
    updateCharacter: (partial: Partial<Character>) => void;
    refreshPermissions: () => Promise<void>;
    loading: boolean;
}

const CharacterContext = createContext<CharacterContextType | null>(null);

export const CharacterProvider = ({ children }: { children: ReactNode }) => {
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const isSelectingRef = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = async () => {
        if (isSelectingRef.current) return;

        try {
            const data = await fetch(`${config.URL}/auth/session`, { credentials: 'include' })
                .then(r => (r.ok ? r.json() : null))
                .catch(() => null);

            if (isSelectingRef.current) return;

            if (data?.activeCharacter) {
                const ac = data.activeCharacter;
                const charId = ac._id || ac.id;

                const normalizedChar: Character = {
                    ...ac,
                    _id: charId,
                    id: charId,
                };

                setSelectedCharacter(prev => {
                    if (!prev || JSON.stringify(prev) !== JSON.stringify(normalizedChar)) {
                        return normalizedChar;
                    }
                    return prev;
                });
            } else {
                setSelectedCharacter(null);
            }
        } catch (err) {
            console.error('[CharacterContext] Błąd odświeżania sesji:', err);
        }
    };

    useEffect(() => {
        refresh().finally(() => setLoading(false));

        const interval = setInterval(refresh, 10_000);
        return () => {
            clearInterval(interval);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleSelectCharacter = async (char: Character) => {
        isSelectingRef.current = true;
        try {
            setSelectedCharacter(char);

            const charId = char._id || char.id;
            const res = await fetch(`${config.URL}/characters/select`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: charId }),
            });

            if (res.ok) {
                const data = await res.json();
                const fetchedId = data._id || data.id;
                setSelectedCharacter({
                    ...data,
                    _id: fetchedId,
                    id: fetchedId,
                });
            }
        } catch (err) {
            console.error('[CharacterContext] Błąd podczas wyboru postaci:', err);
        } finally {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                isSelectingRef.current = false;
            }, 1000);
        }
    };

    const clearCharacter = () => {
        fetch(`${config.URL}/characters/select`, {
            method: 'DELETE',
            credentials: 'include',
        }).catch(() => {});
        setSelectedCharacter(null);
    };

    const updateCharacter = (partial: Partial<Character>) => {
        setSelectedCharacter(prev => (prev ? { ...prev, ...partial } : prev));
    };

    return (
        <CharacterContext.Provider
            value={{
                selectedCharacter,
                setSelectedCharacter: handleSelectCharacter,
                clearCharacter,
                updateCharacter,
                refreshPermissions: refresh,
                loading,
            }}
        >
            {children}
        </CharacterContext.Provider>
    );
};

export const useCharacter = () => {
    const ctx = useContext(CharacterContext);
    if (!ctx) throw new Error("useCharacter must be used within CharacterProvider");
    return ctx;
};