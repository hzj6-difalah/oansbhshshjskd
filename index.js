require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ===== تسجيل أوامر السلاش =====
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  client.user.setActivity('/حقوق أو /say', { type: 3 });

  const commands = [
    new SlashCommandBuilder()
      .setName('say')
      .setDescription('يضيف Evil Files على الملف')
      .addAttachmentOption(option => 
        option.setName('file')
          .setDescription('ارفع الصورة أو الفيديو هنا')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('حقوق')
      .setDescription('يضيف Evil Files على الملف')
      .addAttachmentOption(option => 
        option.setName('file')
          .setDescription('ارفع الصورة أو الفيديو هنا')
          .setRequired(true)
      )
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('⏳ جاري تسجيل الأوامر...');
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('✅ تم تسجيل الأوامر بنجاح!');
  } catch (error) {
    console.error(error);
  }
});

// ===== دالة رسم النص على الصورة =====
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

  drawText(img.width / 2, fontSize);
  drawText(img.width / 2, img.height / 2);
  drawText(img.width / 2, img.height - fontSize);

  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
}

// ===== دالة رسم النص على الفيديو =====
function overlayVideo(inputPath, outputPath, text) {
  return new Promise((resolve, reject) => {
    const safeText = text.replace(/'/g, "\\'");
    // إعدادات الفيديو المحسنة عشان يشتغل 100% بدون أخطاء
    const drawFilter = [
      `drawtext=text='${safeText}':fontcolor=red:fontsize=h/10:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.05`,
      `drawtext=text='${safeText}':fontcolor=red:fontsize=h/10:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`,
      `drawtext=text='${safeText}':fontcolor=red:fontsize=h/10:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.85`,
    ].join(',');

    ffmpeg(inputPath)
      .videoFilters(drawFilter)
      // إجبار الترميز على h264 وإضافة audio codec عشان يتوافق مع ديسكورد
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-y'
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// ===== معالجة أمر السلاش =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say' || interaction.commandName === 'حقوق') {
    await interaction.deferReply();

    const attachment = interaction.options.getAttachment('file');
    if (!attachment) {
      return interaction.editReply('❌ ما وصلني أي ملف، جرب ترفع الملف مع الأمر.');
    }

    const isVideo = attachment.contentType?.startsWith('video');
    const isImage = attachment.contentType?.startsWith('image');

    if (!isVideo && !isImage) {
      return interaction.editReply('❌ الملف لازم يكون صورة أو فيديو');
    }

    const tmpDir = os.tmpdir();
    const ext = path.extname(attachment.name) || (isVideo ? '.mp4' : '.png');
    const inputPath = path.join(tmpDir, `input_${Date.now()}${ext}`);
    const outputPath = path.join(tmpDir, `output_${Date.now()}${isVideo ? '.mp4' : '.png'}`);

    try {
      // تحميل الملف من الرابط
      const res = await fetch(attachment.url);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);

      await interaction.editReply('⏳ جاري المعالجة... (قد تأخذ الفيديوهات وقتاً أطول)');

      // المعالجة
      if (isImage) {
        await overlayImage(inputPath, outputPath, 'Evil Files');
      } else {
        await overlayVideo(inputPath, outputPath, 'Evil Files');
      }

      const file = new AttachmentBuilder(outputPath, {
        name: `EvilFiles_${attachment.name}`,
      });

      await interaction.editReply({ content: '✅ تم!', files: [file] });

      // تنظيف الملفات
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ صار خطأ أثناء المعالجة، قد يكون حجم الفيديو كبير جداً.');
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }
});

// ===== تسجيل الدخول =====
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ ما فيه توكن!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);