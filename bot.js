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

/* ---------------------------------
   /update — Roblox → Stage control
----------------------------------*/
app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update ${robloxUsername} performer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    let member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) return res.sendStatus(200);

    // Fetch single member
    member = await guild.members.fetch(member.id);
    const voice = member.voice;

    if (!voice?.channel || voice.channel.type !== 13) { // 13 = Stage Voice
      console.log("⚠️ Not in a Stage VC yet");
      return res.sendStatus(200);
    }

    try {
      if (isPerformer) {
        // ✅ Bring to stage
        await voice.setSuppressed(false); // Unsuppress → can speak on stage
        console.log(`🎤 On stage: ${robloxUsername}`);
      } else {
        // ✅ Send to audience
        await voice.setSuppressed(true); // Suppress → back to audience
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

