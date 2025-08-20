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
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

app.use(express.json());

// 🔁 /update - Mute or unmute one user based on Performer status
app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update: ${robloxUsername} isPerformer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    const member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) {
      console.log("⚠️ Member not found");
      return res.status(404).send('Member not found.');
    }

    if (member.voice.channel) {
      await member.voice.setMute(!isPerformer);
      console.log(`${isPerformer ? '🔊 Unmuted' : '🔇 Muted'} ${robloxUsername}`);
      res.sendStatus(200);
    } else {
      console.log("⚠️ Member not in a voice channel");
      res.status(400).send('Member not in voice channel.');
    }
  } catch (err) {
    console.error("❌ Error in /update:", err);
    res.sendStatus(500);
  }
});

// 🔁 /mute-all-except - Mute everyone except "Performer" team
app.post('/mute-all-except', async (req, res) => {
  const { players } = req.body;
  console.log(`📥 /mute-all-except: Received ${players.length} players`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    const performers = new Set(
      players.filter(p => p.team === "Performer").map(p => p.robloxUsername)
    );

    const promises = [];

    guild.members.cache.forEach(member => {
      if (!member.voice.channel) return;

      const robloxName = member.nickname || member.user.username;
      const shouldMute = !performers.has(robloxName);

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
    console.error("❌ Error in /mute-all-except:", err);
    res.sendStatus(500);
  }
});

// 🔁 /unmute-all - Unmute everyone
app.post('/unmute-all', async (req, res) => {
  console.log("📥 /unmute-all request received");

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    const promises = [];

    guild.members.cache.forEach(member => {
      if (!member.voice.channel) return;

      promises.push(
        member.voice.setMute(false).then(() => {
          console.log(`🔊 Unmuted ${member.nickname || member.user.username}`);
        }).catch(err => {
          console.warn(`⚠️ Could not unmute ${member.user.username}: ${err.message}`);
        })
      );
    });

    await Promise.all(promises);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error in /unmute-all:", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});

client.login(TOKEN);
