require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder, Events } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  client.user.setActivity('!حقوق | !say', { type: 3 }); // حالة البوت
});

// ===== رسم على الصور =====
async function overlayImage(inputPath, outputPath, text) {
  const img = await loadImage(inputPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const fontSize = Math.max(30, Math.floor(img.width / 12));
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = '#ff0000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(3, fontSize / 10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawText = (x, y) => {
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };

  drawText(img.width / 2, fontSize);              // فوق
  drawText(img.width / 2, img.height / 2);        // وسط
  drawText(img.width / 2, img.height - fontSize); // تحت

  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
}

// ===== رسم على الفيديو =====
function overlayVideo(inputPath, outputPath, text) {
  return new Promise((resolve, reject) => {
    const safeText = text.replace(/'/g, "\\'");
    const drawFilter = [
      `drawtext=text='${safeText}':fontcolor=red:fontsize=h/10:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.05`,
      `drawtext=text='${safeText}':fontcolor=red:fontsize=h/10:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`,
      `drawtext=text='${safeText}':fontcolor=red:fontsize=h/10:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.85`,
    ].join(',');

    ffmpeg(inputPath)
      .videoFilters(drawFilter)
      .outputOptions(['-c:a copy', '-y'])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// ===== معالجة الأمر =====
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // البريفكس !
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  // نتحقق إذا كان الأمر say أو حقوق
  if (command !== 'say' && command !== 'حقوق') return;

  // نجيب أيدي الروم من الأمر (إذا كتبته)
  const targetChannelId = args[0];
  
  // نجيب المرفق (صورة أو فيديو)
  let attachment = message.attachments.first();

  // إذا ما فيه مرفق، نشوف إذا كان رد على رسالة فيها مرفق
  if (!attachment && message.reference) {
    const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
    attachment = repliedMsg?.attachments.first();
  }

  if (!attachment) {
    return message.reply('❌ حط صورة أو فيديو مع الأمر، أو رد على مقطع بـ `!say`');
  }

  const isVideo = attachment.contentType?.startsWith('video');
  const isImage = attachment.contentType?.startsWith('image');

  if (!isVideo && !isImage) {
    return message.reply('❌ الملف لازم يكون صورة أو فيديو');
  }

  // تجهيز الملفات المؤقتة
  const tmpDir = os.tmpdir();
  const ext = path.extname(attachment.name) || (isVideo ? '.mp4' : '.png');
  const inputPath = path.join(tmpDir, `input_${Date.now()}${ext}`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}${isVideo ? '.mp4' : '.png'}`);

  try {
    // تحميل الملف
    const res = await fetch(attachment.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    // رسالة الانتظار
    const statusMsg = await message.reply('⏳ جاري المعالجة...');

    // المعالجة
    if (isImage) {
      await overlayImage(inputPath, outputPath, 'Evil Files');
    } else {
      await overlayVideo(inputPath, outputPath, 'Evil Files');
    }

    const file = new AttachmentBuilder(outputPath, {
      name: `EvilFiles_${attachment.name}`,
    });

    // إذا حطيت أيدي روم، البوت يرسل هناك. إذا لا، يرسل في نفس الروم.
    if (targetChannelId && /^\d+$/.test(targetChannelId)) {
      try {
        const targetChannel = await client.channels.fetch(targetChannelId);
        await targetChannel.send({ files: [file] });
        await statusMsg.edit('✅ تم الإرسال في الروم المطلوب!');
      } catch (err) {
        console.error(err);
        await statusMsg.edit('❌ ما قدرت أرسل في الروم، تأكد من الأيدي أو الصلاحيات. سيتم الإرسال هنا بدلاً من ذلك.');
        await message.channel.send({ files: [file] });
      }
    } else {
      // إرسال في نفس الروم
      await message.channel.send({ files: [file] });
      await statusMsg.delete().catch(() => {});
    }

    // حذف الملفات المؤقتة
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

  } catch (err) {
    console.error(err);
    message.reply('❌ صار خطأ أثناء المعالجة').catch(() => {});
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
});

client.login(process.env.DISCORD_TOKEN);