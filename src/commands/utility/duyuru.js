const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Belirtilen kanala embed duyuru gönderir.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Duyuru kanalı').setRequired(true))
        .addStringOption(opt => opt.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
        .addStringOption(opt => opt.setName('icerik').setDescription('Duyuru içeriği').setRequired(true))
        .addStringOption(opt => opt.setName('renk').setDescription('Embed rengi (hex, örn: #FF0000)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const kanal = interaction.options.getChannel('kanal');
        const baslik = interaction.options.getString('baslik');
        const icerik = interaction.options.getString('icerik');
        const renkStr = interaction.options.getString('renk') || '#0099FF';

        let renk;
        try {
            renk = renkStr.startsWith('#') ? renkStr : `#${renkStr}`;
        } catch {
            renk = '#0099FF';
        }

        const embed = new EmbedBuilder()
            .setColor(renk)
            .setTitle(`📢 ${baslik}`)
            .setDescription(icerik)
            .setTimestamp()
            .setFooter({ text: `Duyuru | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

        try {
            await kanal.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Duyuru <#${kanal.id}> kanalına başarıyla gönderildi!`, flags: 64 });
            
            const logEmbed = buildModEmbed(
                '📢 Duyuru Gönderildi',
                '#0099FF',
                [
                    { name: '👮 Gönderen', value: interaction.user.tag, inline: true },
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '🏷️ Başlık', value: baslik, inline: false }
                ]
            );
            await sendLog(client, logEmbed);
        } catch (error) {
            await interaction.reply({ content: `❌ Duyuru gönderilemedi: ${error.message}`, flags: 64 });
        }
    },
};
