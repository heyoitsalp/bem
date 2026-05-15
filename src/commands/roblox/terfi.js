const { SlashCommandBuilder } = require('discord.js');
const { getRobloxUser, getUserRankInGroup, setRobloxRank } = require('../../modules/robloxApi');
const { rankList, colorMap } = require('../../modules/constants');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('terfi')
        .setDescription('Kullanıcıyı bir üst rütbeye terfi ettirir.')
        .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),
    async execute(interaction, client) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const robloxUser = await getRobloxUser(username);
            if (!robloxUser) return interaction.editReply('❌ Roblox kullanıcısı bulunamadı.');

            const currentRank = await getUserRankInGroup(robloxUser.id);
            const currentIndex = rankList.findIndex(r => r.id === currentRank.rank);

            if (currentIndex === -1) return interaction.editReply(`❌ Kullanıcı grupta değil veya rütbesi listede yok. (Mevcut: ${currentRank.name})`);
            if (currentIndex >= rankList.length - 1) return interaction.editReply('❌ Kullanıcı zaten en yüksek rütbede!');

            const nextRank = rankList[currentIndex + 1];
            await setRobloxRank(robloxUser.id, nextRank.id);

            const embed = buildModEmbed(
                '📈 Terfi İşlemi Başarılı',
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: `${robloxUser.name} (${robloxUser.id})`, inline: true },
                    { name: '⬅️ Eski Rütbe', value: currentRank.name, inline: true },
                    { name: '➡️ Yeni Rütbe', value: nextRank.name, inline: true },
                    { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
                ]
            );

            await interaction.editReply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.editReply(`❌ Hata: ${error.message}`);
        }
    },
};
