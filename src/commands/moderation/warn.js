const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, addWarning } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Kullanıcıya uyarı verir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const warnCount = addWarning(user.id, reason, interaction.user.id);
        const caseId = addModCase('WARN', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('warn', interaction.guild.name, interaction.user.tag, reason,
            `Bu sizin **${warnCount}. uyarınız**.\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        const embed = buildModEmbed(
            `⚠️ Kullanıcı Uyarıldı | Vaka #${caseId}`,
            '#FFFF00',
            [
                { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                { name: '🔢 Toplam Uyarı', value: `${warnCount}`, inline: true },
                { name: '📋 Sebep', value: reason, inline: false },
                { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
