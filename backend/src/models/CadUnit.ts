import { Schema, model, Document, Types } from 'mongoose';

export interface ICadUnitMember {
    characterId: Types.ObjectId | string;
    firstName: string;
    lastName: string;
}

export interface ICadUnit extends Document {
    callsign: string;
    unitType: string;
    status: string;
    createdBy?: Types.ObjectId | string;
    members: ICadUnitMember[];
}

const CadUnitSchema = new Schema<ICadUnit>(
    {
        callsign: { type: String, required: true },
        unitType: { type: String, required: true },
        status: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        members: [
            {
                characterId: { type: Schema.Types.ObjectId, ref: 'Character', required: true },
                firstName: { type: String, required: true },
                lastName: { type: String, required: true },
            },
        ],
    },
    { timestamps: true }
);

export const CadUnit = model<ICadUnit>('CadUnit', CadUnitSchema);