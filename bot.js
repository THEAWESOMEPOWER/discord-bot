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

/* ---------------------------------
   /update — move user on/off stage
----------------------------------*/
app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update: ${robloxUsername} performer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    let member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) {
      const results = await guild.members.search({
        query: robloxUsername,
        limit: 1
      });
      member = results.first();
    }

    if (!member || !member.voice.channel) return res.sendStatus(200);

    // 🎤 STAGE LOGIC
    await member.voice.setSuppressed(!isPerformer);

    console.log(
      `${isPerformer ? "🎤 On stage" : "👥 Audience"} ${robloxUsername}`
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /update error:", err);
    res.sendStatus(500);
  }
});

/* ---------------------------------
   /stage-all — bring everyone up
----------------------------------*/
app.post('/stage-all', async (req, res) => {
  console.log("📥 /stage-all");

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    const ops = guild.members.cache.map(member => {
      if (!member.voice.channel) return;
      return member.voice.setSuppressed(false).catch(() => {});
    });

    await Promise.all(ops);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /stage-all error:", err);
    res.sendStatus(500);
  }
});

/* ---------------------------------
   /stage-except — allowed teams only
----------------------------------*/
app.post('/stage-except', async (req, res) => {
  const { players } = req.body;
  console.log(`📥 /stage-except: ${players.length} players`);

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
      const toAudience = !allowedUsers.has(robloxName);

      promises.push(
        member.voice.setSuppressed(toAudience).then(() => {
          console.log(
            `${toAudience ? "👥 Audience" : "🎤 On stage"} ${robloxName}`
          );
        }).catch(() => {})
      );
    });

    await Promise.all(promises);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /stage-except error:", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

client.login(TOKEN);
