import { useEffect, useState } from 'react';
import config from '../utils/config';

interface ActiveCharacter {
    id: string;
    firstName: string;
    lastName: string;
    roles: string[];
}

interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    global_name: string | null;
}

interface SessionState {
    loading: boolean;
    isAuth: boolean;
    authorized: boolean;
    activeCharacter: ActiveCharacter | null;
    user: DiscordUser | null;
}

export const useSession = (): SessionState => {
    const [state, setState] = useState<SessionState>({
        loading: true,
        isAuth: false,
        authorized: false,
        activeCharacter: null,
        user: null,
    });

    useEffect(() => {
        fetch(`${config.URL}/auth/session`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data) {
                    setState({ loading: false, isAuth: false, authorized: false, activeCharacter: null, user: null });
                    return;
                }
                setState({
                    loading: false,
                    isAuth: data.isAuthenticated,
                    authorized: data.authorized,
                    activeCharacter: data.activeCharacter ?? null,
                    user: data.user ?? null,
                });
            })
            .catch(() => setState({ loading: false, isAuth: false, authorized: false, activeCharacter: null, user: null }));
    }, []);

    return state;
};