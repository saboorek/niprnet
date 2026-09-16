import { Schema, model, Document } from 'mongoose';

export type LegalCodeType = 'PC' | 'VC' | 'UCMJ';

export interface ILegalCode extends Document {
    codeType: LegalCodeType;
    code: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

const legalCodeSchema = new Schema<ILegalCode>(
    {
        codeType: {
            type: String,
            enum: ['PC', 'VC', 'UCMJ'],
            required: true,
            index: true
        },
        code: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

// Indeks złożony zapobiegający dublowaniu tego samego kodu w ramach jednego kodeksu
legalCodeSchema.index({ codeType: 1, code: 1 }, { unique: true });

export const LegalCode = model<ILegalCode>('LegalCode', legalCodeSchema);