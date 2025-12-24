const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

app.use(express.json());

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

/* -----------------------------
   /update — mute or unmute user
------------------------------*/
app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update: ${robloxUsername} performer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    // 1️⃣ Cache lookup
    let member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    // 2️⃣ Fallback search (safe)
    if (!member) {
      const results = await guild.members.search({
        query: robloxUsername,
        limit: 1
      });
      member = results.first();
    }

    if (!member) {
      console.log("⚠️ Discord member not found");
      return res.sendStatus(404);
    }

    if (!member.voice.channel) {
      console.log("⚠️ Member not in voice");
      return res.sendStatus(200);
    }

    await member.voice.setMute(!isPerformer);
    console.log(`${isPerformer ? "🔊 Unmuted" : "🔇 Muted"} ${robloxUsername}`);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /update error:", err);
    res.sendStatus(500);
  }
});

/* -----------------------------
   Unmute everyone
------------------------------*/
app.post('/unmute-all', async (req, res) => {
  console.log("📥 /unmute-all");

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    const ops = guild.members.cache.map(member => {
      if (!member.voice.channel) return;
      return member.voice.setMute(false).catch(() => {});
    });

    await Promise.all(ops);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /unmute-all error:", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

/* -----------------------------
   /mute-all-except — mute everyone except allowed teams
------------------------------*/
app.post('/mute-all-except', async (req, res) => {
  const { players } = req.body;
  console.log(`📥 /mute-all-except: received ${players.length} players`);

  try {
    const allowedTeams = new Set(["Performer", "Judges", "Host"]);
    const allowedUsers = new Set(
      players
        .filter(p => allowedTeams.has(p.team))
        .map(p => p.robloxUsername)
    );

    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    const promises = [];

    guild.members.cache.forEach(member => {
      if (!member.voice.channel) return;

      const robloxName = member.nickname || member.user.username;
      const shouldMute = !allowedUsers.has(robloxName);

      promises.push(
        member.voice.setMute(shouldMute).then(() => {
          console.log(`${shouldMute ? "🔇 Muted" : "🔊 Unmuted"} ${robloxName}`);
        }).catch(err => {
          console.warn(`⚠️ Could not mute/unmute ${robloxName}: ${err.message}`);
        })
      );
    });

    await Promise.all(promises);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /mute-all-except error:", err);
    res.sendStatus(500);
  }
});

client.login(TOKEN);

