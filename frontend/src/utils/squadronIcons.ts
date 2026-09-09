const patchModules = import.meta.glob<{ default: string }>('../assets/patches/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
});

export const squadronIconsMap: Record<string, string> = {};

Object.entries(patchModules).forEach(([path, module]) => {
    const fileName = path.split('/').pop();
    if (fileName) {
        squadronIconsMap[fileName] = module.default;
    }
});

export const availableSquadronIconNames = Object.keys(squadronIconsMap);