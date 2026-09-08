import { Schema, model, Document } from 'mongoose';

export interface IStructureElement {
    _id?: string;
    name: string;
    commanderId?: string | null;
    deputyCommanderId?: string | null;
}

export interface IStructureSection {
    _id?: string;
    name: string;
    commanderId?: string | null;
    deputyCommanderId?: string | null;
    elements: IStructureElement[];
}

export interface IStructureSquadron extends Document {
    name: string;
    commanderId?: string | null;
    deputyCommanderId?: string | null;
    sections: IStructureSection[];
}

const ElementSchema = new Schema<IStructureElement>({
    name: { type: String, required: true },
    commanderId: { type: String, default: null },
    deputyCommanderId: { type: String, default: null },
});

const SectionSchema = new Schema<IStructureSection>({
    name: { type: String, required: true },
    commanderId: { type: String, default: null },
    deputyCommanderId: { type: String, default: null },
    elements: [ElementSchema],
});

const SquadronSchema = new Schema<IStructureSquadron>({
    name: { type: String, required: true, unique: true },
    commanderId: { type: String, default: null },
    deputyCommanderId: { type: String, default: null },
    sections: [SectionSchema],
}, { timestamps: true });

export const Structure = model<IStructureSquadron>('Structure', SquadronSchema);