import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacter extends Document {
    discordId: string;
    discordUsername?: string;
    discordAvatarHash?: string | null;
    firstName: string;
    lastName: string;
    roles: mongoose.Types.ObjectId[];
    avatarUrl?: string;
    createdAt: Date;
}

const CharacterSchema = new Schema<ICharacter>({
    discordId: { type: String, required: true, index: true },
    discordUsername: { type: String, default: null },
    discordAvatarHash: { type: String, default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    avatarUrl: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});

export const Character = mongoose.model<ICharacter>('Character', CharacterSchema);