const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

// التحقق من التوكن
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Discord Token not found in environment variables.');
    process.exit(1);
}

class RATBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        // قاعدة بيانات بسيطة للأجهزة (تُحذف عند إعادة التشغيل)
        this.targets = new Map(); 
        
        this.commands = {
            'scan': this.scanDevice.bind(this),
            'inject': this.injectCode.bind(this),
            'capture': this.captureScreen.bind(this),
            'keylog': this.startKeylogger.bind(this),
            'stop': this.stopSession.bind(this),
            'list': this.listTargets.bind(this)
        };

        this.setupEvents();
    }

    setupEvents() {
        this.client.once('ready', () => {
            console.log(`✅ ${this.client.user.tag} متصل`);
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            const args = message.content.trim().split(' ');
            const command = args[0].toLowerCase();
            
            // تجاهل الرسائل التي لا تبدأ بـ !
            if (!command.startsWith('!')) return;

            const cleanCommand = command.substring(1);

            if (this.commands[cleanCommand]) {
                try {
                    await this.commands[cleanCommand](message, args.slice(1));
                } catch (error) {
                    this.sendMessage(message.channel, `❌ خطأ: ${error.message}`);
                }
            } else {
                this.sendMessage(message.channel, `الأوامر المتاحة: \n\`!scan <target>\`\n\`!inject <code>\`\n\`!capture <target>\`\n\`!keylog <target>\`\n\`!stop <target>\`\n\`!list`);
            }
        });
    }

    sendMessage(channel, content) {
        channel.send(content);
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

    // أمر حقن الكود
    async injectCode(message, args) {
        const code = args.join(' ') || 'payload.exe';
        
        const embed = new EmbedBuilder()
            .setTitle('💉 حقن الكود')
            .setDescription(`تم إرسال: **${code}**`)
            .addFields(
                { name: 'الحالة', value: '✅ تم التنفيذ', inline: true },
                { name: 'المسار', value: `C:\\Users\\Public\\${code}`, inline: true },
                { name: 'الحجم', value: `${Math.floor(Math.random() * 5000)} KB`, inline: true }
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

    // أمر مفتاح التسجيل
    async startKeylogger(message, args) {
        const target = args[0] || 'unknown';
        
        const embed = new EmbedBuilder()
            .setTitle('⌨️ بدء تسجيل المفاتيح')
            .setDescription(`بدأ تسجيل المفاتيح للجهاز: **${target}**`)
            .addFields(
                { name: 'الحالة', value: '🟢 نشط', inline: true },
                { name: 'عدد الأحرف', value: '0', inline: true }
            )
            .setColor('#0000ff')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // إيقاف الجلسة
    async stopSession(message, args) {
        const target = args[0] || 'unknown';
        
        const embed = new EmbedBuilder()
            .setTitle('🛑 إيقاف الجلسة')
            .setDescription(`تم إيقاف الجلسة للجهاز: **${target}**`)
            .setColor('#ff0000')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // عرض الأجهزة المسجلة
    async listTargets(message) {
        if (this.targets.size === 0) {
            return this.sendMessage(message.channel, 'لا توجد أجهزة مسجلة حالياً.');
        }

        const targetsList = Array.from(this.targets.entries())
            .map(([id, data]) => `- **${id}**: ${data.status} (${new Date(data.time).toLocaleTimeString()})`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('📋 قائمة الأجهزة')
            .setDescription(targetsList)
            .setColor('#ffffff')
            .setFooter({ text: 'Total Targets: ' + this.targets.size })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    saveTarget(id, data) {
        this.targets.set(id, data);
    }
}

// تشغيل البوت
const bot = new RATBot();
bot.client.login(token);