// The import screen for the Open Trivia Database (RZ-023): which downloaded questions are
// not fit for Rabakz, beyond what `blocklist.txt` and the validator already reject. Pure.
//
// Rabakz is played by a whole room, children included, on a shared TV, as a buzzer race with
// no timer, and the options are shuffled. So a question is dropped here when it is
// - unsuitable for all ages in its subject (alcohol, tobacco, drugs, violence, adult titles);
// - true only on the day it was written ("currently", "as of 2016", records that change);
// - about an internet fad that has passed;
// - dependent on something the TV does not show (a sound, a picture, how a word is said);
// - dependent on the order of its options ("All of the above").
//
// `blocklist.txt` holds the words that are wrong in any question and fails the build for the
// whole bank. This file holds the judgements that apply to this dataset only.
//
// Every pattern is matched against the text as `wordFold` leaves it: lower case, accents and
// apostrophes removed, every other mark a space. So "world's" is "worlds" and "e-cigarette" is
// "e cigarette".

import type { SourceQuestion } from '../src/tools';
import { wordFold } from '../src/tools';

export interface ScreenHit {
  /** The name of the rule, as the import report lists it. */
  readonly rule: string;
  /** The words that hit. */
  readonly match: string;
}

/** Dataset categories left out whole, by their id in the API, with the reason. */
export const EXCLUDED_CATEGORIES: Readonly<Record<number, string>> = {
  26: 'Celebrities: who is famous, married or alive changes, and much of it is gossip',
};

interface ScreenRule {
  readonly rule: string;
  /** Which text the pattern is tried on. */
  readonly where: 'prompt' | 'options' | 'all';
  readonly pattern: RegExp;
  /** Phrases taken out of the text first, so that a harmless use does not hit. */
  readonly except?: RegExp;
}

const words = (list: string): string => list.trim().split(/\s*\|\s*/).join('|');

const RULES: readonly ScreenRule[] = [
  {
    rule: 'depends on option order',
    where: 'options',
    pattern: new RegExp(
      `\\b(${words(
        'of the above | of the below | the above | above | all of these | all of them | all of the following | both of these | both of them | both a and b | a and b | b and c | a and c | first two | last two | all three | all four | all are | all were | neither of | none of the others | the other three | the other answers | other options | the others',
      )})\\b`,
    ),
  },
  {
    rule: 'needs a sound or a picture',
    where: 'prompt',
    pattern: new RegExp(
      `\\b(${words(
        'pictured | this image | this picture | this photo | this photograph | shown here | shown above | shown below | image above | image below | picture above | picture below | this logo | this flag | this map | this clip | this sound | this audio | listen | pronounced | pronounce | pronunciation | pronouncing | mispronounced | sounds like | rhymes with | homophone | homophones | silent letter',
      )})\\b`,
    ),
  },
  {
    rule: 'dated wording',
    where: 'prompt',
    pattern: new RegExp(
      `\\b(${words(
        'as of | as at | current | currently | to date | to this day | latest | newest | most recent | most recently | recently | recent | upcoming | forthcoming | at present | presently | nowadays | these days | so far | this year | last year | next year | this decade | still alive | still living | still active | still holds | still in | is still | are still | youngest living | oldest living | reigning | incumbent | yet to | not yet | has yet | have yet | will be | will host | is hosting | is going to | are going to | is set to | are set to | will be released | set to release | set to be released | is planned | are planned | scheduled to | expected to | since 20\\d\\d | ever since',
      )})\\b`,
    ),
    except:
      /\b(electric current|electrical current|alternating current|direct current|ocean current|ocean currents|current code)\b/g,
  },
  {
    rule: 'record or count that changes',
    where: 'prompt',
    pattern: new RegExp(
      `\\b(${words(
        'highest grossing | top grossing | best selling | bestselling | best seller | top selling | most sold | most subscribed | most viewed | most followed | most streamed | most downloaded | most liked | most watched | most visited | most played | most popular | most valuable company | most valuable brand | most expensive | most successful | most decorated | most wins | most goals | most points | most titles | most medals | most championships | most grand slams | most oscars | most academy awards | most grammys | most awards | most career | has won the most | have won the most | has scored the most | has sold the most | have sold the most | has attended the most | has appeared in the most | has hosted the most | has received the most | has played the most | has made the most | has had the most | won the most | has the most | have the most | is the only | are the only | the only .{1,60} to | holds the \\w+ record | fastest road | largest city | largest cities | owned by | is owned | have there been | has there been | most populous | most populated | most spoken | richest | wealthiest | highest paid | world record | world records | record holder | holds the record | a record | record breaking | personal best | leading scorer | leading goalscorer | leading goal scorer | leading appearance | top scorer | top goalscorer | all time | of all time | population | populations | inhabitants | tallest building | tallest buildings | tallest tower | tallest skyscraper | tallest structure | tallest man made | tallest roller | fastest production | fastest car | fastest train | fastest roller | fastest man | fastest woman | fastest supercomputer | largest company | largest economy | largest employer | largest retailer | largest airline | largest bank | largest producer | largest exporter | largest importer | largest army | largest navy | biggest company | longest running | longest reigning | longest serving | market share | net worth | how many copies | copies sold | sold worldwide | has sold | have sold | how many seasons does | how many seasons has | how many seasons have | how many seasons are | how many episodes does | how many episodes has | how many episodes have | how many episodes are | how many games are | how many games have | how many games has | how many films have | how many films has | how many films are | how many movies have | how many movies has | how many movies are | how many albums has | how many albums have | how many studio albums has | how many studio albums have | how many books has | how many books have | how many novels has | how many novels have | how many titles | how many times has | how many times have | how many member | how many members | how many countries are | how many states are | how many people live | gdp',
      )})\\b`,
    ),
  },
  {
    rule: 'internet fad',
    where: 'all',
    pattern: new RegExp(
      `\\b(${words(
        'youtube | youtuber | youtubers | youtube channel | twitch | reddit | subreddit | 4chan | tumblr | myspace | tiktok | vine | viner | meme | memes | viral video | went viral | creepypasta | pewdiepie | let s play | lets play | streamer | streamers | podcast | podcasts | webcomic | web comic | web series | newgrounds | rooster teeth | vaporwave | harambe | dank | twitter | tweet | tweeted | instagram | snapchat | facebook | hashtag | kickstarter | crowdfunding | steam greenlight | early access | speedrun | speedrunner | speedrunning | esports | e sports | fidget spinner | fidget spinners | scp | scp foundation',
      )})\\b`,
    ),
  },
  {
    rule: 'alcohol or tobacco',
    where: 'all',
    pattern: new RegExp(
      `\\b(${words(
        'beer | beers | lager | lagers | pale ale | brewery | breweries | brewing company | wine | wines | winery | champagne | vodka | whisky | whiskey | whiskies | bourbon | scotch | rum | gin | tequila | brandy | cognac | absinthe | liquor | liqueur | liqueurs | cocktail | cocktails | alcohol | alcoholic | alcoholism | drunk | drunken | drunkard | intoxicated | hangover | bartender | moonshine | cider | booze | budweiser | heineken | guinness stout | jack daniels | jagermeister | smirnoff | bacardi | carlsberg | corona | prohibition | cigarette | cigarettes | e cigarette | e cigarettes | cigar | cigars | smoking | smokin | smoke weed | tobacco | vape | vaping | nicotine | marlboro',
      )})\\b`,
    ),
    except: /\b(wine red|rum and raisin)\b/g,
  },
  {
    rule: 'drugs',
    where: 'all',
    pattern: new RegExp(
      `\\b(${words(
        'drug | drugs | drugged | cartel | cannabis | weed | pot smoking | stoned | narcotic | narcotics | opioid | opioids | morphine | addicted | addict | addicts | addiction | hallucinogen | hallucinogenic | psychedelic | psychedelics | magic mushrooms | steroids',
      )})\\b`,
    ),
    except: /\b(psychedelic rock|psychedelic pop)\b/g,
  },
  {
    rule: 'violence',
    where: 'all',
    pattern: new RegExp(
      `\\b(${words(
        'kill | kills | killed | killing | killings | killer | killers | murder | murders | murdered | murderer | murderers | murdering | manslaughter | homicide | slaughter | slaughtered | massacre | massacred | stab | stabs | stabbed | stabbing | strangle | strangled | strangling | shot dead | shot and | gunned down | shooting spree | shooter | corpse | corpses | dead body | dead bodies | cadaver | bloodbath | bloody | execution | executions | executed | hanged | guillotine | guillotined | electric chair | lethal injection | death penalty | death row | gas chamber | gas chambers | concentration camp | concentration camps | death camp | death camps | holocaust | atrocity | atrocities | war crime | war crimes | terrorist | terrorists | terrorism | bombing | bombings | bomber | hostage | hostages | kidnap | kidnapped | kidnapping | abducted | abuse | abused | domestic violence | assault | assaulted | drowned | poisoned | death toll | casualties | fatalities | how many people died | how many died | fatal | fatally | car accident | car crash | plane crash | freak accident | to his death | to her death | to their death | that crashed | crashed into | assassinated | assassination | tragic event | tragic accident | tragically | \\d+x\\d+ ?mm | \\d+ ?mm cartridge | calibre | caliber | chambered | round does | zombie | zombies | horror film | horror movie | horror game | slasher | snuff',
      )})\\b`,
    ),
    except:
      /\b(to kill a mockingbird|killer whale|killer whales|killer queen|the killers|curiosity killed the cat|doesn t kill you|doesnt kill you|bloody mary|plants vs zombies|executed a|executed the program|executed by the cpu)\b/g,
  },
  {
    rule: 'adult or crude themes',
    where: 'all',
    pattern: new RegExp(
      `\\b(${words(
        'naked | nude | nudes | nudity | breasts | lingerie | seduce | seduced | seduction | mistress | adultery | extramarital | one night stand | strip club | adult film | adult films | adult movie | r rated | x rated | nc 17 | rated m | m rated | mature rating | explicit | uncensored | censored | banned in | gambling | gamble | casino | casinos | betting | slot machine | slot machines | urine | urinate | urinating | pee | peeing | peein | poop | feces | faeces | fart | farts | farting | vomit | vomiting | butt | butts | buttocks | crotch | groin | underwear | panties | bra | circumcision | affair with | sleep with | sleeps with | slept with | courtesan | courtesans | harem | lecherous | broads | beerbong | beerbongs | recreational pill | ecstasy pill | birth control pill | birth control pills | abortion pill | abortion pills | scientology | mein kampf | minigun',
      )})\\b`,
    ),
  },
];

/**
 * Films, shows, games and comics made for adults (rated 18, M or R for violence, horror, sex
 * or drugs): a question about one is, more often than not, about what makes it so, and the
 * title itself is not one for a family room. Folded, whole words.
 */
const ADULT_TITLES_ANYWHERE = `
  assassins creed | to love ru | song of ice and fire | hardcore henry | taxi driver | tony soprano |
  watchmen | death grips | wu tang | solid snake | trevor philips | kaiji | tom clancy |
  silence of the lambs | army of darkness | 28 days later |
  always sunny | mad men | two and a half men | house of cards | fear and loathing |
  call of duty | grand theft auto | gta | fallout new vegas | fallout 3 | fallout 4 | tf2 | csgo | cs go | l4d | mgs | lethal company | n w a | mortal kombat | resident evil | silent hill |
  game of thrones | breaking bad | better call saul | south park | family guy | american dad |
  rick and morty | the walking dead | walking dead | fifty shades | pulp fiction |
  reservoir dogs | django unchained | inglourious basterds | hateful eight | a clockwork orange |
  american psycho | trainspotting | requiem for a dream | fight club | scarface | deadpool |
  sausage party | human centipede | texas chainsaw | friday the 13th | nightmare on elm street |
  the exorcist | hellraiser | evil dead | final destination | the purge | attack on titan |
  tokyo ghoul | elfen lied | hellsing | high school dxd | highschool of the dead |
  the sopranos | sopranos | narcos | dexter | american horror story | bojack horseman |
  cards against humanity | five nights at freddys | doki doki literature club | hotline miami |
  left 4 dead | left for dead | dead space | dead rising | dead island | dead by daylight | dying light |
  the last of us | last of us | team fortress | counter strike | rainbow six | rainbow 6 | half life |
  metal gear | dark souls | bloodborne | bioshock | borderlands | far cry | wolfenstein |
  gears of war | god of war | saints row | max payne | mass effect | dragon age | red dead |
  the witcher | witcher | skyrim | elder scrolls | cyberpunk 2077 | watch dogs | devil may cry |
  duke nukem | leisure suit larry | binding of isaac | payday 2 | payday the heist |
  killing floor | s t a l k e r | danganronpa | nier automata | life is strange | until dawn |
  heavy rain | la noire | sin city | the punisher | punisher | berserk | parasyte | gantz |
  devilman | black lagoon | mirai nikki | future diary | higurashi | school days |
  prison school | monster musume | psycho pass | dishonored | deus ex | system shock |
  unreal tournament | garrys mod | conkers bad fur day
`;

/** Titles that are also ordinary words: tried only on questions from the video games category. */
const ADULT_TITLES_IN_GAMES = `
  doom | fallout | halo | hitman | manhunt | postal | prototype | mafia | yakuza | persona |
  quake | rust | dayz | outlast | amnesia | bayonetta | diablo | bulletstorm | carmageddon |
  payday | stalker | killzone | crysis | prey
`;

/** What a shooting game is asked about. Only tried on the video games category. */
const GAME_VIOLENCE = `
  nazi | nazis | gun | guns | weapon | weapons | rifle | rifles | shotgun | shotguns | pistol |
  pistols | sniper | grenade | grenades | ammo | ammunition | headshot | blood | first person shooter
`;

// A title may carry a plural or possessive "s": `wordFold` drops the apostrophe, so
// "Half-Life's" is "half lifes" and "Assassin's Creed" is "assassins creed".
const titles = (list: string): RegExp =>
  new RegExp(`\\b(${words(list.replace(/\s+/g, ' '))})s?\\b`);
const ADULT_TITLE_PATTERN = titles(ADULT_TITLES_ANYWHERE);
const GAME_TITLE_PATTERN = titles(ADULT_TITLES_IN_GAMES);
const GAME_VIOLENCE_PATTERN = new RegExp(`\\b(${words(GAME_VIOLENCE.replace(/\s+/g, ' '))})\\b`);
const VIDEO_GAMES = 15;

/**
 * Misspellings seen in the dataset that have no safe automatic fix (the same letters could be
 * a different name). A question showing one is dropped: a misspelt answer on a TV is a fault.
 * Misspellings with one clear fix are corrected instead: see `SPELLING_FIXES` in otdb-map.ts.
 * Matched on the text as written, whole words, any case.
 */
export const MISSPELLINGS: readonly string[] = [
  'Hexidecimal',
  'Shephard',
  'Bismark',
  'Satelite',
  'Acient',
  'Krushchev',
  'Pasipahe',
  'Hotal',
  'Millenium',
  'carribean',
  'condemed',
  'immerged',
  'occured',
  'orignially',
  'introudced',
  'Pilfsner',
];
const MISSPELLING_PATTERN = new RegExp(`\\b(${MISSPELLINGS.join('|')})\\b`, 'i');

/** Why a mapped question is not imported, or null when it passes the screen. */
export function screenQuestion(question: SourceQuestion, sourceCategoryId: number): ScreenHit | null {
  const excluded = EXCLUDED_CATEGORIES[sourceCategoryId];
  if (excluded !== undefined) return { rule: 'source category left out', match: excluded };

  const prompt = wordFold(question.prompt);
  const options = question.options.map(wordFold).join(' | ');
  const texts = { prompt, options, all: `${prompt} | ${options}` };
  for (const { rule, where, pattern, except } of RULES) {
    const text = except === undefined ? texts[where] : texts[where].replace(except, ' ');
    const match = pattern.exec(text);
    if (match !== null) return { rule, match: match[0] };
  }
  // Preserve case for this title abbreviation: folding would confuse CoD with cod fish.
  const abbreviation = /\bCoD(?:['’]s)?\b/.exec([question.prompt, ...question.options].join(' | '));
  if (abbreviation !== null) return { rule: 'title made for adults', match: abbreviation[0] };
  const title =
    ADULT_TITLE_PATTERN.exec(texts.all) ??
    (sourceCategoryId === VIDEO_GAMES ? GAME_TITLE_PATTERN.exec(texts.all) : null);
  if (title !== null) return { rule: 'title made for adults', match: title[0] };
  if (sourceCategoryId === VIDEO_GAMES) {
    const match = GAME_VIOLENCE_PATTERN.exec(texts.all);
    if (match !== null) return { rule: 'violence', match: match[0] };
  }
  const misspelt = MISSPELLING_PATTERN.exec([question.prompt, ...question.options].join(' | '));
  if (misspelt !== null) return { rule: 'misspelt', match: misspelt[0] };
  return null;
}
