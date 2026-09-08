export const DEVELOPERS: string[] = (process.env.DEVELOPER_IDS ?? '328819524365320192')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

export const isDeveloper = (discordId: string): boolean => {
    return DEVELOPERS.includes(discordId);
};