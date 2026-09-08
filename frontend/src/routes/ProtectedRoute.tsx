import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useCharacter } from '../context/CharacterContext';
import { CharacterSelectModal } from '../components/ui/CharacterSelectModal';

export const ProtectedRoute = () => {
    const { loading, isAuth, authorized } = useSession();
    const { selectedCharacter } = useCharacter();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-white">
                Ładowanie...
            </div>
        );
    }

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    if (!authorized) {
        return <Navigate to="/no-auth" replace />;
    }

    return (
        <>
            {!selectedCharacter && <CharacterSelectModal />}
            <Outlet />
        </>
    );
};