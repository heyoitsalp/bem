const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Kullanıcının avatarını gösterir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Avatar alınacak kişi').setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('kullanici') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🖼️ Avatar — ${target.tag}`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription(`[PNG](${target.displayAvatarURL({ extension: 'png', size: 1024 })}) | [JPG](${target.displayAvatarURL({ extension: 'jpg', size: 1024 })}) | [WEBP](${target.displayAvatarURL({ extension: 'webp', size: 1024 })})`)
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed] });
    },
};
