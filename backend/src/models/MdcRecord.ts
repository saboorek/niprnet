import { Schema, model, Document, Types } from 'mongoose';

export type MdcRecordType = 'Ostrzeżenie' | 'Cytacja' | 'Areszt' | 'Notatka';

export interface IMdcRecord extends Document {
    characterId: Types.ObjectId;
    type: MdcRecordType;
    description: string;
    amount?: number;
    createdBy: string;
    createdAt: Date;
}

const mdcRecordSchema = new Schema<IMdcRecord>(
    {
        characterId: { type: Schema.Types.ObjectId, ref: 'Character', required: true, index: true },
        type: {
            type: String,
            enum: ['Ostrzeżenie', 'Cytacja', 'Areszt', 'Notatka'],
            required: true
        },
        description: { type: String, required: true },
        amount: { type: Number, required: false },
        createdBy: { type: String, required: true, default: 'System' },
    },
    { timestamps: true }
);

export const MdcRecord = model<IMdcRecord>('MdcRecord', mdcRecordSchema);