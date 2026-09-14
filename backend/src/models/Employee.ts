import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeNote {
    _id?: string;
    type?: 'note' | 'reprimand' | 'praise' | 'promotion';
    content: string;
    author: string;
    createdAt?: Date;
}

export interface IEmployeeQualification {
    _id?: string;
    name: string;
    description?: string;
    obtainedAt?: Date;
    issuedBy?: string;
}

export interface IEmployee extends Document {
    characterId: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    doDId: string;
    rank: string;
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    phone: string;
    notes: IEmployeeNote[];
    ribbons: string[];
    qualifications: IEmployeeQualification[];
    squadronId?: mongoose.Types.ObjectId;
    sectionId?: mongoose.Types.ObjectId;
    elementId?: mongoose.Types.ObjectId;
}

const EmployeeNoteSchema = new Schema<IEmployeeNote>({
    type: { type: String, enum: ['note', 'reprimand', 'praise', 'promotion'], default: 'note' },
    content: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const EmployeeQualificationSchema = new Schema<IEmployeeQualification>({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    obtainedAt: { type: Date, default: Date.now },
    issuedBy: { type: String, default: '' },
});

const EmployeeSchema = new Schema<IEmployee>({
    characterId: { type: Schema.Types.ObjectId, ref: 'Character', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    doDId: { type: String, required: true },
    rank: { type: String, default: 'Private' },
    status: { type: String, enum: ['active', 'on_leave', 'suspended', 'terminated'], default: 'active' },
    phone: { type: String, default: '' },
    notes: { type: [EmployeeNoteSchema], default: [] },
    ribbons: { type: [String], default: [] },
    qualifications: { type: [EmployeeQualificationSchema], default: [] },
    squadronId: { type: Schema.Types.ObjectId, ref: 'Squadron', default: null },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    elementId: { type: Schema.Types.ObjectId, ref: 'Element', default: null },
}, { timestamps: true });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);