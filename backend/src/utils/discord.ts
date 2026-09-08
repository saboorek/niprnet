interface Embed {
    title: string;
    color: number;
    fields: { name: string; value: string; inline?: boolean }[];
    timestamp?: string;
    footer?: { text: string };
}

export async function sendDiscordMessage(channelId: string, embed: Embed): Promise<void> {
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({ embeds: [embed] }),
        });

        if (!res.ok) {
            const err = await res.json();
            console.error('❌ Discord message error:', err);
        }
    } catch (err) {
        console.error('❌ Failed to send Discord message:', err);
    }
}