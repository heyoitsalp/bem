const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildDMEmbed, sendDM } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-al')
        .setDescription('Kullanıcıdan rol alır.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Rol alınacak kişi').setRequired(true))
        .addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });
        if (!member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `❌ **${user.tag}** zaten **${rol.name}** rolüne sahip değil!`, flags: 64 });
        }

        try {
            await member.roles.remove(rol, `Rol alındı | Yetkili: ${interaction.user.tag}`);
            const dmEmbed = buildDMEmbed('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü alındı.`);
            await sendDM(user, dmEmbed);
            await interaction.reply(`✅ **${user.tag}** kullanıcısından **${rol.name}** rolü alındı.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Rol alınamadı: ${error.message}`, flags: 64 });
        }
    },
};
