const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendDM } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toplu-dm')
        .setDescription('Belirli role sahip kişilere toplu DM gönderir.')
        .addRoleOption(opt => opt.setName('rol').setDescription('Hedef rol').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const rol = interaction.options.getRole('rol');
        const mesaj = interaction.options.getString('mesaj');

        await interaction.deferReply({ flags: 64 });
        await interaction.guild.members.fetch();

        const members = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(rol.id) && !m.user.bot
        );

        if (members.size === 0) {
            return interaction.editReply(`❌ **${rol.name}** rolüne sahip kullanıcı bulunamadı.`);
        }

        let success = 0, fail = 0;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📢 Toplu Duyuru')
            .setDescription(mesaj)
            .addFields({ name: '👮 Gönderen', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        for (const [, member] of members) {
            const sent = await sendDM(member.user, embed);
            if (sent) success++; else fail++;
            // Rate limit için küçük bekleme
            await new Promise(r => setTimeout(r, 100));
        }

        await interaction.editReply(
            `📊 Toplu DM sonucu:\n✅ Başarılı: **${success}**\n❌ Başarısız: **${fail}**\nToplam: **${members.size}**`
        );
    },
};
