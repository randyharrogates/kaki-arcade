# Open Trivia Database import report

Fetched: **5299** verified questions in 24 dataset categories (0 record(s) could not be decoded).
Kept: **2343** (44.2%). Dropped: **2956**.
Text tidied (invisible characters, spacing) on 300 question(s). Spelling fixed in 108 text(s) of kept questions.

## Fetched, by dataset category

| Dataset category → Rabakz category | multiple | boolean | total |
|---|---:|---:|---:|
| Animals → science-and-nature | 69 | 30 | 99 |
| Art → arts-and-literature | 50 | 9 | 59 |
| Celebrities → left out whole | 48 | 5 | 53 |
| Entertainment: Board Games → games-comics-and-anime | 66 | 12 | 78 |
| Entertainment: Books → arts-and-literature | 109 | 11 | 120 |
| Entertainment: Cartoon & Animations → games-comics-and-anime | 97 | 11 | 108 |
| Entertainment: Comics → games-comics-and-anime | 74 | 5 | 79 |
| Entertainment: Film → film-and-tv | 268 | 33 | 301 |
| Entertainment: Japanese Anime & Manga → games-comics-and-anime | 177 | 27 | 204 |
| Entertainment: Music → music | 439 | 56 | 495 |
| Entertainment: Musicals & Theatres → arts-and-literature | 32 | 4 | 36 |
| Entertainment: Television → film-and-tv | 173 | 23 | 196 |
| Entertainment: Video Games → games-comics-and-anime | 1018 | 168 | 1186 |
| General Knowledge → general-knowledge | 380 | 89 | 469 |
| Geography → geography | 320 | 63 | 383 |
| History → history | 356 | 55 | 411 |
| Mythology → arts-and-literature | 58 | 13 | 71 |
| Politics → history | 53 | 24 | 77 |
| Science & Nature → science-and-nature | 250 | 49 | 299 |
| Science: Computers → technology | 149 | 43 | 192 |
| Science: Gadgets → technology | 34 | 6 | 40 |
| Science: Mathematics → science-and-nature | 61 | 19 | 80 |
| Sports → sport | 160 | 16 | 176 |
| Vehicles → technology | 69 | 18 | 87 |
| **All** | 4510 | 789 | 5299 |

## Dropped, by rule

A question is counted once, under the first rule that dropped it, in this order: true-or-false, shape, screen, validator, length giveaway, then, as each category is filled, duplicate, removed after reading, near-duplicate, the share for North American leagues in sport, category cap.

| Rule | Dropped |
|---|---:|
| answer given away by length | 28 |
| category over its cap | 813 |
| duplicate | 7 |
| near-duplicate | 39 |
| removed after reading | 260 |
| screen: adult or crude themes | 19 |
| screen: alcohol or tobacco | 27 |
| screen: dated wording | 11 |
| screen: depends on option order | 6 |
| screen: drugs | 4 |
| screen: internet fad | 34 |
| screen: misspelt | 14 |
| screen: needs a sound or a picture | 1 |
| screen: record or count that changes | 102 |
| screen: source category left out | 48 |
| screen: title made for adults | 411 |
| screen: violence | 147 |
| sport: over the share for North American leagues | 16 |
| true-or-false (not used in Rabakz) | 789 |
| validator: blocklist | 14 |
| validator: options | 86 |
| validator: prompt | 80 |
| **All** | 2956 |

## Kept, by Rabakz category and difficulty

| Category | easy | medium | hard | total |
|---|---:|---:|---:|---:|
| arts-and-literature | 56 | 85 | 51 | 192 |
| film-and-tv | 107 | 79 | 54 | 240 |
| games-comics-and-anime | 106 | 54 | 78 | 238 |
| general-knowledge | 133 | 98 | 39 | 270 |
| geography | 76 | 118 | 58 | 252 |
| history | 73 | 147 | 81 | 301 |
| music | 87 | 91 | 62 | 240 |
| science-and-nature | 89 | 132 | 86 | 307 |
| sport | 42 | 44 | 17 | 103 |
| technology | 60 | 85 | 55 | 200 |
| **All** | 829 | 933 | 581 | 2343 |

Difficulty split: easy 35.4%, medium 39.8%, hard 24.8%.

## Kept, by dataset category

| Dataset category | easy | medium | hard | total |
|---|---:|---:|---:|---:|
| Animals | 16 | 28 | 20 | 64 |
| Art | 14 | 14 | 14 | 42 |
| Entertainment: Board Games | 9 | 4 | 12 | 25 |
| Entertainment: Books | 22 | 37 | 22 | 81 |
| Entertainment: Cartoon & Animations | 16 | 4 | 6 | 26 |
| Entertainment: Comics | 12 | 6 | 6 | 24 |
| Entertainment: Film | 68 | 55 | 31 | 154 |
| Entertainment: Japanese Anime & Manga | 9 | 6 | 7 | 22 |
| Entertainment: Music | 87 | 91 | 62 | 240 |
| Entertainment: Musicals & Theatres | 6 | 12 | 7 | 25 |
| Entertainment: Television | 39 | 24 | 23 | 86 |
| Entertainment: Video Games | 60 | 34 | 47 | 141 |
| General Knowledge | 133 | 98 | 39 | 270 |
| Geography | 76 | 118 | 58 | 252 |
| History | 64 | 130 | 74 | 268 |
| Mythology | 14 | 22 | 8 | 44 |
| Politics | 9 | 17 | 7 | 33 |
| Science & Nature | 54 | 84 | 54 | 192 |
| Science: Computers | 38 | 52 | 36 | 126 |
| Science: Gadgets | 10 | 11 | 2 | 23 |
| Science: Mathematics | 19 | 20 | 12 | 51 |
| Sports | 42 | 44 | 17 | 103 |
| Vehicles | 12 | 22 | 17 | 51 |
| **All** | 829 | 933 | 581 | 2343 |

## Hand-written questions replaced

None: no imported question asks what a hand-written one asks.

## Spelling fixes made (kept questions)

- `otdb-011bfc9c5af5` "Bir Tawil, an uninhabited track of land claimed by no country, is located along the border of which two countries?" → "Bir Tawil, an uninhabited tract of land claimed by no country, is located along the border of which two countries?"
- `otdb-0203de8b0c0a` "In Monster Hunter Generations, which of these hunter arts are exclusive to the Longsword?" → "In Monster Hunter Generations, which of these hunter arts is exclusive to the Longsword?"
- `otdb-062549a01ab3` "Ismuth of Ottoma" → "Isthmus of Ottoma"
- `otdb-062549a01ab3` "Ismuth of Anatolia" → "Isthmus of Anatolia"
- `otdb-08f65be72d45` "Senoir Chang" → "Señor Chang"
- `otdb-1042a9266c7a` "RAID 10" → "RAID 6"
- `otdb-139c1d0f0c42` "Prior to 2018, which car company is the only Japanese company which won the 24 Hours of Le Mans?" → "Prior to 2018, which car company was the only Japanese company to have won the 24 Hours of Le Mans?"
- `otdb-142cafcb10d3` "What was the title of ABBA`s first UK hit single?" → "What was the title of ABBA's first UK hit single?"
- `otdb-18322563dbe9` "Saskachewan" → "Saskatchewan"
- `otdb-18322563dbe9` "Northwest Terrirories" → "Northwest Territories"
- `otdb-18cc1d6979c6` "Los Angelas, CA" → "Los Angeles, CA"
- `otdb-1c00c823fd77` "Which of the following is NOT classified as a Semetic language?" → "Which of the following is NOT classified as a Semitic language?"
- `otdb-1dfec393c83f` "In the Mario Kart and Smash Bros. Games, Princess Rosalina is considered what weight class?" → "In the Mario Kart games, Rosalina is in which weight class?"
- `otdb-1f2b24b94c16` "Uwe Rosenburg" → "Uwe Rosenberg"
- `otdb-20df5da239d7` "In the Panic! At the Disco's song "Nothern Downpour", which lyric follows 'I know the world's a broken bone'." → "In the Panic! At the Disco's song "Northern Downpour", which lyric follows 'I know the world's a broken bone'."
- `otdb-2338466ae6cb` "Who wrote the Sinead O`Connor hit 'Nothing Compares 2 U'?" → "Who wrote the Sinead O'Connor hit 'Nothing Compares 2 U'?"
- `otdb-23691f0ebcda` "Which of these artists did NOT feature in the fitfh studio album "Humanz" by British virtual band Gorillaz?" → "Which of these artists did NOT feature in the fifth studio album "Humanz" by British virtual band Gorillaz?"
- `otdb-24223bae6eb1` "What was Sir Handel's original name in "The Railway Series" and it's animated counterpart "Thomas and Friends?"" → "What was Sir Handel's original name in "The Railway Series" and its animated counterpart "Thomas and Friends?""
- `otdb-246cc284a90f` "What weakpoint of Achilles was expoited by the Trojan prince, Paris?" → "What weakpoint of Achilles was exploited by the Trojan prince, Paris?"
- `otdb-248cbb5c2678` "Solid State Disk" → "Super Speed Disk"
- `otdb-282613b0f90b` "What's the name of the halloween-related Sims 4 Stuff Pack released September 29th, 2015?" → "What's the name of the Halloween-related Sims 4 Stuff Pack released September 29th, 2015?"
- `otdb-28b9c657ca59` "An organism described as "heliotropic" has a tendancy to move towards which of these things?" → "An organism described as "heliotropic" has a tendency to move towards which of these things?"
- `otdb-2ba5e21b0546` "The Windows OS was delevoped by which company?" → "The Windows OS was developed by which company?"
- `otdb-30940ba1419f` "The Western Lowland Gorilla is scientifically know as?" → "The Western Lowland Gorilla is scientifically known as?"
- `otdb-31d487e8ab4f` "Sholder" → "Shoulder"
- `otdb-31de456e518e` "Which of these theoretical phycisists first predicted the existence of antimatter?" → "Which of these theoretical physicists first predicted the existence of antimatter?"
- `otdb-38b6dccbd9ef` "Dallon Weekes, former touring basist of Panic! At the Disco, created his own band in 2016 called..." → "Dallon Weekes, former touring bassist of Panic! At the Disco, created his own band in 2016 called..."
- `otdb-39c27f008662` "Simien Jackel" → "Simien Jackal"
- `otdb-3b3f3350896b` "Shirley Basey" → "Shirley Bassey"
- `otdb-3d0ec7aac84f` "Contraceptive prevalence rate" → "Cardiac pressure response"
- `otdb-3d6a46d4f825` "When the Falcon Heavy was launched on it's test flight, what was the only part of the operation that failed?" → "When the Falcon Heavy was launched on its test flight, what was the only part of the operation that failed?"
- `otdb-42ee9b59807c` "Marshmellow" → "Marshmallow"
- `otdb-456686178a1e` "What was the name of the teenage witch played by Melisa Joan Hart who lives with her witch aunts Hilda and Zelda?" → "What was the name of the teenage witch played by Melissa Joan Hart who lives with her witch aunts Hilda and Zelda?"
- `otdb-4572f49c6497` "Rio de Janero" → "Rio de Janeiro"
- `otdb-48e9a5bf15d0` "What tool lends it's name to a last-stone advantage in an end in Curling?" → "What tool lends its name to a last-stone advantage in an end in Curling?"
- `otdb-4c6f1226c26a` "The Queen song `A Kind Of Magic` is featured in which 1986 film?" → "The Queen song 'A Kind Of Magic' is featured in which 1986 film?"
- `otdb-4edd6a1c572a` "What is the relationship between the band members of American rock band King of Leon?" → "What is the relationship between the band members of American rock band Kings of Leon?"
- `otdb-53b46c78efc9` "Phillipines" → "Philippines"
- `otdb-54ab75c0577a` "Nelson Mandella" → "Nelson Mandela"
- `otdb-567f1a286b19` "What year was Red Hot Chill Pepper's album "Californication" released?" → "What year was Red Hot Chili Peppers' album "Californication" released?"
- `otdb-57d43174b081` "Ludvig Van Beethoven" → "Ludwig van Beethoven"
- `otdb-5ccd4e0c10bf` "Ronald Regan" → "Ronald Reagan"
- `otdb-638c1e92cb65` "Which of these Mediterranian islands is under the sovereign rule of France?" → "Which of these Mediterranean islands is under the sovereign rule of France?"
- `otdb-638ddddd9b4c` "Austrailia" → "Australia"
- `otdb-63e6ea91a2fa` "Antoine Lavoiser" → "Antoine Lavoisier"
- `otdb-694941bc5a91` "What type of cheese, loved by Wallace and Gromit, had it's sale prices rise after their successful short films?" → "What type of cheese, loved by Wallace and Gromit, had its sale prices rise after their successful short films?"
- `otdb-6ae98f8882f6` "Dan the Automater" → "Dan the Automator"
- `otdb-6baea2364752` "On which aircraft carrier did the Doolitte Raid launch from on April 18, 1942 during World War II?" → "On which aircraft carrier did the Doolittle Raid launch from on April 18, 1942 during World War II?"
- `otdb-6bc0775906f9` "In the year 1818, novelist Mary Shelly is credited with writing a fiction novel and creating this infamous character." → "In the year 1818, novelist Mary Shelley is credited with writing a fiction novel and creating this infamous character."
- `otdb-6cc52a418be7` "Will Arnet" → "Will Arnett"
- `otdb-6d47ebacf617` "In Minecraft, what update did foods like steak become stackable?" → "In Minecraft, in which update did foods like steak become stackable?"
- `otdb-6f75b7afcb91` "King Ghidora" → "King Ghidorah"
- `otdb-7191652df59d` "Who invented the "Flying Shuttle" in 1738; one of the key developments in the industrialization of weaving?" → "Who invented the "Flying Shuttle" in 1733; one of the key developments in the industrialization of weaving?"
- `otdb-7804b095251f` "In which year did the orignal Sims game release?" → "In which year did the original Sims game release?"
- `otdb-7df565c9576b` "The Great Mouse Detecive" → "The Great Mouse Detective"
- `otdb-8102ba27e7a7` "What was George Bizet's last opera?" → "What was Georges Bizet's last opera?"
- `otdb-8454e24e896f` "Steven Sondheim" → "Stephen Sondheim"
- `otdb-8454e24e896f` "John Phillips Sousa" → "John Philip Sousa"
- `otdb-84c5bd65921b` "Gannymede is the largest moon of which planet?" → "Ganymede is the largest moon of which planet?"
- `otdb-85529672eff1` "What mytological creatures have women's faces and vultures' bodies?" → "What mythological creatures have women's faces and vultures' bodies?"
- `otdb-857f02e003f8` "Cheslea" → "Chelsea"
- `otdb-8953f72b09c8` "After which Danish city is the 72th element on the periodic table named?" → "After which Danish city is the 72nd element on the periodic table named?"
- `otdb-8a21caf05fb2` "Which German field marshal was known as the `Desert Fox`?" → "Which German field marshal was known as the 'Desert Fox'?"
- `otdb-9248624ca809` "Which actor plays the role of the main antagonist in the 2011 movie "Tower Heist?"" → "Which actor plays the role of the main antagonist in the 2011 movie "Tower Heist"?"
- `otdb-93cf3e57156e` "Feburary 7th, 2000" → "February 7th, 2000"
- `otdb-9422b7962c6f` "The Nike apparel and footwear brand takes it's name from the Greek goddess of what?" → "The Nike apparel and footwear brand takes its name from the Greek goddess of what?"
- `otdb-9b96a398b316` "Which major bank's collapse was notable as one of the causes of the Financal Crisis of 2008?" → "Which major bank's collapse was notable as one of the causes of the Financial Crisis of 2008?"
- `otdb-9dcac6360bae` "Liechenstein" → "Liechtenstein"
- `otdb-9ef8297eeb04` "How many Sister Ships were related to the TItanic?" → "How many Sister Ships were related to the Titanic?"
- `otdb-9f7e0264055f` "All of the following countries have official claims to territory in Antartica EXCEPT:" → "All of the following countries have official claims to territory in Antarctica EXCEPT:"
- `otdb-a50045a60f51` "Lydon B. Johnson" → "Lyndon B. Johnson"
- `otdb-a667e736acb4` "Which band released songs suchs as "Rio", "Girls on Film", and "The Reflex"?" → "Which band released songs such as "Rio", "Girls on Film", and "The Reflex"?"
- `otdb-ad7140d8fad6` "T.S. Elliot" → "T.S. Eliot"
- `otdb-ad7140d8fad6` "Emily Dickenson" → "Emily Dickinson"
- `otdb-b055dd84ac07` "Satchell Paige" → "Satchel Paige"
- `otdb-b0fcc8985866` "Seth Rogan" → "Seth Rogen"
- `otdb-b109bb261409` "Newton and Leibnitz" → "Newton and Leibniz"
- `otdb-b109bb261409` "Asiimov and Rutherford" → "Asimov and Rutherford"
- `otdb-b193ce2e3df7` "Chuck Paluhniuk" → "Chuck Palahniuk"
- `otdb-b44e91927131` "Which city did the former NHL team "The Nordiques" originiate from?" → "Which city did the former NHL team "The Nordiques" originate from?"
- `otdb-b87560224594` "What does "hippopotamus" mean and in what langauge?" → "What does "hippopotamus" mean and in what language?"
- `otdb-b90b11d75873` "Which Beatles album does NOT feature any of the band members on it's cover?" → "Which Beatles album does NOT feature any of the band members on its cover?"
- `otdb-bc5568b03abd` "What was the first commerically available computer processor?" → "What was the first commercially available computer processor?"
- `otdb-bc71619b202f` "German Shepard" → "German Shepherd"
- `otdb-c30abd9c48a9` "Colbalt" → "Cobalt"
- `otdb-c3575b9829ca` "Zavoc" → "Zavok"
- `otdb-c3c897f2a51e` "What was the name of Sqiudward's bad painting in the Spongebob episode "Artist Unknown?"" → "What was the name of Squidward's bad painting in the Spongebob episode "Artist Unknown?""
- `otdb-c51e600da84c` "Santo Dominigo" → "Santo Domingo"
- `otdb-c85e3f8fbeca` "What was found in 1946 by two young shepards near a cave?" → "What was found in 1946 by two young shepherds near a cave?"
- `otdb-c8d5a331b87a` "Masta Killa" → "MC Lars"
- `otdb-d7b77b4d6713` "What programming language was used to create the game "Minecraft"?" → "What programming language was "Minecraft" originally written in?"
- `otdb-d7dba8b0049b` "The Rio 2016 Summer Olympics held it's closing ceremony on what date?" → "The Rio 2016 Summer Olympics held its closing ceremony on what date?"
- `otdb-d7fe8930204a` "Which of the following games in the The Legend of Zelda franchise was released in Japan before North America?" → "Which of the following games in The Legend of Zelda franchise was released in Japan before North America?"
- `otdb-d7fe8930204a` "The Legend of Zelda: Four Swords" → "The Legend of Zelda: Skyward Sword"
- `otdb-d8bdb09db67e` "In human biology, a circadium rhythm relates to a period of roughly how many hours?" → "In human biology, a circadian rhythm relates to a period of roughly how many hours?"
- `otdb-d9437bb5fa3a` "Los Angles" → "Los Angeles"
- `otdb-daefbeb1ea70` "Alexander Flemming" → "Alexander Fleming"
- `otdb-e09f878fec8d` "Myofiaments" → "Myofilaments"
- `otdb-ee8359ab0e64` "The Rush song "YYZ" derives its name from the IATA aiport identification code for which city?" → "The Rush song "YYZ" derives its name from the IATA airport identification code for which city?"
- `otdb-ef2085d3ff23` "Alec Travelyan" → "Alec Trevelyan"
- `otdb-ef728ce79db9` "Prior to his appearance in Super Smash Bros. Ultimate, What was King K. Rool's last appearance in any game?" → "Prior to his appearance in Super Smash Bros. Ultimate, what was King K. Rool's last appearance in any game?"
- `otdb-f41556f26af4` "Naturally occuring uranium primarily consists of which isotope?" → "Naturally occurring uranium primarily consists of which isotope?"
- `otdb-f55772d19429` "Who wrote the lyrics for Leonard Bernstein's 1957 Brodway musical West Side Story?" → "Who wrote the lyrics for Leonard Bernstein's 1957 Broadway musical West Side Story?"
- `otdb-fc70d50f1bdf` "Which of the following physical typologies are used with Ethernet Networks?" → "Which of the following physical topologies are used with Ethernet Networks?"
- `otdb-ff41b0ac5966` "The “fairy” type made it’s debut in which generation of the Pokemon core series games?" → "The “fairy” type made its debut in which generation of the Pokemon core series games?"
- `otdb-ff492316e389` "What name did Tom Hanks give to his volleyball companion in the film `Cast Away`?" → "What name did Tom Hanks give to his volleyball companion in the film 'Cast Away'?"
- `otdb-ff8d44694d46` "Zack Synder" → "Zack Snyder"
- `otdb-ff8d44694d46` "Josh Whedon" → "Joss Whedon"

## Hand lists

Every id in the removal and exceptions lists is in the download.
No removal entry is redundant.

## Examples of what each rule dropped

**answer given away by length** (28)

- [Entertainment: Books] What was the last message of the Dolphins in "The Hitchhiker's Guide to the Galaxy"? — the correct option (39 characters) is much longer than every other (longest 22)
- [Entertainment: Books] George Orwell wrote this book, which is often considered a statement on government oversight. — the correct option (4 characters) is much shorter than every other (shortest 19)
- [Entertainment: Film] What is the oldest Disney film? — the correct option (31 characters) is much longer than every other (longest 9)
- [Entertainment: Film] Actress Susan Sarandon caught pneumonia during filming of which movie? — the correct option (29 characters) is much longer than every other (longest 17)
- [Entertainment: Music] The 2010 song "Eenie Meenie" was a collaboration between which two popular artists? — the correct option (29 characters) is much longer than every other (longest 19)

**category over its cap** (813)

- [Entertainment: Television] This composer worked on the 2003 TV series Battlestar Galatica.
- [Entertainment: Television] In the comedy series "Trailer Park Boys", which of the following characters takes care of stray cats?
- [Entertainment: Television] What is the name of the mad scientist who owns Planet Express in Futurama?
- [Entertainment: Television] In the Doctor Who universe, how many times can a time lord normally regenerate?
- [Entertainment: Television] Which British writer wrote for both Doctor Who and Sherlock?

**duplicate** (7)

- [Art] Who painted The Starry Night? — otdb-4150ccc9e585
- [Art] Who painted the Mona Lisa? — otdb-d14ed0698b12
- [General Knowledge] Nephelococcygia is the practice of doing what? — otdb-8a5214ccd7d3
- [General Knowledge] The “fairy” type made its debut in which generation of the Pokemon core series games? — otdb-ff41b0ac5966
- [Science: Mathematics] How many sides does a heptagon have? — otdb-536e565d3fd2

**near-duplicate** (39)

- [Entertainment: Books] Mary Shelley is the author of what classic horror story? — otdb-648afafa5e0b: Who was the original author of Frankenstein?
- [Entertainment: Books] Who is the protagonist of the book: "The Catcher in the Rye" by J.D. Salinger — otdb-6051bdf7933d: What is the name of the protagonist of J.D. Salinger's novel Catcher in the Rye?
- [Mythology] What immense structure is referred to in Norse Mythology as the Yggdrasil. — otdb-9472c7e540ac: In Norse Mythology, what is the name of the symbol commonly referred to as the "Tree of Life"?
- [Mythology] In Norse mythology, what is the name of the serpent which eats the roots of the ash tree Yggdrasil? — otdb-f4aa862c75a2: Nidhogg is a mythical creature from what mythology?
- [Entertainment: Film] Who starred as Bruce Wayne and Batman in Tim Burton's 1989 movie "Batman"? — otdb-93150bbcbda8: What superhero has been played in film by actors Michael Keaton, Val Kilmer, George Clooney and Christian Bale?

**removed after reading** (260)

- [Art] Which artist is famous for cutting off his ear? — Van Gogh's ear
- [Entertainment: Musicals & Theatres] Who wrote the play 'Angels in America'? — [misspelt] the answer is spelt "Tony Kusher" (Kushner); the play is also an adult one
- [Entertainment: Musicals & Theatres] What is Jean ValJean's first prisoner number? — the reverse of otdb-3775dbd5e501 (prisoner 24601)
- [Entertainment: Books] Which poet wrote "The Ballad of Reading Gaol" whilst imprisoned for being gay? — Oscar Wilde "imprisoned for being gay"
- [Entertainment: Books] Who wrote the 1967 horror novel "Rosemary's Baby"? — [unsuitable] an adult horror novel (Rosemary's Baby)

**screen: adult or crude themes** (19)

- [Entertainment: Books] The title of Adolf Hitler's autobiography "Mein Kampf" is what when translated to English? — mein kampf
- [Entertainment: Film] In "Mean Girls", who has breasts that tell when it's raining? — breasts
- [Entertainment: Film] Which documentary film maker wrote and starred in the film "My Scientology Movie" which first debuted in 2015? — scientology
- [Entertainment: Music] Which of these bands are NOT from Australia? — naked
- [Entertainment: Music] Finish these lyrics from the 2016 song "Panda" by Desiigner: "I got broads in _______". — broads

**screen: alcohol or tobacco** (27)

- [General Knowledge] What is the name of the alcoholic beverage made from potatoes or grains that originates from Poland and Russia? — alcoholic
- [General Knowledge] What alcoholic drink is mainly made from juniper berries? — alcoholic
- [General Knowledge] Which American-owned brewery led the country in sales by volume in 2015? — brewery
- [General Knowledge] The Mexican Beer "Corona" is what type of beer? — beer
- [General Knowledge] According to the United States' CDC, one in how many Americans die annually due to smoking? — smoking

**screen: dated wording** (11)

- [Entertainment: Music] Who is the artist of the recent new album the Uncanny Valley? — recent
- [Entertainment: Video Games] As of the year 2026, how many known moons does Jupiter have? — as of
- [Entertainment: Video Games] In No Man's Sky (as of the Beyond update), what two resources do you need to craft Antimatter? — as of
- [Science & Nature] What is the largest living organism currently known to man? — currently
- [Science & Nature] In quantum physics, which of these theorised sub-atomic particles has yet to be observed? — has yet

**screen: depends on option order** (6)

- [Entertainment: Music] Which of these songs did Jimi Hendrix cover? — all of these
- [Entertainment: Television] Out of the 3 Tots in Tots TV, who speaks French in the UK Version and Spanish in the US Version? — of the above
- [Entertainment: Television] In "Star Trek", what is the Ferengi's First Rule of Acquisition? — above
- [Entertainment: Video Games] In "Call of Duty: Black Ops III" Zombies, what does completing all the main easter eggs reward you with? — all three
- [Art] Which one of these paintings is not by Caspar David Friedrich? — above

**screen: drugs** (4)

- [General Knowledge] The drug cartel run by Pablo Escobar originated in which South American city? — drug
- [Entertainment: Film] In the film "Requiem for a Dream", what drug does Jared Leto's character get addicted to? — drug
- [Entertainment: Music] In August 1964, who introduced the Beatles to cannabis? — cannabis
- [Science & Nature] What is isobutylphenylpropanoic acid more commonly known as? — morphine

**screen: internet fad** (34)

- [General Knowledge] What is the name of the very first video uploaded to YouTube? — youtube
- [General Knowledge] When was the website reddit founded ? — reddit
- [General Knowledge] What is the real name of viral internet meme Grumpy Cat? — meme
- [General Knowledge] What type of animal was Harambe, who was shot after a child fell into it's enclosure at the Cincinnati Zoo? — harambe
- [General Knowledge] What machine element is located in the center of fidget spinners? — fidget spinners

**screen: misspelt** (14)

- [General Knowledge] What is the name of NASA’s most famous space telescope? — Millenium
- [General Knowledge] Out of these four buildings, which one is the tallest, with a height of 1,250 ft (381 m)? — Hotal
- [General Knowledge] In the MMO RPG "Realm of the Mad God", what dungeon is widely considered to be the most difficult? — Acient
- [General Knowledge] What is a dead mall? — condemed
- [Entertainment: Video Games] Which Sonic the Hedgehog game introudced Knuckles the Echidna? — introudced

**screen: needs a sound or a picture** (1)

- [Vehicles] What animal is pictured on the logo of the automobile manufacturer Porsche? — pictured

**screen: record or count that changes** (102)

- [General Knowledge] What fast food chain has the most locations globally? — has the most
- [General Knowledge] De Eemhof, Port Zelande and Het Heijderbos are holiday villas owned by what company? — owned by
- [General Knowledge] In a standard set of playing cards, which is the only king without a moustache? — is the only
- [General Knowledge] Virgin Trains, Virgin Atlantic and Virgin Racing, are all companies owned by which famous entrepreneur? — owned by
- [General Knowledge] What is the most-visited website out of these options? — most visited

**screen: source category left out** (48)

- [Celebrities] Which of these celebrities was not a member of the Jackson 5? — Celebrities: who is famous, married or alive changes, and much of it is gossip
- [Celebrities] Nikki Diamond portrayed which Gladiator in the 1992 TV show "Gladiators"? — Celebrities: who is famous, married or alive changes, and much of it is gossip
- [Celebrities] If he was still alive, in what year would Elvis Presley celebrate his 100th birthday? — Celebrities: who is famous, married or alive changes, and much of it is gossip
- [Celebrities] In which situation was musician John Lennon assassinated? — Celebrities: who is famous, married or alive changes, and much of it is gossip
- [Celebrities] Aubrey Graham is better known as — Celebrities: who is famous, married or alive changes, and much of it is gossip

**screen: title made for adults** (411)

- [General Knowledge] What is the name of the main Character from the Series: Dead Space? — dead space
- [General Knowledge] In "Resident Evil 3", how many inventory slots does Jill have at the start of the game? — resident evil
- [General Knowledge] In Half-Life, what is the name of the alien that attaches to heads? — half life
- [General Knowledge] What is the name of the company in Lethal Company? — lethal company
- [General Knowledge] What is the name of the antagonist group in Danganronpa Another Episode: Ultra Despair Girls? — danganronpa

**screen: violence** (147)

- [General Knowledge] Roughly how many ingested apple seeds would it take to receive a fatal dose of cyanide? — fatal
- [General Knowledge] Virtual reality company Oculus VR lost which of it's co-founders in a freak car accident in 2013? — car accident
- [General Knowledge] Which country developed the AK-47 assault rifle? — assault
- [General Knowledge] What airline was the owner of the plane that crashed off the coast of Nova Scotia in 1998? — that crashed
- [Entertainment: Books] Which classic book opens with the line "Call me Ishmael"? — kidnapped

**sport: over the share for North American leagues** (16)

- [Sports] What city did the Lakers represent before relocating to Los Angeles?
- [Sports] Josh Mansour is part of what NRL team?
- [Sports] Who won the 2015 College Football Playoff (CFP) National Championship?
- [Sports] What is the oldest team in the NFL?
- [Sports] Which team was the 2014-2015 NBA Champions?

**true-or-false (not used in Rabakz)** (789)

- [General Knowledge] The vapor produced by e-cigarettes is actually water.
- [General Knowledge] Jingle Bells was originally meant for Thanksgiving
- [General Knowledge] There are 86400 seconds in a day.
- [General Knowledge] A pasodoble is a type of Italian pasta sauce.
- [General Knowledge] The Sun rises from the North.

**validator: blocklist** (14)

- [General Knowledge] On average, Americans consume 100 pounds of what per second? — contains a term on the all-ages blocklist: cocaine
- [General Knowledge] Electronic music producer Kygo's popularity skyrocketed after a certain remix. Which song did he remix? — contains a term on the all-ages blocklist: sexual
- [Entertainment: Film] Which of these actors/actresses is NOT a part of the cast for the 2016 movie "Suicide Squad"? — contains a term on the all-ages blocklist: suicide
- [Entertainment: Music] Which of these bands was a featuring artist in Compton rapper Kendrick Lamar's 2017 album, "DAMN."? — contains a term on the all-ages blocklist: damn
- [Entertainment: Music] What was the subject of the 2014 song "CoCo" by American rapper O. T. Genasis? — contains a term on the all-ages blocklist: cocaine

**validator: options** (86)

- [General Knowledge] If someone said "you are olid", what would they mean? — option 4 has the unbroken word "incomprehensible" (16 characters); the limit is 15
- [General Knowledge] The word "aprosexia" means which of the following? — option 3 is 42 characters; the limit is 40
- [General Knowledge] What is a "dakimakura"? — option 2 is 44 characters; the limit is 40
- [General Knowledge] The lesser-known continuation of the saying "Curiosity killed the cat..." is: — option 2 is 43 characters; the limit is 40
- [General Knowledge] The word "astasia" means which of the following? — option 4 is 42 characters; the limit is 40

**validator: prompt** (80)

- [General Knowledge] In blood typing, the (+) and (-) marker after an A, B, AB, or O is called Rh factor. Which of the following is the source of its discovery? — prompt is 139 characters; the limit is 120
- [General Knowledge] Macintosh has named six of its operating systems after big cats. What big cat did Macintosh name their 2007 release after? — prompt is 122 characters; the limit is 120
- [General Knowledge] Which church's interior in Vatican City was designed in 1503 by renaissance architects including Bramante, Michelangelo and Bernini? — prompt is 132 characters; the limit is 120
- [General Knowledge] How long did it take the motorized window washers of the original World Trade Center to clean the entire exterior of the building? — prompt is 130 characters; the limit is 120
- [General Knowledge] Where is the train station "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch"? — prompt has the unbroken word "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch" (58 characters); the limit is 30
