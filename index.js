
const mysqldump = require('mysqldump');
const config = require('./config.json');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const database_info = config.database_info;
const discord = config.discordwebhook;
const backup_schedule = config.backup_schedule;
const root = GetResourcePath(GetCurrentResourceName());

(async () => {
  while (true) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (shouldBackup(dayOfMonth, hour, minute)) {
      const formattedFilename = getFormattedFilename(now);
      console.log(formattedFilename);
      await performBackup(formattedFilename);
    }

    await Delay(60000);
  }
})();

function getFormattedFilename(now) {
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${root}/sql/${database_info.database}-${day}-${month}-${year}-${hours}-${minutes}.sql`;
}

async function performBackup(filename) {
  await mysqldump({
    connection: {
      host: database_info.host,
      user: database_info.user,
      password: database_info.password,
      database: database_info.database,
    },
    dumpToFile: filename,
  });

  if (discord.enable) {
    const webhook = discord.webhook;
    if (!webhook) return;
    const hook = new Webhook(webhook);
    const embed = new MessageBuilder()
      .setAuthor("Flight Database Backup")
      .setTimestamp()
      .setColor(discord.color)
      .addField("Path", `\`${filename}\``)
      .addField("Database", database_info.database)
      .addField("Date", `${new Date()}`)
      .setFooter(discord.footer);
    hook.send(embed);
    hook.sendFile(filename);
  }
}

function shouldBackup(dayOfMonth, hour, minute) {
  const schedule = backup_schedule;
  const isDayMatch =
    schedule.days === "all" || schedule.days.includes(dayOfMonth);
  const isHourMatch = schedule.hours === "all" || schedule.hours.includes(hour);
  return isDayMatch && isHourMatch && schedule.minutes.includes(minute);
}

function Delay(ms) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}
