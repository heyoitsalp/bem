const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-bilgi')
        .setDescription('Rol hakkında bilgi gösterir.')
        .addRoleOption(opt => opt.setName('rol').setDescription('Bilgi alınacak rol').setRequired(true)),
    async execute(interaction, client) {
        const rol = interaction.options.getRole('rol');
        await interaction.guild.members.fetch();
        const memberCount = interaction.guild.members.cache.filter(m => m.roles.cache.has(rol.id)).size;

        const embed = new EmbedBuilder()
            .setColor(rol.color || '#0099FF')
            .setTitle(`🎭 Rol Bilgisi — ${rol.name}`)
            .addFields(
                { name: '🆔 Rol ID', value: rol.id, inline: true },
                { name: '🎨 Renk', value: rol.hexColor, inline: true },
                { name: '👥 Üye Sayısı', value: String(memberCount), inline: true },
                { name: '📊 Pozisyon', value: String(rol.position), inline: true },
                { name: '🔞 Gösterilebilir', value: rol.hoist ? 'Evet' : 'Hayır', inline: true },
                { name: '🏷️ Bahsedilebilir', value: rol.mentionable ? 'Evet' : 'Hayır', inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(rol.createdTimestamp / 1000)}:F>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed] });
    },
};
