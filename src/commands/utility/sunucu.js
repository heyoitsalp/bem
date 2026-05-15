const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('Sunucu hakkında bilgi gösterir.'),
    async execute(interaction, client) {
        const guild = interaction.guild;
        await guild.members.fetch();
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🏰 Sunucu Bilgisi — ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 Sunucu ID', value: guild.id, inline: true },
                { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 Toplam Üye', value: String(guild.memberCount), inline: true },
                { name: '🧑 Kullanıcı', value: String(humanCount), inline: true },
                { name: '🤖 Bot', value: String(botCount), inline: true },
                { name: '💬 Kanal', value: String(guild.channels.cache.size), inline: true },
                { name: '🎭 Rol', value: String(guild.roles.cache.size), inline: true },
                { name: '🌟 Boost', value: `${guild.premiumSubscriptionCount || 0} (Tier ${guild.premiumTier})`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed] });
    },
};
