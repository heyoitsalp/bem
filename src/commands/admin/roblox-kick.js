const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config } = require('../../modules/constants');
const EmbedFactory = require('../../modules/embedFactory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roblox-kick')
        .setDescription('Aktif bir Roblox sunucusundaki oyuncuyu atar.')
        .addStringOption(opt => opt.setName('userid').setDescription('Oyuncunun Roblox ID\'si').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('sebep');

        const apiKey = process.env.ROBLOX_API_KEY || config.ROBLOX_API_KEY;
        const universeId = process.env.UNIVERSE_ID || config.UNIVERSE_ID;

        if (!apiKey || apiKey.includes('YOUR_API_KEY')) {
            return interaction.reply({ 
                content: '❌ Roblox API Key yapılandırılmamış. Lütfen `config.json` dosyasını veya environment variables kısmını kontrol edin.', 
                flags: 64 
            });
        }

        await interaction.deferReply();

        try {
            const messageData = JSON.stringify({ userid: userId, reason: reason });
            
            const response = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${universeId}/topics/Kick`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: messageData })
            });

            if (response.ok) {
                const embed = EmbedFactory.success(
                    'Roblox Kick İsteği Gönderildi',
                    `**User ID:** ${userId}\n**Sebep:** ${reason}\n\nİstek MessagingService üzerinden tüm sunuculara iletildi.`
                );
                return interaction.editReply({ embeds: [embed] });
            } else {
                const errText = await response.text();
                return interaction.editReply({ content: `❌ Roblox API Hatası: ${response.status} - ${errText}` });
            }
        } catch (error) {
            return interaction.editReply({ content: `❌ İstek gönderilirken bir hata oluştu: ${error.message}` });
        }
    },
};
