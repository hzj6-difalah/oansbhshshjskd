const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// التحقق من التوكن
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Discord Token not found in environment variables.');
    process.exit(1);
}

class AdvancedRATBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        // قاعدة بيانات للأجهزة النشطة
        this.targets = new Map(); 
        
        // معرف القناة التي سيتم إرسال التنبيهات فيها
        this.logChannelId = process.env.LOG_CHANNEL_ID || 'YOUR_LOG_CHANNEL_ID'; 

        this.commands = {
            'scan': this.scanDevice.bind(this),
            'inject': this.injectCode.bind(this),
            'capture': this.captureScreen.bind(this),
            'microphone': this.startMicrophone.bind(this),
            'keylog': this.startKeylogger.bind(this),
            'fileman': this.openFileManager.bind(this),
            'files': this.listFiles.bind(this), // أمر عرض الملفات
            'download-zip': this.downloadZip.bind(this), // أمر تحميل ملف ZIP
            'download': this.generateDownloadFile.bind(this),
            'stop': this.stopSession.bind(this),
            'list': this.listTargets.bind(this),
            'exec': this.executeCommand.bind(this)
        };

        this.setupEvents();
    }

    setupEvents() {
        this.client.once('ready', () => {
            console.log(`✅ ${this.client.user.tag} جاهز للعمل`);
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            const args = message.content.trim().split(' ');
            const command = args[0].toLowerCase();
            
            if (!command.startsWith('!')) return;

            const cleanCommand = command.substring(1);

            if (this.commands[cleanCommand]) {
                try {
                    await this.commands[cleanCommand](message, args.slice(1));
                } catch (error) {
                    console.error(error);
                    this.sendMessage(message.channel, `❌ خطأ في تنفيذ الأمر: ${error.message}`);
                }
            } else {
                this.sendMessage(message.channel, `الأوامر المتاحة: \n\`!scan <target>\`\n\`!inject <code>\`\n\`!capture <target>\`\n\`!microphone <target>\`\n\`!keylog <target>\`\n\`!fileman <target>\`\n\`!files <target>\`\n\`!download-zip <target>\`\n\`!download <target>\`\n\`!stop <target>\`\n\`!list`);
            }
        });
    }

    sendMessage(channel, content) {
        channel.send(content);
    }

    // إرسال تنبيه للضحية (عندما يحمل الملف)
    async sendAlertToLog(targetName, action) {
        const channel = await this.client.channels.fetch(this.logChannelId).catch(() => null);
        
        if (!channel) {
            console.warn(`⚠️ Log channel ID ${this.logChannelId} not found.`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🚨 ضحية جديدة / نشاط مشبوه')
            .setDescription(`**الاسم:** ${targetName}\n**الإجراء:** ${action}`)
            .addFields(
                { name: 'الوقت', value: new Date().toLocaleString(), inline: true },
                { name: 'الحالة', value: '🟢 متصل الآن', inline: true }
            )
            .setColor('#ff0000')
            .setTimestamp();

        // إرسال المنشن @everyone و @here
        await channel.send({ 
            content: '@everyone @here',
            embeds: [embed] 
        });
    }

    // أمر الفحص
    async scanDevice(message, args) {
        const target = args[0] || 'system';
        
        const embed = new EmbedBuilder()
            .setTitle('🔍 فحص الجهاز')
            .setDescription(`جاري فحص: **${target}**`)
            .addFields(
                { name: 'نظام التشغيل', value: 'Windows 11 Pro', inline: true },
                { name: 'المعالج', value: 'Intel Core i7-12700K', inline: true },
                { name: 'الذاكرة', value: '32 GB DDR5', inline: true },
                { name: 'العنوان IP', value: '192.168.1.' + Math.floor(Math.random() * 255), inline: true },
                { name: 'الاسم', value: 'PC-' + Math.random().toString(36).substring(7), inline: true },
                { name: 'الكاميرا', value: '✅ متصلة', inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        this.saveTarget(target, { status: 'scanned', time: Date.now() });
    }

    // أمر حقن الكود (تحديث)
    async injectCode(message, args) {
        const code = args.join(' ') || 'payload.exe';
        
        const embed = new EmbedBuilder()
            .setTitle('💉 حقن الكود')
            .setDescription(`تم إرسال ملف: **${code}** إلى الجهاز`)
            .addFields(
                { name: 'الحالة', value: '✅ تم التنفيذ بنجاح', inline: true },
                { name: 'المسار', value: `C:\\Users\\Public\\${code}`, inline: true },
                { name: 'الحجم', value: `${Math.floor(Math.random() * 5000)} KB`, inline: true },
                { name: 'التوقيع الرقمي', value: 'Microsoft Corporation', inline: true }
            )
            .setColor('#ffff00')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // أمر التقاط الشاشة
    async captureScreen(message, args) {
        const target = args[0] || 'unknown';
        const screenshotUrl = `https://picsum.photos/seed/${Date.now()}/800/400`;
        
        const embed = new EmbedBuilder()
            .setTitle('📸 لقطة شاشة')
            .setImage(screenshotUrl)
            .setDescription(`لقطة شاشة الجهاز: **${target}**`)
            .setColor('#ff0000')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // أمر الاستماع للميكروفون
    async startMicrophone(message, args) {
        const target = args[0] || 'unknown';
        
        const embed = new EmbedBuilder()
            .setTitle('🎤 تسجيل الميكروفون')
            .setDescription(`بدأ تسجيل الصوت للجهاز: **${target}**`)
            .addFields(
                { name: 'الحالة', value: '🟢 نشط', inline: true },
                { name: 'الجودة', value: 'High Quality', inline: true }
            )
            .setColor('#0000ff')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // أمر مفتاح التسجيل
    async startKeylogger(message, args) {
        const target = args[0] || 'unknown';
        
        const embed = new EmbedBuilder()
            .setTitle('⌨️ بدء تسجيل المفاتيح')
            .setDescription(`بدأ تسجيل المفاتيح للجهاز: **${target}**`)
            .addFields(
                { name: 'الحالة', value: '🟢 نشط', inline: true },
                { name: 'عدد الأحرف', value: '