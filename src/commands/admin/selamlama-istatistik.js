const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { selamlamaCooldown, kullaniciRuhuHali } = require('../../modules/stats');
const { selamlamaDesenleri } = require('../../modules/selamlamaUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('selamlama-istatistik')
        .setDescription('Selamlama sisteminin istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        const cooldownSayisi = selamlamaCooldown.size;
        const ruhalSayisi    = kullaniciRuhuHali.size;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💬 Selamlama Sistemi — İstatistikler')
            .addFields(
                { name: '⏱️ Aktif Cooldown', value: `${cooldownSayisi} kullanıcı`, inline: true },
                { name: '😊 Takip Edilen Ruh Hali', value: `${ruhalSayisi} kullanıcı`, inline: true },
                { name: '📊 Tanımlı Selamlama', value: `${selamlamaDesenleri.length} desen`, inline: true },
                { name: '⚡ Cooldown Süresi', value: `6 saniye`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Selamlama Sistemi' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
