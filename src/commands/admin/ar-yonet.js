const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const autoResponder = require('../../modules/autoResponder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ar-yonet')
        .setDescription('Otomatik cevaplayıcı sistemini yönetir.')
        .addSubcommand(sub => 
            sub.setName('ekle')
                .setDescription('Yeni bir tetikleyici ekler.')
                .addStringOption(opt => opt.setName('tetikleyici').setDescription('Mesaj içinde geçecek kelime').setRequired(true))
                .addStringOption(opt => opt.setName('cevap').setDescription('Botun vereceği cevap').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('sil')
                .setDescription('Bir tetikleyiciyi siler.')
                .addStringOption(opt => opt.setName('tetikleyici').setDescription('Silinecek kelime').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('liste')
                .setDescription('Tüm tetikleyicileri listeler.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'ekle') {
            const trigger = interaction.options.getString('tetikleyici');
            const response = interaction.options.getString('cevap');
            autoResponder.add(trigger, response);
            return interaction.reply({ content: `✅ **"${trigger}"** için otomatik cevap eklendi.`, flags: 64 });
        }

        if (sub === 'sil') {
            const trigger = interaction.options.getString('tetikleyici');
            autoResponder.remove(trigger);
            return interaction.reply({ content: `✅ **"${trigger}"** otomatik cevabı silindi.`, flags: 64 });
        }

        if (sub === 'liste') {
            const all = autoResponder.getAll();
            const list = Object.entries(all).map(([k, v]) => `• **${k}**: ${v}`).join('\n') || 'Hiç otomatik cevap bulunamadı.';
            return interaction.reply({ content: `📚 **Otomatik Cevap Listesi:**\n${list}`, flags: 64 });
        }
    },
};
