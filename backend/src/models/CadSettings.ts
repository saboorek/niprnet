import { Schema, model, Document } from 'mongoose';

export interface ICadStatus extends Document {
    name: string;
    color?: string;
}

export interface ICadUnitType extends Document {
    name: string;
}

const CadStatusSchema = new Schema<ICadStatus>(
    {
        name: { type: String, required: true, unique: true },
        color: { type: String, default: '#3B82F6' }
    },
    { timestamps: true }
);

const CadUnitTypeSchema = new Schema<ICadUnitType>(
    {
        name: { type: String, required: true, unique: true }
    },
    { timestamps: true }
);

export const CadStatus = model<ICadStatus>('CadStatus', CadStatusSchema);
export const CadUnitType = model<ICadUnitType>('CadUnitType', CadUnitTypeSchema);