const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserWarnings, removeWarning } = require('../../modules/moderationUtils');
const { buildModEmbed } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnremove')
        .setDescription('Kullanıcıdan uyarı kaldırır.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarı kaldırılacak kişi').setRequired(true))
        .addIntegerOption(opt => opt.setName('index').setDescription('Kaldırılacak uyarı numarası (1\'den başlar)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const index = interaction.options.getInteger('index') - 1;
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `❌ **${user.tag}** adlı kullanıcının uyarısı yok.`, flags: 64 });
        }

        if (index < 0 || index >= warns.length) {
            return interaction.reply({ content: `❌ Geçersiz uyarı numarası! (1 ile ${warns.length} arasında olmalı)`, flags: 64 });
        }

        const removedWarn = warns[index];
        removeWarning(user.id, index);

        const embed = buildModEmbed(
            '🗑️ Uyarı Kaldırıldı',
            '#00BFFF',
            [
                { name: '👤 Kullanıcı', value: `${user.tag}`, inline: true },
                { name: '👮 Kaldıran', value: interaction.user.tag, inline: true },
                { name: '📋 Kaldırılan Uyarı', value: removedWarn.reason, inline: false },
                { name: '🔢 Kalan Uyarı', value: `${getUserWarnings(user.id).length}`, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
    },
};
