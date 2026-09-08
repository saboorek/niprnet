import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Permissions } from "../types/permissions";
import config from "../utils/config";

interface Character {
    _id: string;
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

    const refresh = async () => {
        const data = await fetch(`${config.URL}/auth/session`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

        if (data?.activeCharacter) {
            const ac = data.activeCharacter;
            setSelectedCharacter(prev => {
                if (JSON.stringify(prev?.permissions) !== JSON.stringify(ac.permissions)) {
                    return { ...ac, _id: ac._id ?? ac.id };
                }
                return prev;
            });
        } else {
            setSelectedCharacter(null);
        }
    };

    useEffect(() => {
        refresh().finally(() => setLoading(false));

        const interval = setInterval(refresh, 10_000);
        return () => clearInterval(interval);
    }, []);

    const handleSelectCharacter = async (char: Character) => {
        const res = await fetch(`${config.URL}/characters/select`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId: char._id }),
        });
        if (res.ok) {
            const data = await res.json();
            setSelectedCharacter({ ...data, _id: data._id ?? data.id });
        } else {
            setSelectedCharacter(char);
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
        setSelectedCharacter(prev => prev ? { ...prev, ...partial } : prev);
    };

    return (
        <CharacterContext.Provider value={{
            selectedCharacter,
            setSelectedCharacter: handleSelectCharacter,
            clearCharacter,
            updateCharacter,
            refreshPermissions: refresh,
            loading,
        }}>
            {children}
        </CharacterContext.Provider>
    );
};

export const useCharacter = () => {
    const ctx = useContext(CharacterContext);
    if (!ctx) throw new Error("useCharacter must be used within CharacterProvider");
    return ctx;
};