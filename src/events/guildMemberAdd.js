const { Events, EmbedBuilder } = require('discord.js');
const { config } = require('../modules/constants');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        if (!config.WELCOME_CHANNEL_ID) return;
        try {
            const channel = await client.channels.fetch(config.WELCOME_CHANNEL_ID).catch(() => null);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('👋 Yeni Üye!')
                .setDescription(`**${member.user.tag}** sunucumuza katıldı!\n${member.guild.name} ailesine hoş geldin! 🎉`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🆔 Kullanıcı ID', value: member.user.id, inline: true },
                    { name: '📅 Hesap Yaşı', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👥 Toplam Üye', value: String(member.guild.memberCount), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

            await channel.send({ embeds: [embed] });
        } catch { /* welcome kanalı yoksa sessizce geç */ }
    },
};
