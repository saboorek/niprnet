import { Schema, model, Document } from 'mongoose';

export interface IDbidsEntry extends Document {
    passNumber: string;
    passType: 'CAC' | 'VCC';
    holderName: string;
    rankOrStatus: string;
    issueDate: Date;
    expirationDate?: Date | null;
    status: 'active' | 'expired' | 'revoked';
    issuedBy?: string;
    notes?: string;
}

const DbidsSchema = new Schema<IDbidsEntry>(
    {
        passNumber: { type: String, required: true, unique: true, trim: true },
        passType: { type: String, enum: ['CAC', 'VCC'], required: true },
        holderName: { type: String, required: true, trim: true },
        rankOrStatus: { type: String, required: true, trim: true },
        issueDate: { type: Date, default: Date.now },
        expirationDate: { type: Date, default: null },
        status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
        issuedBy: { type: String, default: null },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

export const Dbids = model<IDbidsEntry>('Dbids', DbidsSchema);