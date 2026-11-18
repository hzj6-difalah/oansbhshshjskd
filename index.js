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

const PREFIX = process.env.PREFIX || '/';

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  client.user.setActivity('Evil Files', { type: 3 }); // Watching
});

// ===== رسم نص على صورة =====
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

// ===== رسم نص على فيديو =====
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
      .outputOptions(['-c:a copy'])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// ===== معالجة المرفق =====
async function handleAttachment(message, text) {
  let attachment = message.attachments.first();
  if (!attachment && message.reference) {
    const replied = await message.channel.messages.fetch(message.reference.messageId);
    attachment = replied?.attachments.first();
  }

  if (!attachment) {
    return message.reply('❌ حط صورة أو فيديو مع الأمر، أو رد على مقطع');
  }

  const isVideo = attachment.contentType?.startsWith('video');
  const isImage = attachment.contentType?.startsWith('image');

  if (!isVideo && !isImage) {
    return message.reply('❌ الملف لازم يكون صورة أو فيديو');
  }

  const tmpDir = os.tmpdir();
  const ext = path.extname(attachment.name) || (isVideo ? '.mp4' : '.png');
  const inputPath = path.join(tmpDir, `input_${Date.now()}${ext}`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}${isVideo ? '.mp4' : '.png'}`);

  try {
    const res = await fetch(attachment.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);

    const statusMsg = await message.reply('⏳ جاري المعالجة...');

    if (isImage) {
      await overlayImage(inputPath, outputPath, text);
    } else {
      await overlayVideo(inputPath, outputPath, text);
    }

    const file = new AttachmentBuilder(outputPath, {
      name: `EvilFiles_${attachment.name}`,
    });

    await message.reply({ files: [file] });
    await statusMsg.delete().catch(() => {});

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error(err);
    message.reply('❌ صار خطأ أثناء المعالجة').catch(() => {});
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}

// ===== الأوامر =====
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'say') {
    return handleAttachment(message, 'Evil Files');
  }

  if (command === 'حقوق') {
    return handleAttachment(message, 'Evil Files');
  }
});

// ===== تسجيل الدخول =====
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ ما فيه توكن! حط DISCORD_TOKEN في ملف .env');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);