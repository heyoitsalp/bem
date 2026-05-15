const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getRobloxUser, getUserRankInGroup, setRobloxRank } = require('../../modules/robloxApi');
const { rankList } = require('../../modules/constants');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tenzil')
        .setDescription('Kullanıcıyı bir alt rütbeye düşürür.')
        .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction, client) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const robloxUser = await getRobloxUser(username);
            if (!robloxUser) return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);

            const currentRankData = await getUserRankInGroup(robloxUser.id);
            if (currentRankData.rank === 0) {
                return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);
            }

            const currentIndex = rankList.findIndex(r => r.id === currentRankData.rank);

            if (currentIndex <= 0) {
                return interaction.editReply(`❌ Kullanıcı daha fazla rütbe düşürülemez (en alt rütbede).`);
            }

            const newRankObj = rankList[currentIndex - 1];
            const oldRankObj = rankList[currentIndex] || { name: currentRankData.name };

            await setRobloxRank(robloxUser.id, newRankObj.id);

            const embed = buildModEmbed(
                `👮 Tenzil İşlemi Başarılı`,
                '#FF0000',
                [
                    { name: '👤 Kullanıcı', value: robloxUser.name, inline: true },
                    { name: '📊 Eski Rütbe', value: oldRankObj.name, inline: true },
                    { name: '🆙 Yeni Rütbe', value: newRankObj.name, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true }
                ]
            );

            await interaction.editReply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.editReply(`❌ Hata: ${error.message}`);
        }
    },
};
