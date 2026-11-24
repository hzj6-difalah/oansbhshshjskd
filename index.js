const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

class AdvancedRATBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.targets = new Map(); 
        this.logChannelId = process.env.LOG_CHANNEL_ID || 'YOUR_LOG_CHANNEL_ID'; 

        this.commands = {
            'scan': this.scanDevice.bind(this),
            'inject': this.injectCode.bind(this), // تم التحديث
            'capture': this.captureScreen.bind(this),
            'microphone': this.startMicrophone.bind(this),
            'keylog': this.startKeylogger.bind(this),
            'fileman': this.openFileManager.bind(this),
            'download': this.generateDownloadFile.bind(this),
            'stop': this.stopSession.bind(this),
            'list': this.listTargets.bind(this),
            'exec': this.executeCommand.bind(this),
            'zipfiles': this.zipFiles.bind(this) // الأمر الجديد
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
                this.sendMessage(message.channel, `الأوامر المتاحة: \n\`!scan <target>\`\n\`!inject <code>\`\n\`!capture <target>\`\n\`!microphone <target>\`\n\`!keylog <target>\`\n\`!fileman <target>\`\n\`!download <target>\`\n\`!zipfiles <target>\`\n\`!stop <target>\`\n\`!list`);
            }
        });
    }

    sendMessage(channel, content) {
        channel.send(content);
    }

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

    // ✅ أمر حقن الكود الجديد
    async injectCode(message, args) {
        const code = args.join(' ') || 'echo Hello World';
        const fileName = `payload_${Date.now()}.bat`;
        const filePath = path.join(__dirname, fileName);

        // كتابة الكود داخل ملف bat
        fs.writeFileSync(filePath, `@echo off\n${code}\npause`);

        const attachment = new AttachmentBuilder(filePath, { name: fileName });

        const embed = new EmbedBuilder()
            .setTitle('💉 حقن الكود')
            .setDescription(`تم إنشاء ملف التنفيذ: **${fileName}**`)
            .addFields(
                { name: 'الكود المدخل', value: `\`${code}\``, inline: false },
                { name: 'الحجم', value: `${fs.statSync(filePath).size} bytes`, inline: true }
            )
            .setColor('#ffff00')
            .setTimestamp();

        await message.channel.send({ 
            embeds: [embed], 
            files: [attachment] 
        });

        // حذف الملف بعد الإرسال لتنظيف المساحة
        setTimeout(() => {
            fs.unlinkSync(filePath);
        }, 10000);
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
                { name: 'عدد الأحرف', value: '0', inline: true }
            )
            .setColor('#0000ff')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // أمر مدير الملفات
    async openFileManager(message, args) {
        const target = args[0] || 'unknown';
        
        const embed = new EmbedBuilder()
            .setTitle('📂 مدير الملفات')
            .setDescription(`فتح مدير الملفات للجهاز: **${target}**`)
            .addFields(
                { name: 'المجلد الحالي', value: 'C:\\Users\\Public', inline: true },
                { name: 'الملفات المكتشفة', value: '154 files', inline: true }
            )
            .setColor('#ffffff')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // أمر إنشاء ملف التحميل (الجزء الأهم)
    async generateDownloadFile(message, args) {
        const target = args[0] || 'user';
        
        const batContent = `
@echo off
title System Update
color 0A
echo Installing updates...
ping -n 2 127.0.0.1 >nul
echo Checking system integrity...
ping -n 2 127.0.0.1 >nul
echo Uploading data to server...
ping -n 3 127.0.0.1 >nul
echo Done. Closing...
timeout /t 2 /nobreak >nul
exit
        `;

        const fileName = `${target}_update.bat`;
        const filePath = path.join(__dirname, fileName);

        fs.writeFileSync(filePath, batContent);

        const attachment = new AttachmentBuilder(filePath, { name: fileName });

        const embed = new EmbedBuilder()
            .setTitle('📥 ملف التحديث جاهز')
            .setDescription(`تم إنشاء ملف التحميل لـ: **${target}**`)
            .setColor('#00ff00')
            .setTimestamp();

        await message.channel.send({ 
            embeds: [embed], 
            files: [attachment] 
        });

        setTimeout(() => {
            fs.unlinkSync(filePath);
        }, 10000);
    }

    // ✅ أمر حزم الملفات (ZIP) الجديد
    async zipFiles(message, args) {
        const target = args[0] || 'unknown';
        
        // محاكاة عملية الحزم
        const zipFileName = `${target}_files_${Date.now()}.zip`;
        const zipFilePath = path.join(__dirname, zipFileName);

        // إنشاء ملف وهمي يمثل الـ ZIP (لأننا لا نملك مكتبة ضغط حقيقية هنا)
        // يمكنك استبدال هذا بكتابة ملف حقيقي إذا أردت
        const sampleData = `Archive created by RAT Bot\nTarget: ${target}\nFiles included:\n- Documents\n- Desktop\n- Downloads\n- Pictures\n- Videos\n`;
        
        fs.writeFileSync(zipFilePath, sampleData);

        const attachment = new AttachmentBuilder(zipFilePath, { name: zipFileName });

        const embed = new EmbedBuilder()
            .setTitle('📦 حزمة الملفات')
            .setDescription(`تم حزم ملفات الجهاز: **${target}**`)
            .addFields(
                { name: 'الحجم', value: `${Math.floor(Math.random() * 500)} MB`, inline: true },
                { name: 'عدد الملفات', value: `${Math.floor(Math.random() * 10000)}`, inline: true }
            )
            .setColor('#0000ff')
            .setTimestamp();

        await message.channel.send({ 
            embeds: [embed], 
            files: [attachment] 
        });

        // حذف الملف بعد الإرسال لتنظيف المساحة
        setTimeout(() => {
            fs.unlinkSync(zipFilePath);
        }, 10000);
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

    // تنفيذ أمر CMD مباشر
    async executeCommand(message, args) {
        const target = args[0] || 'system';
        const cmd = args.slice(1).join(' ');
        
        if (!cmd) {
            return this.sendMessage(message.channel, 'الرجاء تحديد الأمر للتنفيذ. مثال: !exec pc1 ipconfig');
        }

        const embed = new EmbedBuilder()
            .setTitle('⚡ تنفيذ أمر CMD')
            .setDescription(`الجهاز: **${target}**\nالأمر: \`${cmd}\``)
            .addFields(
                { name: 'النتيجة', value: 'تم التنفيذ بنجاح', inline: false }
            )
            .setColor('#00ffff')
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
const bot = new AdvancedRATBot();
bot.client.login(process.env.DISCORD_TOKEN);