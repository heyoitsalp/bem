const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanici')
        .setDescription('Kullanıcı hakkında bilgi gösterir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Bilgi alınacak kişi').setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('kullanici') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`👤 Kullanıcı Bilgisi — ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 Kullanıcı ID', value: target.id, inline: true },
                { name: '📅 Hesap Oluşturma', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🤖 Bot mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true }
            );

        if (member) {
            embed.addFields(
                { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '🏷️ Nickname', value: member.nickname || 'Yok', inline: true },
                { name: '🎭 Roller', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Yok', inline: false }
            );
        }

        embed.setTimestamp().setFooter({ text: 'Sentura 🦸 ekoyildiz' });
        await interaction.reply({ embeds: [embed] });
    },
};
