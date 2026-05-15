const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserWarnings } = require('../../modules/moderationUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnlist')
        .setDescription('Kullanıcının uyarılarını listeler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarıları görülecek kişi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** adlı kullanıcının hiç uyarısı yok.`, flags: 64 });
        }

        const warnFields = warns.slice(0, 25).map((w, i) => ({
            name: `⚠️ Uyarı #${i + 1} — ${new Date(w.timestamp).toLocaleDateString('tr-TR')}`,
            value: `**Sebep:** ${w.reason}\n**Yetkili ID:** ${w.moderatorId}`,
            inline: false
        }));

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`⚠️ Uyarı Listesi — ${user.tag}`)
            .setDescription(`Toplam **${warns.length}** uyarı`)
            .addFields(warnFields)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
