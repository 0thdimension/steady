// Short lines from non-dual Buddhist teaching (Prajnaparamita, Madhyamaka, Chan/Zen, Dzogchen and Mahamudra).
// All are plain-English renderings of classic texts, written for this app.
export interface Quote { text: string; source: string }
export const QUOTES: Quote[] = [
  { text: 'Form is emptiness, and emptiness is form.', source: 'Heart Sutra' },
  { text: 'All things are marked by emptiness. They are not born and do not die, not stained and not pure, not growing and not shrinking.', source: 'Heart Sutra' },
  { text: 'With nothing to attain, the mind has no obstacles. With no obstacles, there is no fear.', source: 'Heart Sutra' },
  { text: 'Gone, gone, gone beyond, gone completely beyond. Awake. So be it.', source: 'Heart Sutra' },

  { text: 'Everything that arises from conditions is like a dream, a magic trick, a bubble, a shadow, like dew or a flash of lightning. See it this way.', source: 'Diamond Sutra' },
  { text: 'Wherever there are marks, there is illusion. See that all marks are no marks, and you see the Buddha.', source: 'Diamond Sutra' },
  { text: 'Let the mind come alive without resting anywhere.', source: 'Diamond Sutra' },
  { text: 'The teaching is like a raft. Even the teaching must be let go of, and how much more what is not the teaching.', source: 'Diamond Sutra' },

  { text: 'Asked how to enter the gate of not-two, Vimalakirti said nothing at all. Manjushri praised his silence as the true answer.', source: 'Vimalakirti Sutra' },
  { text: 'Lotuses do not grow on high, dry ground. They grow in mud and marsh. Awakening grows the same way, out of the passions.', source: 'Vimalakirti Sutra' },
  { text: 'Because living beings are sick, I am sick. When their sickness is healed, mine will be healed too.', source: 'Vimalakirti Sutra' },

  { text: 'From the night of my awakening to the night of my passing, I have not spoken a single word. Not speaking is how a Buddha speaks.', source: 'Lankavatara Sutra' },
  { text: 'Like a fool who stares at the pointing finger, those who cling to words never see the meaning beyond them.', source: 'Lankavatara Sutra' },
  { text: 'See that the world is nothing but your own mind, and you go beyond the views of being and non-being.', source: 'Lankavatara Sutra' },

  { text: 'Nothing ceases and nothing arises. Nothing ends and nothing lasts forever. Nothing comes and nothing goes. This is dependent arising, the quiet end of all fabrication.', source: 'Nagarjuna, Verses on the Middle Way' },
  { text: 'Whatever arises in dependence, that is what we call emptiness. It is a name given in dependence, and it is the middle way.', source: 'Nagarjuna, Verses on the Middle Way' },
  { text: 'For one to whom emptiness makes sense, everything makes sense.', source: 'Nagarjuna, Verses on the Middle Way' },
  { text: 'There is not the slightest difference between the round of birth and death and nirvana.', source: 'Nagarjuna, Verses on the Middle Way' },
  { text: 'The awakened ones teach emptiness as letting go of all views. Those who make emptiness itself into a view are beyond help.', source: 'Nagarjuna, Verses on the Middle Way' },
  { text: 'Whoever sees the nature of one thing sees the nature of all things. The emptiness of one is the emptiness of all.', source: 'Aryadeva, Four Hundred Verses' },
  { text: 'A chariot is not its parts, not other than its parts, and not their mere collection, yet we name it in dependence on them. So it is with the self.', source: 'Chandrakirti, Entering the Middle Way' },
  { text: 'When neither something nor nothing remains before the mind, there is nowhere else for it to go. It rests, free of concepts, at peace.', source: 'Shantideva, The Way of the Bodhisattva' },

  { text: 'The great way is not hard. Just give up picking and choosing.', source: 'Sengcan, Faith in Mind' },
  { text: 'Simply stop loving and hating, and everything becomes open and clear.', source: 'Sengcan, Faith in Mind' },
  { text: 'A hair\'s breadth of difference, and heaven and earth are set apart.', source: 'Sengcan, Faith in Mind' },
  { text: 'The war between liking and disliking is the sickness of the mind.', source: 'Sengcan, Faith in Mind' },
  { text: 'The way is round like vast space, with nothing missing and nothing extra.', source: 'Sengcan, Faith in Mind' },
  { text: 'Do not go looking for the truth. Just stop holding on to opinions.', source: 'Sengcan, Faith in Mind' },
  { text: 'To be in tune with it, just say "not two." In not-two, nothing is left out.', source: 'Sengcan, Faith in Mind' },

  { text: 'Awakening has no tree, and the bright mirror has no stand. From the beginning there is not one thing. Where could dust land?', source: 'Huineng, Platform Sutra' },
  { text: 'Think neither of good nor of evil. Right at this moment, what is your original face?', source: 'Huineng, Platform Sutra' },
  { text: 'It is not the wind that moves, and not the flag. It is your mind that moves.', source: 'Huineng, Platform Sutra' },
  { text: 'Meditation and wisdom are not two. They are like a lamp and its light.', source: 'Huineng, Platform Sutra' },
  { text: 'No-thought means being free of thought right in the middle of thinking.', source: 'Huineng, Platform Sutra' },

  { text: 'Asked for the highest truth, Bodhidharma said, "Vast emptiness, nothing holy."', source: 'Bodhidharma (Blue Cliff Record, case 1)' },
  { text: 'All beings share one true nature. It is only hidden by passing dust and false thinking.', source: 'Bodhidharma, Two Entrances and Four Practices' },
  { text: '"My mind is not at peace. Please settle it." "Bring me your mind." "I have looked, and cannot find it." "There, I have settled it for you."', source: 'Bodhidharma and Huike (Gateless Gate, case 41)' },

  { text: 'All Buddhas and all living beings are nothing but one mind. Apart from it, nothing exists.', source: 'Huangbo, Essentials of Transmitting Mind' },
  { text: 'It is right here, right now. The moment you stir a thought, you miss it.', source: 'Huangbo, Essentials of Transmitting Mind' },
  { text: 'People fear letting go of the mind, afraid of falling into emptiness. They do not know that emptiness is not empty. It is the real realm of truth.', source: 'Huangbo, Essentials of Transmitting Mind' },

  { text: 'In this body of flesh lives a true person of no rank, always coming and going through your face. Look!', source: 'Linji, Record of Linji' },
  { text: 'Be your own master wherever you are, and wherever you stand is the true place.', source: 'Linji, Record of Linji' },
  { text: 'There is nothing to work hard at. Just be ordinary. Relieve yourself, put on your clothes, eat your rice, and lie down when you are tired.', source: 'Linji, Record of Linji' },

  { text: 'The Way needs no cultivating. Just do not stain it.', source: 'Mazu, Recorded Sayings' },
  { text: 'Zhaozhou asked, "What is the Way?" Nanquan said, "Ordinary mind is the Way."', source: 'Nanquan (Gateless Gate, case 19)' },
  { text: 'The Way is not a matter of knowing or not knowing. Knowing is illusion. Not knowing is blankness. Truly reach it and it is open and vast like space.', source: 'Nanquan (Gateless Gate, case 19)' },

  { text: '"I have just arrived. Please teach me." "Have you eaten your rice gruel?" "Yes." "Then wash your bowl."', source: 'Zhaozhou (Gateless Gate, case 7)' },
  { text: '"I have brought nothing with me. What now?" "Put it down." "If I brought nothing, what is there to put down?" "Then carry it out."', source: 'Zhaozhou (Book of Serenity, case 57)' },
  { text: 'Whether a monk had visited before or was new, Zhaozhou told him the same thing: "Go have some tea."', source: 'Zhaozhou (koan)' },

  { text: 'Every day is a good day.', source: 'Yunmen (Blue Cliff Record, case 6)' },
  { text: 'Everyone has their own light. Look for it, and you cannot see it. All is dark.', source: 'Yunmen (Blue Cliff Record, case 86)' },

  { text: 'Do not seek it from others, or it drifts far away. Going on alone, I meet it everywhere. It is me, yet I am not it.', source: 'Dongshan, verse on crossing the stream' },
  { text: 'As in a jewel mirror, form and reflection look at each other. You are not it, but in truth it is you.', source: 'Dongshan, Song of the Jewel Mirror Samadhi' },
  { text: 'Right in the light there is darkness, but do not take it as darkness. Right in the dark there is light, but do not see it as light.', source: 'Shitou, Harmony of Difference and Sameness' },
  { text: 'My miraculous power and wonderful work: carrying water and hauling firewood.', source: 'Layman Pang' },
  { text: 'Before I practiced, mountains were mountains. With some insight, mountains were no longer mountains. Now, at rest, mountains are simply mountains again.', source: 'Qingyuan Weixin' },

  { text: 'Flowers in spring, the moon in autumn, cool wind in summer, snow in winter. If nothing useless clings to the mind, every season is a good season.', source: 'Wumen, Gateless Gate (case 19)' },
  { text: 'The great Way has no gate, yet a thousand roads lead to it. Pass through this barrier and you walk freely between heaven and earth.', source: 'Wumen, Gateless Gate (preface)' },

  { text: 'To study the Buddha way is to study the self. To study the self is to forget the self. To forget the self is to be awakened by all things.', source: 'Dogen, Genjokoan' },
  { text: 'Awakening is like the moon reflected in water. The moon does not get wet, and the water is not broken.', source: 'Dogen, Genjokoan' },
  { text: 'Flowers fall even though we love them, and weeds spread even though we dislike them.', source: 'Dogen, Genjokoan' },
  { text: 'Think of not thinking. How do you think of not thinking? Beyond thinking.', source: 'Dogen, Fukanzazengi' },
  { text: 'Time itself is being, and all being is time.', source: 'Dogen, Uji (Being-Time)' },
  { text: 'Practice and awakening are not two. Even a beginner\'s first effort is the whole of original awakening.', source: 'Dogen, Bendowa' },
  { text: '"Why not let a helper do this?" "Others are not me." "But why now, in this heat?" "If not now, when?"', source: 'Dogen, Instructions for the Cook' },

  { text: 'All beings are Buddhas from the very start. It is like water and ice. Without water there is no ice, and apart from beings there are no Buddhas.', source: 'Hakuin, Song of Zazen' },
  { text: 'Not knowing how near the truth is, we look for it far away. It is like standing in water and crying out from thirst.', source: 'Hakuin, Song of Zazen' },
  { text: 'Two hands clap and there is a sound. What is the sound of one hand?', source: 'Hakuin (koan)' },

  { text: 'Each of you received the Buddha mind from your mother at birth, and nothing else. It is unborn and wonderfully bright.', source: 'Bankei, sermons' },
  { text: 'While you listen to me, if a crow caws or a sparrow chirps behind you, you know which it is without trying. That is the Unborn at work.', source: 'Bankei, sermons' },
  { text: '"I was born with a short temper." "Show it to me." "I am not angry right now." "Then you were not born with it. You make it yourself."', source: 'Bankei, sermons' },

  { text: 'The thief left one thing behind: the moon in my window.', source: 'Ryokan, haiku' },
  { text: 'Who says my poems are poems? My poems are not poems. When you see that they are not poems, then we can talk about poetry.', source: 'Ryokan, poem' },
  { text: 'A few measures of rice in my bag, a bundle of sticks by the fire. Who asks about delusion or awakening?', source: 'Ryokan, poem' },

  { text: 'Mind alone is the seed of everything. Both the round of existence and nirvana spring from it.', source: 'Saraha, doha' },
  { text: 'The lamps in the house are lit, yet the blind live in darkness. The natural state is everywhere and near, yet to the confused it seems far away.', source: 'Saraha, Royal Song' },
  { text: 'Bees know that honey is found in flowers. That samsara and nirvana are not two, how will the confused ever understand?', source: 'Saraha, Royal Song' },
  { text: 'Gaze and gaze into the sky-like nature, pure from the very start, and the seeing itself falls away.', source: 'Saraha, Treasury of Songs' },

  { text: 'Son, appearances do not bind you. Grasping binds you. So cut through grasping, Naropa.', source: 'Tilopa, advice to Naropa' },
  { text: 'When mist and clouds dissolve into the sky, they go nowhere and stay nowhere. In the same way, waves of thought settle when the mind sees itself.', source: 'Tilopa, Ganges Mahamudra' },
  { text: 'Let the water muddied by thinking settle by itself. Do not accept or reject what arises. Leave it just as it is.', source: 'Tilopa, Ganges Mahamudra' },
  { text: 'Do not dwell on the past. Do not imagine the future. Do not think about the present. Do not analyze. Do not control. Just rest.', source: 'Tilopa, Six Words of Advice' },
  { text: 'Just as alchemy turns iron into gold, troubling emotions become wisdom that is not two.', source: 'Naropa, song' },

  { text: 'Afraid of death, I went to the mountains. Meditating on its uncertain hour, I reached the deathless nature of mind. Now all fear of death is gone.', source: 'Milarepa (quoted in Words of My Perfect Teacher)' },
  { text: 'My teacher showed me that all things are my own mind, and that mind itself is clear and empty. So whatever tricks the demons play, I am not afraid.', source: 'Milarepa, Hundred Thousand Songs' },
  { text: 'Even after so long in retreat, I have not let go of clinging to a self. What use is practice without giving that up?', source: 'Milarepa, Hundred Thousand Songs' },

  { text: 'My view is higher than the sky, yet my care about cause and effect is finer than flour.', source: 'Padmasambhava (attributed)' },
  { text: 'Whatever thoughts arise, recognize their nature and let them free themselves as the play of your own being.', source: 'Longchenpa, Advice on the Ultimate Meaning' },
  { text: 'In meditation, stay loose and easy in an open awareness that is like space.', source: 'Longchenpa, Finding Rest in Illusion' },
  { text: 'If you let go of it all, all of it, that is what really matters.', source: 'Patrul Rinpoche, Advice to Myself' },
  { text: 'Recognize your own nature directly. Decide on this one thing. Have confidence that it frees itself.', source: 'Garab Dorje, Three Words That Strike the Vital Point' },
  { text: 'May the mind turn toward the teaching. May the teaching become the path. May the path clear away confusion. May confusion dawn as wisdom.', source: 'Gampopa, Four Dharmas' },
  { text: 'It does not exist, for even the Buddhas do not see it. It is not nothing, for it is the ground of all samsara and nirvana.', source: 'Rangjung Dorje, Aspiration of Mahamudra' },

];
