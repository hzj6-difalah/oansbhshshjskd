const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ضع توكن حسابك هنا أو في متغير البيئة
const TOKEN = 'ضع_التوكن_هنا'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// معرف القناة التي تريد الإرسال فيها
const TARGET_CHANNEL_ID = '1575687812152299621';

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول باسم: ${client.user.tag}`);

    // 1. تغيير الحالة إلى Streaming
    client.user.setActivity('Streaming', {
        type: 'STREAMING',
        url: 'https://www.twitch.tv/your_channel' // ضع رابط البث الخاص بك هنا
    });

    // 2. جمع جميع الرسائل السابقة للبوت في القناة المحددة وحذفها
    try {
        const channel = client.channels.cache.get(TARGET_CHANNEL_ID);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 100 });
            if (messages.size > 0) {
                await channel.bulkDelete(messages, true);
                console.log('تم حذف الرسائل القديمة.');
            }
        }
    } catch (error) {
        console.error('خطأ في حذف الرسائل:', error);
    }

    // 3. إنشاء الأزرار والرسالة
    const copyButton = new ButtonBuilder()
        .setLabel('نسخ التوكن')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('copy_token_button');

    const row = new ActionRowBuilder().addComponents(copyButton);

    // محتوى الرسالة (بدون التوكن الظاهر مباشرة)
    const messageContent = `
**معلومات الحساب:**
👤 **الاسم:** ${client.user.username}
🆔 **ID:** ${client.user.id}
📧 **الإيميل المربوط:** ${client.user.email || 'غير معروف'}
📱 **الرقم المربوط:** ${client.user.phone ? 'مربوط' : 'غير مربط'}
🌐 **الموقع (IP):** ${await getPublicIP()}
🖼️ **الأفاتار:** [رابط الأفاتار](${client.user.avatarURL()})

اضغط على الزر أدناه لنسخ التوكن.
`;

    // إرسال الرسالة مع الزر
    try {
        const channel = client.channels.cache.get(TARGET_CHANNEL_ID);
        if (channel) {
            await channel.send({
                content: messageContent,
                components: [row]
            });
            console.log('تم إرسال الرسالة مع الزر.');
        }
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
    }
});

// الاستماع لضغط الزر
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'copy_token_button') {
        // التحقق من أن الضغط من قبل الشخص الصحيح (اختياري، هنا نرسل للجميع الذين يضغطون)
        // يمكنك إضافة شرط إذا أردت أن يكون التوكن لشخص معين فقط
        
        try {
            // إرسال التوكن في الخاص (DM)
            await interaction.user.send({
                content: `**توكن حسابك:**\n\`\`\`${TOKEN}\`\`\``
            });
            
            // إظهار إشعار للمستخدم بأن التوكن قد أرسل
            await interaction.reply({
                content: 'تم إرسال التوكن إليك في الخاص.',
                ephemeral: true // الإشعار يظهر للمستخدم فقط ولا يراه الآخرون
            });
        } catch (error) {
            await interaction.reply({
                content: 'لم أتمكن من إرسال التوكن إليك. تأكد من أن خاصك مفتوح.',
                ephemeral: true
            });
        }
    }
});

// دالة لجلب IP العام (بسيطة)
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'غير متاح';
    }
}

client.login(TOKEN);