import { Schema, model, Document, Types } from 'mongoose';

export interface IAbsence extends Document {
    characterId: Types.ObjectId | string;
    startDate: Date;
    endDate: Date;
    reason?: string;
    createdBy?: Types.ObjectId | string;
}

const AbsenceSchema = new Schema<IAbsence>(
    {
        characterId: { type: Schema.Types.ObjectId, ref: 'Character', required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, default: '' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export const Absence = model<IAbsence>('Absence', AbsenceSchema);