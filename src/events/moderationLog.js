const { buildModEmbed, sendLog } = require('../modules/embedBuilders');

module.exports = {
    name: 'moderation_log',
    async execute(data, client) {
        let embed;
        if (data.type === 'auto_unban') {
            embed = buildModEmbed(
                '✅ Otomatik Unban',
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: `${data.user.tag} (${data.user.id})`, inline: true },
                    { name: '📋 Sebep', value: data.reason, inline: true }
                ]
            );
        } else if (data.type === 'auto_unmute') {
            embed = buildModEmbed(
                '🔊 Otomatik Unmute',
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: `${data.member.user.tag} (${data.member.id})`, inline: true },
                    { name: '📋 Sebep', value: data.reason, inline: true }
                ]
            );
        }

        if (embed) {
            await sendLog(client, embed);
        }
    },
};
