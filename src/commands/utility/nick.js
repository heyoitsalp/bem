const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Kullanıcının sunucu nickini değiştirir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Nick değiştirilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('yeni_nick').setDescription('Yeni nickname (boş = sıfırla)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const yeniNick = interaction.options.getString('yeni_nick') || null;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        try {
            await member.setNickname(yeniNick, `Nick değiştirildi | Yetkili: ${interaction.user.tag}`);
            await interaction.reply(`✅ **${user.tag}** kullanıcısının nickname'i **${yeniNick || 'sıfırlandı'}** olarak güncellendi.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Nickname değiştirilemedi: ${error.message}`, flags: 64 });
        }
    },
};
