// Automatyczne załadowanie wszystkich baretek z folderu assets/ribbons
const ribbonFiles = import.meta.glob<{ default: string }>('../assets/ribbons/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
});

export const ribbonsMap: Record<string, string> = {};

for (const path in ribbonFiles) {
    const fileName = path.split('/').pop()?.split('.')[0] || '';
    if (fileName) {
        ribbonsMap[fileName] = ribbonFiles[path].default;
    }
}

export type { RibbonGroup };

interface RibbonGroup {
    baseKey: string;
    baseName: string;
    variants: { key: string; name: string; url: string }[];
}

// Funkcja wyciągająca unikalny klucz grupy bazowej
const getGroupBaseKey = (rawKey: string): string => {
    // 1. Zamiana na małe litery i zastąpienie myślników/podkreśleń spacjami
    let normalized = rawKey.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

    // 2. Odcięcie fraz wariantów z końca nazwy (np. "1st awards", "2nd award", "1 star", "bronze device")
    normalized = normalized.replace(/\s+\d*(?:st|nd|rd|th)?\s*(?:awards?|stars?|device|oak\s*leaf|v\s*device|numeral\s*\d*).*$/i, '');

    // 3. Dodatkowy zapasowy odsiew: usunięcie pojedynczych cyfr lub oznaczeń z samego końca, jeśli zostały
    normalized = normalized.replace(/\s+\d+\w*$/i, '').trim();

    return normalized;
};

// Formatowanie nazwy do ładnego wyświetlania (z wielkich liter)
const formatDisplayName = (text: string): string => {
    return text
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
};

const groupedMap: Record<string, RibbonGroup> = {};

Object.entries(ribbonsMap).forEach(([rawKey, url]) => {
    const normalizedBase = getGroupBaseKey(rawKey);
    // Klucz sluga do grupowania (np. "iraqi campaign medal")
    const groupSlug = normalizedBase.replace(/\s+/g, '_');

    if (!groupedMap[groupSlug]) {
        groupedMap[groupSlug] = {
            baseKey: groupSlug,
            baseName: formatDisplayName(normalizedBase),
            variants: []
        };
    }

    groupedMap[groupSlug].variants.push({
        key: rawKey,
        name: formatDisplayName(rawKey),
        url
    });
});

// Sortujemy warianty wewnątrz każdej grupy, aby warianty bez cyfr / z niższą cyfrą były pierwsze
Object.values(groupedMap).forEach(group => {
    group.variants.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
});

export const ribbonGroups = Object.values(groupedMap);