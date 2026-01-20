require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
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
   /update — Roblox → Stage control
----------------------------------*/
app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update ${robloxUsername} performer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    const member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) {
      console.log("⚠️ Member not found");
      return res.sendStatus(200);
    }

    const voice = member.voice;
    if (!voice.channel) {
      console.log("⚠️ Member not in voice");
      return res.sendStatus(200);
    }

    if (voice.channel.type !== ChannelType.GuildStageVoice) {
      console.log("⚠️ Not a stage channel");
      return res.sendStatus(200);
    }

    if (isPerformer) {
      // 🎤 FORCE BRING TO STAGE
      await voice.channel.inviteToSpeak(member);
      await voice.setSuppressed(false);

      console.log(`🎤 Brought to stage: ${robloxUsername}`);
    } else {
      // 👥 MOVE TO AUDIENCE
      await voice.setSuppressed(true);
      console.log(`👥 Moved to audience: ${robloxUsername}`);
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
