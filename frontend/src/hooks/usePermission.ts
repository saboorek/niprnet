import type { Permissions } from '../types/permissions';
import { useCharacter } from '../context/CharacterContext';

export const usePermission = (permission: keyof Permissions): boolean => {
    const { selectedCharacter } = useCharacter();
    return selectedCharacter?.permissions?.[permission] ?? false;
};