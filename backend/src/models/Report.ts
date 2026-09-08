import { Schema, model, Document, Model } from 'mongoose';

export interface IReport extends Document {
    reportNumber?: string;
    title: string;
    type: 'Incident Report';
    authorId: Schema.Types.ObjectId;
    description: string;
    createdAt: Date;
}

const reportSchema = new Schema<IReport>({
    reportNumber: { type: String, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['Incident Report'], default: 'Incident Report' },
    authorId: {
        type: Schema.Types.ObjectId,
        ref: 'Character',
        required: true
    },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

reportSchema.pre<IReport>('save', async function () {
    if (!this.isNew) return;

    const year = new Date().getFullYear();
    const prefix = 'IR';

    const ReportModel = model<IReport>('Report');

    const lastReport = await ReportModel.findOne({
        reportNumber: new RegExp(`^${prefix}-${year}-`)
    }).sort({ createdAt: -1 });

    let sequence = 1;
    if (lastReport && lastReport.reportNumber) {
        const parts = lastReport.reportNumber.split('-');
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    const formattedSeq = String(sequence).padStart(3, '0');
    this.reportNumber = `${prefix}-${year}-${formattedSeq}`;
});

export const Report: Model<IReport> = model<IReport>('Report', reportSchema);