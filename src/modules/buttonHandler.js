const { EmbedBuilder } = require('discord.js');

const pollVotes = new Map(); // messageId -> { yes: Set, no: Set }

async function handleButtonInteraction(interaction, client) {
    const { customId, message } = interaction;

    if (customId === 'poll_yes' || customId === 'poll_no' || customId === 'poll_results') {
        if (!pollVotes.has(message.id)) {
            pollVotes.set(message.id, { yes: new Set(), no: new Set() });
        }
        const votes = pollVotes.get(message.id);

        if (customId === 'poll_yes') {
            if (votes.yes.has(interaction.user.id)) {
                votes.yes.delete(interaction.user.id);
                return interaction.reply({ content: '✅ Evet oyunuz geri alındı.', flags: 64 });
            }
            votes.no.delete(interaction.user.id);
            votes.yes.add(interaction.user.id);
            return interaction.reply({ content: '✅ Evet oyu kaydedildi!', flags: 64 });
        }

        if (customId === 'poll_no') {
            if (votes.no.has(interaction.user.id)) {
                votes.no.delete(interaction.user.id);
                return interaction.reply({ content: '❌ Hayır oyunuz geri alındı.', flags: 64 });
            }
            votes.yes.delete(interaction.user.id);
            votes.no.add(interaction.user.id);
            return interaction.reply({ content: '❌ Hayır oyu kaydedildi!', flags: 64 });
        }

        if (customId === 'poll_results') {
            const total = votes.yes.size + votes.no.size;
            const yesPercent = total > 0 ? Math.round((votes.yes.size / total) * 100) : 0;
            const noPercent = total > 0 ? Math.round((votes.no.size / total) * 100) : 0;
            const yesBar = '█'.repeat(Math.round(yesPercent / 10)) + '░'.repeat(10 - Math.round(yesPercent / 10));
            const noBar = '█'.repeat(Math.round(noPercent / 10)) + '░'.repeat(10 - Math.round(noPercent / 10));

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('📊 Anket Sonuçları')
                        .addFields(
                            { name: `✅ Evet — ${votes.yes.size} oy (${yesPercent}%)`, value: `\`${yesBar}\``, inline: false },
                            { name: `❌ Hayır — ${votes.no.size} oy (${noPercent}%)`, value: `\`${noBar}\``, inline: false },
                            { name: '🔢 Toplam Oy', value: String(total), inline: true }
                        )
                        .setTimestamp()
                ],
                flags: 64
            });
        }
    }

    // --- SİSTEM KONTROL PANELİ BUTONLARI ---
    if (customId.startsWith('btn_toggle_') || customId.startsWith('btn_all_')) {
        const { status } = require('../../api');
        const { buildModEmbed, sendLog } = require('./embedBuilders');
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

        // Yetki kontrolü (Sadece yetkililer basabilsin)
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: '❌ Bu butonları kullanmak için yeterli yetkiniz yok!', flags: 64 });
        }

        let systemName = '';
        let newState = false;

        if (customId === 'btn_toggle_game') {
            status.isGameOpen = !status.isGameOpen;
            newState = status.isGameOpen;
            systemName = 'Ana Oyun Girişleri';
        } else if (customId === 'btn_toggle_market') {
            status.isMarketOpen = !status.isMarketOpen;
            newState = status.isMarketOpen;
            systemName = 'Rütbe Market';
        } else if (customId === 'btn_toggle_adalet') {
            status.isAdaletSarayOpen = !status.isAdaletSarayOpen;
            newState = status.isAdaletSarayOpen;
            systemName = 'Adalet Sarayı';
        } else if (customId === 'btn_all_open') {
            status.isGameOpen = true;
            status.isMarketOpen = true;
            status.isAdaletSarayOpen = true;
            systemName = 'Tüm Sistemler';
            newState = true;
        } else if (customId === 'btn_all_close') {
            status.isGameOpen = false;
            status.isMarketOpen = false;
            status.isAdaletSarayOpen = false;
            systemName = 'Tüm Sistemler';
            newState = false;
        }

        // Güncellenmiş Embed ve Butonları Oluştur
        const embed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('🎛️ Eko Yıldız Sistem Kontrol Paneli')
            .setDescription('Aşağıdaki butonları kullanarak Roblox oyun sistemlerini aktif veya pasif hale getirebilirsiniz. Bu paneldeki değişiklikler **anında** oyuna yansıyacaktır.')
            .addFields(
                { name: '🎮 Ana Oyun Girişleri', value: status.isGameOpen ? '🟢 **AÇIK**' : '🔴 **KAPALI**', inline: true },
                { name: '🛒 Rütbe Market', value: status.isMarketOpen ? '🟢 **AÇIK**' : '🔴 **KAPALI**', inline: true },
                { name: '⚖️ Adalet Sarayı', value: status.isAdaletSarayOpen ? '🟢 **AÇIK**' : '🔴 **KAPALI**', inline: true }
            )
            .setImage('https://i.imgur.com/B9B1vFm.png')
            .setFooter({ text: `Son işlem: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_toggle_game').setLabel('Oyun Girişleri').setEmoji('🎮').setStyle(status.isGameOpen ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_toggle_market').setLabel('Rütbe Market').setEmoji('🛒').setStyle(status.isMarketOpen ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_toggle_adalet').setLabel('Adalet Sarayı').setEmoji('⚖️').setStyle(status.isAdaletSarayOpen ? ButtonStyle.Success : ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_all_open').setLabel('Tümünü Aç').setEmoji('✅').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_all_close').setLabel('Tümünü Kapat').setEmoji('❌').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [embed], components: [row1, row2] });

        // Mod log gönder
        const logEmbed = buildModEmbed(
            newState ? '🟢 Sistem Aktif Edildi' : '🔴 Sistem Kapatıldı',
            newState ? '#00FF00' : '#FF0000',
            [
                { name: '⚙️ Sistem', value: systemName, inline: true },
                { name: '📊 Durum', value: newState ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true }
            ]
        );
        await sendLog(client, logEmbed);
    }
}

module.exports = { handleButtonInteraction };
