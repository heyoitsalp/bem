const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendDM } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Kullanıcıya DM gönderir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('DM gönderilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const mesaj = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📩 Yetkili Mesajı')
            .setDescription(mesaj)
            .addFields({ name: '👮 Gönderen Yetkili', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        const sent = await sendDM(user, embed);
        if (sent) {
            await interaction.reply({ content: `✅ **${user.tag}** kullanıcısına DM başarıyla gönderildi.`, flags: 64 });
        } else {
            await interaction.reply({ content: `❌ **${user.tag}** kullanıcısına DM gönderilemedi (DM kapalı olabilir).`, flags: 64 });
        }
    },
};
