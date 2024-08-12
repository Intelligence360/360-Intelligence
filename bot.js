const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// MongoDB setup
mongoose.connect('mongodb+srv://izhanasif78666:360inteligence@cluster0.zi6mq.mongodb.net/360inteligence?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  userId: String,
  coins: Number,
  lastTap: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);

// Initialize bot
const bot = new Telegraf('7308665138:AAH4BjAi5i9zOejRguMUkgSeHV4G3wwHeZQ'); // Replace with your bot's API token

// Start command to initialize or greet users
bot.start(async (ctx) => {
  let userId = ctx.from.id.toString();
  let user = await User.findOne({ userId });

  if (!user) {
    user = new User({ userId, coins: 0 });
    await user.save();
  }

  ctx.reply('Welcome to 360 Intelligence! Tap "Tap" to earn coins.');
});

// Handle tap action to earn coins
bot.on('text', async (ctx) => {
  if (ctx.message.text === 'Tap') {
    let userId = ctx.from.id.toString();
    let user = await User.findOne({ userId });

    if (!user) {
      user = new User({ userId, coins: 0 });
    }

    user.coins += 1;
    user.lastTap = Date.now();
    await user.save();

    ctx.reply(`You tapped! Your current coins: ${user.coins}`);
  }
});

// Show current stats
bot.command('stats', async (ctx) => {
  let userId = ctx.from.id.toString();
  let user = await User.findOne({ userId });

  if (!user) {
    return ctx.reply('You have not started the game yet.');
  }

  let totalCoins = await User.aggregate([{ $group: { _id: null, totalCoins: { $sum: '$coins' } } }]);
  let totalPlayers = await User.countDocuments();
  let onlinePlayers = await User.countDocuments({ isActive: true });

  ctx.reply(`Your coins: ${user.coins}\nTotal coins collected: ${totalCoins[0]?.totalCoins || 0}\nTotal players: ${totalPlayers}\nOnline players: ${onlinePlayers}`);
});

// Handle user activity
const checkOnlinePlayers = async () => {
  let activeUsers = await User.find({ lastTap: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }); // Active in the last 5 minutes
  await User.updateMany({}, { isActive: false }); // Mark all as inactive
  await User.updateMany({ userId: { $in: activeUsers.map(user => user.userId) } }, { isActive: true }); // Mark active users as online
};

// Automatically update online players and stats periodically
setInterval(async () => {
  await checkOnlinePlayers();
}, 5 * 60 * 1000); // Every 5 minutes

bot.launch();
