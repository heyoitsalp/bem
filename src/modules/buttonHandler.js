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
}

module.exports = { handleButtonInteraction };
