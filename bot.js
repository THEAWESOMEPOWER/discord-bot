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
  console.log(`Bot logged in as ${client.user.tag}`);
});

app.use(express.json());

app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`Received update: user=${robloxUsername}, isPerformer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    // Fetch all members fresh to avoid stale cache
    await guild.members.fetch();

    // Find member by nickname or username
    const member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) {
      console.log("Member not found in guild");
      return res.status(404).send('Member not found.');
    }

    if (member.voice.channel) {
      await member.voice.setMute(!isPerformer);
      console.log(`${isPerformer ? 'Unmuted' : 'Muted'} ${robloxUsername} in ${member.voice.channel.name}`);
      res.sendStatus(200);
    } else {
      console.log(`${robloxUsername} is not in a voice channel`);
      res.status(400).send('Member not in voice channel.');
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});


app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});


client.login(TOKEN);
