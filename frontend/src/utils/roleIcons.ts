const iconModules = import.meta.glob<{ default: string }>('../assets/icons/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
});

export const roleIconsMap: Record<string, string> = {};

Object.entries(iconModules).forEach(([path, module]) => {
    const fileName = path.split('/').pop();
    if (fileName) {
        roleIconsMap[fileName] = module.default;
    }
});

export const availableIconNames = Object.keys(roleIconsMap);