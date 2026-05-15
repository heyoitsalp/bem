const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tüm komutları ve kullanım amaçlarını gösterir.'),
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📚 Yardım Menüsü')
            .setDescription('Sentura 🦸 ekoyildiz Bot komut listesi')
            .addFields(
                { name: '🛡️ Moderasyon', value: '`/ban`, `/kick`, `/mute`, `/warn`, `/clear`, `/slowmode`', inline: false },
                { name: '🎮 Oyun Yönetimi', value: '`/oyun-yonet`, `/market-yonet`, `/durum`', inline: false },
                { name: '⭐ Roblox', value: '`/terfi`, `/tenzil`, `/rutbebak`, `/rutbelist`', inline: false },
                { name: '📊 Genel', value: '`/anket`, `/ping`, `/yardim`, `/avatar`', inline: false },
                { name: '🔊 Ses', value: '`/ses-durum`, `/ses-yenile`', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });
            
        await interaction.reply({ embeds: [embed] });
    },
};
