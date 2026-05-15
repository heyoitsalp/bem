const { EmbedBuilder } = require('discord.js');

class EmbedFactory {
    static success(title, description) {
        return new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static error(title, description) {
        return new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static info(title, description) {
        return new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static warn(title, description) {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static create(data) {
        const embed = new EmbedBuilder()
            .setColor(data.color || '#888888')
            .setTitle(data.title || null)
            .setDescription(data.description || null)
            .setTimestamp();
            
        if (data.fields) embed.addFields(data.fields);
        if (data.footer) embed.setFooter({ text: data.footer });
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.image) embed.setImage(data.image);
        
        return embed;
    }
}

module.exports = EmbedFactory;
