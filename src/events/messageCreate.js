const { Events, EmbedBuilder } = require('discord.js');
const { 
    KAYIT_GUILD_ID, KAYIT_KANAL_ID, KAYIT_RANK_ID, 
    KAYIT_DISCORD_ROL_ID, KAYIT_COOLDOWN_MS, KAYIT_KARSILAMA_ICERIK 
} = require('../modules/constants');
const { 
    kayitKaydRobloxKullanici, kayitGruptaMi, 
    kayitGetirMevcutRank, kayitSetRobloxRank 
} = require('../modules/robloxApi');
const { sendLog } = require('../modules/embedBuilders');

const kayitCooldown = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (message.guildId !== KAYIT_GUILD_ID) return;
        if (message.channelId !== KAYIT_KANAL_ID) return;

        const icerik = message.content.trim();
        if (!icerik || icerik.startsWith('/')) return;

        const kullaniciAdiRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!kullaniciAdiRegex.test(icerik)) {
            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Geçersiz Kullanıcı Adı')
                .setDescription(`\`${icerik}\` geçerli bir Roblox kullanıcı adı değil.`)
                .setTimestamp();
            const msg = await message.reply({ embeds: [embed] });
            setTimeout(() => msg.delete().catch(() => {}), 10000);
            await message.delete().catch(() => {});
            return;
        }

        const sonIstek = kayitCooldown.get(message.author.id);
        if (sonIstek && Date.now() - sonIstek < KAYIT_COOLDOWN_MS) {
            const kalanSaniye = Math.ceil((KAYIT_COOLDOWN_MS - (Date.now() - sonIstek)) / 1000);
            const msg = await message.reply({ content: `⏱️ Lütfen **${kalanSaniye} saniye** bekleyin.` });
            setTimeout(() => msg.delete().catch(() => {}), 5000);
            await message.delete().catch(() => {});
            return;
        }

        kayitCooldown.set(message.author.id, Date.now());
        await message.delete().catch(() => {});

        const yukleniyor = await message.channel.send({ content: `⏳ **${icerik}** kontrol ediliyor...` });

        try {
            const robloxUser = await kayitKaydRobloxKullanici(icerik);
            if (!robloxUser) {
                await yukleniyor.edit({ content: `❌ **${icerik}** adında bir Roblox kullanıcısı bulunamadı.` });
                setTimeout(() => yukleniyor.delete().catch(() => {}), 15000);
                return;
            }

            const gruptaMi = await kayitGruptaMi(robloxUser.id);
            if (!gruptaMi) {
                await yukleniyor.edit({ content: `❌ **${robloxUser.name}** grupta bulunmuyor.` });
                setTimeout(() => yukleniyor.delete().catch(() => {}), 20000);
                return;
            }

            const mevcutRank = await kayitGetirMevcutRank(robloxUser.id);
            if (mevcutRank && mevcutRank.rank >= KAYIT_RANK_ID) {
                // Discord rolü ver
                const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                if (member) await member.roles.add(KAYIT_DISCORD_ROL_ID).catch(() => {});
                
                await yukleniyor.edit({ content: `✅ **${robloxUser.name}** zaten kayıtlı veya üst rütbede.` });
                setTimeout(() => yukleniyor.delete().catch(() => {}), 15000);
                return;
            }

            await kayitSetRobloxRank(robloxUser.id, KAYIT_RANK_ID);
            const member = await message.guild.members.fetch(message.author.id).catch(() => null);
            if (member) await member.roles.add(KAYIT_DISCORD_ROL_ID).catch(() => {});

            await yukleniyor.edit({ content: `✅ **${robloxUser.name}** başarıyla kaydedildi!` });
            setTimeout(() => yukleniyor.delete().catch(() => {}), 30000);

            const logEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Başarılı Kayıt')
                .addFields(
                    { name: '👤 Roblox', value: robloxUser.name, inline: true },
                    { name: '💬 Discord', value: message.author.tag, inline: true }
                )
                .setTimestamp();
            await sendLog(client, logEmbed);

        } catch (err) {
            console.error(err);
            await yukleniyor.edit({ content: `❌ Bir hata oluştu: ${err.message}` });
        }
    },
};
