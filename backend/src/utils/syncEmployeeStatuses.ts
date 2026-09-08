import { Employee } from '../models/Employee';
import { Absence } from '../models/Absence';

export const syncEmployeeStatuses = async (): Promise<void> => {
    try {
        const now = new Date();

        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const activeAbsences = await Absence.find({
            startDate: { $lte: endOfToday },
            endDate: { $gte: startOfToday },
        });

        const activeAbsentCharacterIds = activeAbsences.map(abs => abs.characterId);

        const leaveResult = await Employee.updateMany(
            {
                characterId: { $in: activeAbsentCharacterIds },
                status: 'active',
            },
            {
                $set: { status: 'on_leave' },
            }
        );

        const activeResult = await Employee.updateMany(
            {
                characterId: { $nin: activeAbsentCharacterIds },
                status: 'on_leave',
            },
            {
                $set: { status: 'active' },
            }
        );

        if (leaveResult.modifiedCount > 0 || activeResult.modifiedCount > 0) {
            console.log(
                `🔄 [SYNC] Zaktualizowano statusy: ${leaveResult.modifiedCount} -> urlop, ${activeResult.modifiedCount} -> aktywny.`
            );
        }
    } catch (error) {
        console.error('❌ [SYNC] Błąd podczas synchronizacji statusów pracowników:', error);
    }
};