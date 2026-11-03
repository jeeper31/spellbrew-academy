/* Spellbrew Academy game data */
window.SB_DATA = (function(){
const LIQUID = { dew:'#8fd3e8', moss:'#6fae4f', gold:'#e9b949', ember:'#e2703a', storm:'#6f86b8', night:'#4b3a7a' };
const R = (name, tier, color, blurb, ings) => ({ name, tier, color, blurb, ings: ings.map(([icon, n, liquid]) => ({icon, name:n, liquid})) });
// The eight recipes, in the order and with the ingredients the spec lists.
const RECIPES = [
  R('Spark Dew', 1, 'dew', 'A first sparkle of magic, bright as morning.',
    [['💧','Dewdrop','dew'],['✨','Glowdust','gold']]),
  R('Moonmoss Tea', 1, 'moss', 'A calm green tea that smells like a forest at night.',
    [['🌿','Moonmoss','moss'],['⭐','Star Sugar','gold'],['🏞️','Brookwater','dew']]),
  R('Firefly Phial', 2, 'gold', 'A little bottle of glowing light for dark places.',
    [['🪲','Firefly','gold'],['🍯','Amber Sap','ember'],['🔷','Glass Shard','dew']]),
  R('Courage Cordial', 2, 'ember', 'A warm sip that makes brave hearts braver.',
    [['🦁','Lionmane','gold'],['🐝','Honeycomb','gold'],['🌰','Ember Seed','ember'],['🍂','Copper Leaf','ember']]),
  R('Memory Mist', 3, 'night', 'A silver mist that helps lost things be remembered.',
    [['🌼','Forget-me-not','storm'],['🖋️','Silver Ink','night'],['🪶','Owl Feather','night'],['🕯️','Midnight Oil','night']]),
  R('Stormbottle', 3, 'storm', 'A rumbling bottle with a tiny storm inside.',
    [['🧂','Thunder Salt','storm'],['☁️','Cloudwool','storm'],['🫧','Rain Pearl','dew'],['🌱','Gale Seed','moss'],['⚡','Lightning Wick','gold']]),
  R('Dragonscale Draught', 4, 'ember', 'A glowing red draught, warm as a dragon\'s hearth.',
    [['🐉','Dragon Scale','moss'],['🍒','Crimson Berry','ember'],['🌫️','Ash','night'],['🪙','Gold Dust','gold'],['🔥','Phoenix Down','ember']]),
  R('Archmage Elixir', 4, 'night', 'The tower\'s greatest brew, full of starlight.',
    [['🌟','Starcore','gold'],['🌑','Void Lily','night'],['⏳','Time Sand','gold'],['🌙','Moonstone','dew'],['🌳','Ancient Root','moss'],['💧','Wizard\u2019s Tear','dew']]),
];
// Brewing rank by how many DIFFERENT potions have been made (0..8).
const BREW_RANKS = [ [0,'Novice Apprentice'],[1,'Spark Keeper'],[3,'Cauldron Hand'],[5,'Alchemist'],[7,'Potion Master'],[8,'Archmage'] ];
const XP_RANKS = [ [0,'Spark Hand'],[24,'Bottle Tosser'],[60,'Phial Knight'],[120,'Courtyard Adept'],[220,'Storm Caller'],[360,'Wyrm Warden'],[540,'Archmage\u2019s Arm'] ];
// Dungeon: 8 rooms, 4 across then back. fav = recipe index the creature is weak to; tier = that recipe's tier.
const ROOMS = [
  { name:'Dusty Nook',   shape:'round',   monster:'Puffmite',        about:'a dusty puff that sneezes glitter', fav:0, hp:4,  level:1, tier:1,
    hint:'Tiny sneezes and a little glitter.',
    hits:['Achoo! It sneezes a cloud of glitter.','It sits down, dizzy, and blinks at the ceiling.','It hiccups little stars. Hic!'],
    home:'The Puffmite gives one last glittery sneeze and rolls home to its cushion pile.' },
  { name:'Moss Cellar',  shape:'cellar',  monster:'Moss Toad',       about:'a mossy toad', fav:1, hp:6,  level:1, tier:1,
    hint:'Wet leaves and something heavy hopping.',
    hits:['It flops onto its belly with a soft plop.','It sneezes so hard its moss hat spins!','It forgets which way is up and hops in a circle.'],
    home:'The Moss Toad lets out a sleepy ribbit and hops home to its puddle.' },
  { name:'Dim Gallery',  shape:'gallery', monster:'Gloom Moth',      about:'a moth that likes the dark', fav:2, hp:8,  level:2, tier:2,
    hint:'Soft wings in the dark.',
    hits:['It forgets which way is up and flutters upside down.','It sits down, dizzy, between the pillars.','It hiccups little stars and giggles.'],
    home:'The Gloom Moth glows a little brighter and flutters home toward the moonlight.' },
  { name:'Cloak Closet', shape:'closet',  monster:'Nervebat',        about:'a jumpy little bat', fav:3, hp:10, level:2, tier:2,
    hint:'A squeak, then the coats go still.',
    hits:['It flops into a pile of cloaks.','It sneezes and its big ears flap over its eyes.','It hangs the wrong way, forgetting which way is up.'],
    home:'The Nervebat yawns, folds its wings, and flaps home to nap in the rafters.' },
  { name:'Fog Landing',  shape:'landing', monster:'Muddle Wisp',     about:'a wisp of fog that forgets things', fav:4, hp:12, level:3, tier:3,
    hint:'This hall can\u2019t quite remember you.',
    hits:['It forgets which way is up and swirls into a pretzel.','It hiccups little stars into the fog.','It sits down, dizzy, in a soft gray puddle.'],
    home:'The Muddle Wisp finally remembers the way and drifts home through a window.' },
  { name:'Storm Stair',  shape:'spiral',  monster:'Storm Cloud',     about:'a grumpy little rain cloud', fav:5, hp:14, level:4, tier:3,
    hint:'The steps crackle under nothing.',
    hits:['It sneezes a tiny rumble of thunder.','It flops onto the steps like a pillow.','It hiccups little stars instead of raindrops.'],
    home:'The Storm Cloud shows off a small rainbow and floats home to the sky.' },
  { name:'Cinder Hall',  shape:'hall',    monster:'Cinder Wyrmling', about:'a small, warm dragon', fav:6, hp:16, level:5, tier:4,
    hint:'Warm scrapes along the stone.',
    hits:['It sneezes a puff of harmless smoke.','It sits down, dizzy, with a plop.','It forgets which way is up and rolls onto its back.'],
    home:'The Cinder Wyrmling curls its tail, waves a wing, and toddles home to its warm hearth.' },
  { name:'Lantern End',  shape:'lantern', monster:'Shade Herald',    about:'a quiet figure with a lantern', fav:7, hp:20, level:6, tier:4,
    hint:'An old light is waiting.',
    hits:['Its lantern flickers and it gives a polite bow.','It sits down, dizzy, and its hood flops over its eyes.','It hiccups little stars from its lantern.'],
    home:'The Shade Herald\u2019s lantern blazes gold. It bows, says thank you, and strolls home.' },
];
const FIZZLES = ['The cork is stuck! The bottle bounces off.','Pfff… just harmless steam.','Splash! It lands on the stones instead.','Oops, the wrong mix. It fizzles into bubbles.'];
// Portrait options. Hair/face labels shown to the child; keys match file names.
const HAIR = {
  g: [['waves','Long waves'],['puffs','Two puffs'],['curls','Curls'],['bangs','Straight bangs'],['sidepart','Side part'],['braids','Braids']],
  b: [['crop','Short crop'],['tousled','Tousled'],['sidepart','Side part'],['curls','Curls'],['buzz','Buzz cut'],['swept','Swept hair']],
};
const FACES = {
  g: [['smile','Smile'],['calm','Calm'],['freckles','Freckles'],['glasses','Glasses'],['bright','Bright'],['wink','Wink']],
  b: [['smile','Smile'],['calm','Calm'],['freckles','Freckles'],['glasses','Glasses'],['bright','Bright'],['grin','Grin']],
};
const SKINS = ['#f6dcc7','#efc9a8','#e2b48c','#c99a6e','#b07e52','#8e5f3c','#6b432a','#3f2718'];
return { LIQUID, RECIPES, BREW_RANKS, XP_RANKS, ROOMS, FIZZLES, HAIR, FACES, SKINS };
})();
