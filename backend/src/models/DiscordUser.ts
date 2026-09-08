import mongoose, { Schema, Document } from 'mongoose';
import type { IPermissions } from './Role';

export interface IDiscordUser extends Document {
    discordId: string;
    permissions: IPermissions;
}

const DiscordUserSchema: Schema = new Schema<IDiscordUser>({
    discordId: { type: String, required: true, unique: true, index: true },
    permissions: {
        hasAdminAccess: { type: Boolean, default: false },
        canManagePermission: { type: Boolean, default: false },
        hasStatisticAccess: { type: Boolean, default: false },
        canEditCharacter: { type: Boolean, default: false },
        hasBusinessesAccess: { type: Boolean, default: false },
        canAddBusiness: { type: Boolean, default: false },
        canEditBusiness: { type: Boolean, default: false },
        canDeleteBusiness: { type: Boolean, default: false },
        canAddBusinessReport: { type: Boolean, default: false },
        canAddBusinessCitation: { type: Boolean, default: false },
        canAddBusinessNotes: { type: Boolean, default: false },
    },
});

export const DiscordUser = mongoose.model<IDiscordUser>('DiscordUser', DiscordUserSchema);