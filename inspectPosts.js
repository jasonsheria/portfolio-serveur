// apiena/inspectPosts.js
// Script Node.js pour diagnostiquer les posts, sites et users (version dotenv/MongoDB Atlas)
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Erreur: MONGODB_URI non défini dans .env');
  process.exit(1);
}

const postSchema = new mongoose.Schema({}, { strict: false, collection: 'posts' });
const siteSchema = new mongoose.Schema({}, { strict: false, collection: 'sites' });
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });

const Post = mongoose.model('Post', postSchema);
const Site = mongoose.model('Site', siteSchema);
const User = mongoose.model('User', userSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  const posts = await Post.find({}).lean();
  for (const post of posts) {
    const site = post.site ? await Site.findById(post.site).lean() : null;
    const user = post.user ? await User.findById(post.user).lean() : null;
    console.log('---');
    console.log('Post:', post._id, post.title);
    console.log('  Site:', site ? `${site._id} (${site.siteName})` : 'null');
    console.log('  User:', user ? `${user._id} (${user.email})` : 'null');
  }
  await mongoose.disconnect();
}

main().catch(console.error);
