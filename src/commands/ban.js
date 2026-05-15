const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed } = require('../modules/embedBuilders');
const { sendDM, sendLog } = require('../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Kullanıcıyı sunucudan kalıcı olarak yasaklar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj_sil').setDescription('Kaç günlük mesaj silinsin? (0-7)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const deletedays = parseInt(interaction.options.getString('mesaj_sil') || '0');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member) {
            if (!member.bannable) {
                return interaction.reply({ content: '❌ Bu kullanıcıyı banlayamam! (Yetkim yetersiz veya üst rol)', flags: 64 });
            }
        }

        const caseId = addModCase('BAN', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('ban', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}\nSunucu: ${interaction.guild.name}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await interaction.guild.bans.create(user.id, { 
                reason: `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`, 
                deleteMessageSeconds: Math.min(Math.max(deletedays, 0), 7) * 86400 
            });

            const embed = buildModEmbed(
                `🔨 Kullanıcı Banlandı | Vaka #${caseId}`,
                '#FF0000',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi (DM Kapalı)', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Banlama işlemi başarısız: ${error.message}`, flags: 64 });
        }
    },
};
