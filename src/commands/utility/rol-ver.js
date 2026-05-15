const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildDMEmbed, sendDM } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-ver')
        .setDescription('Kullanıcıya rol verir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Rol verilecek kişi').setRequired(true))
        .addRoleOption(opt => opt.setName('rol').setDescription('Verilecek rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });
        if (member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `❌ **${user.tag}** zaten **${rol.name}** rolüne sahip!`, flags: 64 });
        }

        try {
            await member.roles.add(rol, `Rol verildi | Yetkili: ${interaction.user.tag}`);
            const dmEmbed = buildDMEmbed('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü verildi.`);
            await sendDM(user, dmEmbed);
            await interaction.reply(`✅ **${user.tag}** kullanıcısına **${rol.name}** rolü verildi.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Rol verilemedi: ${error.message}`, flags: 64 });
        }
    },
};
