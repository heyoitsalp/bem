const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRobloxUser, getUserRankInGroup } = require('../../modules/robloxApi');
const { rankList } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbebak')
        .setDescription('Kullanıcının Roblox rütbesini gösterir.')
        .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),
    async execute(interaction, client) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const robloxUser = await getRobloxUser(username);
            if (!robloxUser) return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);

            const rankData = await getUserRankInGroup(robloxUser.id);
            if (rankData.rank === 0) {
                return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);
            }

            const rankObj = rankList.find(r => r.id === rankData.rank);
            const rankIndex = rankList.findIndex(r => r.id === rankData.rank);
            const nextRank = rankIndex !== -1 && rankIndex < rankList.length - 1 ? rankList[rankIndex + 1] : null;

            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`👮 Rütbe Bilgisi — ${robloxUser.name}`)
                .addFields(
                    { name: '🏅 Mevcut Rütbe', value: rankObj ? rankObj.name : rankData.name, inline: true },
                    { name: '🔢 Rütbe ID', value: String(rankData.rank), inline: true },
                    { name: '📊 Sıralama', value: rankIndex !== -1 ? `${rankIndex + 1}/${rankList.length}` : 'Bilinmiyor', inline: true },
                    { name: '⬆️ Sonraki Rütbe', value: nextRank ? nextRank.name : '🏆 En Yüksek Rütbe', inline: true },
                    { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true }
                )
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUser.id}&width=420&height=420&format=png`)
                .setTimestamp()
                .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(`❌ Hata: ${error.message}`);
        }
    },
};
