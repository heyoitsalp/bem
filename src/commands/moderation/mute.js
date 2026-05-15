const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');
const { config } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Kullanıcıya Susturulmuş rolü verir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı! Config\'i kontrol edin.', flags: 64 });

        if (member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmuş!', flags: 64 });
        }

        const caseId = addModCase('MUTE', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('mute', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.add(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `🔇 Kullanıcı Susturuldu | Vaka #${caseId}`,
                '#FFA500',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Susturma işlemi başarısız: ${error.message}`, flags: 64 });
        }
    },
};
