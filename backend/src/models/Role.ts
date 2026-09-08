import mongoose, { Schema, Document } from "mongoose";

export type RoleType = 'role' | 'rank';

export interface IPermissions {
    // === Administracja ===
    hasAdminAccess: boolean;
    canManagePermission: boolean;
    hasStatisticAccess: boolean;

    // === HR ===
    hasHumanResourcesAccess: boolean;
    hasEmployeeAccess: boolean;
    hasStructureAccess: boolean;
    hasAbsenceAccess: boolean;
    canEditCharacter: boolean;
    canEditRibbons: boolean;
    canAddAbsence: boolean;
    canRemoveAbsence: boolean;
    canAddReprimands: boolean;
    canRemoveReprimands: boolean;
    canAddPraises: boolean;
    canRemovePraises: boolean;
    canAddPromotions: boolean;
    canRemovePromotions: boolean;
    canAddDemotes: boolean;
    canRemoveDemotes: boolean;
    canAddStructure: boolean;
    canRemoveStructure: boolean;
    canEditStructure: boolean;

    // === SFS ===
    hasSecurityForcesAccess: boolean;
    hasReportAccess: boolean;
    hasFleetAccess: boolean;
    hasDBIDSAccess: boolean;
    canAddPass: boolean;
    canRemovePass: boolean;
    canAddReport: boolean;
    canRemoveReport: boolean;
}

export interface IRole extends Document {
    name: string;
    type: RoleType;
    icon?: string | null;
    permissions: IPermissions;
    createdAt: Date;
}

const PermissionsSchema = new Schema<IPermissions>({
    hasAdminAccess: { type: Boolean, default: false },
    hasStatisticAccess: { type: Boolean, default: false },
    canManagePermission: { type: Boolean, default: false },
    hasHumanResourcesAccess: { type: Boolean, default: false },
    hasEmployeeAccess: { type: Boolean, default: false },
    hasStructureAccess: { type: Boolean, default: false },
    hasAbsenceAccess: { type: Boolean, default: false },
    canEditCharacter: { type: Boolean, default: false },
    canEditRibbons: { type: Boolean, default: false },
    canAddAbsence: { type: Boolean, default: false },
    canRemoveAbsence: { type: Boolean, default: false },
    canAddReprimands: { type: Boolean, default: false },
    canRemoveReprimands: { type: Boolean, default: false },
    canAddPraises: { type: Boolean, default: false },
    canRemovePraises: { type: Boolean, default: false },
    canAddPromotions: { type: Boolean, default: false },
    canRemovePromotions: { type: Boolean, default: false },
    canAddDemotes: { type: Boolean, default: false },
    canRemoveDemotes: { type: Boolean, default: false },
    hasSecurityForcesAccess: { type: Boolean, default: false },
    hasReportAccess: { type: Boolean, default: false },
    hasFleetAccess: { type: Boolean, default: false },
    hasDBIDSAccess: { type: Boolean, default: false },
    canAddPass: { type: Boolean, default: false },
    canRemovePass: { type: Boolean, default: false },
    canAddReport: { type: Boolean, default: false },
    canRemoveReport: { type: Boolean, default: false },
}, { _id: false });

const RoleSchema = new Schema<IRole>({
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['role', 'rank'], default: 'role' },
    icon: { type: String, default: null },
    permissions: { type: PermissionsSchema, default: () => ({}) },
    createdAt: { type: Date, default: Date.now },
});

export const Role = mongoose.model<IRole>("Role", RoleSchema);