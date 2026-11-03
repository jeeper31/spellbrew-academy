/* Spellbrew Academy word list: 120 words in 4 tiers (20/30/40/30).
   Fields: word | syllables | pattern | definition | sentence (uses the word) | hint
   Patterns: vowel = tricky vowels, silent = silent letters, homophone, contraction, suffix, double = double letters */
(function(){
const T = {
1: `because|be·cause|vowel|for the reason that|I wore boots because it was raining.|The middle sounds like "caw" but is spelled a-u-s-e.
friend|friend|vowel|a person you like and trust|My friend saved me a seat at lunch.|"I before E" here: f-r-I-E-n-d. A friend to the END.
beautiful|beau·ti·ful|vowel|very pretty or lovely to see|The sunset over the lake was beautiful.|It begins with "beau" — b-e-a-u — then "ti" and "ful" with one L.
said|said|vowel|spoke words; the past of say|Mom said we could stay up late tonight.|It sounds like "sed" but has an A-I in the middle.
again|a·gain|vowel|one more time|Can you read that page again?|A + gain. The second part is spelled like "gain".
people|peo·ple|vowel|more than one person|Lots of people came to the school fair.|There is a sneaky O after the E: p-e-O-p-l-e.
would|would|silent|a word used to talk about what might happen|I would love to visit the ocean.|Silent L, like in could and should: w-o-u-l-d.
knife|knife|silent|a tool with a sharp blade for cutting|Dad used a knife to slice the bread.|The K at the start is silent.
write|write|silent|to put letters or words on paper|Please write your name at the top.|The W at the start is silent.
their|their|homophone|belonging to them|The kids hung their coats on the hooks.|It belongs to them, and it has "heir" inside it.
there|there|homophone|in or at that place|Put the box over there by the door.|It has "here" inside it, because it is about a place.
they're|they're|contraction|short for "they are"|They're going to the park after school.|They + are. The apostrophe takes the place of the A.
don't|don't|contraction|short for "do not"|Please don't forget your lunch.|Do + not. The apostrophe takes the place of the O in not.
can't|can't|contraction|short for "cannot"|I can't find my other sock.|Can + not. The apostrophe takes the place of the N and O.
happy|hap·py|double|feeling glad or pleased|The puppy looked happy to see us.|Two Ps in the middle, then Y.
little|lit·tle|double|small in size|A little bird landed on the fence.|Two Ts, then the "le" ending.
running|run·ning|double|moving fast on your feet|The dog was running across the yard.|Run, then double the N before adding -ing.
careful|care·ful|suffix|paying close attention to stay safe|Be careful when you carry the hot soup.|Care + ful. The suffix "ful" has only one L.
thankful|thank·ful|suffix|feeling glad about something you got|I am thankful for my warm blanket.|Thank + ful, with only one L at the end.
knew|knew|silent|past of know; was sure about|She knew the answer right away.|Silent K, like know. Not "new".`,
2: `piece|piece|vowel|a part of something|May I have a piece of apple pie?|You want a PIEce of PIE: p-i-e-c-e.
believe|be·lieve|vowel|to think something is true|I believe you can win the race.|Never beLIEve a LIE: there is a "lie" in the middle.
field|field|vowel|an open area of land|The cows grazed in the green field.|I before E: f-i-e-l-d.
enough|e·nough|vowel|as much as you need|We have enough cups for everyone.|The "uff" sound is spelled o-u-g-h.
laugh|laugh|vowel|to make sounds because something is funny|The joke made the whole class laugh.|The "aff" sound is spelled a-u-g-h.
busy|bus·y|vowel|having lots to do|The kitchen was busy before dinner.|It sounds like "bizzy" but starts like "bus".
guess|guess|silent|to give an answer when you are not sure|Can you guess what is in the box?|There is a silent U after the G, and a double S.
knock|knock|silent|to hit a door to show you are there|Please knock before you come in.|Silent K at the start, and it ends in c-k.
listen|lis·ten|silent|to pay attention to sounds|Listen to the birds singing outside.|There is a silent T in the middle.
castle|cas·tle|silent|a large old building with towers and walls|The king lived in a stone castle.|Silent T: c-a-s-T-l-e.
thumb|thumb|silent|the short, thick finger on your hand|I gave my friend a thumbs-up with my thumb.|There is a silent B at the end.
island|is·land|silent|land with water all around it|We took a boat to the little island.|The S is silent: is + land.
honest|hon·est|silent|telling the truth|Being honest is always the best choice.|The H at the start is silent.
weather|weath·er|homophone|what the sky and air are like outside|The weather is sunny and warm today.|It has "eat" inside: w-EAT-her. Rain or shine.
whether|wheth·er|homophone|if; used to show a choice|I can't decide whether to wear red or blue.|This one starts with W-H, like "which".
peace|peace|homophone|a calm, quiet time with no fighting|The library is full of peace and quiet.|A PEAce of PEAce: it starts with "pea".
threw|threw|homophone|past of throw; tossed|She threw the ball to her brother.|It looks like "throw" with E-W at the end.
wouldn't|would·n't|contraction|short for "would not"|The jar lid wouldn't come off.|Would + not. The apostrophe replaces the O in not.
couldn't|could·n't|contraction|short for "could not"|I couldn't reach the top shelf.|Could + not. The apostrophe replaces the O in not.
you're|you're|contraction|short for "you are"|You're my favorite reading buddy.|You + are. The apostrophe replaces the A.
we're|we're|contraction|short for "we are"|We're baking cookies this afternoon.|We + are. The apostrophe replaces the A.
let's|let's|contraction|short for "let us"|Let's play a game after dinner.|Let + us. The apostrophe replaces the U.
happiness|hap·pi·ness|suffix|the feeling of being happy|The new puppy filled our home with happiness.|Happy + ness: change the Y to I first.
careless|care·less|suffix|not paying enough attention|A careless mistake made me lose a point.|Care + less, with a double S.
quickly|quick·ly|suffix|in a fast way|The rabbit hopped quickly into the bush.|Quick + ly.
hoping|hop·ing|suffix|wishing for something to happen|I am hoping for snow this weekend.|Hope + ing: drop the E. One P, not two.
letter|let·ter|double|a mark like A or B; also a note you mail|I sent a letter to my grandma.|Two Ts in the middle.
balloon|bal·loon|double|a rubber bag filled with air|The red balloon floated into the sky.|Double L AND double O.
address|ad·dress|double|where someone lives|Write your address on the envelope.|Double D and double S.
different|dif·fer·ent|double|not the same|Each snowflake is different.|Double F, and it ends in -ent.`,
3: `receive|re·ceive|vowel|to get or be given something|Did you receive my birthday card?|E before I after C: re-C-E-I-ve.
ceiling|ceil·ing|vowel|the top surface of a room|A spider was hanging from the ceiling.|After C, it's E then I: c-E-I-ling.
neighbor|neigh·bor|vowel|a person who lives next to you|Our neighbor waters our plants when we travel.|It starts like a horse's "neigh".
weird|weird|vowel|very strange or unusual|The robot made a weird beeping sound.|This weird word breaks the rule: w-E-I-r-d.
height|height|vowel|how tall something is|We measured the height of the sunflower.|It's spelled like "eight" with an H in front: h-EIGHT.
mountain|moun·tain|vowel|a very high hill|We hiked to the top of the mountain.|The ending sounds like "tin" but is spelled t-a-i-n.
villain|vil·lain|vowel|the bad guy in a story|The villain in the movie stole the crown.|Double L, and the end is spelled a-i-n.
separate|sep·a·rate|vowel|to pull apart; not together|Please separate the red blocks from the blue ones.|There's "a rat" in sep-A-RAT-e.
knowledge|knowl·edge|silent|what you know and understand|Reading books adds to your knowledge.|Know + ledge. The K is silent and it ends in -dge.
wrestle|wres·tle|silent|to struggle or roll around holding someone|The puppies like to wrestle on the rug.|Silent W at the start and a silent T.
autumn|au·tumn|silent|the season after summer; fall|The leaves turn orange in autumn.|There's a silent N at the end.
column|col·umn|silent|a tall post, or a line going up and down|Write the numbers in the first column.|There's a silent N at the end.
doubt|doubt|silent|to not be sure about something|I doubt it will rain today.|There's a silent B before the T.
scissors|scis·sors|silent|a tool with two blades for cutting paper|Hand me the scissors, please.|It starts with S-C, and has a double S in the middle.
whistle|whis·tle|silent|to make a high sound by blowing|The coach blew her whistle loudly.|Silent T: whis-T-le.
aloud|a·loud|homophone|in a voice others can hear|Our teacher read the story aloud.|A + loud. You say it out loud.
allowed|al·lowed|homophone|let someone do something|We are allowed to have one snack.|Allow + ed, with a double L.
dessert|des·sert|homophone|a sweet food after a meal|We had ice cream for dessert.|Dessert has two Ss because you want seconds.
break|break|homophone|to make something come apart; or a rest|Let's take a short break from homework.|It's spelled like "bread" with K: b-r-E-A-k.
brake|brake|homophone|the part that slows a bike or car|Squeeze the brake to slow your bike.|It ends like "rake" and "lake".
weigh|weigh|homophone|to find out how heavy something is|We weigh the flour before baking.|It sounds like "way" and is spelled like "eight" without the T.
its|its|homophone|belonging to it|The cat licked its paw.|No apostrophe. It's like "his" or "hers".
it's|it's|contraction|short for "it is"|It's my turn to feed the fish.|It + is. The apostrophe replaces the I in is.
shouldn't|should·n't|contraction|short for "should not"|You shouldn't run near the pool.|Should + not. Remember the silent L.
they'll|they'll|contraction|short for "they will"|They'll be here in five minutes.|They + will. The apostrophe replaces "wi".
we've|we've|contraction|short for "we have"|We've finished all our chores.|We + have. The apostrophe replaces "ha".
would've|would·'ve|contraction|short for "would have"|I would've come if I had known.|Would + have. It is never "would of".
who's|who's|contraction|short for "who is"|Who's coming to the movie?|Who + is. The apostrophe replaces the I.
excitement|ex·cite·ment|suffix|a happy, eager feeling|The kids buzzed with excitement before the trip.|Excite + ment. Keep the E.
carefully|care·ful·ly|suffix|with close attention|Carry the eggs carefully.|Care + ful + ly. That makes a double L.
happily|hap·pi·ly|suffix|in a happy way|The kitten purred happily on my lap.|Happy + ly: change the Y to I.
argument|ar·gu·ment|suffix|a disagreement, or reasons for an idea|My brother and I had an argument about the remote.|Argue + ment: drop the E!
truly|tru·ly|suffix|really; honestly|I am truly sorry I was late.|True + ly: drop the E.
achievement|a·chieve·ment|suffix|something great you worked hard for|Finishing the marathon was a big achievement.|Achieve + ment. I before E: ach-I-E-ve.
tomorrow|to·mor·row|double|the day after today|We have a spelling test tomorrow.|One M and a double R.
necessary|nec·es·sar·y|double|needed; must have|A coat is necessary in the snow.|One Collar, two Sleeves: one C, double S.
occasion|oc·ca·sion|double|a special event or time|A birthday is a happy occasion.|Double C, but only one S.
success|suc·cess|double|getting what you worked for|The bake sale was a big success.|Double C AND double S.
beginning|be·gin·ning|double|the start of something|The beginning of the book was exciting.|Begin, then double the N before -ing.
swimming|swim·ming|double|moving through water using your body|We went swimming in the lake.|Swim, then double the M before -ing.`,
4: `queue|queue|vowel|a line of people waiting|We stood in a queue for the roller coaster.|Q, then U-E-U-E. Four vowels in a row!
foreign|for·eign|vowel|from another country|She speaks a foreign language at home.|It ends in -eign, like "reign".
mischievous|mis·chie·vous|vowel|playfully causing small trouble|The mischievous kitten unrolled the toilet paper.|Only three syllables: mis-chie-vous. No extra I before "ous".
cautious|cau·tious|vowel|careful to avoid danger|Be cautious on the icy steps.|It starts like "caution": c-a-u-t-i-o-u-s.
nuisance|nui·sance|vowel|something annoying|The buzzing fly was a nuisance.|The start is n-u-I: nui-sance.
biscuit|bis·cuit|vowel|a small baked bread or cookie|Grandpa spread jam on his biscuit.|There's a sneaky U-I: bis-C-U-I-t.
aisle|aisle|silent|a walkway between rows of seats or shelves|The cereal is in the third aisle.|Silent S, and it starts with A-I.
rhyme|rhyme|silent|words that end with the same sound|"Cat" and "hat" rhyme.|Silent H after the R, and a Y.
rhythm|rhy·thm|silent|a steady beat in music|Clap your hands to the rhythm.|R-H-Y, then T-H-M. No vowels except Y!
knuckle|knuck·le|silent|a bump where your finger bends|I bumped my knuckle on the desk.|Silent K, then -ck- and -le.
salmon|sal·mon|silent|a pink-orange fish|Bears catch salmon in the river.|There's a silent L: sa-L-mon.
subtle|sub·tle|silent|small and hard to notice|There was a subtle smell of vanilla.|There's a silent B: su-B-tle.
isle|isle|homophone|a small island|The pirates sailed to a tiny isle.|Like "aisle" without the A.
cereal|ce·re·al|homophone|grain food often eaten with milk|I poured cereal into my bowl.|It starts like "cell": c-e-r-e-a-l.
serial|se·ri·al|homophone|in a series, one after another|Each phone has a serial number.|It starts like "series": s-e-r-i-a-l.
principal|prin·ci·pal|homophone|the leader of a school|The principal visited our class.|The principal is your PAL.
compliment|com·pli·ment|homophone|a kind thing you say about someone|She gave me a compliment on my drawing.|I like to get a compl-I-ment. It has an I in the middle.
should've|should·'ve|contraction|short for "should have"|I should've brought an umbrella.|Should + have. Never "should of".
could've|could·'ve|contraction|short for "could have"|We could've won with one more goal.|Could + have. Never "could of".
they'd|they'd|contraction|short for "they would" or "they had"|They'd like to join our team.|They + would. The apostrophe replaces "woul".
o'clock|o'·clock|contraction|short for "of the clock"|School starts at eight o'clock.|O + apostrophe + clock.
courageous|cou·ra·geous|suffix|very brave|The courageous firefighter saved the cat.|Courage + ous. Keep the E so the G stays soft.
noticeable|no·tice·a·ble|suffix|easy to see or notice|There was a noticeable stain on my shirt.|Notice + able. Keep the E so the C stays soft.
mysterious|mys·te·ri·ous|suffix|strange and hard to explain|We heard a mysterious noise in the attic.|Mystery + ous: change the Y to I.
responsible|re·spon·si·ble|suffix|in charge of something; trustworthy|I am responsible for feeding the dog.|It ends in -ible, not -able.
ridiculous|ri·dic·u·lous|suffix|very silly|The clown wore a ridiculous hat.|It starts with R-I-D, not R-E-D.
embarrass|em·bar·rass|double|to make someone feel shy or silly|Please don't embarrass me in front of my friends.|Double R AND double S.
committee|com·mit·tee|double|a group that plans or decides something|The party committee picked the snacks.|Three doubles: MM, TT, EE.
occurrence|oc·cur·rence|double|something that happens|A rainbow is a rare occurrence.|Double C, double R, and it ends in -ence.
parallel|par·al·lel|double|lines that never meet|Railroad tracks are parallel.|There are two Ls in the middle and one at the end.`};
const out=[];
for (const tier of [1,2,3,4]) {
  for (const line of T[tier].split('\n')) {
    const [word,syl,pattern,definition,sentence,hint] = line.split('|');
    out.push({id: word, word, syllables: syl, pattern, definition, sentence, hint, tier});
  }
}
window.SB_WORDS = out;
})();
