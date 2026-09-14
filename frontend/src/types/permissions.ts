export interface Permissions {
    // ADMINISTRACJA
    hasAdminAccess: boolean;
    canManagePermission: boolean;
    hasStatisticAccess: boolean;
    canManageCharacter: boolean;

    //HR
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

    //SFS
    hasSecurityForcesAccess: boolean;
    hasReportAccess: boolean;
    hasFleetAccess: boolean;
    hasDBIDSAccess: boolean;
    hasMDTAccess: boolean;
    canAddPass: boolean;
    canRemovePass: boolean;
    canAddReport: boolean;
    canRemoveReport: boolean;

}

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
    hasAdminAccess: 'Dostęp do panelu administratora',
    canManagePermission: 'Zarządzanie uprawnieniami',
    hasStatisticAccess: 'Dostęp do widoku statystyk',
    canManageCharacter: 'Edycja postaci',
    hasHumanResourcesAccess: 'Dostęp do działu HR',
    hasEmployeeAccess: 'Dostęp do widoku pracowników',
    hasStructureAccess: 'Dostęp do widoku struktury',
    hasAbsenceAccess: 'Dostęp do widoku nieobecności',
    canEditCharacter: 'Edycja postaci',
    canEditRibbons: 'Edycja wstążek',
    canAddAbsence: 'Dodawanie nieobecności',
    canRemoveAbsence: 'Usuwanie nieobecności',
    canAddReprimands: 'Dodawanie nagan',
    canRemoveReprimands: 'Usuwanie nagan',
    canAddPraises: 'Dodawanie pochwał',
    canRemovePraises: 'Usuwanie pochwał',
    canAddPromotions: 'Dodawanie awansów',
    canRemovePromotions: 'Usuwanie awansów',
    hasSecurityForcesAccess: 'Dostęp do działu SFS',
    hasReportAccess: 'Dostęp do raportów',
    hasMDTAccess: 'Dostęp do MDT',
    hasFleetAccess: 'Dostęp do floty',
    hasDBIDSAccess: 'Dostęp do DBIDS',
    canAddPass: 'Dodawanie przepustek',
    canRemovePass: 'Usuwanie przepustek',
    canAddReport: 'Dodawanie raportów',
    canRemoveReport: 'Usuwanie raportów',
    canAddDemotes: 'Dodawanie degradacji',
    canRemoveDemotes: 'Usuwanie degradacji',
    canAddStructure: 'Dodawanie struktury',
    canRemoveStructure: 'Usuwanie struktury',
    canEditStructure: 'Edycja struktury',
};

export const emptyPermissions = (): Permissions =>
    Object.fromEntries(
        Object.keys(PERMISSION_LABELS).map(k => [k, false])
    ) as unknown as Permissions;