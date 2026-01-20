require('dotenv').config();

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
   /update — Roblox → Stage control
------------------------------*/
app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update ${robloxUsername} performer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    // find member in cache
    let member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) return res.sendStatus(200);

    // fetch single member
    member = await guild.members.fetch(member.id);
    const voice = member.voice;

    if (!voice?.channel || voice.channel.type !== 13) { // 13 = Stage Voice
      console.log("⚠️ Not in Stage VC yet");
      return res.sendStatus(200);
    }

    try {
      if (isPerformer) {
        // Bring them on stage
        await voice.setSuppressed(false);
        console.log(`🎤 On stage: ${robloxUsername}`);
      } else {
        // Send them back to audience
        await voice.setSuppressed(true);
        console.log(`👥 Audience: ${robloxUsername}`);
      }
    } catch (err) {
      if (err.code === 10065) {
        console.warn(`⚠️ Stage desync ignored for ${robloxUsername}`);
      } else {
        throw err;
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ /update error:", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

client.login(TOKEN);
