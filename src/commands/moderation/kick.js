const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kullanıcıyı sunucudan atar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });
        if (!member.kickable) return interaction.reply({ content: '❌ Bu kullanıcıyı atamam! (Yetki yetersiz)', flags: 64 });

        const caseId = addModCase('KICK', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('kick', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.kick(`[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `👢 Kullanıcı Atıldı | Vaka #${caseId}`,
                '#FF6600',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Atma işlemi başarısız: ${error.message}`, flags: 64 });
        }
    },
};
