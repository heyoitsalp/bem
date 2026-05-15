const { Events, EmbedBuilder } = require('discord.js');
const { config } = require('../modules/constants');
const { sendLog } = require('../modules/embedBuilders');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        if (!config.LOG_CHANNEL_ID) return;
        try {
            const embed = new EmbedBuilder()
                .setColor('#FF6600')
                .setTitle('👋 Üye Ayrıldı')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag}\n(${member.user.id})`, inline: true },
                    { name: '📅 Katılım', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Bilinmiyor', inline: true },
                    { name: '👥 Kalan Üye', value: String(member.guild.memberCount), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

            await sendLog(client, embed);
        } catch { }
    },
};
