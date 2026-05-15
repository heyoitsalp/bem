const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tumrollerveidleriveisimleri')
        .setDescription('Sunucudaki tüm rolleri idleri ve isimleriyle listeler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 }); // Ephemeral, so it doesn't spam the chat

        const roles = interaction.guild.roles.cache.sort((a, b) => b.position - a.position);
        
        let description = "";
        let chunks = [];

        roles.forEach(role => {
            const roleStr = `**${role.name}** - \`${role.id}\`\n`;
            if (description.length + roleStr.length > 4000) {
                chunks.push(description);
                description = "";
            }
            description += roleStr;
        });

        if (description.length > 0) {
            chunks.push(description);
        }

        for (let i = 0; i < chunks.length; i++) {
            const embed = new EmbedBuilder()
                .setTitle(`Sunucu Rolleri (${i + 1}/${chunks.length})`)
                .setDescription(chunks[i])
                .setColor('Blue');

            if (i === 0) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.followUp({ embeds: [embed], flags: 64 });
            }
        }
    },
};
