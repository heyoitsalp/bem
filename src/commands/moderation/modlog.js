const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getModCases } = require('../../modules/moderationUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Kullanıcının geçmiş ceza kayıtlarını gösterir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kayıtları bakılacak kişi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const cases = getModCases(user.id);

        if (cases.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** kullanıcısının herhangi bir ceza kaydı bulunmuyor.`, flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📜 Modlog — ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(cases.reverse().slice(0, 10).map(c => 
                `**Vaka #${c.caseId} [${c.type}]**\n📅 <t:${Math.floor(c.timestamp / 1000)}:f>\n👮 <@${c.moderatorId}>\n📝 ${c.reason}`
            ).join('\n\n'))
            .setFooter({ text: `Toplam ${cases.length} kayıt | Son 10 kayıt gösteriliyor.` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
