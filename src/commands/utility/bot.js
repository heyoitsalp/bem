const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Bot hakkında bilgi gösterir.'),
    async execute(interaction, client) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Bot Bilgisi')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🏷️ Bot Adı', value: client.user.tag, inline: true },
                { name: '🆔 Bot ID', value: client.user.id, inline: true },
                { name: '🌐 Sunucu Sayısı', value: String(client.guilds.cache.size), inline: true },
                { name: '⏱️ Uptime', value: `${days}g ${hours}s ${minutes}d ${seconds}sn`, inline: true },
                { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: '💾 Bellek', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📦 Node.js', value: process.version, inline: true },
                { name: '📚 discord.js', value: version, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz Sistemleri' });

        await interaction.reply({ embeds: [embed] });
    },
};
