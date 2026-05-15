const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { status } = require('../../api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sistem-kontrol')
        .setDescription('Roblox sistemleri için gelişmiş butonlu kontrol paneli açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('🎛️ Eko Yıldız Sistem Kontrol Paneli')
            .setDescription('Aşağıdaki butonları kullanarak Roblox oyun sistemlerini aktif veya pasif hale getirebilirsiniz. Bu paneldeki değişiklikler **anında** oyuna yansıyacaktır.')
            .addFields(
                { name: '🎮 Ana Oyun Girişleri', value: status.isGameOpen ? '🟢 **AÇIK**' : '🔴 **KAPALI**', inline: true },
                { name: '🛒 Rütbe Market', value: status.isMarketOpen ? '🟢 **AÇIK**' : '🔴 **KAPALI**', inline: true },
                { name: '⚖️ Adalet Sarayı', value: status.isAdaletSarayOpen ? '🟢 **AÇIK**' : '🔴 **KAPALI**', inline: true }
            )
            .setImage('https://i.imgur.com/B9B1vFm.png') // İstersen buraya güzel bir banner ekleyebilirsin
            .setFooter({ text: `Panel erişimi: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_toggle_game')
                .setLabel('Oyun Girişleri')
                .setEmoji('🎮')
                .setStyle(status.isGameOpen ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('btn_toggle_market')
                .setLabel('Rütbe Market')
                .setEmoji('🛒')
                .setStyle(status.isMarketOpen ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('btn_toggle_adalet')
                .setLabel('Adalet Sarayı')
                .setEmoji('⚖️')
                .setStyle(status.isAdaletSarayOpen ? ButtonStyle.Success : ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_all_open')
                .setLabel('Tümünü Aç')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_all_close')
                .setLabel('Tümünü Kapat')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    },
};
