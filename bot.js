app.post('/update', async (req, res) => {
  const { robloxUsername, isPerformer } = req.body;
  console.log(`📥 /update ${robloxUsername} performer=${isPerformer}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    let member = guild.members.cache.find(
      m => m.nickname === robloxUsername || m.user.username === robloxUsername
    );

    if (!member) return res.sendStatus(200);

    // 🔁 REFRESH VOICE STATE (CRITICAL)
    member = await guild.members.fetch(member.id);
    const voice = member.voice;

    if (!voice?.channelId) {
      console.log("⚠️ User not fully in voice yet");
      return res.sendStatus(200);
    }

    if (voice.channel.type !== ChannelType.GuildStageVoice) {
      console.log("⚠️ Not a stage channel");
      return res.sendStatus(200);
    }

    try {
      if (isPerformer) {
        // 🎤 Bring to stage
        await voice.channel.inviteToSpeak(member);
        await voice.setSuppressed(false);
        console.log(`🎤 On stage: ${robloxUsername}`);
      } else {
        // 👥 Send to audience
        await voice.setSuppressed(true);
        console.log(`👥 Audience: ${robloxUsername}`);
      }
    } catch (err) {
      // ✅ Ignore known Stage desync error
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
