const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hepsini-ban')
        .setDescription('Birden fazla kullanıcıyı aynı anda banlar.')
        .addStringOption(opt => opt.setName('id_listesi').setDescription('ID\'leri virgülle ayırarak girin').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const idListStr = interaction.options.getString('id_listesi');
        const reason = interaction.options.getString('sebep');

        const idList = idListStr.split(',').map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id));

        if (idList.length === 0) {
            return interaction.reply({ content: '❌ Geçerli kullanıcı ID\'si bulunamadı! ID\'leri virgülle ayırın.', flags: 64 });
        }

        if (idList.length > 50) {
            return interaction.reply({ content: '❌ Tek seferde en fazla 50 kullanıcı banlanabilir!', flags: 64 });
        }

        await interaction.deferReply();
        let success = 0, fail = 0, alreadyBanned = 0;

        for (const userId of idList) {
            try {
                const alreadyBannedCheck = await interaction.guild.bans.fetch(userId).catch(() => null);
                if (alreadyBannedCheck) { alreadyBanned++; continue; }

                await interaction.guild.bans.create(userId, {
                    reason: `[TOPLU BAN] ${reason} | Yetkili: ${interaction.user.tag}`,
                    deleteMessageSeconds: 86400
                });
                addModCase('BAN', userId, interaction.user.id, `[TOPLU BAN] ${reason}`);

                const user = await client.users.fetch(userId).catch(() => null);
                if (user) {
                    const dmEmbed = buildDMEmbed('ban', interaction.guild.name, interaction.user.tag, reason);
                    await sendDM(user, dmEmbed);
                }
                success++;
            } catch { fail++; }
            await new Promise(r => setTimeout(r, 200));
        }

        const embed = buildModEmbed(
            '🔨 Toplu Ban Tamamlandı',
            '#FF0000',
            [
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                { name: '📋 Sebep', value: reason, inline: false },
                { name: '✅ Başarılı', value: String(success), inline: true },
                { name: '❌ Başarısız', value: String(fail), inline: true },
                { name: '⚠️ Zaten Banlı', value: String(alreadyBanned), inline: true },
                { name: '🔢 Toplam', value: String(idList.length), inline: true }
            ]
        );
        await interaction.editReply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
