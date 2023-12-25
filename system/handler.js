import path from "path";
import chalk from "chalk";
import { getAggregateVotesInPollMessage, delay } from "@whiskeysockets/baileys";

const isNumber = (x) => typeof x === "number" && !isNaN(x);
const database = new (await import("./lib/database.js")).default();

export async function handler(conn, m, chatUpdate) {
  conn.msgqueque = conn.msgqueque || [];

  if (!m) return;
  if (db == null) await database.write(db);

  try {
    m.exp = 0;
    m.limit = false;

    await (await import("./lib/loadDatabase.js")).default(m);
    const isPrem = m.isOwner || db.users[m.sender].premium;

    if (!m.isOwner && db.settings.self) return;
    if (db.settings.pconly && m.chat.endsWith("g.us")) return;
    if (db.settings.gconly && !m.chat.endsWith("g.us")) return;
    if (db.settings.autoread) conn.readMessages([m.key]);

    if (m.isBaileys) return;
    if (db.settings.queque && m.body && !isPrem) {
      let queque = conn.msgqueque,
        time = 1000 * 5;
      let previousID = queque[queque.length - 1];

      queque.push(m.id || m.key.id);
      setInterval(async () => {
        if (queque.indexOf(previousID) === -1) clearInterval(conn);
        await delay(time);
      }, time);
    }

    m.exp += Math.ceil(Math.random() * 10);
    let user = db.users && db.users[m.sender];

    for (let name in global.plugins) {
      let plugin = global.plugins[name];

      if (!plugin) continue;
      if (plugin.disabled) continue;
      if (typeof plugin.all === "function") {
        try {
          await plugin.all.call(conn, m, { chatUpdate });
        } catch (e) {
          console.error(e);
        }
      }

      if (typeof plugin.before === "function") {
        if (await plugin.before.call(conn, m, { chatUpdate })) continue;
      }

      if (m.prefix) {
        let { args, command, text } = m;
        let _quoted = m.isQuoted ? m.quoted : m;
        let isAccept = Array.isArray(plugin.command)
          ? plugin.command.some((cmd) => cmd === command)
          : false;

        m.plugin = name;
        if (!isAccept) continue;
        if (m.chat in db.chats || m.sender in db.users) {
          if (db.chats[m.chat]?.isBanned) return;
          if (db.users[m.sender]?.banned) return;
        }

        if (plugin.owner && !m.isOwner) {
          m.reply(mess.owner);
          continue;
        }

        if (plugin.premium && !isPrem) {
          m.reply(mess.premium);
          continue;
        }

        if (plugin.group && !m.isGroup) {
          m.reply(mess.group);
          continue;
        }

        if (plugin.botAdmin && !m.isBotAdmin) {
          m.reply(mess.botAdmin);
          continue;
        }

        if (plugin.admin && !m.isAdmin) {
          m.reply(mess.admin);
          continue;
        }

        if (plugin.private && m.isGroup) {
          m.reply(mess.private);
          continue;
        }

        if (plugin.register && !user.registered) {
          m.reply(mess.register);
          continue;
        }

        if (plugin.quoted && !m.isQuoted) {
          m.reply(mess.quoted);
          continue;
        }

        if (plugin.media == !m.isMedia) {
          if (plugin.media.audio && !/audio|voice/i.test(_quoted.mime)) {
            m.reply(mess.audio);
            continue;
          }

          if (plugin.media.image && !/image/i.test(_quoted.mime)) {
            m.reply(mess.image);
            continue;
          }

          if (plugin.media.sticker && !/webp/i.test(_quoted.mime)) {
            m.reply(mess.sticker);
            continue;
          }

          if (plugin.media.video && !/video/i.test(_quoted.mime)) {
            m.reply(mess.video);
            continue;
          }
        }

        m.isCommand = true;
        let xp = "exp" in plugin ? parseInt(plugin.exp) : 3;

        if (xp < 200) m.exp += xp;
        if (plugin.loading) m.reply(mess.loading);
        if (plugin.limit && user.limit < 1 && !isPrem) {
          m.reply(mess.limit);
          continue;
        }

        if (plugin.example && !text) {
          m.reply(
            plugin.example
              .replace(/%p/gi, m.prefix)
              .replace(/%cmd/gi, plugin.name)
              .replace(/%text/gi, text),
          );
          continue;
        }

        let extra = {
          conn,
          args,
          isPrem,
          command,
          text,
          chatUpdate,
        };

        try {
          await plugin.run(m, extra);
          if (!isPrem) m.limit = m.limit || plugin.limit || false;
        } catch (e) {
          console.error(e);
          m.reply(func.format(e));
        } finally {
          if (typeof plugin.after === "function") {
            try {
              await plugin.after.call(conn, m, extra);
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    if (db.settings.queque && m.body) {
      let quequeIndex = conn.msgqueque.indexOf(m.id || m.key.id);
      if (quequeIndex !== -1) conn.msgqueque.splice(quequeIndex, 1);
    }

    if (m) {
      let user,
        stats = db.stats,
        stat;
      if (m.sender && (user = db.users[m.sender])) {
        user.exp += m.exp;
        user.limit -= m.limit * 1;
      }

      if (m.plugin) {
        if (m.plugin in stats) {
          stat = stats[m.plugin];
          if (!isNumber(stat.total)) stat.total = 1;
          if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1;
          if (!isNumber(stat.last)) stat.last = +new Date();
          if (!isNumber(stat.lastSuccess))
            stat.lastSuccess = m.error != null ? 0 : +new Date();
        } else {
          stat = stats[m.plugin] = {
            total: 1,
            success: m.error != null ? 0 : 1,
            last: +new Date(),
            lastSuccess: m.error != null ? 0 : +new Date(),
          };
        }
        stat.total += 1;
        stat.last = +new Date();
        if (m.error == null) {
          stat.success += 1;
          stat.lastSuccess = +new Date();
        }
      }
    }

    if (!m.isBaileys && !m.fromMe)
      console.log(
        "\x1b[1;31m~\x1b[1;37m>",
        "[\x1b[1;32m CMD \x1b[1;37m]",
        chalk.yellow(m.type),
        "from",
        chalk.green(m.pushName),
        "in",
        chalk.cyan(m.isGroup ? m.metadata.subject : "private chat"),
        "args :",
        chalk.green(m.body.length),
      );
  }
}

export async function participantsUpdate({ id, participants, action }) {
  if (db.settings.self) return;
  if (db == null) await database.write(db);

  let chat = db.chats[id] || {},
    ppuser;
  let metadata = await conn.groupMetadata(id);

  switch (action) {
    case "add":
    case "remove":
      if (chat.welcome) {
        for (let user of participants) {
          try {
            ppuser = await conn.profilePictureUrl(user, "image");
          } catch {
            ppuser =
              "https://i0.wp.com/www.gambarunik.id/wp-content/uploads/2019/06/Top-Gambar-Foto-Profil-Kosong-Lucu-Tergokil-.jpg";
          } finally {
            let tekswell = `Halo @${
              user.split("@")[0]
            } 👋\n\nSelamat datang di grup ${
              metadata.subject
            }! Kami senang kamu bergabung dengan kami.\n\nSaya harap kamu betah disini dan jangan lupa untuk selalu mengikuti peraturan yang ada`;
            let teksbye = `Selamat tinggal @${
              user.split("@")[0]
            } 👋\n\nSalam perpisahan, kami harap kamu baik-baik saja disana`;

            if (action == "add") {
              conn.sendMessage(id, {
                image: { url: ppuser },
                contextInfo: { mentionedJid: [user] },
                caption: tekswell,
                mentions: [user],
              });
            } else if (action == "remove") {
              conn.sendMessage(id, { text: teksbye, mentions: [user] });
            }
          }
        }
      }
      break;
    case "promote":
    case "demote":
      let tekspro = `Selamat @${
        participants[0].split("@")[0]
      } atas kenaikan pangkatnya di grup ${metadata.subject} 🥂`;
      let teksdem = `Sabar yaa @${
        participants[0].split("@")[0]
      } atas penurunan pangkatnya di grup ${metadata.subject} 😔`;

      if (chat.detect) {
        if (action == "promote")
          conn.sendMessage(id, { text: tekspro, mentions: [participants[0]] });
        if (action == "demote")
          conn.sendMessage(id, { text: teksdem, mentions: [participants[0]] });
      }
      break;
  }
}

export async function groupsUpdate(groupsUpdate) {
  if (db.settings.self) return;
  for (let groupUpdate of groupsUpdate) {
    let id = groupUpdate.id;
    let chats = db.chats[id] || {},
      text = "";

    if (!chats.detect) continue;
    if (groupUpdate.desc)
      text = "*Deskripsi grup telah diubah menjadi*\n\n@desc".replace(
        "@desc",
        groupUpdate.desc,
      );
    if (groupUpdate.subject)
      text = "*Judul grup telah diubah menjadi*\n\n@subject".replace(
        "@subject",
        groupUpdate.subject,
      );
    if (groupUpdate.icon) text = "*Ikon grup telah diubah*";
    if (groupUpdate.inviteCode)
      text =
        "*Tautan grup telah diubah menjadi*\n\nhttps://chat.whatsapp.com/@revoke".replace(
          "@revoke",
          groupUpdate.inviteCode,
        );
    if (groupUpdate.announce === true) text = "*Grup telah ditutup*";
    if (groupUpdate.announce === false) text = "*Grup telah dibuka*";
    if (groupUpdate.restrict === true)
      text = "*Grup dibatasi hanya untuk peserta saja*";
    if (groupUpdate.restrict === false)
      text = "*Grup ini dibatasi hanya untuk admin saja*";

    conn.sendMessage(id, { text });
  }
}

export async function deleteUpdate({ fromMe, id, participants }) {
  try {
    if (fromMe) return;
    let msg = conn.serializeM(conn.loadMessage(id));
    if (!msg) return;
    if (db.chats[m.chat].antidelete) return;

    conn.sendMessage(
      msg.key.remoteJid,
      {
        text: `[❗] Terdeteksi @${
          participants[0].split("@")[0]
        } telah menghapus pesan.\n\nUntuk mematikan fitur ini, ketik *.off antidelete*\nUntuk menghapus pesan yang dikirim oleh BOT, balas pesan dengan perintah *.delete*`,
        mentions: [participants[0]],
      },
      { quoted: msg },
    );
    conn.copyNForward(m.chat, msg, false);
  } catch (e) {
    console.error(e);
  }
}

export async function pollUpdate(message) {
  for (let { key, update } of message) {
    if (message.pollUpdates) {
      let pollCreation = await conn.serializeM(conn.loadMessage(key.id));

      if (pollCreation) {
        let pollMessage = await getAggregateVotesInPollMessage({
          message: pollCreation.message,
          pollUpdates: pollCreation.pollUpdates,
        });
        message.pollUpdates[0].vote = pollMessage;
        conn.appenTextMessage(
          message,
          message.pollUpdates[0].vote ||
            pollMessage.filter((v) => v.voters.length !== 0)[0]?.name,
          message.message,
        );
      }
    }
  }
}

export async function presenceUpdate(presenceUpdate) {
  const id = presenceUpdate.id;
  const nouser = Object.keys(presenceUpdate.presences);
  const status = presenceUpdate.presences[nouser]?.lastKnownPresence;
  const user = db.users[nouser[0]];

  if (user?.afk && status === "composing" && user.afk > -1) {
    if (user.banned) {
      user.afk = -1;
      user.afkReason = "User Banned AFK";
      return;
    }

    const username = nouser[0].split("@")[0];
    const timeAfk = new Date() - user.afk;
    const caption = `@${username} berhenti afk, dia sedang mengetik\n\nAlasan: ${
      user.afkReason ? user.afkReason : "tidak ada alasan"
    }\nSelama: ${timeAfk.toTimeString()} yang lalu`;

    conn.sendMessage(id, { text: caption });
    user.afk = -1;
    user.afkReason = "";
  }
}

export async function rejectCall(json) {
  if (db.settings.anticall) {
    for (let id of json) {
      if (id.status === "offer") {
        let msg = await conn.sendMessage(id.from, {
          text: "Maaf untuk saat ini, Kami tidak dapat menerima panggilan, entah dalam group atau pribadi\n\nJika Membutuhkan bantuan ataupun request fitur silahkan chat owner",
        });

        conn.sendContact(id.from, global.owner, msg);
        await conn.rejectCall(id.id, id.from);
      }
    }
  }
}
