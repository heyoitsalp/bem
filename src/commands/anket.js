const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Hızlı evet/hayır anketi oluşturur.')
        .addStringOption(opt => opt.setName('soru').setDescription('Anket sorusu').setRequired(true))
        .addChannelOption(opt => opt.setName('kanal').setDescription('Anket kanalı (boş = mevcut)').setRequired(false)),
    async execute(interaction, client) {
        const soru = interaction.options.getString('soru');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Anket')
            .setDescription(`**${soru}**`)
            .addFields(
                { name: '✅ Evet', value: 'Aşağıya oy vermek için butona basın', inline: true },
                { name: '❌ Hayır', value: 'Aşağıya oy vermek için butona basın', inline: true }
            )
            .setFooter({ text: `Anketi açan: ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('poll_yes').setLabel('✅ Evet').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('poll_no').setLabel('❌ Hayır').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('poll_results').setLabel('📊 Sonuçlar').setStyle(ButtonStyle.Secondary)
        );

        try {
            await kanal.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Anket <#${kanal.id}> kanalına gönderildi!`, flags: 64 });
        } catch (error) {
            await interaction.reply({ content: `❌ Anket gönderilemedi: ${error.message}`, flags: 64 });
        }
    },
};
