// Automatyczne załadowanie wszystkich baretek z folderu assets/ribbons
const ribbonFiles = import.meta.glob<{ default: string }>('../assets/ribbons/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
});

export const ribbonsMap: Record<string, string> = {};

for (const path in ribbonFiles) {
    // Wyciągamy samą nazwę pliku jako klucz (np. "air-force-achievement")
    const fileName = path.split('/').pop()?.split('.')[0] || '';
    if (fileName) {
        ribbonsMap[fileName] = ribbonFiles[path].default;
    }
}

export const availableRibbonNames = Object.keys(ribbonsMap);