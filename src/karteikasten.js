(function (global) {
  /* ============================================================
     B1 Karteikasten — Schritte plus Neu, Ausgabe Schweiz

     A standalone flashcard section for the textbook's lesson word lists. Like
     extr@, it does NOT go through the deck engine and has no spaced
     repetition. The learner picks a lesson, flips through the cards, and
     marks each one "Gewusst" or "Nochmal". A known card stays out of the
     lesson's rounds until the learner starts the lesson again.

     Progress is written through Storage under the deck key `b1-karteikasten`,
     so it survives reloads and rides along in Export / Import backups.
     ============================================================ */

  const DECK_ID = 'b1-karteikasten';
  /* a missed card comes back after this many other cards */
  const AGAIN_GAP = 4;
  /* loaded on first open only, so the menu never waits for these fonts */
  const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400' +
    '&family=Bitter:wght@500;700&family=IBM+Plex+Mono:wght@500&display=swap';

  const BOOKS = [['B1.1', 'B1.1 · Schritte plus Neu 5'], ['B1.2', 'B1.2 · Schritte plus Neu 6']];

  /* cards: [German, English, German example, English translation, note, CH flag] */
  const LESSONS = [
    { id: "L01", n: 1, title: "Glück im Alltag", book: "B1.1", cards: [
      ["der Artikel, -", "article (newspaper)", "Heute habe ich einen lustigen Artikel über einen Lottogewinner gelesen.", "Today I read a funny article about a lottery winner.", "", 0],
      ["das Erlebnis, -se", "experience (event)", "Das war das schönste Erlebnis in meinen Ferien.", "That was the best experience of my holidays.", "", 0],
      ["der Gewinn, -e", "win; winnings, prize", "Mit dem Gewinn kaufte er sich ein neues Velo.", "With the winnings he bought himself a new bike.", "", 0],
      ["hören auf (+ Akk.)", "to listen to (take advice from)", "Er hört nie auf seine Freunde.", "He never listens to his friends.", "", 0],
      ["das Lotto, -s", "lottery", "Mein Nachbar spielt jede Woche Lotto.", "My neighbour plays the lottery every week.", "", 0],
      ["die Lottoziehung, -en", "lottery draw", "Die Lottoziehung ist am Samstagabend.", "The lottery draw is on Saturday evening.", "", 0],
      ["mutig", "brave", "Es war sehr mutig, ins kalte Wasser zu springen.", "It was very brave to jump into the cold water.", "", 0],
      ["die Religion, -en", "religion", "In vielen Religionen gibt es Rituale für Glück.", "Many religions have rituals for luck.", "", 0],
      ["sich setzen", "to sit down", "Bitte setzen Sie sich, der Arzt kommt gleich.", "Please sit down, the doctor will be right with you.", "", 0],
      ["setzen auf (+ Akk.)", "to bet on", "Sie setzt immer auf die gleichen Zahlen.", "She always bets on the same numbers.", "", 0],
      ["das Spielcasino, -s", "casino", "Im Spielcasino verlor er sein ganzes Geld.", "He lost all his money at the casino.", "", 0],
      ["die Steuer, -n", "tax", "Muss man auf den Gewinn Steuern zahlen?", "Do you have to pay tax on the winnings?", "", 0],
      ["steuerfrei", "tax-free", "Kleine Gewinne sind oft steuerfrei.", "Small winnings are often tax-free.", "", 0],
      ["die Stimme, -n", "voice; vote", "Am Telefon erkannte ich ihre Stimme sofort.", "I recognised her voice on the phone immediately.", "", 0],
      ["die Überraschung, -en", "surprise", "Zum Geburtstag bekam sie eine schöne Überraschung.", "She got a nice surprise for her birthday.", "", 0],
      ["verrückt", "crazy", "Das ist eine verrückte Geschichte!", "That's a crazy story!", "", 0],
      ["weg sein", "to be gone", "Als ich zurückkam, war mein Velo weg.", "When I came back, my bike was gone.", "", 0],
      ["weiter- (weiterspielen …)", "to keep on …-ing (prefix)", "Trotz des Regens spielten die Kinder weiter.", "Despite the rain, the children kept on playing.", "", 0],
      ["zu Fuss", "on foot", "Ich gehe jeden Tag zu Fuss zur Arbeit.", "I walk to work every day.", "DE: zu Fuß", 0],
      ["die Angabe, -n", "detail, piece of information", "Bitte überprüfen Sie Ihre Angaben im Formular.", "Please check your details on the form.", "", 0],
      ["aus·reichen", "to be enough, suffice", "Das Geld reicht nicht für einen neuen Laptop aus.", "The money isn't enough for a new laptop.", "", 0],
      ["die Autobahnraststätte, -n", "motorway service area", "An der Autobahnraststätte tranken wir einen Kaffee.", "We had a coffee at the motorway service area.", "", 0],
      ["beide", "both", "Beide Kinder haben den Bus verpasst.", "Both children missed the bus.", "", 0],
      ["der Beifahrersitz, -e", "passenger seat", "Der Hund sass auf dem Beifahrersitz.", "The dog was sitting in the passenger seat.", "DE: saß", 0],
      ["sich befinden", "to be (located)", "Das Fundbüro befindet sich im Bahnhof.", "The lost-property office is in the station.", "", 0],
      ["an Bord", "on board", "Wie viele Passagiere waren an Bord?", "How many passengers were on board?", "", 0],
      ["einige", "some, a few", "Einige Leute glauben an Glückszahlen.", "Some people believe in lucky numbers.", "", 0],
      ["erreichen", "to reach; to catch (a train)", "Wir haben den letzten Zug gerade noch erreicht.", "We only just caught the last train.", "", 0],
      ["der Fischer, -", "fisherman", "Ein Fischer rettete den Mann aus dem See.", "A fisherman rescued the man from the lake.", "", 0],
      ["gekleidet", "dressed", "Er war nur in Shorts und T-Shirt gekleidet.", "He was dressed only in shorts and a T-shirt.", "", 0],
      ["der Jackpot, -s", "jackpot", "Der Jackpot liegt diese Woche bei 20 Millionen Franken.", "The jackpot this week is 20 million francs.", "", 0],
      ["-jährig (z. B. 30-jährig)", "…-year-old", "Eine 30-jährige Frau hat den Jackpot geknackt.", "A 30-year-old woman hit the jackpot.", "", 0],
      ["die Kreuzfahrt, -en", "cruise", "Meine Grosseltern machen eine Kreuzfahrt im Mittelmeer.", "My grandparents are going on a Mediterranean cruise.", "DE: Großeltern", 0],
      ["die Lotto-Annahmestelle, -n", "lottery outlet", "Den Lottoschein kann man am Kiosk oder an einer Lotto-Annahmestelle abgeben.", "You can hand in your lottery ticket at a kiosk or a lottery outlet.", "CH: oft einfach am Kiosk", 0],
      ["mehrere", "several", "Er versuchte es mehrere Male.", "He tried several times.", "", 0],
      ["die Meldung, -en", "report, news item", "In der Zeitung stand eine kurze Meldung über den Unfall.", "There was a short report about the accident in the newspaper.", "", 0],
      ["Mittel- (Mittelmeer, Mitteleuropa)", "central, middle (prefix)", "Im Sommer ist das Mittelmeer sehr warm.", "The Mediterranean is very warm in summer.", "", 0],
      ["der Mut (Sg.)", "courage", "Sie nahm all ihren Mut zusammen und sprach ihn an.", "She plucked up all her courage and spoke to him.", "", 0],
      ["nach·denken (über + Akk.)", "to think (about), reflect", "Ich muss noch über dein Angebot nachdenken.", "I still need to think about your offer.", "", 0],
      ["retten", "to save, rescue", "Die Feuerwehr rettete die Katze vom Dach.", "The fire brigade rescued the cat from the roof.", "", 0],
      ["die Rettung, -en", "rescue", "Die Rettung kam in letzter Minute.", "The rescue came at the last minute.", "", 0],
      ["der Rosenstrauss, -¨e", "bouquet of roses", "Zum Valentinstag schenkte er ihr einen Rosenstrauss.", "For Valentine's Day he gave her a bouquet of roses.", "DE: Rosenstrauß", 0],
      ["die Shorts (Pl.)", "shorts", "Im Winter in Shorts? Das ist verrückt!", "Shorts in winter? That's crazy!", "", 0],
      ["der Sitz, -e", "seat", "Ist dieser Sitz noch frei?", "Is this seat free?", "", 0],
      ["steigen (in + Akk.)", "to get in(to)", "Sie stieg ins Auto und fuhr weg.", "She got into the car and drove off.", "", 0],
      ["die Tabelle, -n", "table, chart", "Ergänzen Sie bitte die Tabelle.", "Please complete the table.", "", 0],
      ["tief", "deep", "Der See ist an dieser Stelle sehr tief.", "The lake is very deep at this point.", "", 0],
      ["die Überschrift, -en", "headline, heading", "Die Überschrift des Artikels war sehr lustig.", "The headline of the article was very funny.", "", 0],
      ["vergangen", "past, last", "Am vergangenen Wochenende regnete es nur.", "Last weekend it did nothing but rain.", "", 0],
      ["vergeblich", "in vain", "Er wartete vergeblich auf den Bus.", "He waited for the bus in vain.", "", 0],
      ["vergesslich", "forgetful", "Mein Grosspapa wird immer vergesslicher.", "My grandpa is getting more and more forgetful.", "DE: Opa / Großvater", 0],
      ["sich verfliegen", "to lose one's way (when flying)", "Der Pilot hat sich im Nebel verflogen.", "The pilot lost his way in the fog.", "", 0],
      ["verschneit", "snow-covered, snowy", "Die Strasse über den Pass war völlig verschneit.", "The road over the pass was completely covered in snow.", "DE: Straße", 0],
      ["verschwinden", "to disappear", "Mein Schlüssel ist plötzlich verschwunden.", "My key has suddenly disappeared.", "", 0],
      ["verwechseln", "to mix up, confuse", "Ich verwechsle immer die beiden Zwillinge.", "I always mix up the two twins.", "", 0],
      ["während", "during; while", "Während der Fahrt schlief er.", "He slept during the journey.", "", 0],
      ["sich wundern", "to be surprised", "Ich wundere mich, dass er noch nicht da ist.", "I'm surprised he isn't here yet.", "", 0],
      ["zurück·lassen", "to leave behind", "Sie mussten ihr Gepäck am Bahnhof zurücklassen.", "They had to leave their luggage behind at the station.", "", 0],
      ["zwar … aber", "admittedly … but", "Das Hotel war zwar teuer, aber sehr schön.", "The hotel was expensive, admittedly, but very nice.", "", 0],
      ["ab·sagen", "to cancel, call off", "Wegen des Wetters mussten wir das Fest absagen.", "We had to cancel the party because of the weather.", "", 0],
      ["ab·sperren", "to cordon off; to lock", "Die Polizei sperrte die Strasse ab.", "The police cordoned off the street.", "DE: Straße", 0],
      ["der Ärger (Sg.)", "trouble; annoyance", "Mit dem neuen Vermieter gibt es nur Ärger.", "There's nothing but trouble with the new landlord.", "", 0],
      ["ausgelassen", "exuberant, boisterous", "Die Gäste feierten ausgelassen bis Mitternacht.", "The guests partied exuberantly until midnight.", "", 0],
      ["betrunken", "drunk", "Der Einbrecher war so betrunken, dass er einschlief.", "The burglar was so drunk that he fell asleep.", "", 0],
      ["der Einbrecher, -", "burglar", "Der Einbrecher kam durch das Kellerfenster.", "The burglar came in through the cellar window.", "", 0],
      ["fest·nehmen", "to arrest", "Die Polizei nahm den Dieb noch am selben Abend fest.", "The police arrested the thief that same evening.", "", 0],
      ["folgen (+ Dat.)", "to follow", "Der Hund ist mir bis nach Hause gefolgt.", "The dog followed me all the way home.", "", 0],
      ["der Hausbesitzer, -", "homeowner", "Der Hausbesitzer rief sofort die Polizei.", "The homeowner called the police immediately.", "", 0],
      ["junge Leute (Pl.)", "young people", "Viele junge Leute ziehen nach Zürich.", "Lots of young people move to Zurich.", "", 0],
      ["der Konflikt, -e", "conflict", "Den Konflikt mit dem Nachbarn konnten wir lösen.", "We were able to resolve the conflict with the neighbour.", "", 0],
      ["das Reihenhaus, -¨er", "terraced house", "Wir wohnen in einem Reihenhaus am Stadtrand.", "We live in a terraced house on the edge of town.", "", 0],
      ["rufen", "to call (out); to call for", "Er rief laut um Hilfe.", "He called out loudly for help.", "", 0],
      ["verbreiten", "to spread", "Die Nachricht verbreitete sich schnell im ganzen Dorf.", "The news spread quickly through the whole village.", "", 0],
      ["der Wodka, -s", "vodka", "Er hatte zu viel Wodka getrunken.", "He had drunk too much vodka.", "", 0],
      ["zumindest", "at least", "Zumindest hat es nicht geregnet.", "At least it didn't rain.", "", 0],
      ["aufregend", "exciting", "Der erste Tag in der neuen Stadt war sehr aufregend.", "The first day in the new city was very exciting.", "", 0],
      ["der Heimatort, -e", "home town", "Jeden Sommer fährt sie in ihren Heimatort im Tessin.", "Every summer she goes back to her home town in Ticino.", "", 0],
      ["jedes Mal", "every time", "Jedes Mal, wenn ich Lotto spiele, verliere ich.", "Every time I play the lottery, I lose.", "", 0],
      ["der Motorroller, -", "scooter", "Mit 16 hatte ich einen alten Motorroller.", "At 16 I had an old scooter.", "CH oft: der Roller", 0],
      ["witzig", "funny, witty", "Mein Kollege erzählt immer witzige Geschichten.", "My colleague always tells funny stories.", "", 0],
      ["aller- (allerbeste …)", "very …-est (prefix)", "Das war der allerschönste Tag meines Lebens.", "That was the very best day of my life.", "", 0],
      ["die Bank, -¨e", "bench", "Wir sassen auf einer Bank am See.", "We sat on a bench by the lake.", "DE: saßen", 0],
      ["der/die/das beste", "the best", "Das ist die beste Pizza der Stadt.", "This is the best pizza in town.", "", 0],
      ["betrachten", "to look at, observe", "Sie betrachtete lange das alte Foto.", "She looked at the old photo for a long time.", "", 0],
      ["brechen", "to break", "Beim Skifahren brach er sich das Bein.", "He broke his leg skiing.", "", 0],
      ["das Feld, -er", "field", "Hinter dem Haus gibt es nur Felder und Wald.", "There's nothing but fields and forest behind the house.", "", 0],
      ["fliehen", "to flee", "Die Familie musste aus ihrem Land fliehen.", "The family had to flee their country.", "", 0],
      ["schiessen", "to shoot; to score (a goal)", "In der letzten Minute schoss er ein Tor.", "He scored a goal in the last minute.", "DE: schießen", 0],
      ["das Zivilstandsamt, -¨er", "registry office", "Sie haben auf dem Zivilstandsamt geheiratet.", "They got married at the registry office.", "DE: das Standesamt", 0],
      ["stattdessen", "instead", "Es regnete, also gingen wir stattdessen ins Museum.", "It was raining, so we went to the museum instead.", "", 0],
      ["das Tor, -e", "goal; gate", "Der Ball ging direkt ins Tor.", "The ball went straight into the goal.", "", 0],
      ["der Trainer, -", "coach", "Der Trainer war mit dem Spiel zufrieden.", "The coach was pleased with the game.", "", 0],
      ["verliebt sein (in + Akk.)", "to be in love (with)", "Er ist seit Wochen in seine Kollegin verliebt.", "He's been in love with his colleague for weeks.", "", 0],
      ["die Aufnahme, -n", "photo; recording", "Die Aufnahme ist leider unscharf.", "Unfortunately the photo is blurred.", "", 0],
      ["augenblicklich", "immediately", "Der Hund liess augenblicklich den Ball fallen.", "The dog immediately dropped the ball.", "DE: ließ", 0],
      ["beissen", "to bite", "Keine Angst, der Hund beisst nicht.", "Don't worry, the dog doesn't bite.", "DE: beißen", 0],
      ["der Bericht, -e", "report", "Für die Versicherung muss ich einen Bericht schreiben.", "I have to write a report for the insurance company.", "", 0],
      ["der Blumentopf, -¨e", "flowerpot", "Der Blumentopf ist vom Balkon gefallen.", "The flowerpot fell off the balcony.", "", 0],
      ["daraufhin", "as a result, thereupon", "Er beschwerte sich, daraufhin bekam er sein Geld zurück.", "He complained, and as a result he got his money back.", "", 0],
      ["die Daten (Pl.)", "data; personal details", "Bitte geben Sie Ihre persönlichen Daten an.", "Please provide your personal details.", "", 0],
      ["erschrecken", "to get a fright; to frighten", "Ich erschrak, als das Telefon mitten in der Nacht klingelte.", "I got a fright when the phone rang in the middle of the night.", "", 0],
      ["fallen lassen", "to drop", "Vor Schreck liess sie die Tasse fallen.", "She dropped the cup in fright.", "DE: ließ", 0],
      ["das Gespräch, -e", "conversation", "Nach dem Gespräch mit dem Chef war ich erleichtert.", "After the conversation with the boss I was relieved.", "", 0],
      ["der/die Geschädigte, -n", "injured party (insurance)", "Die Versicherung zahlt dem Geschädigten 300 Franken.", "The insurance pays the injured party 300 francs.", "", 0],
      ["der Kontakt, -e", "contact", "Mit meinen alten Schulfreunden habe ich kaum noch Kontakt.", "I hardly have any contact with my old school friends.", "", 0],
      ["Kontakt auf·nehmen (mit + Dat.)", "to get in touch (with)", "Bitte nehmen Sie mit unserem Kundendienst Kontakt auf.", "Please get in touch with our customer service.", "", 0],
      ["die Privathaftpflichtversicherung, -en", "personal liability insurance", "Zum Glück habe ich eine Privathaftpflichtversicherung.", "Luckily I have personal liability insurance.", "", 0],
      ["der Schaden, -¨", "damage", "Der Schaden am Auto war nicht gross.", "The damage to the car wasn't serious.", "DE: groß", 0],
      ["der Schadenhergang (Sg.)", "how the damage occurred (insurance form)", "Beschreiben Sie bitte den Schadenhergang genau.", "Please describe exactly how the damage occurred.", "", 0],
      ["die Stange, -n", "pole, rod", "Die Vorhangstange ist heruntergefallen.", "The curtain rod has fallen down.", "", 0],
      ["treffen", "to hit; to meet", "Der Ball traf das Fenster.", "The ball hit the window.", "", 0],
      ["die Vase, -n", "vase", "Die Katze hat die Vase umgeworfen.", "The cat knocked over the vase.", "", 0],
      ["versehentlich", "accidentally", "Ich habe versehentlich die falsche Datei gelöscht.", "I accidentally deleted the wrong file.", "", 0],
      ["der Versicherungsnehmer, -", "policyholder", "Der Versicherungsnehmer muss den Schaden sofort melden.", "The policyholder must report the damage immediately.", "", 0],
      ["der Vorhang, -¨e", "curtain", "Zieh bitte den Vorhang zu, die Sonne blendet.", "Please close the curtain, the sun is in my eyes.", "", 0],
      ["auf·spannen", "to open (an umbrella)", "Im Haus soll man keinen Schirm aufspannen – das bringt Pech!", "You shouldn't open an umbrella indoors – it's bad luck!", "", 0],
      ["beschützen", "to protect", "Der Schutzengel soll mich auf Reisen beschützen.", "The guardian angel is supposed to protect me when I travel.", "", 0],
      ["der Brunnen, -", "fountain; well", "In Zürich gibt es über tausend Brunnen.", "There are over a thousand fountains in Zurich.", "", 0],
      ["in Erfüllung gehen", "to come true", "Ihr grösster Wunsch ist in Erfüllung gegangen.", "Her greatest wish has come true.", "DE: größter", 0],
      ["glauben an (+ Akk.)", "to believe in", "Glaubst du an Glück?", "Do you believe in luck?", "", 0],
      ["der Glockenschlag, -¨e", "stroke of the bell", "Mit dem letzten Glockenschlag um Mitternacht beginnt das neue Jahr.", "The new year begins with the last stroke of midnight.", "", 0],
      ["der Glücksbringer, -", "good-luck charm", "Mein Glücksbringer ist ein kleiner Stein.", "My good-luck charm is a small stone.", "", 0],
      ["der Löwe, -n", "lion", "Im Zoo sahen wir einen Löwen.", "We saw a lion at the zoo.", "", 0],
      ["die Mitternacht (Sg.)", "midnight", "Um Mitternacht stossen wir mit Champagner an.", "At midnight we toast with champagne.", "DE: stoßen", 0],
      ["das Ritual, -e", "ritual", "Vor jeder Prüfung hat er ein kleines Ritual.", "He has a little ritual before every exam.", "", 0],
      ["der Stein, -e", "stone", "Der Stein in meiner Tasche bringt mir Glück.", "The stone in my pocket brings me luck.", "", 0],
      ["die Weintraube, -n", "grape", "In Spanien isst man an Silvester zwölf Weintrauben.", "In Spain people eat twelve grapes on New Year's Eve.", "", 0],
      ["der Sänger, - / die Sängerin, -nen", "singer", "Die Sängerin sang ein Lied über das Glück.", "The singer sang a song about happiness.", "", 0],
      ["das Velo, -s", "bicycle", "Am Wochenende fahren wir mit dem Velo an den See.", "At the weekend we're cycling to the lake.", "DE: das Fahrrad", 1],
      ["parkieren", "to park", "Hier darf man nicht parkieren.", "You're not allowed to park here.", "DE: parken", 1],
      ["die Grossmama / der Grosspapa", "grandma / grandpa", "Meine Grossmama macht die beste Rösti.", "My grandma makes the best rösti.", "DE: Oma / Opa", 1],
      ["die Schulreise, -n", "school trip", "Auf der Schulreise besuchten wir den Rheinfall.", "On the school trip we visited the Rhine Falls.", "DE: der Klassenausflug", 1],
      ["pensioniert", "retired", "Mein Vater ist seit letztem Jahr pensioniert.", "My father has been retired since last year.", "DE: in Rente", 1],
    ] },
    { id: "L02", n: 2, title: "Unterhaltung", book: "B1.1", cards: [
      ["das Abenteuer, -", "adventure", "Meine Kinder lieben Filme, in denen es um Abenteuer geht.", "My children love films that are about adventures.", "", 0],
      ["alltäglich", "everyday, ordinary", "Mir gefallen Serien, die ganz alltägliche Probleme zeigen.", "I like series that show completely ordinary problems.", "", 0],
      ["der Alzheimer (Sg.)", "Alzheimer's (disease)", "Der Film über einen Vater mit Alzheimer hat mich sehr berührt.", "The film about a father with Alzheimer's really moved me.", "", 0],
      ["anfangs", "at first, initially", "Anfangs fand ich die Serie langweilig, aber dann wurde sie spannend.", "At first I found the series boring, but then it got exciting.", "", 0],
      ["sich an·hören", "to listen to (sth.); to sound", "Hör dir mal diesen Song an – der ist total gut!", "Have a listen to this song – it's really good!", "", 0],
      ["die Arbeitslosigkeit (Sg.)", "unemployment", "Die Serie zeigt, wie schwierig Arbeitslosigkeit für eine ganze Familie sein kann.", "The series shows how hard unemployment can be for a whole family.", "", 0],
      ["aussen", "outside, on the outside", "Von aussen sieht das Haus aus dem Film ganz normal aus.", "From the outside the house from the film looks completely normal.", "DE: außen", 0],
      ["aus·wandern", "to emigrate", "Obwohl er kein Englisch sprach, ist er nach Australien ausgewandert.", "Although he didn't speak any English, he emigrated to Australia.", "", 0],
      ["die Band, -s", "band", "Mein Bruder spielt Schlagzeug in einer Band aus Winterthur.", "My brother plays drums in a band from Winterthur.", "", 0],
      ["der Beat, -s", "beat", "Der Beat ist super, aber den Text finde ich nicht besonders gut.", "The beat is great, but I don't think much of the lyrics.", "", 0],
      ["befreundet sein (mit + Dat.)", "to be friends (with)", "Das ist Lara, mit der ich seit der Schule befreundet bin.", "This is Lara, who I've been friends with since school.", "", 0],
      ["begegnen (+ Dat.)", "to meet, run into", "Gestern bin ich im Zug einem bekannten Schauspieler begegnet.", "Yesterday I ran into a well-known actor on the train.", "", 0],
      ["begleiten", "to accompany; to follow (with a camera)", "In der Dokuserie begleitet die Kamera eine junge Familie ein Jahr lang.", "In the docuseries the camera follows a young family for a year.", "", 0],
      ["sich beschäftigen (mit + Dat.)", "to deal with, occupy oneself with", "In seinen Songs beschäftigt sich der Rapper mit Themen wie Rassismus und Gewalt.", "In his songs the rapper deals with topics such as racism and violence.", "", 0],
      ["das Blut (Sg.)", "blood", "Ich kann kein Blut sehen, deshalb schaue ich keine Horrorfilme.", "I can't stand the sight of blood, so I don't watch horror films.", "", 0],
      ["der Charakter, -e", "character, personality", "Die Hauptfigur hat einen ziemlich schwierigen Charakter.", "The main character has a rather difficult personality.", "", 0],
      ["dafür", "for it, in favour (of it); to make up for it", "Ich bin dafür, dass wir heute Abend ins Kino gehen.", "I'm in favour of going to the cinema tonight.", "", 0],
      ["der Darsteller, -", "actor, performer", "Die Darsteller in dieser Schweizer Serie sprechen alle Dialekt.", "The actors in this Swiss series all speak dialect.", "", 0],
      ["dauernd", "constantly, all the time", "Mein Bruder schaut dauernd aufs Handy, obwohl wir einen Film schauen.", "My brother keeps looking at his phone even though we're watching a film.", "", 0],
      ["doppelt", "double, twice", "Die neue Staffel ist doppelt so lang wie die erste.", "The new season is twice as long as the first.", "", 0],
      ["drehen", "to shoot (a film); to turn", "Der Film wurde zum Teil am Zürichsee gedreht.", "The film was partly shot by Lake Zurich.", "", 0],
      ["das Einfühlungsvermögen (Sg.)", "empathy, sensitivity", "Die Schauspielerin spielt die kranke Mutter mit viel Einfühlungsvermögen.", "The actress plays the sick mother with great sensitivity.", "", 0],
      ["elektronisch", "electronic", "Ich höre gern elektronische Musik, meine Schwester mag sie gar nicht.", "I like listening to electronic music, but my sister doesn't like it at all.", "", 0],
      ["entstehen", "to come about, be created", "Die Idee für die Serie ist bei einem Abendessen mit Freunden entstanden.", "The idea for the series came about over dinner with friends.", "", 0],
      ["erfinden", "to invent; to make up", "Die Geschichte ist nicht wahr – der Autor hat alles frei erfunden.", "The story isn't true – the author made it all up.", "", 0],
      ["erfolgreich", "successful", "Die Serie war so erfolgreich, dass es jetzt eine dritte Staffel gibt.", "The series was so successful that there's now a third season.", "", 0],
      ["sich erfüllen", "to come true, be fulfilled", "Am Ende des Films erfüllt sich ihr grösster Traum.", "At the end of the film her biggest dream comes true.", "DE: größter", 0],
      ["erkrankt (an + Dat.)", "ill (with), suffering (from)", "Im Film spielt er einen Mann, der an Krebs erkrankt ist.", "In the film he plays a man who is ill with cancer.", "", 0],
      ["der Fall, -¨e", "case (crime); case, instance", "Die Kommissarin muss in jeder Folge einen neuen Fall lösen.", "The detective has to solve a new case in every episode.", "", 0],
      ["die Figur, -en (im Film)", "character (in a film); figure", "Welche Figur in der Serie findest du am sympathischsten?", "Which character in the series do you find most likeable?", "", 0],
      ["die Flüchtlingsfamilie, -n", "refugee family", "Der Dokumentarfilm zeigt eine Flüchtlingsfamilie, der die Nachbarn in Luzern helfen.", "The documentary shows a refugee family who are helped by the neighbours in Lucerne.", "", 0],
      ["die Folge, -n", "episode; consequence", "Wir haben gestern drei Folgen hintereinander geschaut.", "Yesterday we watched three episodes in a row.", "", 0],
      ["der Gangsta-Rapper, -", "gangsta rapper", "Obwohl er sich als Gangsta-Rapper gibt, wohnt er noch bei seinen Eltern.", "Although he poses as a gangsta rapper, he still lives with his parents.", "", 0],
      ["gelingen (+ Dat.)", "to succeed, manage", "Es ist mir nicht gelungen, Tickets für das Konzert zu bekommen.", "I didn't manage to get tickets for the concert.", "", 0],
      ["der Gesprächspartner, -", "conversation partner; interviewee", "Im Podcast stellt sie ihren Gesprächspartnern immer die gleiche letzte Frage.", "On the podcast she always asks the people she talks to the same final question.", "", 0],
      ["die Gewalt, -en", "violence; force", "Filme mit viel Gewalt schaue ich überhaupt nicht gern.", "I don't like watching films with lots of violence at all.", "", 0],
      ["der Gewinner, -", "winner", "Der Gewinner der Castingshow bekommt einen Plattenvertrag.", "The winner of the talent show gets a record deal.", "", 0],
      ["die Grossstadt, -¨e", "city, big city", "Viele Krimiserien spielen in einer Grossstadt wie Berlin oder London.", "Lots of crime series are set in a big city like Berlin or London.", "DE: Großstadt", 0],
      ["handeln von (+ Dat.)", "to be about (film, book); to act", "Wovon handelt der Film, den du gestern gesehen hast?", "What is the film you saw yesterday about?", "", 0],
      ["der Held, -en", "hero", "Der Held der Geschichte ist ein ganz normaler Briefträger aus dem Emmental.", "The hero of the story is a completely ordinary postman from the Emmental.", "", 0],
      ["heutig- (die heutige Zeitung …)", "today's, present-day", "In der heutigen Zeitung steht ein Interview mit der Sängerin.", "There's an interview with the singer in today's newspaper.", "", 0],
      ["der Hit, -s", "hit (song)", "Dieser Song war im Sommer ein riesiger Hit.", "This song was a huge hit in the summer.", "", 0],
      ["der Homosexuelle, -n", "homosexual, gay man", "Der Film erzählt die Liebesgeschichte von zwei Homosexuellen in den Fünfzigerjahren.", "The film tells the love story of two gay men in the 1950s.", "", 0],
      ["der Humor (Sg.)", "humour", "Den Schweizer Humor verstehe ich noch nicht immer.", "I don't always understand Swiss humour yet.", "", 0],
      ["innen", "inside, on the inside", "Von innen ist das alte Kino viel grösser, als man denkt.", "Inside, the old cinema is much bigger than you'd think.", "DE: größer", 0],
      ["inzwischen", "by now; meanwhile", "Inzwischen gibt es schon fünf Staffeln dieser Serie.", "By now there are already five seasons of this series.", "", 0],
      ["jammern", "to moan, whine", "Hör auf zu jammern, der Film dauert nur noch zehn Minuten!", "Stop moaning, there are only ten minutes of the film left!", "", 0],
      ["die Kiste, -n", "box, crate; (coll.) telly", "Meine alten DVDs liegen in einer Kiste im Keller.", "My old DVDs are in a box in the cellar.", "", 0],
      ["knapp", "just under, barely; scarce, tight", "Mit knapp zwei Stunden ist der Film nicht zu lang.", "At just under two hours, the film isn't too long.", "", 0],
      ["die Komödie, -n", "comedy", "Wollen wir eine Komödie schauen? Ich brauche heute etwas zum Lachen.", "Shall we watch a comedy? I need something to laugh at today.", "", 0],
      ["Kriminal- (Kriminalfilm, Kriminalroman)", "crime … (prefix)", "Am Sonntagabend schaut meine Mutter immer einen Kriminalfilm.", "On Sunday evenings my mother always watches a crime film.", "", 0],
      ["die Kriminalität (Sg.)", "crime (in general), criminality", "Die Serie zeigt die Kriminalität in einer Grossstadt ziemlich realistisch.", "The series shows crime in a big city fairly realistically.", "DE: Großstadt", 0],
      ["kritisieren", "to criticise", "In der Zeitung wurde der neue Film stark kritisiert.", "The new film was heavily criticised in the newspaper.", "", 0],
      ["das Lager, -", "camp; storeroom, warehouse", "Im Skilager haben wir jeden Abend zusammen einen Film geschaut.", "At ski camp we watched a film together every evening.", "", 0],
      ["sich langweilen", "to be bored", "Bei diesem Film habe ich mich total gelangweilt.", "I was totally bored during this film.", "", 0],
      ["der Lebensunterhalt (Sg.)", "living, livelihood", "Mit seiner Musik kann er seinen Lebensunterhalt noch nicht verdienen.", "He can't make a living from his music yet.", "", 0],
      ["meckern", "to grumble, moan", "Mein Vater meckert über jede Sendung, schaut aber trotzdem weiter.", "My father grumbles about every programme but keeps watching anyway.", "", 0],
      ["die Medien (Pl.)", "(the) media", "Welche Medien nutzt du, um dich zu informieren?", "Which media do you use to keep yourself informed?", "", 0],
      ["meist", "mostly, usually", "Abends schaue ich meist eine Folge, bevor ich schlafen gehe.", "In the evening I usually watch an episode before I go to bed.", "", 0],
      ["nervig", "annoying", "Ich finde es extrem nervig, wenn jemand im Kino telefoniert.", "I find it extremely annoying when someone talks on the phone in the cinema.", "", 0],
      ["niemals", "never", "Ich würde niemals eine Serie ohne dich weiterschauen!", "I would never carry on watching a series without you!", "", 0],
      ["obwohl", "although, even though", "Obwohl ich müde war, habe ich noch zwei Folgen geschaut.", "Although I was tired, I watched two more episodes.", "", 0],
      ["die Operation, -en", "operation (surgery)", "In der Arztserie gibt es in jeder Folge eine schwierige Operation.", "In the medical drama there's a difficult operation in every episode.", "", 0],
      ["optimistisch", "optimistic", "Obwohl die Lage schwierig ist, bleibt die Hauptfigur immer optimistisch.", "Although the situation is difficult, the main character always stays optimistic.", "", 0],
      ["das Pflegeheim, -e", "nursing home, care home", "Meine Grossmutter lebt seit letztem Jahr in einem Pflegeheim am See.", "My grandmother has been living in a care home by the lake since last year.", "DE: Großmutter", 0],
      ["produzieren", "to produce", "Der Rapper produziert seine Beats selbst in seinem Zimmer.", "The rapper produces his beats himself in his bedroom.", "", 0],
      ["der Rap, -s", "rap", "Rap auf Schweizerdeutsch finde ich gar nicht so schlecht.", "I actually think rap in Swiss German isn't bad at all.", "", 0],
      ["rappen", "to rap", "Er rappt auf Berndeutsch über sein Leben in der Stadt.", "He raps in Bernese German about his life in the city.", "", 0],
      ["der Rassismus (Sg.)", "racism", "Der Film zeigt, wie Menschen im Alltag Rassismus erleben.", "The film shows how people experience racism in everyday life.", "", 0],
      ["der Rat (Sg.)", "advice", "Kannst du mir einen Rat geben, welche Serie ich schauen soll?", "Can you give me some advice on which series I should watch?", "", 0],
      ["relativ", "relatively, fairly", "Das Kino ist relativ klein, aber sehr gemütlich.", "The cinema is relatively small but very cosy.", "", 0],
      ["der Rundfunk (Sg.)", "broadcasting; radio", "Früher war der Rundfunk für viele Familien die wichtigste Informationsquelle.", "In the past, radio was the most important source of information for many families.", "", 0],
      ["die Sängerin, -nen", "singer (female)", "Die Sängerin, der ich auf Instagram folge, gibt nächste Woche ein Konzert in Zürich.", "The singer I follow on Instagram is giving a concert in Zurich next week.", "", 0],
      ["die Serie, -n", "series (TV)", "Wollen wir zusammen eine neue Serie anfangen?", "Shall we start a new series together?", "", 0],
      ["sogenannt", "so-called", "Heute schauen viele Leute Serien auf sogenannten Streamingplattformen.", "Nowadays many people watch series on so-called streaming platforms.", "", 0],
      ["der Song, -s", "song", "Das ist der Song, mit dem die Band berühmt geworden ist.", "That's the song the band became famous with.", "", 0],
      ["spülen", "to rinse; to wash up (dishes)", "Während der Werbung spüle ich schnell das Geschirr.", "During the ads I quickly do the washing-up.", "CH oft: abwaschen", 0],
      ["die Staffel, -n", "season (of a TV series)", "Die zweite Staffel finde ich noch spannender als die erste.", "I think the second season is even more exciting than the first.", "", 0],
      ["der Star, -s", "star (celebrity)", "Nach der Castingshow war sie plötzlich ein Star.", "After the talent show she was suddenly a star.", "", 0],
      ["die Szene, -n", "scene (film; music/art world)", "Die Szene am Ende des Films war ziemlich brutal.", "The scene at the end of the film was pretty brutal.", "", 0],
      ["der Titel, -", "title", "Ich habe den Titel des Films vergessen, den wir im Sommer gesehen haben.", "I've forgotten the title of the film we saw in the summer.", "", 0],
      ["der Typ, -en", "guy, bloke; type", "Der Typ, der im Kino neben mir sass, hat die ganze Zeit gegessen.", "The guy who sat next to me in the cinema was eating the whole time.", "DE: saß", 0],
      ["das Ufer, -", "bank, shore", "Im Sommer kann man am Ufer des Zürichsees Filme unter freiem Himmel schauen.", "In summer you can watch open-air films on the shore of Lake Zurich.", "", 0],
      ["unglaublich", "incredible; incredibly", "Das Ende der Serie war unglaublich spannend.", "The ending of the series was incredibly exciting.", "", 0],
      ["die Vergangenheit, -en", "past", "Die Hauptfigur hat ein Geheimnis aus ihrer Vergangenheit.", "The main character has a secret from her past.", "", 0],
      ["das Verhältnis, -se", "relationship; ratio", "Zu meinem Bruder habe ich ein sehr gutes Verhältnis.", "I have a very good relationship with my brother.", "", 0],
      ["verlassen", "to leave", "Nach zwanzig Minuten haben wir das Kino verlassen, so schlecht war der Film.", "We left the cinema after twenty minutes – that's how bad the film was.", "", 0],
      ["das Versehen, -", "oversight, mistake; aus Versehen = by mistake", "Ich habe aus Versehen die letzte Folge zuerst geschaut.", "I accidentally watched the last episode first.", "", 0],
      ["völlig", "completely, totally", "Die Handlung des Films war für mich völlig unverständlich.", "The plot of the film was completely incomprehensible to me.", "", 0],
      ["der Wortwitz, -e", "pun, wordplay", "Die Wortwitze in seinen Songs verstehe ich leider nicht alle.", "Unfortunately I don't understand all the puns in his songs.", "", 0],
      ["die Wurzel, -n", "root", "Die Sängerin wohnt in Zürich, ihre Wurzeln liegen aber in Portugal.", "The singer lives in Zurich, but her roots are in Portugal.", "", 0],
      ["der Zeichentrickfilm, -e", "cartoon, animated film", "Unsere Kinder dürfen am Sonntagmorgen einen Zeichentrickfilm schauen.", "Our children are allowed to watch a cartoon on Sunday mornings.", "", 0],
      ["zuletzt", "last, most recently; in the end", "Welchen Film hast du zuletzt im Kino gesehen?", "What was the last film you saw at the cinema?", "", 0],
      ["zu·stimmen (+ Dat.)", "to agree (with)", "Da kann ich dir nur zustimmen – die zweite Staffel ist viel besser.", "I can only agree with you there – the second season is much better.", "", 0],
      ["tönen", "to sound (good, strange …)", "Ein Filmabend bei dir am Freitag? Das tönt gut!", "A film night at your place on Friday? That sounds good!", "DE: klingen", 1],
      ["die Gratiszeitung, -en", "free (commuter) newspaper", "Im Zug lag eine alte Gratiszeitung auf dem Sitz neben mir.", "On the train there was an old free newspaper on the seat next to me.", "", 1],
      ["SRF (Schweizer Radio und Fernsehen)", "Swiss public radio and TV (German-speaking)", "Meine Nachbarn schauen jeden Abend die Nachrichten auf SRF.", "My neighbours watch the news on SRF every evening.", "", 1],
      ["das Schweizerdeutsch (Sg.)", "Swiss German", "Obwohl sie gut Hochdeutsch kann, versteht sie Schweizerdeutsch noch kaum.", "Although her Standard German is good, she hardly understands any Swiss German yet.", "", 1],
      ["der Dialekt, -e", "dialect (in CH: Swiss German)", "Mit Freunden spricht er Dialekt, bei der Arbeit Hochdeutsch.", "He speaks dialect with friends and Standard German at work.", "", 1],
    ] },
    { id: "L03", n: 3, title: "Gesund bleiben", book: "B1.1", cards: [
      ["ab·bauen", "to reduce, relieve (stress); to dismantle", "Beim Joggen am See kann ich meinen Stress am besten abbauen.", "Jogging by the lake is the best way for me to relieve stress.", "", 0],
      ["der Abfalleimer, -", "rubbish bin, waste bin", "Nach dem Arztbesuch warf er seine Zigaretten in den Abfalleimer.", "After seeing the doctor he threw his cigarettes in the bin.", "CH oft: der Abfallkübel", 0],
      ["ab·nehmen", "to lose weight; to take off, remove", "Seit ich mit dem Velo zur Arbeit fahre, habe ich drei Kilo abgenommen.", "Since I started cycling to work, I've lost three kilos.", "", 0],
      ["ab·senken", "to lower", "Senken Sie das Becken langsam ab und atmen Sie dabei aus.", "Slowly lower your pelvis and breathe out as you do so.", "", 0],
      ["achten (auf + Akk.)", "to pay attention (to), watch", "Seit der Diagnose achtet mein Vater mehr auf seine Ernährung.", "Since the diagnosis my father has been paying more attention to his diet.", "", 0],
      ["der Alkoholgenuss (Sg.)", "drinking (alcohol), alcohol consumption", "Übermässiger Alkoholgenuss ist schlecht für die Leber.", "Excessive drinking is bad for the liver.", "DE: Übermäßiger", 0],
      ["an deiner/Ihrer Stelle", "if I were you", "An deiner Stelle würde ich mit diesen Rückenschmerzen zum Arzt gehen.", "If I were you, I'd go to the doctor with that back pain.", "", 0],
      ["an·halten", "to hold (one's breath); to stop", "Halten Sie kurz den Atem an und zählen Sie bis fünf.", "Hold your breath briefly and count to five.", "", 0],
      ["an·heben", "to lift, raise", "Kannst du mir helfen, das Sofa kurz anzuheben?", "Can you help me lift the sofa for a moment?", "", 0],
      ["atmen", "to breathe", "Im Yogakurs lernen wir, ruhig und tief zu atmen.", "In the yoga class we learn to breathe calmly and deeply.", "", 0],
      ["die Atmung (Sg.)", "breathing", "Die richtige Atmung ist bei dieser Übung besonders wichtig.", "Correct breathing is particularly important in this exercise.", "", 0],
      ["auf·wachen", "to wake up", "Wegen des Stresses wache ich morgens oft schon um vier Uhr auf.", "Because of the stress I often wake up as early as four in the morning.", "", 0],
      ["aus·atmen", "to breathe out, exhale", "Wer bei Stress langsam ausatmet, beruhigt sich schneller.", "If you breathe out slowly when you're stressed, you calm down faster.", "", 0],
      ["aus·halten", "to bear, stand", "Die Schmerzen im Knie waren kaum noch auszuhalten.", "The pain in my knee was barely bearable any more.", "", 0],
      ["ausreichend", "sufficient; sufficiently, enough", "Wer ausreichend schläft, wird seltener krank.", "People who get enough sleep fall ill less often.", "", 0],
      ["aus·strecken", "to stretch out", "Im Flugzeug kann ich meine langen Beine kaum ausstrecken.", "On the plane I can hardly stretch out my long legs.", "", 0],
      ["die Axt, -¨e", "axe", "Für das Brennholz im Ferienhaus brauchen wir eine neue Axt.", "We need a new axe for the firewood at the holiday cottage.", "", 0],
      ["befürchten", "to fear, be afraid (that)", "Ich befürchte, dass ich mir beim Fussball das Knie verletzt habe.", "I'm afraid I've injured my knee playing football.", "DE: Fußball", 0],
      ["beispielsweise", "for example, for instance", "Gegen Stress hilft beispielsweise ein Spaziergang im Wald.", "A walk in the woods, for example, helps against stress.", "", 0],
      ["die Beinmuskulatur, -en", "leg muscles", "Beim Velofahren in den Bergen wird die Beinmuskulatur stark beansprucht.", "Cycling in the mountains puts a lot of strain on the leg muscles.", "", 0],
      ["die Beschwerde, -n", "complaint; (Pl.) symptoms, trouble", "Seit wann haben Sie diese Beschwerden im Rücken?", "How long have you had this trouble with your back?", "", 0],
      ["die Dehnung, -en", "stretch, stretching", "Halten Sie die Dehnung etwa zwanzig Sekunden lang.", "Hold the stretch for about twenty seconds.", "", 0],
      ["das Drittel, -", "third", "Wir verbringen etwa ein Drittel unseres Lebens im Bett.", "We spend about a third of our lives in bed.", "", 0],
      ["ebenfalls", "also, likewise", "Meine Kollegin ist ebenfalls krank, deshalb ist das Büro fast leer.", "My colleague is also ill, so the office is almost empty.", "", 0],
      ["ein·atmen", "to breathe in, inhale", "Atmen Sie tief ein und heben Sie dabei die Arme über den Kopf.", "Breathe in deeply and raise your arms above your head as you do so.", "", 0],
      ["die Einnahme, -n", "taking (of medicine); income", "Lesen Sie vor der Einnahme des Medikaments die Packungsbeilage.", "Read the package leaflet before taking the medicine.", "", 0],
      ["entspannt", "relaxed", "Nach einer Woche Ferien im Tessin fühle ich mich endlich entspannt.", "After a week's holiday in Ticino I finally feel relaxed.", "", 0],
      ["das Ergebnis, -se", "result", "Die Ergebnisse der Blutuntersuchung bekommen Sie nächste Woche.", "You'll get the results of the blood test next week.", "", 0],
      ["erhalten", "to receive; to maintain, keep", "Von der Krankenkasse habe ich einen Brief mit der neuen Prämie erhalten.", "I've received a letter from my health insurer with the new premium.", "", 0],
      ["die Erkrankung, -en", "illness, disease", "Rauchen erhöht das Risiko einer Erkrankung der Lunge.", "Smoking increases the risk of lung disease.", "", 0],
      ["erschöpft", "exhausted", "Nach drei Wochen mit vielen Überstunden war sie völlig erschöpft.", "After three weeks of lots of overtime she was completely exhausted.", "", 0],
      ["erzielen", "to achieve (a result)", "Mit diesem Training kann man schon nach wenigen Wochen gute Ergebnisse erzielen.", "With this training you can achieve good results after just a few weeks.", "", 0],
      ["extrem", "extreme; extremely", "Diese Woche ist im Büro extrem viel los.", "It's extremely busy at the office this week.", "", 0],
      ["der Facharzt, -¨e", "specialist (doctor)", "Mein Hausarzt hat mich wegen der Knieschmerzen an einen Facharzt überwiesen.", "My GP referred me to a specialist because of my knee pain.", "", 0],
      ["der Fachmann, -¨er/-leute", "expert, specialist", "Bei Rückenproblemen sollte man den Rat eines Fachmanns einholen.", "If you have back problems, you should get advice from an expert.", "", 0],
      ["der Faktor, -en", "factor", "Bewegung ist ein wichtiger Faktor für die Gesundheit.", "Exercise is an important factor for your health.", "", 0],
      ["fällen", "to fell, cut down", "Im Wald hinter unserem Haus werden diese Woche alte Bäume gefällt.", "Old trees are being felled in the woods behind our house this week.", "", 0],
      ["das Fett, -e", "fat", "Beim Kochen verwende ich heute weniger Fett als früher.", "I use less fat in cooking these days than I used to.", "", 0],
      ["flach", "flat; shallow", "Die Wanderung ist ziemlich flach und auch für Kinder geeignet.", "The hike is fairly flat and suitable for children too.", "", 0],
      ["die Frucht, -¨e", "fruit, piece of fruit", "Zum Znüni nehme ich meistens eine Frucht mit ins Büro.", "I usually take a piece of fruit to the office for my morning snack.", "", 0],
      ["führen (zu + Dat.)", "to lead (to); to run, manage", "Zu viel Stress kann auf Dauer zu Schlafstörungen führen.", "In the long run, too much stress can lead to sleep problems.", "", 0],
      ["die Geschäftspartnerin, -nen", "business partner (female)", "Ich muss das Treffen mit meiner Geschäftspartnerin leider auf nächste Woche verschieben.", "Unfortunately I have to postpone the meeting with my business partner until next week.", "", 0],
      ["gestresst", "stressed", "Wenn ich gestresst bin, schlafe ich schlecht und esse zu viel Schokolade.", "When I'm stressed, I sleep badly and eat too much chocolate.", "", 0],
      ["die Gesundheitsförderung (Sg.)", "health promotion", "Unsere Firma bietet im Rahmen der Gesundheitsförderung gratis Yogakurse an.", "As part of its health promotion, our company offers free yoga classes.", "", 0],
      ["der Gesundheitskurs, -e", "health course, wellness class", "Meine Krankenkasse übernimmt einen Teil der Kosten für den Gesundheitskurs.", "My health insurer covers part of the cost of the health course.", "", 0],
      ["die Gesundheitsvorsorge (Sg.)", "preventive health care", "Zur Gesundheitsvorsorge gehört auch ein regelmässiger Besuch beim Zahnarzt.", "Regular visits to the dentist are also part of preventive health care.", "DE: regelmäßiger", 0],
      ["das Gewicht, -e", "weight", "Beim Hausarzt wurden zuerst mein Gewicht und meine Grösse gemessen.", "At the GP's, my weight and height were measured first.", "DE: Größe", 0],
      ["gleichzeitig", "at the same time, simultaneously", "Ich kann nicht gleichzeitig telefonieren und E-Mails beantworten.", "I can't talk on the phone and answer emails at the same time.", "", 0],
      ["die Grundlage, -n", "basis, foundation", "Guter Schlaf ist die Grundlage für einen produktiven Tag.", "Good sleep is the basis for a productive day.", "", 0],
      ["grundsätzlich", "basically, in principle; as a rule", "Grundsätzlich trinke ich nach 16 Uhr keinen Kaffee mehr.", "As a rule, I don't drink coffee after 4 p.m.", "", 0],
      ["die Hälfte, -n", "half", "Die Hälfte meiner Abteilung ist zurzeit krank.", "Half of my department is off sick at the moment.", "", 0],
      ["die Haltbarkeit (Sg.)", "shelf life; durability", "Im Kühlschrank verlängert sich die Haltbarkeit der meisten Lebensmittel.", "The shelf life of most foods is extended in the fridge.", "", 0],
      ["die Häufigkeit, -en", "frequency", "Die Häufigkeit meiner Kopfschmerzen hat in letzter Zeit zugenommen.", "The frequency of my headaches has increased recently.", "", 0],
      ["der Hausarzt, -¨e", "GP, family doctor", "Mit meinem Versicherungsmodell muss ich immer zuerst zum Hausarzt.", "With my insurance plan I always have to see my GP first.", "", 0],
      ["heraus·finden", "to find out", "Der Arzt will herausfinden, woher die Magenschmerzen kommen.", "The doctor wants to find out where the stomach pains are coming from.", "", 0],
      ["der Holzfäller, -", "lumberjack, woodcutter", "Im Winter arbeitet mein Onkel als Holzfäller im Emmental.", "In winter my uncle works as a lumberjack in the Emmental.", "", 0],
      ["ideal", "ideal", "Der Zürichberg ist ideal zum Joggen nach der Arbeit.", "The Zürichberg is ideal for jogging after work.", "", 0],
      ["impfen", "to vaccinate", "Ich lasse mich jeden Herbst gegen die Grippe impfen.", "I get vaccinated against flu every autumn.", "", 0],
      ["das Kniegelenk, -e", "knee joint", "Nach der Operation muss das Kniegelenk einige Wochen geschont werden.", "After the operation the knee joint has to be rested for a few weeks.", "", 0],
      ["das Koffein (Sg.)", "caffeine", "Am Abend trinke ich nur noch Tee ohne Koffein.", "In the evening I only drink caffeine-free tea now.", "", 0],
      ["die Konferenz, -en", "conference; (large) meeting", "Kannst du für mich die Präsentation an der Konferenz am Donnerstag übernehmen?", "Can you do the presentation at Thursday's conference for me?", "", 0],
      ["die Kraft, -¨e", "strength; power", "Nach der Grippe hatte ich wochenlang keine Kraft.", "After the flu I had no strength for weeks.", "", 0],
      ["die Kräftigung, -en", "strengthening", "Zur Kräftigung des Rückens mache ich jeden Morgen zehn Minuten Übungen.", "To strengthen my back, I do ten minutes of exercises every morning.", "", 0],
      ["krankgeschrieben sein", "to be signed off sick, be on sick leave", "Mein Kollege ist noch bis Ende Woche krankgeschrieben.", "My colleague is signed off sick until the end of the week.", "", 0],
      ["sich krank·melden", "to call in sick, report sick", "Ich habe Fieber und melde mich heute bei meiner Chefin krank.", "I've got a temperature and I'm calling in sick to my boss today.", "", 0],
      ["krank·schreiben", "to sign (sb.) off sick", "Die Ärztin hat mich für drei Tage krankgeschrieben.", "The doctor signed me off sick for three days.", "", 0],
      ["das Labor, -e", "laboratory, lab", "Die Blutprobe wird heute noch ins Labor geschickt.", "The blood sample will be sent to the lab later today.", "", 0],
      ["die Leistung, -en", "performance; achievement", "Wer zu wenig schläft, kann im Job keine gute Leistung bringen.", "If you don't get enough sleep, you can't perform well at work.", "", 0],
      ["der Magen, -¨", "stomach", "Diese Tabletten sollten nicht auf leeren Magen eingenommen werden.", "These tablets should not be taken on an empty stomach.", "", 0],
      ["die Magenschmerzen (Pl.)", "stomach ache", "Vor wichtigen Prüfungen bekomme ich oft Magenschmerzen.", "I often get stomach ache before important exams.", "", 0],
      ["der Magerquark (Sg.)", "low-fat quark", "Zum Frühstück esse ich Magerquark mit frischen Beeren.", "For breakfast I have low-fat quark with fresh berries.", "", 0],
      ["der Mangel, -¨ (an + Dat.)", "lack (of), shortage; deficiency", "Müdigkeit kann ein Zeichen für einen Mangel an Eisen sein.", "Tiredness can be a sign of iron deficiency.", "", 0],
      ["messen", "to measure; to take (temperature)", "Bei Fieber sollte die Temperatur zweimal am Tag gemessen werden.", "If you have a fever, your temperature should be taken twice a day.", "", 0],
      ["das Milchprodukt, -e", "dairy product", "Milchprodukte wie Käse und Quark enthalten viel Kalzium.", "Dairy products like cheese and quark contain a lot of calcium.", "", 0],
      ["die Mittagspause, -n", "lunch break", "In der Mittagspause gehe ich gern eine Runde am See spazieren.", "In my lunch break I like to go for a walk by the lake.", "", 0],
      ["das Mittel, -", "remedy, medicine; means", "Hast du ein gutes Mittel gegen Halsschmerzen?", "Do you have a good remedy for a sore throat?", "", 0],
      ["das Musikstück, -e", "piece of music", "Zum Entspannen höre ich am Abend ein ruhiges Musikstück.", "To relax, I listen to a calm piece of music in the evening.", "", 0],
      ["nachts", "at night", "Wer nachts schlecht schläft, ist am Tag oft gereizt.", "People who sleep badly at night are often irritable during the day.", "", 0],
      ["der Nacken, -", "(back of the) neck", "Vom vielen Sitzen am Computer tut mir der Nacken weh.", "My neck hurts from sitting at the computer so much.", "", 0],
      ["neigen", "to tilt, bend", "Neigen Sie den Kopf langsam zur rechten Schulter.", "Slowly tilt your head towards your right shoulder.", "", 0],
      ["öfter", "more often; quite often", "Du solltest öfter mal eine Pause machen.", "You should take a break more often.", "", 0],
      ["der Po, -s", "bottom, backside", "Bei dieser Übung bleibt der Po die ganze Zeit auf dem Boden.", "In this exercise your bottom stays on the floor the whole time.", "", 0],
      ["die Position, -en", "position", "In welcher Position schlafen Sie normalerweise?", "What position do you usually sleep in?", "", 0],
      ["der Quark (Sg.)", "quark (fresh curd cheese)", "Aus Quark, Kräutern und etwas Salz mache ich einen feinen Dip.", "I make a tasty dip from quark, herbs and a little salt.", "", 0],
      ["der Radiosender, -", "radio station", "Im Auto höre ich meistens einen Radiosender mit klassischer Musik.", "In the car I mostly listen to a classical music station.", "", 0],
      ["sanft", "gentle; gently", "Die Physiotherapeutin massierte meine Schultern ganz sanft.", "The physiotherapist massaged my shoulders very gently.", "", 0],
      ["schärfen", "to sharpen", "Bevor ich Gemüse schneide, schärfe ich immer zuerst das Messer.", "Before I chop vegetables, I always sharpen the knife first.", "", 0],
      ["der Schlaf (Sg.)", "sleep", "Genug Schlaf ist für die Gesundheit genauso wichtig wie Bewegung.", "Enough sleep is just as important for your health as exercise.", "", 0],
      ["das Schmerzmittel, -", "painkiller", "Nimm nicht zu oft Schmerzmittel, sondern geh lieber zum Arzt.", "Don't take painkillers too often – go to the doctor instead.", "", 0],
      ["der Schreibblock, -¨e", "writing pad, notepad", "Ich lege einen Schreibblock neben das Bett und notiere meine Sorgen.", "I put a notepad next to my bed and write down my worries.", "", 0],
      ["die Schulter, -n", "shoulder", "Ziehen Sie die Schultern hoch und lassen Sie sie dann wieder fallen.", "Pull your shoulders up and then let them drop again.", "", 0],
      ["solch- (solche Schmerzen …)", "such", "Bei solchen Schmerzen solltest du nicht zur Arbeit gehen.", "With pain like that, you shouldn't go to work.", "", 0],
      ["die Spritze, -n", "injection; syringe", "Die Ärztin gab mir eine Spritze gegen die Schmerzen.", "The doctor gave me an injection for the pain.", "", 0],
      ["die Steigerung, -en", "increase, improvement", "Durch tägliches Training erreichte sie eine deutliche Steigerung ihrer Ausdauer.", "Through daily training she achieved a marked improvement in her stamina.", "", 0],
      ["die Störung, -en", "disturbance, interruption; disorder", "Entschuldigen Sie die Störung, haben Sie kurz Zeit für eine Frage?", "Sorry to disturb you – have you got a moment for a question?", "", 0],
      ["strecken", "to stretch", "Strecken Sie beide Arme nach oben, so hoch Sie können.", "Stretch both arms upwards as high as you can.", "", 0],
      ["der Stressabbau (Sg.)", "stress relief, reducing stress", "Zum Stressabbau gehe ich nach der Arbeit schwimmen.", "To relieve stress, I go swimming after work.", "", 0],
      ["der Stressfaktor, -en", "source of stress, stress factor", "Der lange Arbeitsweg ist für mich ein grosser Stressfaktor.", "The long commute is a big source of stress for me.", "DE: großer", 0],
      ["stressig", "stressful", "Die Wochen vor Weihnachten sind im Geschäft immer sehr stressig.", "The weeks before Christmas are always very stressful at work.", "", 0],
      ["teil·nehmen (an + Dat.)", "to take part (in), attend", "Am Montag nehme ich an einem Kurs zur Stressbewältigung teil.", "On Monday I'm taking part in a course on stress management.", "", 0],
      ["treiben", "to do (sport); to drive, push", "Wie oft treiben Sie Sport? – Leider viel zu selten.", "How often do you do sport? – Far too rarely, unfortunately.", "", 0],
      ["das Übergewicht, -e", "excess weight, being overweight", "Übergewicht belastet die Knie und den Rücken.", "Excess weight puts strain on the knees and back.", "", 0],
      ["überreden", "to persuade, talk (sb.) into", "Meine Frau hat mich überredet, endlich mit dem Rauchen aufzuhören.", "My wife has persuaded me to finally give up smoking.", "", 0],
      ["um·gehen (mit + Dat.)", "to deal with, handle", "Meine Chefin kann sehr gut mit Druck umgehen.", "My boss handles pressure very well.", "", 0],
      ["umsonst", "free (of charge); in vain", "Die Rückengymnastik im Quartierzentrum ist für Senioren umsonst.", "The back exercise class at the community centre is free for senior citizens.", "", 0],
      ["untersuchen", "to examine", "Das Knie muss vom Facharzt genauer untersucht werden.", "The knee needs to be examined more closely by a specialist.", "", 0],
      ["der Verband, -¨e", "bandage, dressing", "Der Verband muss jeden Tag gewechselt werden.", "The bandage needs to be changed every day.", "", 0],
      ["die Verbesserung, -en", "improvement", "Seit ich weniger Kaffee trinke, merke ich eine Verbesserung beim Schlafen.", "Since I've been drinking less coffee, I've noticed an improvement in my sleep.", "", 0],
      ["vereinbaren", "to arrange, agree (on)", "Ich möchte gern einen Termin bei Dr. Meier vereinbaren.", "I'd like to make an appointment with Dr Meier.", "", 0],
      ["verschreiben", "to prescribe", "Gegen die Rückenschmerzen hat mir der Arzt Physiotherapie verschrieben.", "The doctor prescribed me physiotherapy for my back pain.", "", 0],
      ["verzichten (auf + Akk.)", "to do without, give up", "Seit einem Monat verzichte ich auf Süssigkeiten und fühle mich besser.", "I've been going without sweets for a month and feel better.", "DE: Süßigkeiten", 0],
      ["das Viertel, -", "quarter; district", "Für die Kinder schneide ich den Apfel in Viertel.", "I cut the apple into quarters for the children.", "CH (Stadtteil) oft: das Quartier", 0],
      ["das Vitamin, -e", "vitamin", "Im Winter nehme ich zusätzlich Vitamin D.", "In winter I take extra vitamin D.", "", 0],
      ["die Vorbeugung, -en", "prevention", "Zur Vorbeugung gegen Erkältungen wasche ich mir oft die Hände.", "To prevent colds, I wash my hands often.", "", 0],
      ["die Vorsorgeuntersuchung, -en", "check-up, (preventive) screening", "Bei der Vorsorgeuntersuchung wurde zum Glück nichts gefunden.", "Luckily nothing was found at the check-up.", "", 0],
      ["die Wirbelsäule, -n", "spine", "Beim Heben schwerer Kisten darf die Wirbelsäule nicht zu stark belastet werden.", "When lifting heavy boxes, the spine must not be put under too much strain.", "", 0],
      ["die Wirkung, -en", "effect", "Die Wirkung der Tablette setzt erst nach einer halben Stunde ein.", "The tablet only takes effect after half an hour.", "", 0],
      ["das Wohl (Sg.)", "well-being, welfare; (zum Wohl!) cheers!", "Das Pflegepersonal tut alles für das Wohl der Patienten.", "The nursing staff do everything for the patients' well-being.", "", 0],
      ["das Spital, -¨er", "hospital", "Nach dem Velounfall musste er zwei Nächte im Spital bleiben.", "After the bike accident he had to stay in hospital for two nights.", "DE: das Krankenhaus", 1],
      ["der Notfall, -¨e", "A&E, emergency department; emergency", "Auf dem Notfall im Unispital mussten wir drei Stunden warten.", "We had to wait three hours at A&E at the university hospital.", "DE: die Notaufnahme", 1],
      ["das Arztzeugnis, -se", "doctor's certificate, sick note", "In vielen Firmen braucht man ab dem dritten Krankheitstag ein Arztzeugnis.", "In many companies you need a doctor's certificate from the third day of illness.", "DE: das ärztliche Attest", 1],
      ["die Franchise, -n", "(annual) excess, deductible (health insurance)", "Weil ich eine hohe Franchise habe, bezahle ich die meisten Arztrechnungen selbst.", "Because I have a high excess, I pay most of my doctor's bills myself.", "DE: die Selbstbeteiligung", 1],
      ["die Krankenkassenprämie, -n", "health-insurance premium", "Im Herbst vergleichen viele Leute die Krankenkassenprämien und wechseln die Kasse.", "In autumn lots of people compare health-insurance premiums and switch insurers.", "DE: der Krankenkassenbeitrag", 1],
      ["die MPA, -s (medizinische Praxisassistentin)", "medical practice assistant", "Der Blutdruck wird zuerst von der MPA gemessen, dann kommt die Ärztin.", "Your blood pressure is taken first by the medical assistant, then the doctor comes.", "DE: die MFA, die Arzthelferin", 1],
      ["der Pikettdienst, -e", "on-call duty", "Weil ich krank bin, übernimmt ein Kollege meinen Pikettdienst.", "Because I'm ill, a colleague is taking over my on-call duty.", "DE: der Bereitschaftsdienst", 1],
    ] },
    { id: "L04", n: 4, title: "Sprachen", book: "B1.1", cards: [
      ["der Akzent, -e", "accent", "Wegen ihres Akzents fragen die Leute oft, woher sie kommt.", "Because of her accent, people often ask where she's from.", "", 0],
      ["allerdings", "however, though; certainly", "Vielen Dank für die Einladung, allerdings habe ich am Freitag keine Zeit.", "Many thanks for the invitation; however, I don't have time on Friday.", "", 0],
      ["allmählich", "gradually", "Allmählich verstehe ich auch das Schweizerdeutsch meiner Kollegen.", "I'm gradually starting to understand my colleagues' Swiss German too.", "", 0],
      ["andererseits", "on the other hand", "Einerseits möchte ich Italienisch lernen, andererseits fehlt mir die Zeit.", "On the one hand I'd like to learn Italian; on the other hand I don't have the time.", "", 0],
      ["auf·schreiben", "to write down", "Neue Wörter schreibe ich mir immer gleich auf.", "I always write new words down straight away.", "", 0],
      ["auf·wachsen", "to grow up", "Sie ist in Lugano aufgewachsen, deshalb ist Italienisch ihre Muttersprache.", "She grew up in Lugano, which is why Italian is her mother tongue.", "", 0],
      ["die Lehrstelle, -n", "apprenticeship (place)", "Ohne gute Deutschkenntnisse ist es schwierig, eine Lehrstelle zu finden.", "Without good German skills it's hard to find an apprenticeship.", "DE: der Ausbildungsplatz", 0],
      ["sich (Dat.) aus·denken", "to think up, make up", "Die Kinder haben sich eine eigene Geheimsprache ausgedacht.", "The children made up their own secret language.", "", 0],
      ["der Ausdruck, -¨e", "expression; printout", "Diesen Ausdruck kenne ich nicht – was bedeutet er?", "I don't know this expression – what does it mean?", "", 0],
      ["aus·räumen", "to clear out; to unload (dishwasher)", "Am Wochenende haben wir endlich den Keller ausgeräumt.", "At the weekend we finally cleared out the cellar.", "", 0],
      ["die Ausrede, -n", "excuse", "Ich hatte keine Lust auf die Party, deshalb habe ich eine Ausrede erfunden.", "I didn't feel like going to the party, so I made up an excuse.", "", 0],
      ["die Aussprache, -n", "pronunciation", "Die Aussprache von «ch» ist für viele Lernende schwierig.", "The pronunciation of «ch» is difficult for many learners.", "", 0],
      ["aus·suchen", "to choose, pick (out)", "Such dir ein Rezept aus, dann kochen wir am Samstag für alle.", "Pick a recipe, then we'll cook for everyone on Saturday.", "", 0],
      ["die Autorin, -nen", "author (female)", "Die Autorin schreibt ihre Bücher auf Deutsch, obwohl ihre Muttersprache Türkisch ist.", "The author writes her books in German, although her mother tongue is Turkish.", "", 0],
      ["der Autoschlüssel, -", "car key", "Wegen des verlorenen Autoschlüssels kamen wir eine Stunde zu spät.", "Because of the lost car key we arrived an hour late.", "", 0],
      ["beenden", "to finish, end", "Wenn ich den B1-Kurs beendet habe, mache ich die Prüfung.", "When I've finished the B1 course, I'll take the exam.", "", 0],
      ["bestehen auf (+ Dat.)", "to insist on", "Meine Lehrerin besteht auf einer korrekten Aussprache.", "My teacher insists on correct pronunciation.", "", 0],
      ["bestimmt (= sicher)", "certainly, definitely", "Mit so viel Motivation schaffst du die Prüfung bestimmt.", "With so much motivation you'll definitely pass the exam.", "", 0],
      ["bevorzugen", "to prefer", "Ich bevorzuge Kurse am Abend, weil ich tagsüber arbeite.", "I prefer evening courses because I work during the day.", "", 0],
      ["das Chili con Carne (Sg.)", "chilli con carne", "Für meine Freunde koche ich heute Abend ein grosses Chili con Carne.", "Tonight I'm cooking a big chilli con carne for my friends.", "DE: großes", 0],
      ["cool", "cool", "Dein neuer Job in Genf klingt echt cool!", "Your new job in Geneva sounds really cool!", "", 0],
      ["da (= weil)", "since, as (because)", "Da der Kurs schon um sieben beginnt, muss ich früh aufstehen.", "Since the course starts at seven, I have to get up early.", "", 0],
      ["daher", "therefore, that's why", "Mein Mann ist Italiener, daher sprechen wir zu Hause oft Italienisch.", "My husband is Italian, so we often speak Italian at home.", "", 0],
      ["da(r)- (dafür, darüber …)", "it, that (+ preposition: for it, about it …)", "Hast du schon von der neuen Sprachschule gehört? – Ja, Anna hat mir davon erzählt.", "Have you heard about the new language school? – Yes, Anna told me about it.", "", 0],
      ["darum", "that's why, therefore", "Ich möchte mit meinen Nachbarn reden können, darum lerne ich Schweizerdeutsch.", "I want to be able to talk to my neighbours, that's why I'm learning Swiss German.", "", 0],
      ["der Dativ, -e", "dative (case)", "Nach «mit» steht immer der Dativ.", "«Mit» is always followed by the dative.", "", 0],
      ["deswegen", "that's why, for that reason", "Der Zug hatte Verspätung, deswegen bin ich zu spät zum Kurs gekommen.", "The train was delayed, which is why I was late for class.", "", 0],
      ["deutlich", "clear(ly), distinct(ly)", "Könnten Sie bitte etwas deutlicher sprechen?", "Could you please speak a bit more clearly?", "", 0],
      ["durcheinander", "confused, muddled; in a mess", "Bei so vielen neuen Wörtern bin ich ganz durcheinander.", "With so many new words I'm completely confused.", "", 0],
      ["ebenso", "just as; likewise", "Grammatik ist wichtig, aber Sprechen ist ebenso wichtig.", "Grammar is important, but speaking is just as important.", "", 0],
      ["die Eile (Sg.)", "hurry, haste", "In der Eile habe ich vergessen, Salz in die Sauce zu tun.", "In my hurry I forgot to put salt in the sauce.", "", 0],
      ["erstmal", "first (of all); for now", "Ich trinke erstmal einen Kaffee, dann mache ich die Hausaufgaben.", "I'll have a coffee first, then I'll do my homework.", "", 0],
      ["die Falte, -n", "wrinkle; crease, fold", "Wenn er nachdenkt, bekommt er eine Falte auf der Stirn.", "When he's thinking, he gets a wrinkle on his forehead.", "", 0],
      ["fliessend", "fluent(ly)", "Wenn ich fliessend Französisch sprechen würde, könnte ich in Lausanne arbeiten.", "If I spoke fluent French, I could work in Lausanne.", "DE: fließend", 0],
      ["fluchen", "to swear, curse", "Fluchen kann ich immer noch am besten in meiner Muttersprache.", "I'm still best at swearing in my mother tongue.", "", 0],
      ["früher- (der frühere Chef …)", "former, previous", "Mein früherer Deutschlehrer wohnt jetzt in Bern.", "My former German teacher now lives in Bern.", "", 0],
      ["gar (gar nicht, gar kein …)", "at all (with nicht/kein)", "Ich habe den Witz gar nicht verstanden.", "I didn't understand the joke at all.", "", 0],
      ["der Genitiv, -e", "genitive (case)", "Nach «wegen» steht in der Schriftsprache der Genitiv: wegen des Wetters.", "In written German «wegen» takes the genitive: wegen des Wetters.", "", 0],
      ["der Grieche, -n / die Griechin, -nen", "Greek (man / woman)", "Mein Nachbar ist Grieche und kocht fantastisch.", "My neighbour is Greek and a fantastic cook.", "", 0],
      ["das Griechische (Sg.)", "Greek (language)", "Das Wort «Demokratie» kommt aus dem Griechischen.", "The word «democracy» comes from Greek.", "", 0],
      ["gross·ziehen", "to bring up, raise", "Meine Eltern haben uns zweisprachig grossgezogen.", "My parents brought us up bilingual.", "DE: großziehen", 0],
      ["halt", "just, simply (that's how it is)", "Das ist halt so, da kann man nichts machen.", "That's just the way it is, there's nothing you can do.", "", 0],
      ["die Herkunft, -¨e", "origin, background", "In unserem Kurs sind Leute ganz unterschiedlicher Herkunft.", "There are people from very different backgrounds in our course.", "", 0],
      ["der Integrationskurs, -e", "integration course", "Im Integrationskurs lernt man Deutsch und viel über die Schweiz.", "In the integration course you learn German and a lot about Switzerland.", "", 0],
      ["irgendwann", "at some point, sometime", "Irgendwann möchte ich die Zeitung ohne Wörterbuch lesen können.", "At some point I'd like to be able to read the newspaper without a dictionary.", "", 0],
      ["jedenfalls", "in any case, anyway", "Ich weiss nicht, ob ich komme – jedenfalls rufe ich dich vorher an.", "I don't know if I'm coming – in any case I'll call you beforehand.", "DE: weiß", 0],
      ["das Kärtchen, -", "small card", "Auf jedes Kärtchen schreibe ich ein Wort mit seinem Artikel.", "On each little card I write a word with its article.", "", 0],
      ["der Keller, -", "cellar, basement", "Unsere alten Bücher liegen in Kisten im Keller.", "Our old books are in boxes in the cellar.", "", 0],
      ["die Kenntnis, -se", "knowledge; (pl.) skills", "Er hat gute Kenntnisse in Deutsch und Englisch.", "He has a good knowledge of German and English.", "", 0],
      ["das Kompliment, -e", "compliment", "Die Verkäuferin machte mir ein Kompliment für mein gutes Deutsch.", "The shop assistant paid me a compliment on my good German.", "", 0],
      ["korrekt", "correct", "Ist dieser Satz grammatisch korrekt, oder habe ich einen Fehler gemacht?", "Is this sentence grammatically correct, or have I made a mistake?", "", 0],
      ["lächeln", "to smile", "Wenn ich einen Fehler mache, lächelt meine Nachbarin nur freundlich.", "When I make a mistake, my neighbour just smiles kindly.", "", 0],
      ["leiden", "to suffer; can't stand (nicht leiden können)", "Ich kann es nicht leiden, wenn man mich ständig korrigiert.", "I can't stand it when people keep correcting me.", "", 0],
      ["lügen", "to lie (tell lies)", "Wenn ich lügen würde, würde sie es sofort merken.", "If I lied, she would notice straight away.", "", 0],
      ["der Mechaniker, -", "mechanic", "Der Mechaniker kommt aus Portugal und spricht fünf Sprachen.", "The mechanic is from Portugal and speaks five languages.", "", 0],
      ["die Mensa, Mensen", "(university) canteen", "Mittags essen wir in der Mensa der ETH.", "At lunchtime we eat in the ETH canteen.", "", 0],
      ["merkwürdig", "strange, odd", "Es ist merkwürdig, dass er nie auf meine Nachrichten antwortet.", "It's odd that he never replies to my messages.", "", 0],
      ["mischen", "to mix", "Viele Kinder mischen beim Sprechen Deutsch und ihre Muttersprache.", "Many children mix German and their mother tongue when they speak.", "", 0],
      ["die Mischung, -en", "mixture, mix", "Seine Sprache ist eine lustige Mischung aus Englisch und Deutsch.", "The way he talks is a funny mixture of English and German.", "", 0],
      ["der Mix, -e", "mix", "In Zürich hört man einen Mix aus vielen Sprachen.", "In Zurich you hear a mix of many languages.", "", 0],
      ["die Motivation, -en", "motivation", "Ohne Motivation lernt man keine Sprache.", "Without motivation you won't learn a language.", "", 0],
      ["die Muttersprache, -n", "mother tongue, native language", "Meine Muttersprache ist Englisch, aber im Büro spreche ich Deutsch.", "My mother tongue is English, but at the office I speak German.", "", 0],
      ["nach·fragen", "to ask, enquire", "Wenn ich etwas nicht verstehe, frage ich einfach nach.", "If I don't understand something, I simply ask.", "", 0],
      ["der Nerv, -en", "nerve", "Diese Grammatikübungen gehen mir langsam auf die Nerven.", "These grammar exercises are slowly getting on my nerves.", "", 0],
      ["noch mal", "(once) again", "Könnten Sie das bitte noch mal sagen?", "Could you say that again, please?", "", 0],
      ["noch nicht", "not yet", "Ich verstehe noch nicht alles, aber es wird immer besser.", "I don't understand everything yet, but it's getting better and better.", "", 0],
      ["noch nie", "never (before)", "Ich habe noch nie einen so langen Brief auf Deutsch geschrieben.", "I've never written such a long letter in German before.", "", 0],
      ["der Partner, - / die Partnerin, -nen", "partner", "Mit meiner Partnerin spreche ich Englisch, mit ihrer Familie Deutsch.", "I speak English with my partner and German with her family.", "", 0],
      ["das Portemonnaie, -s", "wallet, purse", "Ich habe mein Portemonnaie im Zug liegen lassen.", "I left my wallet on the train.", "", 0],
      ["der Präsident, -en", "president", "Der Präsident des Vereins hält eine kurze Rede auf Französisch und Deutsch.", "The president of the club gives a short speech in French and German.", "", 0],
      ["das Rumänische (Sg.)", "Romanian (language)", "Das Rumänische ist mit dem Italienischen verwandt.", "Romanian is related to Italian.", "", 0],
      ["der Satz, -¨e", "sentence", "Bilde bitte einen Satz mit «deswegen».", "Please make a sentence with «deswegen».", "", 0],
      ["schimpfen", "to scold; to grumble", "Die Lehrerin hat nicht geschimpft, obwohl ich die Hausaufgaben vergessen hatte.", "The teacher didn't get cross, although I'd forgotten my homework.", "", 0],
      ["die Schrift, -en", "script, writing; handwriting", "Für mich sieht die griechische Schrift ganz anders aus als unsere.", "To me, the Greek script looks completely different from ours.", "", 0],
      ["die Seele, -n", "soul", "Nach einem langen Tag tut ein Spaziergang am See der Seele gut.", "After a long day, a walk by the lake does the soul good.", "", 0],
      ["die Sekundenschnelle (Sg.)", "in a matter of seconds (in Sekundenschnelle)", "Die App übersetzt ganze Texte in Sekundenschnelle.", "The app translates whole texts in a matter of seconds.", "", 0],
      ["sicherlich", "surely, certainly", "Sicherlich hast du schon gemerkt, dass ich Probleme mit den Artikeln habe.", "You've surely noticed by now that I have problems with articles.", "", 0],
      ["die Sauce, -n", "sauce", "Die Sauce für die Pasta mache ich immer selbst.", "I always make the pasta sauce myself.", "DE: die Soße", 0],
      ["so viel", "so much; as much (as)", "Ich habe so viel gekocht, dass alle noch etwas mit nach Hause nehmen können.", "I've cooked so much that everyone can take some home.", "", 0],
      ["spätestens", "at the latest", "Bitte antworte mir spätestens bis Freitag, ob du kommst.", "Please let me know by Friday at the latest whether you're coming.", "", 0],
      ["die Sprachkreation, -en", "coined word, language creation", "«Handy» ist eine deutsche Sprachkreation – auf Englisch sagt man «mobile phone».", "«Handy» is a German coinage – in English you say «mobile phone».", "", 0],
      ["der Sprachlerntipp, -s", "language-learning tip", "Mein bester Sprachlerntipp: jeden Tag ein bisschen Radio hören.", "My best language-learning tip: listen to a bit of radio every day.", "", 0],
      ["die Sprachschule, -n", "language school", "Wenn ich mehr Zeit hätte, würde ich eine Sprachschule in Florenz besuchen.", "If I had more time, I'd go to a language school in Florence.", "", 0],
      ["stammen (aus + Dat.)", "to come from, originate (from)", "Das Wort «Müesli» stammt aus dem Schweizerdeutschen.", "The word «muesli» comes from Swiss German.", "", 0],
      ["die Stirn, -en", "forehead", "Er runzelte die Stirn, als er meine Aussprache hörte.", "He frowned when he heard my pronunciation.", "", 0],
      ["strikt", "strict(ly)", "In unserem Kurs gilt eine strikte Regel: Wir sprechen nur Deutsch.", "There's a strict rule in our course: we only speak German.", "", 0],
      ["das Substantiv, -e", "noun", "Im Deutschen schreibt man alle Substantive gross.", "In German all nouns are written with a capital letter.", "DE: groß", 0],
      ["übersetzen", "to translate", "Kannst du mir diesen Brief vom Amt übersetzen?", "Can you translate this letter from the authorities for me?", "", 0],
      ["unwillig", "reluctant(ly), unwilling", "Unwillig stand er auf und machte das Fenster zu.", "He reluctantly got up and closed the window.", "", 0],
      ["verdursten", "to die of thirst", "Hast du etwas zu trinken? Ich verdurste fast!", "Have you got anything to drink? I'm dying of thirst!", "", 0],
      ["vergleichen", "to compare", "Wenn man Deutsch und Englisch vergleicht, findet man viele ähnliche Wörter.", "If you compare German and English, you find lots of similar words.", "", 0],
      ["verhungern", "to starve (to death)", "Wann gibt es endlich Essen? Ich verhungere!", "When are we finally eating? I'm starving!", "", 0],
      ["sich verstecken", "to hide", "Die Katze hat sich unter dem Sofa versteckt.", "The cat has hidden under the sofa.", "", 0],
      ["vor·haben", "to plan, intend; to have plans", "Leider habe ich am Samstag schon etwas vor, deshalb kann ich nicht kommen.", "Unfortunately I've already got plans on Saturday, so I can't come.", "", 0],
      ["wählen", "to choose; to vote, elect", "Welche Sprache würdest du wählen, wenn du noch eine lernen könntest?", "Which language would you choose if you could learn another one?", "", 0],
      ["die Wahrheit, -en", "truth", "Soll ich ihr die Wahrheit sagen oder eine Ausrede erfinden?", "Should I tell her the truth or make up an excuse?", "", 0],
      ["weshalb", "why", "Weshalb hast du dich für Deutsch entschieden?", "Why did you decide on German?", "", 0],
      ["die Wiederholung, -en", "repetition; revision", "Regelmässige Wiederholung ist der Schlüssel zum Erfolg.", "Regular revision is the key to success.", "DE: regelmäßig", 0],
      ["worüber", "what … about; about which", "Worüber habt ihr heute im Kurs gesprochen?", "What did you talk about in class today?", "", 0],
      ["der Zaubersack, -¨e", "magic bag", "Der Zauberer holte ein Kaninchen aus seinem Zaubersack.", "The magician pulled a rabbit out of his magic bag.", "", 0],
      ["der Zaubertrick, -s", "magic trick", "Mit einem einfachen Zaubertrick brachte er die Kinder zum Lachen.", "He made the children laugh with a simple magic trick.", "", 0],
      ["das E-Mail, -s", "email", "Danke für dein E-Mail – leider kann ich am Samstag nicht kommen.", "Thanks for your email – unfortunately I can't come on Saturday.", "DE: die E-Mail", 1],
      ["die Landessprache, -n", "national language", "Die Schweiz hat vier Landessprachen: Deutsch, Französisch, Italienisch und Rätoromanisch.", "Switzerland has four national languages: German, French, Italian and Romansh.", "", 1],
      ["das Schriftdeutsch (Sg.)", "Standard (written) German", "Im Büro schreiben wir Schriftdeutsch, aber wir sprechen Dialekt.", "At the office we write in Standard German, but we speak dialect.", "DE: das Hochdeutsch", 1],
      ["Grüezi", "hello (polite greeting)", "Wenn man in den Bergen wandert, sagt man zu allen «Grüezi».", "When you hike in the mountains, you say «Grüezi» to everyone.", "DE: Guten Tag", 1],
      ["die Romandie (Sg.)", "French-speaking Switzerland", "Nach dem Studium zog sie in die Romandie, um Französisch zu lernen.", "After her studies she moved to French-speaking Switzerland to learn French.", "", 1],
      ["der ÖV (= öffentlicher Verkehr)", "public transport", "Mit dem ÖV bin ich in zwanzig Minuten bei euch.", "By public transport I can be at your place in twenty minutes.", "DE: der ÖPNV", 1],
      ["der Apéro, -s", "drinks and nibbles (before a meal or event)", "Bevor wir essen, gibt es einen kleinen Apéro auf dem Balkon.", "Before we eat, there'll be some drinks and nibbles on the balcony.", "DE: der Aperitif", 1],
    ] },
    { id: "L05", n: 5, title: "Eine Arbeit finden", book: "B1.1", cards: [
      ["abwechslungsreich", "varied", "Meine neue Stelle ist sehr abwechslungsreich, kein Tag ist wie der andere.", "My new job is very varied – no two days are the same.", "", 0],
      ["der Altenbetreuer, - / die Altenbetreuerin, -nen", "carer for the elderly", "Als Altenbetreuerin begleitet sie ältere Menschen auch beim Einkaufen.", "As a carer for the elderly, she also goes shopping with older people.", "CH oft: Betagtenbetreuer/in", 0],
      ["die Anfahrt, -en", "journey (to get there); directions", "Die Anfahrt mit dem Tram dauert nur zehn Minuten.", "The journey by tram only takes ten minutes.", "", 0],
      ["die Anlage, -n", "enclosure (in a letter); system, installation", "In der Anlage finden Sie meinen Lebenslauf und meine Zeugnisse.", "Please find enclosed my CV and my references.", "", 0],
      ["die Anlageninstallation, -en", "installation of systems/equipment", "Die Anlageninstallation beim Kunden dauert meistens einen Tag.", "Installing the system at the customer's premises usually takes a day.", "", 0],
      ["die Anreise, -n", "journey (there), travel", "Die Kosten für die Anreise zum Vorstellungsgespräch übernimmt die Firma.", "The company covers the travel costs for the interview.", "", 0],
      ["die Arbeitsweise, -n", "way of working", "Meine Chefin schätzt meine selbstständige Arbeitsweise.", "My boss appreciates my independent way of working.", "", 0],
      ["die Aufgabe, -n", "task; duty", "Meine wichtigste Aufgabe ist es, Kunden am Telefon zu beraten.", "My most important task is advising customers on the phone.", "", 0],
      ["auf·hören", "to stop", "Er hat vor einem Jahr aufgehört, als Koch zu arbeiten.", "He stopped working as a chef a year ago.", "", 0],
      ["der Auftrag, -¨e", "order, contract; task", "Diese Woche hat unsere Firma drei neue Aufträge bekommen.", "This week our company got three new orders.", "", 0],
      ["ausserhalb", "outside (of)", "Ausserhalb der Bürozeiten erreichen Sie uns per E-Mail.", "Outside office hours you can reach us by email.", "DE: außerhalb", 0],
      ["die Begegnung, -en", "encounter, meeting", "Im Hotel gefallen mir besonders die Begegnungen mit Gästen aus aller Welt.", "At the hotel I particularly enjoy the encounters with guests from all over the world.", "", 0],
      ["beherrschen", "to master, have a good command of", "Für diese Stelle muss man Französisch gut beherrschen.", "For this job you need a good command of French.", "", 0],
      ["der Berufsberatungskurs, -e", "careers guidance course", "Im Berufsberatungskurs haben wir gelernt, einen Lebenslauf zu schreiben.", "On the careers guidance course we learnt how to write a CV.", "", 0],
      ["die Berufswahl (Sg.)", "choice of career", "Bei der Berufswahl helfen oft auch die Eltern.", "Parents often help with choosing a career too.", "", 0],
      ["sich beruhigen", "to calm down", "Vor dem Gespräch atmete sie tief durch, um sich zu beruhigen.", "Before the interview she took a deep breath to calm down.", "", 0],
      ["der Bewerber, - / die Bewerberin, -nen", "applicant", "Für die Stelle gab es über fünfzig Bewerber.", "There were over fifty applicants for the job.", "", 0],
      ["das Bewerbungsgespräch, -e", "job interview", "Während des Bewerbungsgesprächs war ich ziemlich nervös.", "I was pretty nervous during the job interview.", "", 0],
      ["die Bewerbungsunterlage, -n", "application document (usu. pl.)", "Bitte schicken Sie Ihre vollständigen Bewerbungsunterlagen bis zum 15. November.", "Please send your complete application documents by 15 November.", "", 0],
      ["die Bezahlung, -en", "pay; payment", "Die Arbeit gefällt mir, aber die Bezahlung ist leider schlecht.", "I like the work, but unfortunately the pay is poor.", "", 0],
      ["die Branchenerfahrung, -en", "industry experience", "Bewerber mit Branchenerfahrung haben bessere Chancen.", "Applicants with industry experience have better chances.", "", 0],
      ["der Clip, -s", "(video) clip", "Die Firma hat einen kurzen Clip über ihre Lehrstellen gedreht.", "The company has made a short clip about its apprenticeships.", "", 0],
      ["die Computerkenntnis, -se", "computer skills (usu. pl.)", "Gute Computerkenntnisse sind heute in fast jedem Beruf wichtig.", "Good computer skills are important in almost every job today.", "", 0],
      ["der Dolmetscher, -", "interpreter", "Ein Dolmetscher muss schnell zwischen zwei Sprachen wechseln können.", "An interpreter must be able to switch quickly between two languages.", "", 0],
      ["der Einsatz, -¨e", "commitment, effort; assignment", "Der Chef lobte das Team für seinen tollen Einsatz.", "The boss praised the team for its great commitment.", "", 0],
      ["der Elektriker, -", "electrician", "Der Elektriker kommt morgen und repariert die Steckdose.", "The electrician is coming tomorrow to repair the socket.", "", 0],
      ["der Elektroniker, -", "electronics technician", "Mein Bruder macht eine Lehre als Elektroniker bei einer Firma in Winterthur.", "My brother is doing an apprenticeship as an electronics technician at a company in Winterthur.", "", 0],
      ["entwickeln", "to develop", "Unser Team entwickelt Software für Spitäler.", "Our team develops software for hospitals.", "", 0],
      ["die Entwicklungsmöglichkeit, -en", "opportunity for development, career prospects", "Die Stelle bietet gute Entwicklungsmöglichkeiten innerhalb der Firma.", "The position offers good development opportunities within the company.", "", 0],
      ["erfahren", "experienced; to find out", "Wir suchen eine erfahrene Pflegefachfrau für unser Team.", "We're looking for an experienced nurse for our team.", "", 0],
      ["ergreifen", "to seize (a chance); to take up (a profession)", "Er hat die Chance ergriffen, in Zürich zu arbeiten.", "He seized the chance to work in Zurich.", "", 0],
      ["ersehen (aus + Dat.)", "to see, gather (from)", "Wie Sie aus meinem Lebenslauf ersehen können, habe ich drei Jahre in Bern gearbeitet.", "As you can see from my CV, I worked in Bern for three years.", "", 0],
      ["erwarten", "to expect", "Was erwarten Sie von Ihrer neuen Stelle?", "What do you expect from your new job?", "", 0],
      ["etwa", "about, approximately; for instance", "Das Gespräch dauerte etwa eine Stunde.", "The interview lasted about an hour.", "", 0],
      ["exportieren", "to export", "Die Firma exportiert Uhren nach Asien und Amerika.", "The company exports watches to Asia and America.", "", 0],
      ["der Fachverkäufer, -", "specialist sales assistant", "Der Fachverkäufer im Velogeschäft hat mich sehr gut beraten.", "The sales assistant in the bike shop gave me very good advice.", "", 0],
      ["die Fähigkeit, -en", "ability, skill", "Welche Fähigkeiten braucht man für diesen Beruf?", "What skills do you need for this job?", "", 0],
      ["fest·stellen", "to notice, realise; to establish", "Kurz vor dem Gespräch stellte ich fest, dass in meinem Lebenslauf ein Tippfehler war.", "Shortly before the interview I noticed that there was a typo in my CV.", "", 0],
      ["die Fortbildung, -en", "further training", "Die Firma bezahlt mir eine Fortbildung in Projektmanagement.", "The company is paying for me to do further training in project management.", "CH meist: die Weiterbildung", 0],
      ["die Fotovoltaik (Sg.)", "photovoltaics", "Mit Fotovoltaik kann man auf dem eigenen Dach Strom produzieren.", "With photovoltaics you can produce electricity on your own roof.", "", 0],
      ["der Gärtner, -", "gardener", "Nach der Lehre als Gärtner hat er sich selbstständig gemacht.", "After his apprenticeship as a gardener he set up his own business.", "", 0],
      ["die Gastronomie (Sg.)", "catering, hospitality industry", "In der Gastronomie muss man oft am Abend und am Wochenende arbeiten.", "In the hospitality industry you often have to work evenings and weekends.", "", 0],
      ["genügen", "to be enough, suffice", "Für diese Stelle genügen gute Englischkenntnisse leider nicht.", "Unfortunately, good English isn't enough for this job.", "", 0],
      ["gewohnt", "used to, accustomed; usual", "Ich bin es gewohnt, unter Zeitdruck zu arbeiten.", "I'm used to working under time pressure.", "", 0],
      ["der Handel (Sg.)", "trade, commerce; retail", "Meine Schwester arbeitet seit zehn Jahren im Handel.", "My sister has worked in retail for ten years.", "", 0],
      ["das Handwerk, -e", "trade, craft", "Das Handwerk des Schreiners hat er bei seinem Vater gelernt.", "He learnt the carpenter's trade from his father.", "", 0],
      ["handwerklich", "manual, practical (craft)", "Er ist handwerklich sehr geschickt und repariert alles selbst.", "He's very good with his hands and repairs everything himself.", "", 0],
      ["her·stellen", "to produce, manufacture", "Unsere Firma stellt Teile für Solaranlagen her.", "Our company manufactures parts for solar installations.", "", 0],
      ["hiermit", "herewith, hereby", "Hiermit bewerbe ich mich um die Stelle als Serviceangestellte in Ihrem Restaurant.", "I hereby apply for the position of waitress in your restaurant.", "", 0],
      ["im Freien", "outdoors, in the open air", "Auf dem Bau arbeitet man bei jedem Wetter im Freien.", "On a building site you work outdoors in all weathers.", "", 0],
      ["importieren", "to import", "Der Laden importiert Kaffee direkt aus Kolumbien.", "The shop imports coffee directly from Colombia.", "", 0],
      ["innerhalb", "within", "Wir melden uns innerhalb von zwei Wochen bei Ihnen.", "We'll get back to you within two weeks.", "", 0],
      ["der Installateur, -e", "plumber; fitter, installer", "Wir brauchen dringend einen Installateur, das WC ist verstopft.", "We urgently need a plumber – the toilet is blocked.", "", 0],
      ["jobben", "to do casual jobs, work part-time", "Während des Studiums hat sie in einem Café gejobbt.", "She worked part-time in a café while she was studying.", "", 0],
      ["die Jobsuche, -n", "job hunt, job search", "Die Jobsuche in Zürich war schwieriger als gedacht.", "The job hunt in Zurich was harder than expected.", "", 0],
      ["die Kassiererin, -nen", "cashier (female)", "Die Kassiererin bei der Migros ist immer sehr freundlich.", "The cashier at Migros is always very friendly.", "", 0],
      ["die Konkurrenz, -en", "competition", "Für diese Stelle gibt es viel Konkurrenz.", "There's a lot of competition for this job.", "", 0],
      ["das Kroatien", "Croatia", "Meine Kollegin kommt aus Kroatien und spricht vier Sprachen.", "My colleague is from Croatia and speaks four languages.", "meist ohne Artikel", 0],
      ["künstlerisch", "artistic", "Wer Grafiker werden will, braucht künstlerisches Talent.", "Anyone who wants to become a graphic designer needs artistic talent.", "", 0],
      ["der Lebenslauf, -¨e", "CV, curriculum vitae", "Ein Lebenslauf sollte nicht länger als zwei Seiten sein.", "A CV shouldn't be longer than two pages.", "", 0],
      ["leistungsgerecht", "performance-related (pay)", "Wir bieten Ihnen eine leistungsgerechte Bezahlung und flexible Arbeitszeiten.", "We offer you performance-related pay and flexible working hours.", "", 0],
      ["der Maler, -", "painter (and decorator); painter (artist)", "Der Maler streicht nächste Woche unsere Wohnung neu.", "The painter is repainting our flat next week.", "", 0],
      ["der Mitbewerber, - / die Mitbewerberin, -nen", "fellow applicant; competitor", "Wie kann ich mich von meinen Mitbewerbern abheben?", "How can I stand out from the other applicants?", "", 0],
      ["die Montage, -n", "assembly, installation", "Die Montage der Solaranlage auf dem Dach dauert zwei Tage.", "Installing the solar panels on the roof takes two days.", "", 0],
      ["motiviert", "motivated", "Wir suchen eine motivierte Person, die gern im Team arbeitet.", "We're looking for a motivated person who enjoys working in a team.", "", 0],
      ["nebenbei", "on the side; incidentally", "Sie studiert und arbeitet nebenbei zwei Abende pro Woche im Kino.", "She's studying and works two evenings a week at the cinema on the side.", "", 0],
      ["die Nervosität (Sg.)", "nervousness", "Vor Nervosität konnte ich in der Nacht vor dem Gespräch kaum schlafen.", "I was so nervous I could hardly sleep the night before the interview.", "", 0],
      ["optimal", "ideal, optimal", "Die Stelle ist optimal für mich, weil ich mit dem Velo hinfahren kann.", "The job is ideal for me because I can cycle there.", "", 0],
      ["sich orientieren", "to get one's bearings; to find out (about)", "Am ersten Tag konnte ich mich im neuen Büro kaum orientieren.", "On the first day I could hardly find my way around the new office.", "", 0],
      ["die Perspektive, -n", "prospect(s); perspective", "In meinem alten Job hatte ich keine Perspektive mehr.", "I had no prospects any more in my old job.", "", 0],
      ["die Pflege (Sg.)", "care, nursing", "Von August an macht meine Tochter eine Lehre in der Pflege.", "From August my daughter will be doing an apprenticeship in nursing.", "", 0],
      ["der Pflegedienst, -e", "care service, nursing service", "Meine Tante arbeitet bei einem privaten Pflegedienst.", "My aunt works for a private care service.", "", 0],
      ["pflichtbewusst", "conscientious, dutiful", "Sie ist pflichtbewusst und kommt nie zu spät.", "She's conscientious and is never late.", "", 0],
      ["der PKW, -s", "car (passenger vehicle)", "Für Kundenbesuche stellt Ihnen die Firma einen PKW zur Verfügung.", "The company provides you with a car for customer visits.", "CH oft: der Personenwagen (PW)", 0],
      ["der Führerausweis, -e (Kat. B)", "driving licence (category B, car)", "Für die Stelle als Servicetechniker brauchen Sie den Führerausweis Kategorie B.", "For the service technician job you need a category B driving licence.", "DE: der PKW-Führerschein (Klasse B)", 0],
      ["der Platz, -¨e", "place; space; square", "Für den Berufsberatungskurs gibt es nur noch zwei freie Plätze.", "There are only two places left on the careers guidance course.", "", 0],
      ["das Privatgespräch, -e", "private call; private conversation", "Privatgespräche während der Arbeitszeit sind bei uns nicht erlaubt.", "Private calls during working hours aren't allowed here.", "", 0],
      ["der Puffer, -", "buffer (of time)", "Plane für die Anreise immer einen Puffer von zwanzig Minuten ein.", "Always allow a buffer of twenty minutes for the journey.", "", 0],
      ["der Sekundarschulabschluss, -¨e", "lower secondary school-leaving certificate", "Nach dem Sekundarschulabschluss begann er eine Lehre als Maler.", "After finishing secondary school he started an apprenticeship as a painter.", "DE: ≈ der Realschulabschluss", 0],
      ["rechnen", "to calculate; (mit) to expect, count on", "Mit einer Antwort können Sie bis Ende Monat rechnen.", "You can expect an answer by the end of the month.", "", 0],
      ["die Reinigungskraft, -¨e", "cleaner", "Das Hotel sucht eine Reinigungskraft für die Frühschicht.", "The hotel is looking for a cleaner for the early shift.", "", 0],
      ["die Reisebereitschaft (Sg.)", "willingness to travel", "Im Stelleninserat steht, dass Reisebereitschaft erwartet wird.", "The job advert says that willingness to travel is expected.", "", 0],
      ["der Schauspielerberuf (Sg.)", "acting profession", "Der Schauspielerberuf ist spannend, aber oft schlecht bezahlt.", "Acting is an exciting profession but often badly paid.", "", 0],
      ["die Schauspielschule, -n", "drama school", "Schon von klein auf träumte sie davon, an die Schauspielschule zu gehen.", "Ever since she was little, she dreamt of going to drama school.", "", 0],
      ["schriftlich", "written, in writing", "Die Zusage habe ich zuerst am Telefon und dann schriftlich bekommen.", "I got the job offer first on the phone and then in writing.", "", 0],
      ["der Schulabschluss, -¨e", "school-leaving qualification", "Ohne Schulabschluss ist es schwierig, eine Lehrstelle zu finden.", "Without a school-leaving qualification it's difficult to find an apprenticeship.", "", 0],
      ["die Schulzeit, -en", "schooldays", "In meiner Schulzeit habe ich in den Ferien oft auf einem Bauernhof gearbeitet.", "In my schooldays I often worked on a farm during the holidays.", "", 0],
      ["die/der Serviceangestellte, -n", "waiter, waitress; waiting staff", "Das Restaurant am See sucht für den Sommer zwei Serviceangestellte.", "The restaurant by the lake is looking for two waiting staff for the summer.", "", 0],
      ["der Servicetechniker, -", "service technician", "Als Servicetechniker ist er viel unterwegs und besucht Kunden in der ganzen Schweiz.", "As a service technician he's on the road a lot, visiting customers all over Switzerland.", "", 0],
      ["sicher", "safe, secure; sure, certain", "Ein sicherer Arbeitsplatz ist mir wichtiger als ein hoher Lohn.", "A secure job matters more to me than high pay.", "", 0],
      ["die Solaranlage, -n", "solar installation, solar panels", "Die Gemeinde installiert eine Solaranlage auf dem Dach des Schulhauses.", "The municipality is installing solar panels on the roof of the school building.", "", 0],
      ["der Spiegel, -", "mirror", "Am Abend vor dem Vorstellungsgespräch übte er seine Antworten vor dem Spiegel.", "The evening before the interview he practised his answers in front of the mirror.", "", 0],
      ["die Sprachkenntnis, -se", "language skills (usu. pl.)", "Für die Stelle am Flughafen sind Sprachkenntnisse in Englisch und Französisch nötig.", "Knowledge of English and French is required for the job at the airport.", "", 0],
      ["die Standardfrage, -n", "standard question", "«Wo sehen Sie sich in fünf Jahren?» ist eine typische Standardfrage.", "'Where do you see yourself in five years?' is a typical standard question.", "", 0],
      ["das Talent, -e", "talent", "Sie hat Talent für Sprachen und möchte Dolmetscherin werden.", "She has a talent for languages and wants to become an interpreter.", "", 0],
      ["tätig", "working, employed (tätig sein als)", "Seit drei Jahren bin ich als Elektriker bei einer Firma in Bern tätig.", "I've been working as an electrician for a company in Bern for three years.", "", 0],
      ["die Tätigkeit, -en", "activity; job, occupation", "Beschreiben Sie bitte kurz Ihre jetzige Tätigkeit.", "Please briefly describe your current job.", "", 0],
      ["technisch", "technical", "Mein Sohn interessiert sich sehr für technische Berufe.", "My son is very interested in technical jobs.", "", 0],
      ["der Tierpark, -s", "wildlife park, zoo", "Am Sonntag waren wir mit den Kindern im Tierpark.", "On Sunday we went to the wildlife park with the children.", "", 0],
      ["der Tierpfleger, -", "zookeeper, animal keeper", "Der Tierpfleger füttert die Bären jeden Morgen um acht Uhr.", "The keeper feeds the bears at eight o'clock every morning.", "", 0],
      ["der Traumjob, -s", "dream job", "Für ihren Traumjob ist sie sogar nach Genf gezogen.", "She even moved to Geneva for her dream job.", "", 0],
      ["sich (Dat.) überlegen", "to think about, consider", "Überleg dir gut, ob du die Stelle wirklich willst.", "Think carefully about whether you really want the job.", "", 0],
      ["überrascht", "surprised", "Ich war überrascht, so schnell eine Zusage zu bekommen.", "I was surprised to get a job offer so quickly.", "", 0],
      ["der Übersetzer, -", "translator", "Als Übersetzer arbeitet er von zu Hause aus.", "As a translator he works from home.", "", 0],
      ["die Überstunde, -n", "(hour of) overtime", "Vor Weihnachten muss ich oft Überstunden machen.", "Before Christmas I often have to work overtime.", "", 0],
      ["üblich", "usual, customary", "Ist es üblich, beim Vorstellungsgespräch eine Krawatte zu tragen?", "Is it usual to wear a tie to a job interview?", "", 0],
      ["die Unterlage, -n", "document; papers (usu. pl.)", "Bringen Sie bitte alle Unterlagen zum Termin mit.", "Please bring all the documents to the appointment.", "", 0],
      ["das Unternehmen, -", "company, business", "Das Unternehmen hat seinen Hauptsitz in Zug.", "The company has its headquarters in Zug.", "", 0],
      ["die Unterstützung, -en", "support", "Danke für deine Unterstützung bei der Jobsuche!", "Thanks for your support with the job hunt!", "", 0],
      ["die Verantwortung, -en", "responsibility", "In meiner neuen Position trage ich mehr Verantwortung.", "In my new position I have more responsibility.", "", 0],
      ["die Vergrösserung, -en", "enlargement, expansion", "Wegen der Vergrösserung des Teams suchen wir zwei neue Mitarbeitende.", "Because the team is expanding, we're looking for two new employees.", "DE: Vergrößerung", 0],
      ["der Verkauf, -¨e", "sale; sales (department)", "Nach der Lehre möchte ich im Verkauf arbeiten.", "After my apprenticeship I'd like to work in sales.", "", 0],
      ["verlangen", "to demand, require", "Die Firma verlangt mindestens drei Jahre Berufserfahrung.", "The company requires at least three years' work experience.", "", 0],
      ["vertreten", "to stand in for; to represent", "Während meiner Ferien vertritt mich eine Kollegin.", "A colleague stands in for me while I'm on holiday.", "", 0],
      ["Video- (Videoclip, Videobewerbung …)", "video (prefix)", "Manche Firmen wünschen sich heute eine Videobewerbung.", "Some companies these days want a video application.", "", 0],
      ["die Videokamera, -s", "video camera", "Im Bewerbungstraining wurden wir mit einer Videokamera gefilmt.", "In the interview training we were filmed with a video camera.", "", 0],
      ["voraus·setzen", "to require; to assume", "Die Stelle setzt gute Deutschkenntnisse voraus.", "The job requires good German.", "", 0],
      ["die Voraussetzung, -en", "requirement, prerequisite", "Eine abgeschlossene Lehre ist Voraussetzung für diese Stelle.", "A completed apprenticeship is a requirement for this position.", "", 0],
      ["der Vorteil, -e", "advantage", "Ein Vorteil von Teilzeitarbeit ist, mehr Zeit für die Familie zu haben.", "One advantage of working part-time is having more time for the family.", "", 0],
      ["zeitlich", "in terms of time, time-wise", "Zeitlich passt mir ein Termin am Donnerstag am besten.", "Time-wise, an appointment on Thursday suits me best.", "", 0],
      ["der Zeitpunkt, -e", "point in time, moment", "Wann ist der beste Zeitpunkt, nach dem Lohn zu fragen?", "When is the best moment to ask about the salary?", "", 0],
      ["zu (+ Infinitiv)", "to (before an infinitive)", "Ich habe vor, im Frühling eine neue Stelle zu suchen.", "I'm planning to look for a new job in the spring.", "", 0],
      ["zusammen- (zusammenarbeiten, zusammenpassen …)", "together (prefix)", "Wir arbeiten seit zwei Jahren eng mit einer Firma in Basel zusammen.", "We've been working closely with a company in Basel for two years.", "", 0],
      ["zuständig (für + Akk.)", "responsible (for), in charge (of)", "Wer ist in Ihrer Firma für die Lernenden zuständig?", "Who is in charge of the apprentices in your company?", "", 0],
      ["die Zuverlässigkeit, -en", "reliability", "Pünktlichkeit und Zuverlässigkeit sind uns sehr wichtig.", "Punctuality and reliability are very important to us.", "", 0],
      ["die Lehre, -n", "apprenticeship", "Nach der Sekundarschule macht unser Sohn eine Lehre als Koch.", "After secondary school our son is doing an apprenticeship as a chef.", "DE: die Ausbildung", 1],
      ["die/der Lernende, -n", "apprentice", "Unsere Firma bildet jedes Jahr zwei Lernende aus.", "Our company trains two apprentices every year.", "DE: der/die Auszubildende (Azubi)", 1],
      ["die Schnupperlehre, -n", "trial apprenticeship, taster days", "Während der Schnupperlehre durfte ich in der Werkstatt mithelfen.", "During the trial apprenticeship I was allowed to help out in the workshop.", "DE: das Schülerpraktikum", 1],
      ["das Stelleninserat, -e", "job advertisement", "Ich habe das Stelleninserat in der Zeitung und online gesehen.", "I saw the job advert in the newspaper and online.", "DE: die Stellenanzeige", 1],
      ["das RAV (Regionales Arbeitsvermittlungszentrum)", "regional employment centre", "Nach der Kündigung hat sich mein Bruder beim RAV angemeldet.", "After he was given notice, my brother registered with the regional employment centre.", "DE: die Agentur für Arbeit", 1],
      ["der Detailhandel (Sg.)", "retail (trade)", "Nach drei Jahren im Detailhandel wurde sie Filialleiterin bei Coop.", "After three years in retail she became a branch manager at Coop.", "DE: der Einzelhandel", 1],
      ["die Spitex (Sg.)", "home care service", "Seit seiner Operation kommt die Spitex jeden Morgen zu meinem Nachbarn.", "Since his operation, the home care service has been coming to my neighbour every morning.", "DE: der ambulante Pflegedienst", 1],
    ] },
    { id: "L06", n: 6, title: "Dienstleistung", book: "B1.1", cards: [
      ["die Altenpflege (Sg.)", "care of the elderly, elderly care", "Nach ihrer Ausbildung möchte sie in der Altenpflege arbeiten.", "After her training she wants to work in elderly care.", "CH oft: die Alterspflege", 0],
      ["der Altenpflegedienst, -e", "care service for the elderly", "Der Altenpflegedienst kommt jeden Morgen, um meinem Vater beim Anziehen zu helfen.", "The elderly care service comes every morning to help my father get dressed.", "CH oft: die Spitex", 0],
      ["anbei", "enclosed, attached (in letters)", "Anbei schicke ich Ihnen ein Foto des beschädigten Koffers.", "I am enclosing a photo of the damaged suitcase.", "", 0],
      ["die Änderung, -en", "change, alteration", "Bei Änderungen im Dienstplan informieren wir Sie per SMS.", "If there are changes to the roster, we'll let you know by text message.", "", 0],
      ["die Anleitung, -en", "instructions, guide", "Ohne die Anleitung zu lesen, baute er das Regal zusammen.", "Without reading the instructions, he assembled the shelf.", "", 0],
      ["der Anspruch, -¨e", "right, entitlement; demand, standard", "Während der Garantiezeit haben Sie Anspruch auf eine kostenlose Reparatur.", "During the warranty period you are entitled to a free repair.", "", 0],
      ["ärgerlich", "annoying; annoyed", "Es ist wirklich ärgerlich, dass die Hotline nie erreichbar ist.", "It's really annoying that the hotline can never be reached.", "", 0],
      ["auf·fordern", "to ask, request (formally); to call on", "Die Firma hat mich aufgefordert, die Rechnung bis Ende Monat zu bezahlen.", "The company has asked me to pay the bill by the end of the month.", "", 0],
      ["ausschliesslich", "exclusively, only", "Der kleine Laden verkauft ausschliesslich Produkte aus der Region.", "The little shop sells only regional products.", "DE: ausschließlich", 0],
      ["die Bearbeitung, -en", "processing, handling", "Die Bearbeitung Ihrer Reklamation dauert etwa zwei Wochen.", "Processing your complaint takes about two weeks.", "", 0],
      ["die Bedienung, -en", "service (restaurant, shop); operation (of a device)", "Die Bedienung im neuen Café am See war sehr freundlich.", "The service at the new café by the lake was very friendly.", "", 0],
      ["die Bedienungsanleitung, -en", "user manual, operating instructions", "Leider lag der Kaffeemaschine keine Bedienungsanleitung bei.", "Unfortunately the coffee machine didn't come with a user manual.", "", 0],
      ["das Befinden (Sg.)", "(state of) health, well-being", "Die Pflegerin fragt jeden Tag nach dem Befinden der Patienten.", "The carer asks about the patients' well-being every day.", "", 0],
      ["begrüssen", "to greet, welcome", "Am ersten Arbeitstag begrüsste mich das ganze Team sehr herzlich.", "On my first day at work the whole team welcomed me very warmly.", "DE: begrüßen", 0],
      ["belegen", "to prove, back up (with evidence); to take (a course)", "Mit der Quittung können Sie belegen, wann Sie das Gerät gekauft haben.", "With the receipt you can prove when you bought the device.", "", 0],
      ["bereits", "already", "Ich habe mich bereits zweimal beim Kundendienst gemeldet.", "I've already contacted customer service twice.", "", 0],
      ["der Berufsalltag (Sg.)", "everyday working life", "Im Berufsalltag sind Soft Skills oft wichtiger als gute Noten.", "In everyday working life, soft skills are often more important than good grades.", "", 0],
      ["beschädigen", "to damage", "Beim Transport wurde der Bildschirm leider beschädigt.", "Unfortunately the screen was damaged in transit.", "", 0],
      ["besitzen", "to own, possess", "Herr Yilmaz besitzt mittlerweile drei Kebab-Restaurants in Basel.", "Mr Yilmaz now owns three kebab restaurants in Basel.", "", 0],
      ["bestätigen", "to confirm", "Bitte bestätigen Sie den Termin per E-Mail.", "Please confirm the appointment by email.", "", 0],
      ["bestimmt (= speziell)", "certain, particular, specific", "Suchen Sie ein bestimmtes Gewürz oder kann ich Ihnen etwas empfehlen?", "Are you looking for a particular spice, or can I recommend something?", "", 0],
      ["betreuen", "to look after, care for; to supervise", "Seit drei Jahren betreut sie zwei ältere Damen in St. Gallen.", "She has been looking after two elderly ladies in St. Gallen for three years.", "", 0],
      ["brav", "good, well-behaved", "Unser Hund wartet immer ganz brav vor dem Laden.", "Our dog always waits outside the shop as good as gold.", "", 0],
      ["die Büroarbeit, -en", "office work, paperwork", "Die Büroarbeit macht mir keinen Spass, ich arbeite lieber mit Menschen.", "I don't enjoy office work; I prefer working with people.", "DE: Spaß", 0],
      ["der Bürostuhl, -¨e", "office chair", "Mein Bürostuhl ist so unbequem, dass ich Rückenschmerzen bekomme.", "My office chair is so uncomfortable that I get backache.", "", 0],
      ["die Bürste, -n", "brush", "Mit dieser Bürste bekommt man die Schuhe wieder sauber.", "With this brush you can get your shoes clean again.", "", 0],
      ["defekt", "faulty, broken", "Der Wasserkocher war schon beim Auspacken defekt.", "The kettle was already faulty when I unpacked it.", "", 0],
      ["ein·gehen", "to be received, arrive (mail, payment); to take (a risk)", "Ihre Zahlung ist heute bei uns eingegangen.", "Your payment reached us today.", "", 0],
      ["das Engagement, -s", "commitment, dedication", "Ohne das Engagement der Freiwilligen könnte das Dorffest nicht stattfinden.", "Without the volunteers' commitment the village festival couldn't take place.", "", 0],
      ["sich entschliessen (zu + Dat.)", "to decide, make up one's mind", "Nach langem Überlegen entschloss sie sich, einen eigenen Laden zu eröffnen.", "After thinking it over for a long time, she decided to open her own shop.", "DE: sich entschließen", 0],
      ["enttäuschen", "to disappoint", "Der Service im Hotel hat uns leider sehr enttäuscht.", "Unfortunately the hotel's service really disappointed us.", "", 0],
      ["erst- (der/die/das erste …)", "first", "In den ersten Monaten hatte das Restaurant kaum Gäste.", "In the first few months the restaurant hardly had any customers.", "", 0],
      ["das Experiment, -e", "experiment", "Unser Streetfood-Stand war am Anfang nur ein Experiment.", "At first our street food stall was just an experiment.", "", 0],
      ["finanziell", "financial(ly)", "Am Anfang hat ihn seine Familie finanziell unterstützt.", "At the beginning his family supported him financially.", "", 0],
      ["die Flexibilität (Sg.)", "flexibility", "In der Gastronomie braucht man viel Flexibilität, auch am Wochenende.", "In the restaurant trade you need a lot of flexibility, at weekends too.", "", 0],
      ["fordern", "to demand", "Die Pflegekräfte fordern höhere Löhne und bessere Arbeitszeiten.", "The nursing staff are demanding higher wages and better working hours.", "", 0],
      ["ganz- (der/die/das ganze …)", "whole, entire", "Die ganze Woche habe ich auf eine Antwort vom Kundendienst gewartet.", "I waited the whole week for an answer from customer service.", "", 0],
      ["der Gastarbeiter, -", "guest worker, migrant worker", "In den Sechzigerjahren kamen viele Gastarbeiter aus Italien in die Schweiz.", "In the sixties many guest workers came to Switzerland from Italy.", "", 0],
      ["geboren werden", "to be born", "Mein Vater wurde in der Türkei geboren, aber ich bin in Zürich aufgewachsen.", "My father was born in Turkey, but I grew up in Zurich.", "", 0],
      ["das Geheimnis, -se", "secret", "Die Gewürzmischung ist das Geheimnis unseres Erfolgs.", "The spice mix is the secret of our success.", "", 0],
      ["der Geschäftsmann, -¨er/-leute", "businessman", "Als Geschäftsmann muss er oft nach Genf reisen.", "As a businessman he often has to travel to Geneva.", "", 0],
      ["sich gewöhnen an (+ Akk.)", "to get used to", "An das frühe Aufstehen habe ich mich schnell gewöhnt.", "I quickly got used to getting up early.", "", 0],
      ["das Gewürz, -e", "spice", "In ihrem Laden verkauft sie Gewürze aus Indien und Sri Lanka.", "In her shop she sells spices from India and Sri Lanka.", "", 0],
      ["gründen", "to found, set up", "Um unabhängig zu sein, gründete er eine eigene Firma.", "To be independent, he set up his own company.", "", 0],
      ["das Heimatgefühl, -e", "feeling of home, sense of belonging", "Wenn ich Musik aus Vietnam höre, bekomme ich ein richtiges Heimatgefühl.", "When I hear music from Vietnam, I get a real feeling of home.", "", 0],
      ["das Heimweh (Sg.)", "homesickness", "Im ersten Winter in Bern hatte sie oft Heimweh.", "In her first winter in Bern she was often homesick.", "", 0],
      ["der Hintergrund, -¨e", "background", "Im Team arbeiten Menschen mit ganz verschiedenen kulturellen Hintergründen.", "People from very different cultural backgrounds work in the team.", "", 0],
      ["höchstens", "at most", "Die Reparatur dauert höchstens zehn Tage.", "The repair takes ten days at most.", "", 0],
      ["die Hotline, -s", "hotline, helpline", "Bei der Hotline musste ich zwanzig Minuten warten.", "I had to wait twenty minutes on the hotline.", "", 0],
      ["die Innenstadt, -¨e", "town centre, city centre", "Die Mieten in der Innenstadt sind für kleine Geschäfte oft zu hoch.", "Rents in the city centre are often too high for small shops.", "", 0],
      ["interkulturell", "intercultural", "Interkulturelle Kompetenz ist in der Pflege sehr wichtig.", "Intercultural competence is very important in nursing and care.", "", 0],
      ["jahrelang", "for years", "Jahrelang arbeitete er als Koch, bevor er sein eigenes Restaurant eröffnete.", "For years he worked as a cook before he opened his own restaurant.", "", 0],
      ["die Jahreszeit, -en", "season", "Im Restaurant wechseln wir die Speisekarte mit jeder Jahreszeit.", "In the restaurant we change the menu with every season.", "", 0],
      ["jedoch", "however", "Ich habe mehrmals angerufen, jedoch hat niemand zurückgerufen.", "I phoned several times; however, nobody called back.", "", 0],
      ["der Kaufmann, -leute / die Kauffrau, -en", "businessman / businesswoman; (trained) commercial clerk", "Meine Tochter macht bei einer Bank eine Lehre als Kauffrau.", "My daughter is doing a commercial apprenticeship at a bank.", "", 0],
      ["der Kinofilm, -e", "film (for the cinema), movie", "Der Kinofilm läuft ab Donnerstag in allen Zürcher Kinos.", "The film is showing in all Zurich cinemas from Thursday.", "", 0],
      ["die Klimaanlage, -n", "air conditioning", "Im Sommer ist die Klimaanlage im Büro oft kaputt.", "In summer the air conditioning in the office is often broken.", "", 0],
      ["kommunikativ", "communicative, good at communicating", "Für die Stelle an der Rezeption suchen wir eine kommunikative Person.", "For the reception job we are looking for a communicative person.", "", 0],
      ["die Kompetenz, -en", "competence, skill", "Teamfähigkeit ist eine wichtige soziale Kompetenz.", "Being a team player is an important social skill.", "", 0],
      ["der Kompromiss, -e", "compromise", "Nach einer langen Diskussion haben wir endlich einen Kompromiss gefunden.", "After a long discussion we finally found a compromise.", "", 0],
      ["die Kopie, -n", "copy", "Schicken Sie uns bitte eine Kopie der Quittung, damit wir Ihre Reklamation bearbeiten können.", "Please send us a copy of the receipt so that we can process your complaint.", "", 0],
      ["das Kosmetikstudio, -s", "beauty salon", "Nach der Ausbildung eröffnete sie ein Kosmetikstudio in Luzern.", "After her training she opened a beauty salon in Lucerne.", "", 0],
      ["die Kreativität (Sg.)", "creativity", "In der Küche kann ich meine Kreativität zeigen.", "In the kitchen I can show my creativity.", "", 0],
      ["sich lohnen", "to be worth it, pay off", "Die viele Arbeit hat sich gelohnt: Das Restaurant ist jeden Abend voll.", "All the hard work has paid off: the restaurant is full every evening.", "", 0],
      ["lösen (ein Problem)", "to solve (a problem)", "Statt das Problem zu lösen, verband mich die Hotline mit einer anderen Abteilung.", "Instead of solving the problem, the hotline put me through to another department.", "", 0],
      ["das Management, -s", "management", "Das Management hat beschlossen, die Filiale in Olten zu schliessen.", "Management has decided to close the branch in Olten.", "DE: schließen", 0],
      ["der Mitarbeiter, - / die Mitarbeiterin, -nen", "employee, member of staff; colleague", "Die Firma sucht neue Mitarbeiter für den Kundendienst.", "The company is looking for new staff for customer service.", "", 0],
      ["mittlerweile", "by now, meanwhile", "Mittlerweile spreche ich gut Deutsch, aber Schweizerdeutsch verstehe ich noch kaum.", "By now I speak German well, but I still hardly understand Swiss German.", "", 0],
      ["möglichst", "as … as possible", "Bitte antworten Sie mir möglichst schnell.", "Please reply to me as quickly as possible.", "", 0],
      ["die Moschee, -n", "mosque", "Freitags geht mein Kollege in der Mittagspause in die Moschee.", "On Fridays my colleague goes to the mosque in his lunch break.", "", 0],
      ["die Mühe, -n", "effort, trouble", "Sie gibt sich viel Mühe, damit sich die Gäste wohlfühlen.", "She goes to a lot of trouble so that the guests feel comfortable.", "", 0],
      ["die Pflegekraft, -¨e", "carer, member of nursing staff", "In vielen Spitälern fehlen gut ausgebildete Pflegekräfte.", "Many hospitals are short of well-trained nursing staff.", "DE: Krankenhäusern", 0],
      ["pflegen", "to nurse, care for; to look after, maintain", "Sie pflegt ihre kranke Mutter zu Hause.", "She looks after her sick mother at home.", "", 0],
      ["die Produktion, -en", "production", "Die Produktion des Films hat zwei Jahre gedauert.", "The production of the film took two years.", "", 0],
      ["die Produktionsfirma, -firmen", "production company", "Sie arbeitet bei einer kleinen Produktionsfirma, die Werbefilme macht.", "She works for a small production company that makes commercials.", "", 0],
      ["die Pünktlichkeit (Sg.)", "punctuality", "Mein Chef legt viel Wert auf Pünktlichkeit.", "My boss attaches a lot of importance to punctuality.", "", 0],
      ["recherchieren", "to research, look into", "Bevor sie den Laden eröffnete, recherchierte sie lange im Internet.", "Before she opened the shop, she did a lot of research on the internet.", "", 0],
      ["die Rede, -n", "speech", "Bei der Eröffnung hielt der Besitzer eine kurze Rede.", "At the opening the owner gave a short speech.", "", 0],
      ["die Reklamation, -en", "complaint (about a product or service)", "Wegen des kaputten Staubsaugers schrieb ich eine Reklamation an den Hersteller.", "Because of the broken vacuum cleaner I wrote a complaint to the manufacturer.", "", 0],
      ["das Risiko, Risiken", "risk", "Ohne ein Risiko einzugehen, kann man keine Firma gründen.", "You can't start a company without taking a risk.", "", 0],
      ["die Rolle, -n", "role, part", "Bei der Stellensuche spielen Soft Skills eine wichtige Rolle.", "Soft skills play an important role in job-hunting.", "", 0],
      ["die Rücksicht, -en", "consideration, regard", "Im Grossraumbüro sollte man Rücksicht auf die Kollegen nehmen.", "In an open-plan office you should be considerate towards your colleagues.", "DE: Großraumbüro", 0],
      ["rum·kommen", "to get around, travel a lot (coll.)", "Als Pilot ist er viel in der Welt rumgekommen.", "As a pilot he has got around the world a lot.", "", 0],
      ["russisch", "Russian", "Ihr Restaurant bietet russische Spezialitäten wie Pelmeni an.", "Her restaurant offers Russian specialities such as pelmeni.", "", 0],
      ["das Russland", "Russia", "Vor zwanzig Jahren kam Olga aus Russland in die Schweiz.", "Twenty years ago Olga came to Switzerland from Russia.", "", 0],
      ["das Shampoo, -s", "shampoo", "Dieses Shampoo gibt es in der Migros im Moment zum halben Preis.", "This shampoo is half price at Migros at the moment.", "", 0],
      ["der Sinn, -e", "sense; meaning, point", "Ich sehe in meiner Arbeit keinen Sinn mehr und bin total frustriert.", "I no longer see any point in my work and I'm totally frustrated.", "", 0],
      ["der/das Soft Skill, -s", "soft skill", "Konfliktfähigkeit ist ein Soft Skill, den viele Firmen suchen.", "Being able to handle conflict is a soft skill that many companies look for.", "", 0],
      ["die Software, -s", "software", "Für die Buchhaltung benutzen wir eine neue Software.", "We use new software for the accounts.", "", 0],
      ["statt (+ Gen.); statt … zu", "instead of", "Statt sich zu beschweren, sucht sie lieber selbst eine Lösung.", "Instead of complaining, she prefers to look for a solution herself.", "", 0],
      ["das Streetfood, -s", "street food", "Mittags verkauft er vietnamesisches Streetfood an einem kleinen Stand.", "At lunchtime he sells Vietnamese street food at a small stall.", "", 0],
      ["das Studio, -s", "studio", "Den Werbefilm drehen wir in einem Studio in Oerlikon.", "We're shooting the commercial in a studio in Oerlikon.", "", 0],
      ["die Teamarbeit, -en", "teamwork", "Ohne gute Teamarbeit funktioniert in der Küche nichts.", "Without good teamwork nothing works in the kitchen.", "", 0],
      ["die Toleranz, -en", "tolerance", "In einem internationalen Team braucht man viel Toleranz und Geduld.", "In an international team you need a lot of tolerance and patience.", "", 0],
      ["türkisch", "Turkish", "Mein Nachbar hat in Winterthur einen türkischen Lebensmittelladen eröffnet.", "My neighbour has opened a Turkish grocery shop in Winterthur.", "", 0],
      ["um·tauschen", "to exchange (goods)", "Kann ich die Hose umtauschen, wenn sie nicht passt?", "Can I exchange the trousers if they don't fit?", "", 0],
      ["um … zu", "in order to", "Sie besucht einen Abendkurs, um ihr Deutsch zu verbessern.", "She's taking an evening class in order to improve her German.", "", 0],
      ["sich verabschieden (von + Dat.)", "to say goodbye (to)", "Am letzten Arbeitstag verabschiedete er sich von allen Kollegen.", "On his last day at work he said goodbye to all his colleagues.", "", 0],
      ["verzweifelt", "desperate, in despair", "Verzweifelt schrieb sie in einem Forum: «Mein Chef hört mir nie zu!»", "In despair she wrote in a forum: 'My boss never listens to me!'", "", 0],
      ["das Vietnam", "Vietnam", "Ihre Eltern sind in den Achtzigerjahren aus Vietnam in die Schweiz gekommen.", "Her parents came to Switzerland from Vietnam in the eighties.", "", 0],
      ["das Waschmittel, -", "washing powder, detergent", "Vergiss nicht, im Coop Waschmittel zu kaufen!", "Don't forget to buy washing powder at Coop!", "", 0],
      ["der Wettbewerb, -e", "competition (business); contest", "In der Innenstadt ist der Wettbewerb zwischen den Restaurants sehr hart.", "In the city centre the competition between restaurants is very tough.", "", 0],
      ["wieder·kommen", "to come back", "Wenn der Service gut ist, kommen die Kunden gern wieder.", "If the service is good, customers are happy to come back.", "", 0],
      ["die Zahncreme, -s", "toothpaste", "Die Zahncreme ist fast aufgebraucht, wir müssen neue kaufen.", "The toothpaste is almost used up; we need to buy some more.", "", 0],
      ["die Zutat, -en", "ingredient", "Für ihre Gerichte verwendet sie nur frische Zutaten vom Markt.", "For her dishes she uses only fresh ingredients from the market.", "", 0],
      ["die Westschweiz (Sg.)", "French-speaking Switzerland", "Nach der Lehre arbeitete er ein Jahr in der Westschweiz, um Französisch zu lernen.", "After his apprenticeship he worked in French-speaking Switzerland for a year to learn French.", "", 1],
      ["die Quittung, -en", "receipt", "Ohne Quittung können wir die Ware leider nicht umtauschen.", "Unfortunately we can't exchange the goods without a receipt.", "DE: der Kassenbon", 1],
      ["retournieren", "to return, send back (goods)", "Wenn Ihnen die Schuhe nicht passen, können Sie sie innerhalb von 30 Tagen retournieren.", "If the shoes don't fit, you can return them within 30 days.", "DE: zurückschicken", 1],
      ["allfällig", "any (that may arise), possible", "Für allfällige Fragen stehe ich Ihnen gerne zur Verfügung.", "I am happy to answer any questions you may have.", "DE: eventuell, etwaig", 1],
      ["der Coiffeur, -e / die Coiffeuse, -n", "hairdresser", "Mein Coiffeur kommt aus Syrien und hat seit fünf Jahren einen eigenen Salon.", "My hairdresser is from Syria and has had his own salon for five years.", "DE: der Friseur / die Friseurin", 1],
    ] },
    { id: "L07", n: 7, title: "Rund ums Wohnen", book: "B1.1", cards: [
      ["ab·machen", "to agree, arrange; to take off", "Wir haben abgemacht, dass jeder einmal pro Woche das Bad putzt.", "We agreed that everyone cleans the bathroom once a week.", "", 0],
      ["die Alternative, -n", "alternative", "Eine WG ist eine gute Alternative zur teuren Einzimmerwohnung.", "A flatshare is a good alternative to an expensive studio flat.", "", 0],
      ["an·gehen", "to concern (Das geht dich nichts an.); to come on (light)", "Was ich in meiner Freizeit mache, geht meine Nachbarn nichts an.", "What I do in my free time is none of my neighbours' business.", "", 0],
      ["an·klopfen", "to knock (on a door)", "Bitte klopf an, bevor du in mein Zimmer kommst!", "Please knock before you come into my room!", "", 0],
      ["an·legen", "to lay out (a garden); sich anlegen mit: to pick a fight with", "Hinter dem Haus haben wir einen kleinen Gemüsegarten angelegt.", "We've laid out a small vegetable garden behind the house.", "", 0],
      ["der Anwalt, -¨e", "lawyer", "Im Streit um den Zaun hat unser Nachbar sogar einen Anwalt eingeschaltet.", "In the dispute over the fence our neighbour even brought in a lawyer.", "", 0],
      ["aufmerksam", "attentive; aufmerksam machen auf: to point out", "Die Nachbarin hat mich freundlich auf die Ruhezeiten aufmerksam gemacht.", "The neighbour kindly pointed out the quiet hours to me.", "", 0],
      ["der Aufschwung (Sg.)", "upturn, boom", "Seit der neue Bahnhof eröffnet wurde, erlebt das Quartier einen Aufschwung.", "Since the new station opened, the neighbourhood has been experiencing an upturn.", "", 0],
      ["aus·reden", "to finish speaking; to talk sb out of sth", "An der WG-Sitzung lässt Marco nie jemanden ausreden.", "At the flatshare meeting Marco never lets anyone finish speaking.", "", 0],
      ["äussern", "to express, voice (an opinion)", "An der Mieterversammlung durfte jeder seine Meinung äussern.", "At the tenants' meeting everyone was allowed to voice their opinion.", "DE: äußern", 0],
      ["der Bau, -ten", "construction; building", "Der Bau des neuen Schulhauses dauert noch bis zum nächsten Sommer.", "Construction of the new school building will go on until next summer.", "", 0],
      ["der Bauarbeiter, -", "construction worker", "Die Bauarbeiter fangen schon um sieben Uhr morgens an.", "The construction workers start as early as seven in the morning.", "", 0],
      ["beauftragen", "to commission, hire, instruct", "Die Verwaltung hat einen Gärtner beauftragt, die Hecke zu schneiden.", "The property management has hired a gardener to cut the hedge.", "", 0],
      ["der Beton, -s", "concrete", "Die Mauer bestand aus grauem Beton und Stacheldraht.", "The wall was made of grey concrete and barbed wire.", "", 0],
      ["bezahlbar", "affordable", "Eine bezahlbare Wohnung in Zürich zu finden, ist wie ein Sechser im Lotto.", "Finding an affordable flat in Zurich is like winning the lottery.", "", 0],
      ["der Bleistift, -e", "pencil", "Ich habe den Grundriss der Wohnung mit Bleistift skizziert.", "I sketched the floor plan of the flat in pencil.", "", 0],
      ["bloss", "only, just; (in wishes) if only", "Wäre ich bloss nicht in diese laute Wohnung gezogen!", "If only I hadn't moved into this noisy flat!", "DE: bloß", 0],
      ["brennen", "to burn; to be on (light)", "Im Treppenhaus brennt die ganze Nacht das Licht.", "The light in the stairwell is on all night.", "", 0],
      ["das Bundesland, -¨er", "federal state (Germany, Austria)", "Das Dorf lag genau an der Grenze zwischen zwei Bundesländern.", "The village lay right on the border between two federal states.", "in der Schweiz: der Kanton", 0],
      ["die Chance, -n", "chance, opportunity", "Mit einem Haustier hast du kaum eine Chance auf diese Wohnung.", "With a pet you hardly stand a chance of getting this flat.", "", 0],
      ["-eckig (z. B. viereckig)", "-cornered, -angular (suffix)", "Für die kleine Küche brauchen wir einen viereckigen Tisch.", "We need a square table for the small kitchen.", "", 0],
      ["das Eigentum, -e", "property, ownership", "Der Garten ist zwar Eigentum der Vermieterin, aber wir dürfen ihn benutzen.", "The garden does belong to the landlady, but we're allowed to use it.", "", 0],
      ["einander", "each other, one another", "In unserem Haus helfen die Nachbarn einander gern.", "In our building the neighbours like helping each other.", "", 0],
      ["ein·bauen", "to install, fit", "Der Vermieter hat endlich eine neue Küche eingebaut.", "The landlord has finally put in a new kitchen.", "", 0],
      ["entdecken", "to discover", "Im Keller haben wir eine alte Kiste voller Briefe entdeckt.", "In the cellar we discovered an old box full of letters.", "", 0],
      ["entweder … oder", "either … or", "Entweder wäschst du dein Geschirr selbst ab, oder ich stelle es vor deine Tür.", "Either you wash up your own dishes or I'll put them outside your door.", "", 0],
      ["die Erde (Sg.)", "earth; soil", "Für die Tomaten auf dem Balkon brauche ich frische Erde.", "I need fresh soil for the tomatoes on the balcony.", "", 0],
      ["erstaunt", "astonished, surprised", "Die neue Mitbewohnerin war erstaunt, wie sauber unsere WG ist.", "The new flatmate was astonished at how clean our flat is.", "", 0],
      ["der Farbstift, -e", "coloured pencil", "Die Kinder malen mit Farbstiften ein Bild von ihrem Traumhaus.", "The children are drawing a picture of their dream house with coloured pencils.", "", 0],
      ["fehlen", "to be missing; to be missed (Du fehlst mir.)", "Seit du in Hamburg wohnst, fehlst du mir jeden Tag.", "Since you've been living in Hamburg, I've missed you every day.", "", 0],
      ["die Frechheit, -en", "cheek, impudence", "Er parkiert sein Auto immer auf meinem Platz – so eine Frechheit!", "He always parks his car in my space – what a cheek!", "", 0],
      ["der Frieden, -", "peace", "Nach dem langen Streit haben die Nachbarn endlich Frieden geschlossen.", "After the long dispute the neighbours finally made peace.", "", 0],
      ["friedlich", "peaceful", "Am Sonntagmorgen ist unser Quartier ganz still und friedlich.", "On Sunday mornings our neighbourhood is completely quiet and peaceful.", "", 0],
      ["der Frühstückstisch, -e", "breakfast table", "Am Frühstückstisch streiten wir oft über den Putzplan.", "We often argue about the cleaning rota at the breakfast table.", "", 0],
      ["das Fussballtraining, -s", "football training", "Nach dem Fussballtraining bin ich immer völlig kaputt.", "After football training I'm always completely worn out.", "DE: Fußballtraining", 0],
      ["das Gebäude, -", "building", "Das alte Gebäude am See wird bald renoviert.", "The old building by the lake is going to be renovated soon.", "", 0],
      ["die Bewilligung, -en", "permit, permission", "Für den Wintergarten braucht man eine Bewilligung der Gemeinde.", "You need a permit from the municipality for the conservatory.", "DE: die Genehmigung", 0],
      ["das Gericht, -e", "court (of law); dish (food)", "Der Streit um die Hecke landete schliesslich vor Gericht.", "The dispute over the hedge ended up in court in the end.", "DE: schließlich", 0],
      ["geteilt", "divided; shared", "Jahrzehntelang war das kleine Dorf durch eine Mauer geteilt.", "For decades the small village was divided by a wall.", "", 0],
      ["gleich- (gleichaltrig, gleichzeitig …)", "same, equal (prefix)", "In unserer WG sind alle ungefähr gleichaltrig.", "In our flatshare everyone is about the same age.", "", 0],
      ["das Grundstück, -e", "plot (of land), property", "Auf dem Grundstück neben uns wird ein Mehrfamilienhaus gebaut.", "A block of flats is being built on the plot next to us.", "", 0],
      ["die Hausordnung, -en", "house rules", "Hätte ich nur die Hausordnung genauer gelesen!", "If only I'd read the house rules more carefully!", "", 0],
      ["der Hausschuh, -e", "slipper", "In vielen Schweizer Wohnungen zieht man die Schuhe aus und trägt Hausschuhe.", "In many Swiss homes people take their shoes off and wear slippers.", "CH oft: die Finken (Pl.)", 0],
      ["herrschen", "to rule; to prevail, reign (Es herrscht Ruhe.)", "Ab 22 Uhr herrscht im ganzen Haus Ruhe.", "From 10 p.m. there's quiet throughout the building.", "", 0],
      ["herum- (herumliegen, herumlaufen …)", "around, about (prefix)", "Bei uns liegen überall schmutzige Socken herum.", "At our place there are dirty socks lying around everywhere.", "", 0],
      ["hierher", "here (to this place)", "Warum bist du eigentlich hierher nach Zürich gezogen?", "Why did you actually move here to Zurich?", "", 0],
      ["im Grünen", "in the countryside, in green surroundings", "Unser Haus liegt ruhig im Grünen, trotzdem ist man schnell in der Stadt.", "Our house is in a quiet, green spot, but you can still get into town quickly.", "", 0],
      ["der Innenhof, -¨e", "courtyard", "Im Innenhof spielen die Kinder bis zum Abendessen.", "The children play in the courtyard until dinner.", "", 0],
      ["irgend- (irgendwo, irgendwann …)", "some-, any- (prefix)", "Irgendwo in dieser Wohnung muss mein Schlüssel sein.", "My key must be somewhere in this flat.", "", 0],
      ["der Kopfschmerz, -en", "headache", "Vom ständigen Baulärm bekomme ich Kopfschmerzen.", "The constant construction noise gives me a headache.", "", 0],
      ["die Kritik, -en", "criticism", "Der neue Mitbewohner kann mit Kritik nicht gut umgehen.", "The new flatmate doesn't take criticism well.", "", 0],
      ["der Küchentisch, -e", "kitchen table", "Der Küchentisch ist schon wieder voller schmutziger Tassen.", "The kitchen table is full of dirty cups again.", "", 0],
      ["lächerlich", "ridiculous", "Sich wegen ein paar Blättern auf dem Rasen zu streiten, ist doch lächerlich!", "Arguing over a few leaves on the lawn is ridiculous!", "", 0],
      ["längst", "long since, long ago", "Die Party ist längst vorbei, aber die Nachbarn reden immer noch darüber.", "The party is long over, but the neighbours are still talking about it.", "", 0],
      ["der Lärm (Sg.)", "noise", "Der Lärm von der Baustelle stört nicht nur uns, sondern auch die Nachbarn.", "The noise from the building site bothers not only us but also the neighbours.", "", 0],
      ["das Lärmschutzfenster, -", "soundproof window", "Dank der Lärmschutzfenster hört man den Verkehr kaum noch.", "Thanks to the soundproof windows you can hardly hear the traffic any more.", "", 0],
      ["der Lift, -e/-s", "lift", "Hätten wir nur eine Wohnung mit Lift genommen!", "If only we'd taken a flat with a lift!", "", 0],
      ["der Link, -s", "link", "Ich schicke dir den Link zum Wohnungsinserat.", "I'll send you the link to the flat advert.", "", 0],
      ["der Luxus (Sg.)", "luxury", "Eine eigene Waschmaschine in der Wohnung ist in Zürich ein echter Luxus.", "Having your own washing machine in the flat is a real luxury in Zurich.", "", 0],
      ["mähen", "to mow", "Laut Hausordnung darf man am Sonntag den Rasen nicht mähen.", "According to the house rules you're not allowed to mow the lawn on Sundays.", "", 0],
      ["die Mauer, -n", "wall (free-standing, outer)", "Nach dem Fall der Mauer konnten sich die Familien endlich wieder besuchen.", "After the fall of the wall the families could finally visit each other again.", "", 0],
      ["meinetwegen", "as far as I'm concerned, fine by me; because of me", "Meinetwegen kannst du deine Freundin jedes Wochenende einladen.", "As far as I'm concerned, you can invite your girlfriend every weekend.", "", 0],
      ["das Mikrofon, -e", "microphone", "Beim Videoanruf mit meinem Freund funktionierte mein Mikrofon nicht.", "During the video call with my boyfriend my microphone wasn't working.", "", 0],
      ["miteinander", "with each other, together", "Seit dem Streit reden die beiden Nachbarn nicht mehr miteinander.", "Since the argument the two neighbours haven't spoken to each other.", "", 0],
      ["mitten", "in the middle (of)", "Mitten in der Nacht klingelte jemand an unserer Tür.", "Someone rang our doorbell in the middle of the night.", "", 0],
      ["die Nachbarschaft, -en", "neighbourhood; neighbours", "Wir haben eine sehr nette Nachbarschaft und grillieren oft zusammen.", "We have very nice neighbours and often have barbecues together.", "", 0],
      ["das Niemandsland (Sg.)", "no man's land", "Zwischen den beiden Mauern lag ein breiter Streifen Niemandsland.", "Between the two walls lay a wide strip of no man's land.", "", 0],
      ["nördlich", "north (of), northern", "Unsere neue Wohnung liegt etwas nördlich vom Stadtzentrum.", "Our new flat is a little north of the city centre.", "", 0],
      ["die Ordnung, -en", "order, tidiness", "Mein Mitbewohner hält nicht viel von Ordnung.", "My flatmate doesn't think much of tidiness.", "", 0],
      ["Ost- (Ostschweiz, Ostberlin …)", "east, eastern (prefix)", "Meine Freundin wohnt in der Ostschweiz, ich wohne in Bern.", "My girlfriend lives in eastern Switzerland, and I live in Bern.", "", 0],
      ["die Pflicht, -en", "duty, obligation", "In unserer WG ist der Putzplan für alle Pflicht.", "In our flatshare the cleaning rota is compulsory for everyone.", "", 0],
      ["die Privatsphäre, -n", "privacy", "In einer WG hat man nicht viel Privatsphäre.", "You don't have much privacy in a flatshare.", "", 0],
      ["der Prozess, -e", "lawsuit, trial; process", "Den Prozess gegen den Vermieter hat sie zum Glück gewonnen.", "Luckily she won the lawsuit against the landlord.", "", 0],
      ["das Puzzle, -s", "jigsaw puzzle", "Am Sonntagabend machen wir zusammen ein Puzzle mit tausend Teilen.", "On Sunday evening we do a thousand-piece jigsaw together.", "", 0],
      ["die Querstrasse, -n", "side street, cross street", "Die Bäckerei ist in der nächsten Querstrasse links.", "The bakery is in the next side street on the left.", "DE: Querstraße", 0],
      ["der/das Radiergummi, -s", "rubber, eraser", "Kannst du mir kurz deinen Radiergummi leihen?", "Can you lend me your rubber for a moment?", "", 0],
      ["der Rand, -¨er", "edge", "Wir wohnen am Rand eines kleinen Dorfes.", "We live on the edge of a small village.", "", 0],
      ["der Rasen, -", "lawn", "Die Kinder dürfen auf dem Rasen hinter dem Haus Fussball spielen.", "The children are allowed to play football on the lawn behind the house.", "DE: Fußball", 0],
      ["der Rechtsanwalt, -¨e", "lawyer, solicitor", "Hätte ich doch vor der Unterschrift einen Rechtsanwalt gefragt!", "If only I'd asked a lawyer before signing!", "", 0],
      ["die Regierung, -en", "government", "Die Regierung will mehr bezahlbare Wohnungen bauen lassen.", "The government wants to have more affordable flats built.", "", 0],
      ["der Respekt (Sg.)", "respect", "Gute Nachbarschaft braucht vor allem gegenseitigen Respekt.", "Good neighbourly relations need mutual respect above all.", "", 0],
      ["die Ruhezeit, -en", "quiet hours, rest period", "Während der Ruhezeiten soll man im Haus keinen Lärm machen.", "You're not supposed to make noise in the building during the quiet hours.", "", 0],
      ["die Säge, -n", "saw", "Die Säge hängt im Keller neben dem Velo.", "The saw is hanging in the cellar next to the bike.", "", 0],
      ["sägen", "to saw", "Am Samstagmorgen sägt der Nachbar schon um sieben Uhr Holz.", "On Saturday mornings the neighbour is already sawing wood at seven.", "", 0],
      ["der Schmutz (Sg.)", "dirt", "Nach dem Umbau lag überall im Treppenhaus Schmutz.", "After the renovation there was dirt everywhere in the stairwell.", "", 0],
      ["schreien", "to scream, shout", "Das Baby in der Wohnung über uns schreit jede Nacht.", "The baby in the flat above us screams every night.", "", 0],
      ["die Sommerresidenz, -en", "summer residence", "Die Königsfamilie verbrachte jeden Juli in ihrer Sommerresidenz am See.", "The royal family spent every July at their summer residence by the lake.", "", 0],
      ["der Staat, -en", "state, country", "Nach der Teilung gehörte das Dorf zu zwei verschiedenen Staaten.", "After the division the village belonged to two different states.", "", 0],
      ["der Stadtrand, -¨er", "outskirts, edge of town", "Am Stadtrand sind die Mieten zwar günstiger, aber der Arbeitsweg ist lang.", "On the outskirts rents are admittedly cheaper, but the commute is long.", "", 0],
      ["der Stadtteil, -e", "district, part of town", "In welchem Stadtteil von Zürich wohnst du?", "Which part of Zurich do you live in?", "", 0],
      ["-stöckig (z. B. dreistöckig)", "-storey (suffix)", "Wir wohnen in einem dreistöckigen Haus ohne Lift.", "We live in a three-storey building without a lift.", "", 0],
      ["die Stufe, -n", "step; level, stage", "Vorsicht, die letzte Stufe vor der Haustür ist kaputt!", "Careful, the last step before the front door is broken!", "", 0],
      ["tatsächlich", "actually, really, indeed", "Hat der Nachbar tatsächlich die Polizei gerufen?", "Did the neighbour really call the police?", "", 0],
      ["die Terrasse, -n", "terrace, patio", "Im Sommer frühstücken wir am liebsten auf der Terrasse.", "In summer we like having breakfast on the terrace best.", "", 0],
      ["der Tourismus (Sg.)", "tourism", "Der Tourismus ist für viele Bergdörfer sehr wichtig.", "Tourism is very important for many mountain villages.", "", 0],
      ["die Touristenattraktion, -en", "tourist attraction", "Das alte Stück Mauer ist heute eine Touristenattraktion.", "The old section of wall is a tourist attraction today.", "", 0],
      ["trotz (+ Gen.)", "despite, in spite of", "Trotz des Lärms wohnen wir sehr gern in der Altstadt.", "Despite the noise we really like living in the old town.", "", 0],
      ["der Umgang (Sg.)", "dealings, contact; handling", "Der Umgang mit den Nachbarn ist nicht immer einfach.", "Dealing with the neighbours isn't always easy.", "", 0],
      ["der Untermieter, -", "subtenant, lodger", "Entweder finde ich einen Untermieter, oder ich muss die Miete doppelt zahlen.", "Either I find a subtenant or I'll have to pay rent twice.", "", 0],
      ["verärgert", "annoyed, angry", "Die Nachbarin war sehr verärgert über den Rauch vom Grill.", "The neighbour was very annoyed about the smoke from the barbecue.", "", 0],
      ["das Verbot, -e", "ban, prohibition", "In unserem Haus gilt ein Verbot für Holzkohlegrills auf dem Balkon.", "In our building there's a ban on charcoal barbecues on the balcony.", "", 0],
      ["verdächtigen", "to suspect", "Sie verdächtigt den Nachbarn, ihr Velo gestohlen zu haben.", "She suspects the neighbour of having stolen her bike.", "", 0],
      ["sich vergrössern", "to get bigger, expand; (vergrössern: to enlarge)", "Wir bekommen ein Baby und möchten uns deshalb vergrössern.", "We're having a baby, so we'd like to move somewhere bigger.", "DE: vergrößern", 0],
      ["der Vorort, -e", "suburb", "Viele Familien ziehen in die Vororte, weil die Mieten dort günstiger sind.", "Many families move to the suburbs because rents are cheaper there.", "", 0],
      ["weg·räumen", "to clear away, tidy away", "Wer kocht, muss danach auch alles wegräumen.", "Whoever cooks has to clear everything away afterwards too.", "", 0],
      ["weg·schaffen", "to remove, get rid of", "Wer schafft endlich das alte Sofa aus dem Keller weg?", "Who's finally going to get rid of the old sofa in the cellar?", "", 0],
      ["wesentlich", "essential, substantial; considerably (+ comparative)", "Die neue Wohnung ist wesentlich grösser als die alte.", "The new flat is considerably bigger than the old one.", "DE: größer", 0],
      ["West- (Westschweiz, Westberlin …)", "west, western (prefix)", "Seit mein Freund in der Westschweiz arbeitet, sehen wir uns nur am Wochenende.", "Since my boyfriend has been working in western Switzerland, we only see each other at weekends.", "", 0],
      ["das WG-Zimmer, -", "room in a shared flat", "Auf ein günstiges WG-Zimmer in Zürich melden sich oft Dutzende Leute.", "Dozens of people often apply for a cheap flatshare room in Zurich.", "", 0],
      ["die Wirklichkeit, -en", "reality", "Auf den Fotos sah die Wohnung schön aus, in Wirklichkeit war sie dunkel.", "In the photos the flat looked nice, but in reality it was dark.", "", 0],
      ["die Wirtschaft, -en", "economy; restaurant, pub", "Weil die Wirtschaft in Zürich boomt, sind Wohnungen dort knapp und teuer.", "Because the economy in Zurich is booming, flats there are scarce and expensive.", "", 0],
      ["wirtschaftlich", "economic; economical", "Wirtschaftlich gesehen ist eine WG oft die beste Lösung.", "Economically speaking, a flatshare is often the best solution.", "", 0],
      ["wo(r)- (worüber, womit …)", "what (in question words: about what, with what …)", "Worüber habt ihr an der WG-Sitzung so lange diskutiert?", "What did you spend so long discussing at the flatshare meeting?", "", 0],
      ["wütend", "furious, angry", "Der Nachbar klingelte wütend, weil unsere Musik zu laut war.", "The neighbour rang the bell furiously because our music was too loud.", "", 0],
      ["der Zaun, -¨e", "fence", "Über den Zaun hinweg plaudern die beiden Nachbarinnen jeden Morgen.", "The two neighbours chat over the fence every morning.", "", 0],
      ["zentral", "central(ly located)", "Die Wohnung ist nicht nur zentral, sondern auch erstaunlich günstig.", "The flat is not only central but also surprisingly cheap.", "", 0],
      ["die Zimmersuche, -n", "room hunting, search for a room", "Hätte ich doch nur früher mit der Zimmersuche angefangen!", "If only I'd started looking for a room earlier!", "", 0],
      ["zu·drücken", "to press shut; ein Auge zudrücken: to turn a blind eye", "Bei unserer Party am Samstag hat der Hauswart ein Auge zugedrückt.", "The caretaker turned a blind eye to our party on Saturday.", "", 0],
      ["grillieren", "to barbecue, grill", "Im Sommer grillieren wir fast jeden Abend am See.", "In summer we have a barbecue by the lake almost every evening.", "DE: grillen", 1],
      ["die Waschküche, -n", "(shared) laundry room", "Laut Waschplan darf ich die Waschküche nur am Dienstag benutzen.", "According to the laundry rota I can only use the laundry room on Tuesdays.", "", 1],
      ["die Liegenschaftsverwaltung, -en", "property management (company)", "Wegen der kaputten Heizung habe ich die Liegenschaftsverwaltung angerufen.", "I rang the property management about the broken heating.", "DE: die Hausverwaltung", 1],
      ["der Hauswart, -e / die Hauswartin, -nen", "caretaker, janitor", "Der Hauswart kontrolliert jeden Abend, ob die Haustür abgeschlossen ist.", "The caretaker checks every evening whether the front door is locked.", "DE: der Hausmeister", 1],
      ["der Mietzins, -e", "rent", "Der Mietzins für die Dreizimmerwohnung beträgt 2100 Franken plus Nebenkosten.", "The rent for the three-room flat is 2,100 francs plus service charges.", "DE: die Miete", 1],
      ["zügeln", "to move (house)", "Nächsten Monat zügeln wir von Bern nach Zürich.", "Next month we're moving from Bern to Zurich.", "DE: umziehen", 1],
      ["das Quartier, -e", "neighbourhood, district", "In unserem Quartier gibt es viele kleine Läden und Cafés.", "There are lots of little shops and cafés in our neighbourhood.", "DE: das Viertel", 1],
      ["das Billett, -e", "ticket", "Jeden Freitag kaufe ich ein Billett nach Lugano, um meine Freundin zu besuchen.", "Every Friday I buy a ticket to Lugano to visit my girlfriend.", "DE: die Fahrkarte", 1],
    ] },
    { id: "L08", n: 8, title: "Unter Kollegen", book: "B1.2", cards: [
      ["die Atmosphäre, -n", "atmosphere", "Bei unserem Teamessen am Freitag war die Atmosphäre sehr locker.", "The atmosphere at our team dinner on Friday was very relaxed.", "", 0],
      ["bearbeiten", "to deal with, process; to work on", "Leider kann ich Ihre Anfrage erst nächste Woche bearbeiten.", "Unfortunately I can't deal with your request until next week.", "", 0],
      ["beeinflussen", "to influence", "Mein früherer Chef hat meine Arbeitsweise stark beeinflusst.", "My former boss strongly influenced the way I work.", "", 0],
      ["die Beziehung, -en", "relationship", "Zu meiner Teamleiterin habe ich eine offene und ehrliche Beziehung.", "I have an open and honest relationship with my team leader.", "", 0],
      ["der Chat, -s", "chat (online)", "Im Team-Chat hat Lukas gefragt, wer am Freitag Zeit hat.", "In the team chat Lukas asked who has time on Friday.", "", 0],
      ["derselbe (dieselbe/dasselbe)", "the same", "Seit zehn Jahren arbeiten wir in derselben Abteilung.", "We've been working in the same department for ten years.", "", 0],
      ["der Eindruck, -¨e", "impression", "Von unserem neuen Praktikanten habe ich einen sehr guten Eindruck.", "I have a very good impression of our new intern.", "", 0],
      ["der Einfluss, -¨e", "influence", "Freunde haben oft mehr Einfluss auf uns, als wir denken.", "Friends often have more influence on us than we think.", "", 0],
      ["der Elternabend, -e", "parents' evening", "Falls ich am Donnerstag länger arbeiten muss, geht mein Mann allein zum Elternabend.", "If I have to work late on Thursday, my husband will go to the parents' evening alone.", "", 0],
      ["eng", "close; narrow, tight", "Mit meiner Bürokollegin bin ich inzwischen eng befreundet.", "I'm now close friends with the colleague I share an office with.", "", 0],
      ["eventuell", "possibly, perhaps (not «eventually»)", "Diese Woche schaffe ich es nicht, aber eventuell nächste Woche.", "I can't manage it this week, but possibly next week.", "", 0],
      ["die Form, -en", "form, shape; manner", "Kritik sollte man immer in freundlicher Form äussern.", "You should always express criticism in a friendly manner.", "DE: äußern", 0],
      ["die Freundschaft, -en", "friendship", "Aus unserer Zusammenarbeit ist eine echte Freundschaft entstanden.", "A real friendship has grown out of our work together.", "", 0],
      ["freundschaftlich", "friendly, amicable", "Das Verhältnis zwischen der Chefin und dem Team ist sehr freundschaftlich.", "The relationship between the boss and the team is very friendly.", "", 0],
      ["führen zu (+ Dat.)", "to lead to", "Zu viele Überstunden führen oft zu Stress und Konflikten.", "Too much overtime often leads to stress and conflicts.", "", 0],
      ["das Gedicht, -e", "poem", "Zur Pensionierung von Frau Meier hat das Team ein lustiges Gedicht geschrieben.", "The team wrote a funny poem for Ms Meier's retirement.", "", 0],
      ["die Gemeinschaft, -en", "community", "Der Chor ist für mich eine Gemeinschaft, in der ich mich wohlfühle.", "For me the choir is a community where I feel at home.", "", 0],
      ["die Grenze, -n", "border; limit", "Ich helfe gern, aber bei 50 Stunden pro Woche ist meine Grenze erreicht.", "I'm happy to help, but at 50 hours a week I've reached my limit.", "", 0],
      ["hilfsbereit", "helpful, willing to help", "Alle mögen den neuen Kollegen, weil er so hilfsbereit ist.", "Everyone likes the new colleague because he's so helpful.", "", 0],
      ["interviewen", "to interview", "Für die Quartierzeitung habe ich den Präsidenten unseres Sportvereins interviewt.", "For the neighbourhood paper I interviewed the president of our sports club.", "", 0],
      ["je … desto", "the … the (je länger, desto besser)", "Je länger ich in Zürich wohne, desto besser gefällt es mir hier.", "The longer I live in Zurich, the more I like it here.", "", 0],
      ["die Karriere, -n", "career", "Für ihre Karriere ist sie von Lausanne nach Zürich gezogen.", "She moved from Lausanne to Zurich for her career.", "", 0],
      ["das Klima, Klimata", "climate; atmosphere (at work)", "Seit dem Chefwechsel ist das Klima in unserer Abteilung viel besser.", "Since the change of boss, the atmosphere in our department has been much better.", "", 0],
      ["die Konsequenz, -en", "consequence", "Falls du die Stelle wechselst, hat das auch Konsequenzen für unser Projekt.", "If you change jobs, that will have consequences for our project too.", "", 0],
      ["der Kuli, -s", "ballpoint pen, biro", "Kannst du mir kurz deinen Kuli leihen?", "Can you lend me your pen for a moment?", "", 0],
      ["monatelang", "for months", "Monatelang haben wir uns gesiezt, bis sie mir endlich das Du angeboten hat.", "For months we called each other «Sie» until she finally offered to switch to «du».", "", 0],
      ["morgig- (die morgige Sitzung …)", "tomorrow's", "Für die morgige Sitzung muss ich noch eine Präsentation vorbereiten.", "I still have to prepare a presentation for tomorrow's meeting.", "", 0],
      ["nachher", "afterwards, later", "Ich habe jetzt keine Zeit, aber nachher schaue ich mir das gern an.", "I don't have time now, but I'll be happy to look at it later.", "", 0],
      ["das Orchester, -", "orchestra", "Meine Kollegin, mit der ich das Büro teile, spielt Geige in einem Orchester.", "My colleague, who I share an office with, plays the violin in an orchestra.", "", 0],
      ["professionell", "professional(ly)", "Auch wenn wir befreundet sind, bleiben wir bei der Arbeit professionell.", "Even though we're friends, we stay professional at work.", "", 0],
      ["recht", "quite, fairly", "Der erste Arbeitstag war recht anstrengend, aber alle waren sehr nett.", "The first day at work was quite tiring, but everyone was very nice.", "", 0],
      ["schwer·fallen (+ Dat.)", "to be difficult (for sb.), find hard", "Es fällt mir schwer, Nein zu sagen, wenn mich ein Kollege um Hilfe bittet.", "I find it hard to say no when a colleague asks me for help.", "", 0],
      ["sinnvoll", "sensible, worthwhile; makes sense", "Wäre es nicht sinnvoller, wenn Marco diese Aufgabe übernehmen würde?", "Wouldn't it make more sense for Marco to take on this task?", "", 0],
      ["der Sportler, -", "athlete, sportsman", "Mein Kollege ist ein begeisterter Sportler und fährt täglich mit dem Velo ins Büro.", "My colleague is a keen sportsman and cycles to the office every day.", "", 0],
      ["steif", "stiff; formal", "Unter Kollegen finde ich das Siezen manchmal etwas steif.", "Among colleagues I sometimes find saying «Sie» a bit stiff.", "", 0],
      ["die Studie, -n", "study (research)", "Für eine Studie über Freundschaften am Arbeitsplatz suchen wir noch Teilnehmende.", "We're still looking for participants for a study on friendships at work.", "", 0],
      ["tauschen", "to swap, exchange", "Falls du am Samstag nicht arbeiten kannst, tauschen wir einfach die Schichten.", "If you can't work on Saturday, we'll just swap shifts.", "", 0],
      ["treu", "loyal, faithful", "Sie ist eine treue Freundin, auf die man sich immer verlassen kann.", "She's a loyal friend you can always rely on.", "", 0],
      ["umso", "all the more; (je … umso) the … the", "Je besser man sich kennt, umso einfacher wird die Zusammenarbeit.", "The better you know each other, the easier working together becomes.", "", 0],
      ["unlösbar", "unsolvable, impossible to solve", "Am Anfang schien das Problem unlösbar, aber zusammen haben wir es geschafft.", "At first the problem seemed impossible to solve, but together we managed it.", "", 0],
      ["verbindlich", "binding, definite; obliging", "Bitte geben Sie mir bis Freitag eine verbindliche Antwort.", "Please give me a definite answer by Friday.", "", 0],
      ["der Vergleich, -e", "comparison", "Im Vergleich zu meiner alten Stelle ist das Team hier viel offener.", "Compared with my old job, the team here is much more open.", "", 0],
      ["das Vorbild, -er", "role model", "Meine erste Chefin, von der ich viel gelernt habe, ist bis heute mein Vorbild.", "My first boss, who I learned a lot from, is still my role model today.", "", 0],
      ["die Werbung, -en", "advertising; advert", "Eine Bekannte von mir arbeitet seit Jahren in der Werbung.", "An acquaintance of mine has worked in advertising for years.", "", 0],
      ["wirken", "to seem, come across; to have an effect", "Der neue Mitarbeiter wirkt etwas schüchtern, ist aber sehr nett.", "The new employee seems a bit shy, but he's very nice.", "", 0],
      ["worum", "what … about", "Worum geht es in der Sitzung morgen?", "What's the meeting tomorrow about?", "", 0],
      ["warnen (vor + Dat.)", "to warn (about, against)", "Meine Kollegin hat mich vor dem schlechten Kaffee in der Kantine gewarnt.", "My colleague warned me about the bad coffee in the canteen.", "", 0],
      ["die Zusammenarbeit (Sg.)", "cooperation, working together", "Vielen Dank für die gute Zusammenarbeit in den letzten Jahren!", "Thank you for the good cooperation over the last few years!", "", 0],
      ["zu·sagen", "to accept (an invitation), say yes; to promise", "Für das Teamessen am Freitag habe ich schon zugesagt.", "I've already said yes to the team dinner on Friday.", "", 0],
      ["duzen / siezen", "to call sb. «du» / to call sb. «Sie»", "In unserer Firma duzen sich alle, nur den Chef siezen wir noch.", "At our company everyone says «du» to each other – only the boss is still «Sie».", "", 1],
      ["der Znüni, -", "mid-morning snack; morning break", "Um zehn Uhr treffen wir uns in der Cafeteria zum Znüni.", "At ten o'clock we meet in the cafeteria for our morning break.", "DE: das zweite Frühstück, die Frühstückspause", 1],
      ["der Kindergärtner, - / die Kindergärtnerin, -nen", "kindergarten teacher", "Die Kindergärtnerin unserer Tochter ist sehr geduldig und herzlich.", "Our daughter's kindergarten teacher is very patient and warm.", "DE: ≈ der Erzieher / die Erzieherin", 1],
      ["der Quartierverein, -e", "neighbourhood association", "Im Quartierverein, bei dem ich mitmache, organisieren wir jedes Jahr ein Fest.", "In the neighbourhood association I'm involved in, we organise a party every year.", "DE: der Stadtteilverein, der Bürgerverein", 1],
    ] },
    { id: "L09", n: 9, title: "Virtuelle Welt", book: "B1.2", cards: [
      ["der Akku, -s", "rechargeable battery", "Bevor wir losfahren, muss ich noch den Akku meines E-Bikes laden.", "Before we set off, I still have to charge my e-bike's battery.", "", 0],
      ["als ob", "as if, as though", "Er sieht aus, als ob er die ganze Nacht nicht geschlafen hätte.", "He looks as if he hadn't slept all night.", "", 0],
      ["sich ändern", "to change (e.g. plans, times)", "Nach dem Update hat sich das ganze Menü geändert.", "After the update the whole menu changed.", "", 0],
      ["an·klicken", "to click on", "Klicken Sie das gewünschte Datum an und bestätigen Sie mit «OK».", "Click on the date you want and confirm with «OK».", "", 0],
      ["an·schliessen", "to connect, plug in", "Hast du den Drucker schon an den Laptop angeschlossen?", "Have you already connected the printer to the laptop?", "DE: anschließen", 0],
      ["sich auf·regen (über + Akk.)", "to get worked up, get annoyed (about)", "Reg dich doch nicht so auf, es ist nur ein Spiel!", "Don't get so worked up, it's only a game!", "", 0],
      ["beschliessen", "to decide", "Wir haben beschlossen, für Lea eine Überraschungsparty zu organisieren.", "We've decided to organise a surprise party for Lea.", "DE: beschließen", 0],
      ["beschreiben", "to describe", "Können Sie mir beschreiben, wie man die neue Waschmaschine bedient?", "Can you describe to me how to operate the new washing machine?", "", 0],
      ["bevor", "before (conjunction)", "Bevor du die Datei löschst, mach lieber eine Sicherungskopie.", "Before you delete the file, you'd better make a backup.", "", 0],
      ["die Datei, -en", "file (computer)", "Ich schicke dir die Datei mit den Ferienfotos per Mail.", "I'll send you the file with the holiday photos by email.", "", 0],
      ["ein·füllen", "to pour in, put in", "Zuerst füllt man das Waschmittel in das kleine Fach oben links ein.", "First you pour the detergent into the little compartment at the top left.", "", 0],
      ["ein·werfen", "to insert (coins); to post (a letter)", "Werfen Sie zuerst zwei Franken ein und drücken Sie dann auf den grünen Knopf.", "First insert two francs and then press the green button.", "", 0],
      ["die Erfindung, -en", "invention", "Die Waschmaschine ist für mich die beste Erfindung aller Zeiten.", "For me the washing machine is the best invention of all time.", "", 0],
      ["erstellen", "to create; to draw up (a list)", "Während die anderen den Kuchen backten, erstellte ich die Gästeliste.", "While the others were baking the cake, I drew up the guest list.", "", 0],
      ["die Festplatte, -n", "hard drive, hard disk", "Meine externe Festplatte ist voll mit alten Fotos.", "My external hard drive is full of old photos.", "", 0],
      ["fort", "away, gone", "Mein Portemonnaie ist fort! Hat es jemand gesehen?", "My wallet is gone! Has anyone seen it?", "", 0],
      ["der Freundeskreis, -e", "circle of friends", "In meinem Freundeskreis spielt fast niemand Videospiele.", "Hardly anyone in my circle of friends plays video games.", "", 0],
      ["das Gehirn, -e", "brain", "Nach acht Stunden am Bildschirm fühlt sich mein Gehirn wie Watte an.", "After eight hours at the screen my brain feels like cotton wool.", "", 0],
      ["der Gott, -¨er (Gott sei Dank!)", "god; Gott sei Dank! = thank God!", "Gott sei Dank hatte ich vorher eine Sicherungskopie gemacht!", "Thank God I had made a backup beforehand!", "", 0],
      ["herrlich", "wonderful, glorious", "Was für ein herrlicher Tag – lass uns an den See gehen!", "What a glorious day – let's go to the lake!", "", 0],
      ["herunter·laden", "to download", "Nachdem ich die SBB-App heruntergeladen hatte, kaufte ich das Billett direkt auf dem Handy.", "After I had downloaded the SBB app, I bought the ticket directly on my phone.", "", 0],
      ["infrage kommen", "to be an option; nicht infrage kommen = to be out of the question", "Ein Fest bei uns zu Hause kommt nicht infrage, die Wohnung ist zu klein.", "A party at our place is out of the question – the flat is too small.", "", 0],
      ["die Installation, -en", "installation", "Die Installation des Programms dauert etwa zehn Minuten.", "The installation of the program takes about ten minutes.", "", 0],
      ["installieren", "to install", "Hast du auf deinem neuen Laptop schon ein Antivirenprogramm installiert?", "Have you installed an antivirus program on your new laptop yet?", "", 0],
      ["irgendwelche", "any, some (or other)", "Hast du noch irgendwelche Fragen zur neuen Software?", "Do you have any more questions about the new software?", "", 0],
      ["irgendwie", "somehow", "Irgendwie müssen wir Lea bis sieben Uhr ablenken.", "Somehow we have to keep Lea distracted until seven o'clock.", "", 0],
      ["klasse", "great, brilliant (colloquial)", "Die Überraschungsparty für Lea war echt klasse!", "The surprise party for Lea was really great!", "", 0],
      ["der Knopf, -¨e", "button; knob", "Drück einfach auf den roten Knopf, dann startet die Maschine.", "Just press the red button and the machine starts.", "", 0],
      ["der Kursleiter, -", "course instructor, course leader", "Der Kursleiter im Computerkurs erklärt alles sehr geduldig.", "The instructor on the computer course explains everything very patiently.", "", 0],
      ["lauter", "nothing but, sheer", "In meinem Ordner sind lauter alte Dateien, die ich nicht mehr brauche.", "My folder contains nothing but old files that I no longer need.", "", 0],
      ["löschen", "to delete; to put out (a fire)", "Lösch bitte keine Dateien, bevor du mich gefragt hast.", "Please don't delete any files before you've asked me.", "", 0],
      ["der Manager, -", "manager", "Der Manager der Band plant jeden Auftritt bis ins letzte Detail.", "The band's manager plans every gig down to the last detail.", "", 0],
      ["das Mitleid (Sg.)", "pity, sympathy", "Ich will kein Mitleid, sondern einen Rat, wie ich meine Schulden abbezahle.", "I don't want pity, I want advice on how to pay off my debts.", "", 0],
      ["der Moderator, -en", "presenter (TV/radio); moderator (forum)", "Der Moderator des Forums hat den beleidigenden Beitrag gelöscht.", "The forum moderator deleted the offensive post.", "", 0],
      ["der Monitor, -e", "monitor, screen", "An meinem Arbeitsplatz habe ich zwei Monitore.", "I have two monitors at my workstation.", "", 0],
      ["das Mountainbike, -s", "mountain bike", "Am Wochenende fahren wir mit dem Mountainbike auf den Uetliberg.", "At the weekend we're riding our mountain bikes up the Uetliberg.", "", 0],
      ["nachdem", "after (conjunction)", "Nachdem sich alle Gäste versteckt hatten, machten wir das Licht aus.", "After all the guests had hidden, we switched off the light.", "", 0],
      ["der Ordner, -", "folder; ring binder", "Ich habe einen neuen Ordner für die Steuerunterlagen erstellt.", "I've created a new folder for the tax documents.", "", 0],
      ["das Passwort, -¨er", "password", "Mein Passwort sollte ich wirklich öfter ändern.", "I really ought to change my password more often.", "", 0],
      ["der Rechner, -", "computer; calculator", "Mein alter Rechner ist so langsam, dass ich einen neuen brauche.", "My old computer is so slow that I need a new one.", "", 0],
      ["der Salon, -s", "salon (e.g. hair salon)", "Sie hat einen kleinen Coiffeursalon in der Altstadt.", "She has a small hair salon in the old town.", "DE: Friseursalon", 0],
      ["sämtlich", "all (the), entire", "Der Virus hat sämtliche Dateien auf meiner Festplatte beschädigt.", "The virus damaged all the files on my hard drive.", "", 0],
      ["die Sicherungskopie, -n", "backup (copy)", "Von wichtigen Dokumenten mache ich jede Woche eine Sicherungskopie.", "I make a backup of important documents every week.", "", 0],
      ["die Speicherkarte, -n", "memory card", "Während der Wanderung war die Speicherkarte meiner Kamera plötzlich voll.", "During the hike the memory card in my camera was suddenly full.", "", 0],
      ["die Spielkonsole, -n", "games console", "Mein Neffe sitzt jeden Abend stundenlang vor der Spielkonsole.", "My nephew sits in front of the games console for hours every evening.", "", 0],
      ["der Standpunkt, -e", "point of view, standpoint", "Ich verstehe deinen Standpunkt, aber ich sehe das anders.", "I understand your point of view, but I see it differently.", "", 0],
      ["süchtig (nach + Dat.)", "addicted (to)", "Im Forum fragt ein Vater, ob sein Sohn süchtig nach Onlinespielen ist.", "In the forum a father asks whether his son is addicted to online games.", "", 0],
      ["der Superstar, -s", "superstar", "Er benimmt sich, als ob er ein Superstar wäre.", "He behaves as if he were a superstar.", "", 0],
      ["das Symbol, -e", "symbol; icon", "Was bedeutet eigentlich dieses kleine Symbol neben der Uhrzeit?", "What does this little icon next to the time actually mean?", "", 0],
      ["tagelang", "for days (on end)", "In den Ferien hat mein Sohn tagelang nur Videospiele gespielt.", "During the holidays my son did nothing but play video games for days.", "", 0],
      ["die Tastatur, -en", "keyboard", "Auf einer Schweizer Tastatur gibt es keine Taste für das scharfe S.", "There's no key for the sharp s (ß) on a Swiss keyboard.", "", 0],
      ["top- (topfit, topmodern …)", "top-, extremely (prefix)", "Nach drei Monaten Training ist meine Mutter wieder topfit.", "After three months of training my mother is in top shape again.", "", 0],
      ["um·benennen", "to rename", "Ich habe den Ordner umbenannt, damit Lea nichts von der Party merkt.", "I renamed the folder so that Lea doesn't notice anything about the party.", "", 0],
      ["der Unsinn (Sg.)", "nonsense", "Das ist doch Unsinn – Computerspiele machen nicht automatisch dumm.", "That's nonsense – computer games don't automatically make you stupid.", "", 0],
      ["unterschreiben", "to sign", "Bitte unterschreiben Sie den Vertrag unten rechts.", "Please sign the contract at the bottom right.", "", 0],
      ["sich verändern", "to change (become different)", "Seit sie in Zürich wohnt, hat sie sich sehr verändert.", "She has changed a lot since she's been living in Zurich.", "", 0],
      ["die Verzeihung (Sg.)", "forgiveness; Verzeihung! = sorry, excuse me", "Verzeihung, können Sie mir zeigen, wie dieser Automat funktioniert?", "Excuse me, can you show me how this machine works?", "", 0],
      ["virtuell", "virtual", "Viele Jugendliche verbringen mehr Zeit in der virtuellen Welt als draussen.", "Many young people spend more time in the virtual world than outdoors.", "DE: draußen", 0],
      ["der Virus, Viren", "virus", "Ich glaube, mein Laptop hat einen Virus.", "I think my laptop has a virus.", "", 0],
      ["der Vorgang, -¨e", "process, procedure", "Wiederholen Sie den Vorgang, bis die grüne Lampe leuchtet.", "Repeat the process until the green light comes on.", "", 0],
      ["vorn", "at the front; von vorn = from the beginning", "Nachdem der Computer abgestürzt war, musste ich wieder von vorn anfangen.", "After the computer had crashed, I had to start again from the beginning.", "", 0],
      ["wieso", "why", "Wieso hast du mir nicht gesagt, dass die Party schon morgen ist?", "Why didn't you tell me the party is already tomorrow?", "", 0],
      ["das WLAN, -s", "Wi-Fi, wireless network", "Kannst du mir bitte das Passwort für euer WLAN geben?", "Can you give me the password for your Wi-Fi, please?", "", 0],
      ["der Wohnblock, -¨e", "block of flats", "Unser Wohnblock hat acht Stockwerke und keinen Lift.", "Our block of flats has eight floors and no lift.", "", 0],
      ["das Natel, -s", "mobile phone (older Swiss word)", "Meine Eltern sagen heute noch Natel statt Handy.", "My parents still say «Natel» instead of «Handy».", "DE: das Handy", 1],
      ["der Billettautomat, -en", "ticket machine", "Am Billettautomaten kann man auch mit Karte bezahlen.", "You can also pay by card at the ticket machine.", "DE: der Fahrkartenautomat", 1],
      ["der Tumbler, -", "tumble dryer", "Diese Pullover dürfen nicht in den Tumbler.", "These jumpers mustn't go in the tumble dryer.", "DE: der Wäschetrockner", 1],
      ["wie wenn (+ Konj. II)", "as if (= als ob)", "Sie schaut mich an, wie wenn ich etwas Falsches gesagt hätte.", "She looks at me as if I had said something wrong.", "DE: meist als ob", 1],
      ["auf·starten", "to start up, boot (a computer)", "Mein alter Laptop braucht fast fünf Minuten zum Aufstarten.", "My old laptop takes almost five minutes to start up.", "DE: hochfahren", 1],
    ] },
    { id: "L10", n: 10, title: "Werbung und Konsum", book: "B1.2", cards: [
      ["ab·stimmen (über + Akk.)", "to vote (on); to coordinate", "Online konnten die Kunden über die neue Teesorte abstimmen.", "Customers were able to vote online on the new tea flavour.", "", 0],
      ["an·stellen", "to switch on; to get up to (mischief)", "Was hast du denn mit meinem Fotoapparat angestellt?", "What on earth have you done to my camera?", "", 0],
      ["die Aprikose, -n", "apricot", "Auf dem Berner Markt kaufte ich ein Kilo Aprikosen aus dem Wallis.", "At the Bern market I bought a kilo of apricots from Valais.", "", 0],
      ["auf·halten", "to hold up, delay; to hold open", "Entschuldigung, ich wurde an der Kasse aufgehalten.", "Sorry, I was held up at the checkout.", "", 0],
      ["ausgezeichnet", "excellent", "Die Testpersonen fanden den neuen Pflaumentee ausgezeichnet.", "The testers thought the new plum tea was excellent.", "", 0],
      ["die Bedingung, -en", "condition", "Ein Umtausch ist nur unter einer Bedingung möglich: Die Ware muss unbenutzt sein.", "An exchange is only possible on one condition: the item must be unused.", "", 0],
      ["der Befehl, -e", "command, order", "Der sprechende Roboter reagiert nur auf einfache Befehle.", "The talking robot only responds to simple commands.", "", 0],
      ["behandeln", "to treat", "Im Laden wurde ich sehr unfreundlich behandelt.", "I was treated very rudely in the shop.", "", 0],
      ["der Beleg, -e", "receipt; proof", "Ohne Beleg können wir Ihnen das Geld leider nicht zurückgeben.", "Without a receipt we unfortunately can't give you your money back.", "", 0],
      ["betonen", "to emphasise, stress", "Die Werbung betont, dass der Tee ganz ohne Zucker ist.", "The advert stresses that the tea contains no sugar at all.", "", 0],
      ["der Dieb, -e", "thief", "Ein Dieb hat mir im Tram das Portemonnaie gestohlen.", "A thief stole my wallet on the tram.", "", 0],
      ["sich drehen", "to turn, rotate; (um) to be about", "Im Werbespot dreht sich alles um ein neues Shampoo.", "In the advert everything revolves around a new shampoo.", "", 0],
      ["einerseits", "on the one hand", "Einerseits ist das Angebot günstig, andererseits brauche ich es gar nicht.", "On the one hand the offer is cheap, on the other hand I don't need it at all.", "", 0],
      ["ein·fallen (+ Dat.)", "to occur to, come to mind", "Mir fällt der Name des Produkts gerade nicht ein.", "I can't think of the name of the product right now.", "", 0],
      ["die Entschädigung, -en", "compensation", "Wegen der Verspätung bekam ich von der SBB eine Entschädigung.", "I got compensation from SBB because of the delay.", "", 0],
      ["entschlossen sein", "to be determined", "Sie ist fest entschlossen, das kaputte Gerät zurückzubringen.", "She is absolutely determined to take the broken device back.", "", 0],
      ["die Entwicklung, -en", "development", "Die Entwicklung eines neuen Produkts dauert oft mehrere Jahre.", "Developing a new product often takes several years.", "", 0],
      ["erfrischend", "refreshing", "Nach dem Joggen am See trinke ich gern einen erfrischenden Eistee.", "After jogging by the lake I like to drink a refreshing iced tea.", "", 0],
      ["das Fahrzeug, -e", "vehicle", "Wegen der Panne blockierte unser Fahrzeug eine Spur der Autobahn.", "Because of the breakdown, our vehicle blocked a lane of the motorway.", "", 0],
      ["die Figur, -en", "figure; character", "Die Kinder lieben die lachende Figur auf der Verpackung.", "The children love the laughing figure on the packaging.", "", 0],
      ["die Forschung, -en", "research", "Die Firma investiert viel Geld in die Forschung.", "The company invests a lot of money in research.", "", 0],
      ["der Fotoapparat, -e", "camera", "Für die Ferien kaufte ich mir einen neuen Fotoapparat.", "I bought myself a new camera for the holidays.", "", 0],
      ["fruchtig", "fruity", "Dieser Tee schmeckt sowohl fruchtig als auch ein bisschen scharf.", "This tea tastes both fruity and a little spicy.", "", 0],
      ["gerecht", "fair, just", "Ich finde es nicht gerecht, dass ich für den Umtausch bezahlen muss.", "I don't think it's fair that I have to pay for the exchange.", "", 0],
      ["das Gesicht, -er", "face", "Als er die Rechnung sah, machte er ein langes Gesicht.", "When he saw the bill, he pulled a long face.", "", 0],
      ["gratis", "free (of charge)", "Manche Leute nehmen alles mit, was gratis ist.", "Some people take everything that's free.", "", 0],
      ["der Griff, -e", "handle; grip", "Der Griff meiner neuen Pfanne ist schon nach einer Woche abgebrochen.", "The handle of my new pan broke off after only a week.", "", 0],
      ["die Handtasche, -n", "handbag", "In ihrer Handtasche findet sie nie, was sie sucht.", "She can never find what she's looking for in her handbag.", "", 0],
      ["das Handtuch, -¨er", "towel", "Vergiss das Handtuch nicht, wir gehen im See schwimmen.", "Don't forget your towel, we're going swimming in the lake.", "", 0],
      ["die Haut, -¨e", "skin", "Diese Creme ist sowohl für trockene als auch für fettige Haut geeignet.", "This cream is suitable for both dry and oily skin.", "", 0],
      ["hinterher", "afterwards; behind", "Erst kaufen, hinterher nachdenken – das ist oft ein Fehler.", "Buy first, think afterwards – that's often a mistake.", "", 0],
      ["hysterisch", "hysterical", "Als die Zahnbürste plötzlich sprach, lachte ich hysterisch.", "When the toothbrush suddenly spoke, I laughed hysterically.", "", 0],
      ["die Jury, -s", "jury, panel of judges", "Die Jury wählte den besten Werbespot des Jahres.", "The jury chose the best advert of the year.", "", 0],
      ["der Kampf, -¨e", "fight, struggle", "Der Kampf gegen den Abfall beginnt schon beim Einkaufen.", "The fight against waste starts when you go shopping.", "", 0],
      ["die Kanalbaugrube, -n", "sewer construction pit", "Ein Velofahrer ist nachts in eine Kanalbaugrube gestürzt.", "A cyclist fell into a sewer construction pit at night.", "", 0],
      ["der Keks, -e", "biscuit", "Diese Kekse mit Schokolade sind leider schon wieder ausverkauft.", "Unfortunately these chocolate biscuits are sold out again.", "", 0],
      ["die Klappe, -n", "flap, lid; (coll.) mouth", "Die Klappe am Automaten klemmt, ich komme nicht an meinen Snack.", "The flap on the vending machine is stuck – I can't get to my snack.", "", 0],
      ["das Kokos (Sg.)", "coconut", "Ich mag weder Kokos noch Marzipan.", "I like neither coconut nor marzipan.", "", 0],
      ["korrigieren", "to correct", "Kannst du bitte meinen Brief an den Kundendienst korrigieren?", "Can you please correct my letter to customer service?", "", 0],
      ["lallen", "to slur (one's words)", "Nach drei Gläsern Wein begann er zu lallen.", "After three glasses of wine he started to slur his words.", "", 0],
      ["lauschen (+ Dat.)", "to listen (intently); to eavesdrop", "Die Kinder lauschten gespannt der Geschichte ihrer Lehrerin.", "The children listened intently to their teacher's story.", "", 0],
      ["leuchten", "to shine, glow", "Die leuchtenden Werbeplakate am Bahnhof sieht man schon von Weitem.", "You can see the glowing billboards at the station from far away.", "", 0],
      ["die Lieferung, -en", "delivery", "Die Lieferung kam drei Tage zu spät und war beschädigt.", "The delivery arrived three days late and was damaged.", "", 0],
      ["die Limonade, -n", "lemonade; soft drink", "Selbst gemachte Limonade mit Zitrone und Minze ist im Sommer wunderbar.", "Homemade lemonade with lemon and mint is wonderful in summer.", "", 0],
      ["live", "live", "Das Fussballspiel wird live im Fernsehen übertragen.", "The football match is being broadcast live on TV.", "DE: Fußballspiel", 0],
      ["das/der Marzipan, -e", "marzipan", "In der Konditorei gibt es kleine Schweinchen aus Marzipan.", "The confectioner's sells little marzipan pigs.", "", 0],
      ["das Missgeschick, -e", "mishap", "Im Büro erzählten alle von ihren lustigsten Missgeschicken.", "In the office everyone told stories about their funniest mishaps.", "", 0],
      ["der Nachteil, -e", "disadvantage", "Der einzige Nachteil des Geräts ist der hohe Preis.", "The only disadvantage of the device is the high price.", "", 0],
      ["neon- (neongrün …)", "neon (colour) (prefix)", "Die neongrüne Verpackung fällt im Regal sofort auf.", "The neon-green packaging stands out on the shelf straight away.", "", 0],
      ["neulich", "recently, the other day", "Neulich ist mir im Coop eine Flasche Öl aus der Hand gefallen.", "The other day a bottle of oil slipped out of my hand at Coop.", "", 0],
      ["die Pflaume, -n", "plum", "Aus den Pflaumen im Garten macht meine Mutter Konfitüre.", "My mother makes jam from the plums in the garden.", "CH: oft die Zwetschge", 0],
      ["posten", "to post (online)", "Sie hat ein Foto ihres verbrannten Kuchens auf Instagram gepostet.", "She posted a photo of her burnt cake on Instagram.", "", 0],
      ["das Projekt, -e", "project", "In unserem Projekt dürfen die Kunden neue Sorten selbst erfinden.", "In our project, customers get to invent new flavours themselves.", "", 0],
      ["die Redaktion, -en", "editorial team; editorial office", "Schreiben Sie der Redaktion, was Sie von unserem Test halten.", "Write to the editors and tell them what you think of our test.", "", 0],
      ["reinigen", "to clean", "Die Zahnbürste reinigt sich nach jedem Gebrauch selbst.", "The toothbrush cleans itself after every use.", "", 0],
      ["der Rest, -e", "rest, remainder", "Den Rest der Pizza essen wir morgen.", "We'll eat the rest of the pizza tomorrow.", "", 0],
      ["roboterhaft", "robotic, robot-like", "Die Stimme der Zahnbürste klang seltsam roboterhaft.", "The toothbrush's voice sounded strangely robotic.", "", 0],
      ["rutschen", "to slip, slide", "Meine neue Brille rutscht mir ständig von der Nase.", "My new glasses keep slipping down my nose.", "", 0],
      ["schalten", "to switch (e.g. channels); to change gear", "Bei jeder Werbung schaltet mein Mann auf einen anderen Sender.", "Whenever the adverts come on, my husband switches to another channel.", "", 0],
      ["der Schalter, -", "switch; (ticket) counter", "Am SBB-Schalter kann man auch Geld wechseln.", "You can also change money at the SBB counter.", "", 0],
      ["schauen", "to look; to watch", "Schau mal, die Zahnbürste blinkt rot!", "Look, the toothbrush is flashing red!", "", 0],
      ["schief", "crooked, lopsided; (schiefgehen) to go wrong", "Beim Aufbau des Regals ging alles schief, was schiefgehen konnte.", "When putting up the shelf, everything that could go wrong did.", "", 0],
      ["schlagen", "to hit; to beat", "Im Test hat die günstige Marke die teure klar geschlagen.", "In the test the cheap brand clearly beat the expensive one.", "", 0],
      ["Schlange stehen", "to queue", "Für das neue Handy standen die Leute stundenlang Schlange.", "People queued for hours for the new mobile phone.", "", 0],
      ["die Schraube, -n", "screw", "Ohne die fehlende Schraube kann ich den Tisch nicht zusammenbauen.", "I can't assemble the table without the missing screw.", "", 0],
      ["der Schraubenzieher, -", "screwdriver", "Hast du einen Schraubenzieher? Der Türgriff ist schon wieder locker.", "Have you got a screwdriver? The door handle is loose again.", "", 0],
      ["schrumpfen", "to shrink", "Meine Lieblingsjeans ist beim Waschen geschrumpft.", "My favourite jeans shrank in the wash.", "", 0],
      ["schütteln", "to shake", "Vor dem Öffnen die Flasche gut schütteln!", "Shake the bottle well before opening!", "", 0],
      ["schweigen", "to be silent, say nothing", "Zu meiner Beschwerde schweigt die Firma bis heute.", "To this day the company has said nothing about my complaint.", "", 0],
      ["der Sesam (Sg.)", "sesame", "Die Cracker mit Sesam sind weder zu salzig noch zu trocken.", "The sesame crackers are neither too salty nor too dry.", "", 0],
      ["der Sieger, -", "winner", "Der Sieger des Wettbewerbs gewinnt einen Jahresvorrat Schokolade.", "The winner of the competition wins a year's supply of chocolate.", "", 0],
      ["der Snack, -s", "snack", "Am Kiosk, wo ich jeden Morgen die Zeitung kaufe, gibt es auch Snacks.", "The kiosk where I buy the newspaper every morning also sells snacks.", "", 0],
      ["sommersprossig", "freckled", "Das sommersprossige Mädchen im Werbespot lacht fröhlich in die Kamera.", "The freckled girl in the advert laughs cheerfully into the camera.", "", 0],
      ["sowohl … als auch", "both … and; as well as", "Das Angebot gilt sowohl in der Filiale als auch online.", "The offer is valid both in store and online.", "", 0],
      ["stets", "always (formal)", "Unser Kundendienst ist stets für Sie da.", "Our customer service is always there for you.", "", 0],
      ["strahlen", "to shine, beam", "Mit der neuen Zahnpasta strahlen Ihre Zähne wie nie zuvor.", "With the new toothpaste your teeth will shine like never before.", "", 0],
      ["streichen", "to paint; to spread; to cancel", "Am Wochenende streichen wir die Küche neu.", "At the weekend we're repainting the kitchen.", "", 0],
      ["der Teufel, -", "devil", "Wie es der Teufel will, war der Akku im falschen Moment leer.", "As bad luck would have it, the battery died at the wrong moment.", "", 0],
      ["der Umtausch, -e", "exchange (of goods)", "Der Umtausch ist innerhalb von 30 Tagen möglich.", "Exchanges are possible within 30 days.", "", 0],
      ["die Vanille (Sg.)", "vanilla", "Ich nehme eine Kugel Vanille und eine Kugel Schokolade.", "I'll have one scoop of vanilla and one scoop of chocolate.", "", 0],
      ["verärgern", "to annoy, anger", "Der schlechte Service hat viele Kunden verärgert.", "The poor service annoyed a lot of customers.", "", 0],
      ["verbieten", "to forbid, ban", "Als Kind haben mir meine Eltern Süssigkeiten vor dem Essen verboten.", "When I was a child, my parents didn't allow me sweets before meals.", "DE: Süßigkeiten", 0],
      ["der Verbraucher, -", "consumer", "Viele Verbraucher achten beim Einkaufen vor allem auf den Preis.", "When shopping, many consumers pay attention above all to the price.", "CH: oft der Konsument", 0],
      ["verkehrt", "wrong; the wrong way round", "Du hast den Pullover verkehrt herum angezogen!", "You've put your jumper on the wrong way round!", "", 0],
      ["verschliessen", "to close, seal; to lock", "Bitte verschliessen Sie die Packung nach dem Gebrauch gut.", "Please seal the pack well after use.", "DE: verschließen", 0],
      ["der/die Verschüttete, -n", "person buried (e.g. by an avalanche)", "Die Rettungshunde fanden den Verschütteten nach einer Stunde im Schnee.", "The rescue dogs found the buried man in the snow after an hour.", "", 0],
      ["die Vollmilch (Sg.)", "whole milk", "Diese Schokolade wird mit Schweizer Vollmilch hergestellt.", "This chocolate is made with Swiss whole milk.", "", 0],
      ["voran·kommen", "to make progress", "Mit dem Projekt kommen wir leider nur langsam voran.", "Unfortunately we're only making slow progress with the project.", "", 0],
      ["vorig- (vorige Woche …)", "last, previous", "Vorige Woche habe ich eine Beschwerde an die Firma geschrieben.", "Last week I wrote a complaint to the company.", "", 0],
      ["wachsen", "to grow", "Auf unserem Balkon wachsen Tomaten und Kräuter.", "Tomatoes and herbs are growing on our balcony.", "", 0],
      ["wanken", "to stagger, totter; to sway", "Nach dem Firmenfest wankte er spät in der Nacht nach Hause.", "After the office party he staggered home late at night.", "", 0],
      ["weder … noch", "neither … nor", "Ich habe weder die Quittung noch die Originalverpackung.", "I have neither the receipt nor the original packaging.", "", 0],
      ["weg·werfen", "to throw away", "Wirf den Beleg nicht weg, du brauchst ihn vielleicht noch.", "Don't throw the receipt away – you might still need it.", "", 0],
      ["sich wehren (gegen + Akk.)", "to defend oneself; to fight back", "Gegen die unfaire Rechnung habe ich mich gewehrt.", "I fought back against the unfair bill.", "", 0],
      ["weiter·machen", "to carry on, continue", "Nach der kurzen Pause machen wir mit dem Test weiter.", "After the short break we'll carry on with the test.", "", 0],
      ["die Wellness (Sg.)", "wellness, spa treatments", "Zum Geburtstag schenke ich meiner Mutter ein Wellness-Wochenende in Graubünden.", "For her birthday I'm giving my mother a spa weekend in Graubünden.", "", 0],
      ["winzig", "tiny", "Das Kleingedruckte auf der Verpackung ist winzig.", "The small print on the packaging is tiny.", "", 0],
      ["wischen", "to wipe; (CH also) to sweep", "Er wischte den verschütteten Kaffee schnell mit einem Lappen vom Tisch.", "He quickly wiped the spilt coffee off the table with a cloth.", "", 0],
      ["wohltuend", "soothing, pleasant", "Ein Kräutertee mit Honig ist bei Halsschmerzen sehr wohltuend.", "Herbal tea with honey is very soothing when you have a sore throat.", "", 0],
      ["das Zelt, -e", "tent", "Wir stellten das Zelt dort auf, wo es keinen Wind gab.", "We put up the tent where there was no wind.", "", 0],
      ["der Zimt (Sg.)", "cinnamon", "Der Apfelkuchen schmeckt mit etwas Zimt noch besser.", "The apple cake tastes even better with a little cinnamon.", "", 0],
      ["die Aktion, -en", "special offer", "Diese Woche ist der Kaffee in der Migros in Aktion.", "This week the coffee at Migros is on special offer.", "DE: das Sonderangebot", 1],
      ["das Guetzli, -", "biscuit", "Vor Weihnachten backen wir jedes Jahr viele verschiedene Guetzli.", "Every year before Christmas we bake lots of different biscuits.", "DE: der Keks, das Plätzchen", 1],
      ["das Rüebli, -", "carrot", "Als gesunden Snack gebe ich den Kindern Rüebli mit.", "I give the children carrots to take along as a healthy snack.", "DE: die Karotte, die Möhre", 1],
      ["der Rahm (Sg.)", "cream", "Zum Dessert gibt es Meringues mit Rahm.", "For dessert there are meringues with cream.", "DE: die Sahne", 1],
    ] },
    { id: "L11", n: 11, title: "Miteinander", book: "B1.2", cards: [
      ["absolut", "absolute(ly), totally", "Pünktlichkeit ist für meinen Chef absolut wichtig.", "Punctuality is absolutely essential to my boss.", "", 0],
      ["die Anzahl (Sg.)", "number, quantity", "Die Anzahl der Velofahrer in Zürich wird wohl weiter steigen.", "The number of cyclists in Zürich will probably keep rising.", "", 0],
      ["an·zeigen", "to report (to the police); to display", "Der Bauer hat den Dieb bei der Polizei angezeigt.", "The farmer reported the thief to the police.", "", 0],
      ["die Aufforderung, -en", "request, demand; instruction", "Trotz der Aufforderung der Polizistin fuhr er einfach weiter.", "Despite the police officer's request, he simply drove on.", "", 0],
      ["auf·geben", "to give up; to post (a parcel)", "Ich verspreche dir, ich werde im neuen Jahr das Rauchen aufgeben.", "I promise you I'll give up smoking in the new year.", "", 0],
      ["die Ausnahme, -n", "exception", "Normalerweise bin ich pünktlich, heute ist eine Ausnahme.", "I'm usually punctual; today is an exception.", "", 0],
      ["der Autor, -en", "author", "Der Autor des Artikels lebt seit zehn Jahren als Ausländer in Bern.", "The author of the article has been living in Bern as a foreigner for ten years.", "", 0],
      ["behaupten", "to claim, maintain", "Er behauptet, dass er bei Grün über die Strasse gegangen ist.", "He claims he crossed the road when the light was green.", "DE: Straße", 0],
      ["behindern", "to obstruct, hinder", "Das falsch parkierte Auto behindert den ganzen Verkehr.", "The badly parked car is holding up all the traffic.", "", 0],
      ["beleidigen", "to insult, offend", "Der Autofahrer hat den Velofahrer laut beleidigt.", "The driver loudly insulted the cyclist.", "", 0],
      ["sich bemühen", "to make an effort, try hard", "Ich werde mich bemühen, nächstes Mal pünktlicher zu sein.", "I'll try hard to be more punctual next time.", "", 0],
      ["bereit", "ready; willing", "Er war nicht bereit, die Busse zu bezahlen.", "He wasn't willing to pay the fine.", "DE: Strafe", 0],
      ["bestrafen", "to punish", "Wer bei Rot über die Kreuzung fährt, wird bestraft.", "Anyone who drives through the junction on red gets punished.", "", 0],
      ["betrügen", "to cheat, deceive", "Wer einen Kürbis nimmt, ohne zu bezahlen, betrügt den Bauern.", "Anyone who takes a pumpkin without paying is cheating the farmer.", "", 0],
      ["beweisen", "to prove", "Können Sie beweisen, dass Sie das Billett bezahlt haben?", "Can you prove that you paid for the ticket?", "DE: Fahrkarte", 0],
      ["eilig", "hurried, urgent; es eilig haben: to be in a hurry", "Entschuldigung, ich habe es sehr eilig, da mein Zug gleich fährt.", "Sorry, I'm in a real hurry as my train is about to leave.", "", 0],
      ["eindeutig", "clear, unambiguous; clearly", "Das Video zeigt eindeutig, wer den Unfall verursacht hat.", "The video clearly shows who caused the accident.", "", 0],
      ["ein·treffen", "to arrive", "Die Gäste werden gegen acht Uhr eintreffen.", "The guests will arrive at around eight.", "", 0],
      ["endgültig", "final; for good", "Ist das jetzt deine endgültige Entscheidung?", "Is that your final decision now?", "", 0],
      ["entwaffnend", "disarming", "Sie entschuldigte sich mit einem entwaffnenden Lächeln.", "She apologised with a disarming smile.", "", 0],
      ["die Erbse, -n", "pea", "Als Gast habe ich die Erbsen gegessen, obwohl ich sie nicht mag.", "As a guest I ate the peas, although I don't like them.", "", 0],
      ["fest", "firm, fixed; solid", "Bei uns gibt es eine feste Regel: Beim Essen bleibt das Handy weg.", "We have a firm rule at home: no mobile phones during meals.", "", 0],
      ["filmen", "to film", "Ein Passant hat den Unfall mit dem Handy gefilmt.", "A passer-by filmed the accident on his phone.", "", 0],
      ["die Flöte, -n", "flute; recorder", "An der Basler Fasnacht hört man überall Flöten und Trommeln.", "At the Basel carnival you hear flutes and drums everywhere.", "", 0],
      ["die Flucht, -en", "escape, flight", "Nach dem Unfall ergriff der Fahrer die Flucht.", "After the accident, the driver fled.", "", 0],
      ["das Gebiet, -e", "area, region", "Morgen wird es im Gebiet um den Zürichsee schneien.", "Tomorrow it will snow in the area around Lake Zürich.", "", 0],
      ["gediegen", "tasteful, elegant; high-quality", "Das Restaurant ist sehr gediegen; Jeans und Turnschuhe passen dort nicht hin.", "The restaurant is very refined; jeans and trainers don't fit in there.", "", 0],
      ["die Generation, -en", "generation", "Bei uns leben drei Generationen unter einem Dach.", "Three generations live under one roof in our house.", "", 0],
      ["geografisch", "geographical(ly)", "Geografisch liegt die Schweiz mitten in Europa.", "Geographically, Switzerland lies in the middle of Europe.", "", 0],
      ["der Geruch, -¨e", "smell", "Der Geruch vom Fondue wird noch tagelang in der Wohnung hängen.", "The smell of the fondue will linger in the flat for days.", "", 0],
      ["der Geschmack, -¨e", "taste, flavour", "Der Geschmack von Zimtsternen erinnert mich an Weihnachten.", "The taste of cinnamon stars reminds me of Christmas.", "", 0],
      ["die Geschwindigkeitsbeschränkung, -en", "speed limit", "Vor dieser Schule gilt eine Geschwindigkeitsbeschränkung von 30 km/h.", "There's a 30 km/h speed limit outside this school.", "", 0],
      ["grenzen an (+ Akk.)", "to border (on)", "Die Schweiz grenzt an fünf Länder.", "Switzerland borders five countries.", "", 0],
      ["grossartig", "great, magnificent", "Das Feuerwerk an Silvester war grossartig.", "The fireworks on New Year's Eve were magnificent.", "DE: großartig", 0],
      ["der Hauptbahnhof, -¨e", "main (railway) station", "Wir treffen uns um 18 Uhr beim Hauptbahnhof.", "We're meeting at the main station at 6 pm.", "", 0],
      ["die Hektik (Sg.)", "hectic rush, frantic hurry", "In der Hektik habe ich mein Portemonnaie im Zug liegen lassen.", "In all the rush I left my wallet on the train.", "", 0],
      ["das Herkunftsland, -¨er", "country of origin, home country", "In meinem Herkunftsland kommt man zu Einladungen oft etwas später.", "In my home country people often arrive a bit late when invited.", "", 0],
      ["hilfreich", "helpful", "Deine Tipps für das Leben in der Schweiz waren sehr hilfreich.", "Your tips for living in Switzerland were very helpful.", "", 0],
      ["illegal", "illegal(ly)", "Er hat illegal auf dem Behindertenparkplatz parkiert.", "He parked illegally in the disabled parking space.", "", 0],
      ["das Instrument, -e", "instrument", "Mein Sohn möchte unbedingt ein Instrument lernen.", "My son really wants to learn an instrument.", "", 0],
      ["der Kasten, -¨", "box, case; (CH) cupboard", "Das Geld für die Kürbisse wirft man einfach in den kleinen Kasten.", "You just drop the money for the pumpkins into the little box.", "", 0],
      ["kulturell", "cultural(ly)", "Zwischen der Deutschschweiz und der Romandie gibt es einige kulturelle Unterschiede.", "There are some cultural differences between German-speaking and French-speaking Switzerland.", "", 0],
      ["der Kürbis, -se", "pumpkin", "Im Herbst verkaufen viele Bauern Kürbisse am Strassenrand.", "In autumn many farmers sell pumpkins at the roadside.", "DE: Straßenrand", 0],
      ["leichtfertig", "careless, reckless", "Es ist leichtfertig, bei diesem Schneefall mit Sommerreifen zu fahren.", "It's reckless to drive on summer tyres in this snowfall.", "", 0],
      ["loben", "to praise", "Als Gast sollte man das Essen loben.", "As a guest you should praise the food.", "", 0],
      ["minutenlang", "for minutes (on end)", "Der Autofahrer hupte minutenlang, weil der Bus nicht weiterfuhr.", "The driver honked for minutes on end because the bus wasn't moving.", "", 0],
      ["das Missverständnis, -se", "misunderstanding", "Das war nur ein Missverständnis, ich wollte dich nicht beleidigen.", "That was just a misunderstanding; I didn't mean to offend you.", "", 0],
      ["missverstehen", "to misunderstand", "Ich glaube, du hast mich missverstanden.", "I think you misunderstood me.", "", 0],
      ["das Mitbringsel, -", "small gift (for a host); souvenir", "Als Mitbringsel für die Gastgeber habe ich Pralinen gekauft.", "I bought chocolates as a little gift for the hosts.", "", 0],
      ["neugierig", "curious; nosy", "Unsere Nachbarin ist sehr neugierig und schaut immer aus dem Fenster.", "Our neighbour is very nosy and is always looking out of the window.", "", 0],
      ["notwendig", "necessary", "Ist es notwendig, die Schuhe auszuziehen, wenn man zu Besuch ist?", "Is it necessary to take your shoes off when you're visiting someone?", "", 0],
      ["die Ortschaft, -en", "village, small town", "Die nächste Ortschaft liegt etwa zehn Kilometer entfernt.", "The next village is about ten kilometres away.", "", 0],
      ["das Plakat, -e", "poster", "Überall in der Stadt hängen Plakate für das Konzert.", "There are posters for the concert all over town.", "", 0],
      ["die Politesse, -n", "(female) traffic warden", "Die Politesse hat ihm eine Busse unter den Scheibenwischer gesteckt.", "The traffic warden put a fine under his windscreen wiper.", "DE: Strafzettel", 0],
      ["präzise", "precise(ly), exact(ly)", "Kannst du mir präzise sagen, wann du ankommst?", "Can you tell me exactly when you'll arrive?", "", 0],
      ["die Prozession, -en", "procession", "An Fronleichnam gibt es in katholischen Dörfern oft eine Prozession.", "On Corpus Christi there's often a procession in Catholic villages.", "", 0],
      ["realistisch", "realistic(ally)", "Sei realistisch: Du wirst nicht jeden Tag joggen gehen.", "Be realistic: you're not going to go jogging every day.", "", 0],
      ["der Reim, -e", "rhyme", "Für den Samichlaus lernen die Kinder einen kurzen Reim auswendig.", "For St Nicholas, the children learn a short rhyme by heart.", "DE: Nikolaus", 0],
      ["die Runde, -n", "round (of drinks); lap; group", "Ich gebe heute eine Runde aus, da ich Geburtstag habe.", "I'm buying a round today since it's my birthday.", "", 0],
      ["der Schneefall, -¨e", "snowfall", "Wegen des starken Schneefalls hatte unser Zug eine Stunde Verspätung.", "Because of the heavy snowfall our train was an hour late.", "", 0],
      ["schüchtern", "shy", "Unser Sohn ist schüchtern, aber er wird sich bald an die Klasse gewöhnen.", "Our son is shy, but he'll soon get used to the class.", "", 0],
      ["der Speisewagen, -", "dining car", "Wo ist Papa? – Er wird wohl im Speisewagen sitzen.", "Where's Dad? – He's probably sitting in the dining car.", "", 0],
      ["stehlen", "to steal", "Jemand hat das ganze Geld aus der Kasse am Kürbisstand gestohlen.", "Someone stole all the money from the cash box at the pumpkin stand.", "", 0],
      ["das Telefonat, -e", "phone call", "Ich bin spät dran, da das Telefonat mit meinem Chef so lange gedauert hat.", "I'm running late because the phone call with my boss went on so long.", "", 0],
      ["der Tropfen, -", "drop", "Auf der ganzen Wanderung fiel kein einziger Tropfen Regen.", "Not a single drop of rain fell during the whole hike.", "", 0],
      ["überqueren", "to cross", "Die Kinder überqueren die Kreuzung nur bei Grün.", "The children only cross the junction when the light is green.", "", 0],
      ["unerträglich", "unbearable", "Die Hitze im Tram war heute unerträglich.", "The heat in the tram was unbearable today.", "DE: in der Straßenbahn", 0],
      ["die Unmenge, -n", "huge amount, masses", "Zum Apéro gab es eine Unmenge an Häppchen.", "There were masses of nibbles at the apéro.", "", 0],
      ["verdrücken", "to polish off, scoff (food)", "Die Kinder haben den ganzen Kuchen in zehn Minuten verdrückt.", "The children polished off the whole cake in ten minutes.", "", 0],
      ["vergeuden", "to waste", "Ich will meine Zeit nicht im Stau vergeuden.", "I don't want to waste my time sitting in traffic jams.", "", 0],
      ["sich verhalten", "to behave", "Wie verhält man sich richtig, wenn man bei Schweizern eingeladen ist?", "How should you behave when you're invited to a Swiss home?", "", 0],
      ["sich verspäten", "to be late, be delayed", "Entschuldige, ich werde mich etwas verspäten, da der Bus im Stau steht.", "Sorry, I'll be a bit late as the bus is stuck in traffic.", "", 0],
      ["verständlich", "understandable; comprehensible", "Deine Wut ist verständlich, aber bitte bleib ruhig.", "Your anger is understandable, but please stay calm.", "", 0],
      ["das Vertrauen (Sg.)", "trust", "Der Kürbisstand ohne Verkäufer funktioniert nur mit Vertrauen.", "The unstaffed pumpkin stand only works on trust.", "", 0],
      ["voraus·sagen", "to predict, forecast", "Die Meteorologen sagen für nächste Woche viel Regen voraus.", "The meteorologists are predicting lots of rain for next week.", "", 0],
      ["die Vorhersage, -n", "forecast, prediction", "Laut Vorhersage wird es am Samstag sonnig und warm.", "According to the forecast, Saturday will be sunny and warm.", "", 0],
      ["vor·kommen", "to happen, occur; to seem", "So etwas kommt bei uns zum Glück selten vor.", "Luckily, that kind of thing rarely happens here.", "", 0],
      ["sich (Dat.) vor·nehmen", "to resolve, plan (to do sth.)", "Für das neue Jahr habe ich mir vorgenommen, mehr Deutsch zu sprechen.", "For the new year I've resolved to speak more German.", "", 0],
      ["der Vorsatz, -¨e", "resolution, intention", "Wie lange wirst du deinen guten Vorsatz durchhalten?", "How long will you stick to your good resolution?", "", 0],
      ["weg·gehen", "to go away, leave", "Ohne sich zu verabschieden, ist er einfach weggegangen.", "He just left without saying goodbye.", "", 0],
      ["sich weigern", "to refuse", "Der Fahrer weigerte sich, seinen Führerausweis zu zeigen.", "The driver refused to show his driving licence.", "DE: Führerschein", 0],
      ["zählen", "to count", "Am Abend zählt der Bauer das Geld im Kasten.", "In the evening the farmer counts the money in the box.", "", 0],
      ["zaubern", "to do magic; to conjure up", "Aus ein paar Resten hat sie ein tolles Essen gezaubert.", "She conjured up a great meal from a few leftovers.", "", 0],
      ["zerstören", "to destroy", "Der Hagel hat die ganze Kürbisernte zerstört.", "The hail destroyed the entire pumpkin harvest.", "", 0],
      ["zu·schauen", "to watch, look on", "Viele Leute schauten nur zu, statt zu helfen.", "Many people just stood and watched instead of helping.", "", 0],
      ["das Trottoir, -s", "pavement", "Velos haben auf dem Trottoir nichts zu suchen.", "Bikes have no business on the pavement.", "DE: der Bürgersteig", 1],
      ["der Fussgängerstreifen, -", "zebra crossing", "Warte am Fussgängerstreifen, bis die Autos anhalten.", "Wait at the zebra crossing until the cars stop.", "DE: der Zebrastreifen", 1],
      ["die Busse, -n", "fine (penalty)", "Er hat eine Busse bekommen, da er zu schnell gefahren ist.", "He got a fine because he was speeding.", "DE: das Bußgeld", 1],
      ["der Vortritt (Sg.)", "right of way", "An dieser Kreuzung hat der Verkehr von rechts Vortritt.", "At this junction, traffic from the right has right of way.", "DE: die Vorfahrt", 1],
      ["das Lichtsignal, -e", "traffic light", "Beim nächsten Lichtsignal musst du links abbiegen.", "You need to turn left at the next traffic lights.", "DE: die Ampel", 1],
      ["die Ferien (Pl.)", "holiday(s), vacation", "Nächsten Sommer werden wir die Ferien im Tessin verbringen.", "Next summer we'll spend our holidays in Ticino.", "DE: der Urlaub", 1],
    ] },
    { id: "L12", n: 12, title: "Soziales Engagement", book: "B1.2", cards: [
      ["auf·führen", "to perform, put on (a play)", "Am Ende des Ferienprogramms führen die Kinder ein Theaterstück auf.", "At the end of the holiday programme the children put on a play.", "", 0],
      ["das Altersheim, -e", "old people's home, care home", "Seit Frau Huber im Altersheim wohnt, bekommt sie jede Woche Besuch von einer Freiwilligen.", "Since Mrs Huber has been living in the care home, a volunteer has visited her every week.", "DE: das Altenheim", 0],
      ["der Augenblick, -e", "moment", "In diesem Augenblick wusste ich: Ich will anderen Menschen helfen.", "At that moment I knew: I want to help other people.", "", 0],
      ["der Austausch, -e", "exchange", "Das Projekt fördert den Austausch zwischen Jung und Alt.", "The project promotes exchange between young and old.", "", 0],
      ["der Babysitter, -", "babysitter", "Bis der Babysitter kommt, können wir nicht losgehen.", "We can't leave until the babysitter arrives.", "", 0],
      ["der/die Bedürftige, -n", "person in need", "Bedürftige können hier günstig Kleider und Möbel kaufen.", "People in need can buy clothes and furniture cheaply here.", "", 0],
      ["beinahe", "almost, nearly", "Beinahe hätte ich das Geschenk weiterverschenkt, ohne die Karte herauszunehmen.", "I almost passed the present on without taking the card out.", "", 0],
      ["beständig", "constant, steady; lasting", "Seit Jahren unterstützt sie den Verein beständig mit kleinen Spenden.", "She has been steadily supporting the association with small donations for years.", "", 0],
      ["die Betreuung, -en", "care, looking after (people)", "In den Herbstferien bietet die Gemeinde eine Betreuung für Schulkinder an.", "During the autumn holidays the municipality offers care for schoolchildren.", "", 0],
      ["die Biene, -n", "bee", "Auf dem Dach des Gemeinschaftszentrums halten Freiwillige seit zwei Jahren Bienen.", "Volunteers have been keeping bees on the roof of the community centre for two years.", "", 0],
      ["bilden", "to form; to educate", "Die Eltern haben eine Gruppe gebildet, um den Spielplatz zu renovieren.", "The parents formed a group to renovate the playground.", "", 0],
      ["die Bürgerinitiative, -n", "citizens' action group", "Die Bürgerinitiative sammelt Unterschriften für mehr Velowege.", "The citizens' action group is collecting signatures for more cycle paths.", "", 0],
      ["der Dienst, -e", "service; duty, shift", "Mein Dienst bei der Lebensmittelabgabe beginnt um acht Uhr.", "My shift at the food distribution starts at eight o'clock.", "", 0],
      ["egoistisch", "selfish", "Ist es egoistisch, das Geschenk meiner Tante umzutauschen, ohne dass sie es weiss?", "Is it selfish to exchange my aunt's present without her knowing?", "DE: weiß", 0],
      ["die Einrichtung, -en", "institution, facility; furnishings", "In der Region gibt es mehrere Einrichtungen für Menschen mit Behinderung.", "There are several facilities for people with disabilities in the region.", "", 0],
      ["ein·setzen", "to use, deploy; (sich ~ für) to stand up for", "Der Verein setzt die Spenden direkt für die Kinder ein.", "The association uses the donations directly for the children.", "", 0],
      ["ein·treten", "to join (a club); to enter", "Seitdem ich in den Chor eingetreten bin, kenne ich viel mehr Leute im Dorf.", "Since joining the choir, I've got to know far more people in the village.", "", 0],
      ["sich engagieren (für + Akk.)", "to get involved (in), be committed (to)", "Mein Bruder engagiert sich ehrenamtlich für Kinder aus armen Familien.", "My brother does volunteer work for children from poor families.", "", 0],
      ["die Feuerwehr, -en", "fire brigade", "In vielen Dörfern besteht die Feuerwehr aus Freiwilligen.", "In many villages the fire brigade is made up of volunteers.", "", 0],
      ["frisieren", "to do someone's hair", "Vor dem Fest frisiert eine Freiwillige die Bewohnerinnen des Pflegeheims.", "Before the party a volunteer does the hair of the women living in the nursing home.", "", 0],
      ["die Geduld (Sg.)", "patience", "Für die Arbeit mit kleinen Kindern braucht man viel Geduld.", "You need a lot of patience to work with small children.", "", 0],
      ["der/die Geflüchtete, -n", "refugee", "Jeden Mittwoch üben wir mit Geflüchteten Deutsch, indem wir zusammen kochen.", "Every Wednesday we practise German with refugees by cooking together.", "", 0],
      ["gegenseitig", "mutual; each other", "In unserem Quartier helfen wir uns gegenseitig, zum Beispiel beim Einkaufen.", "In our neighbourhood we help each other out, for example with the shopping.", "DE: Viertel", 0],
      ["gemeinnützig", "non-profit, charitable", "Die Stiftung ist gemeinnützig und finanziert sich nur durch Spenden.", "The foundation is non-profit and is funded only by donations.", "", 0],
      ["die Gesellschaft, -en", "society; company", "Freiwillige leisten einen wichtigen Beitrag für die Gesellschaft.", "Volunteers make an important contribution to society.", "", 0],
      ["das Gewissen (Sg.)", "conscience", "Ich habe ein schlechtes Gewissen, weil ich ihr Geschenk nie benutze.", "I have a guilty conscience because I never use her present.", "", 0],
      ["heimlich", "secret(ly)", "Jemand hat heimlich 500 Franken in die Vereinskasse gelegt.", "Someone secretly put 500 francs in the association's cash box.", "", 0],
      ["hin·weisen (auf + Akk.)", "to point out, draw attention to", "Die Leiterin wies uns darauf hin, dass wir die Kinder nicht fotografieren dürfen.", "The leader pointed out to us that we're not allowed to photograph the children.", "", 0],
      ["die Integration, -en", "integration", "Sport im Verein kann bei der Integration sehr helfen.", "Sport in a club can really help with integration.", "", 0],
      ["investieren", "to invest", "Seit sie im Verein ist, investiert sie viel Zeit in die Jugendarbeit.", "Since she joined the association, she has been investing a lot of time in youth work.", "", 0],
      ["jahrzehntelang", "for decades", "Jahrzehntelang hat er als Trainer im Fussballclub gearbeitet, ohne einen Franken zu verdienen.", "For decades he worked as a coach at the football club without earning a single franc.", "DE: Fußballclub", 0],
      ["die Jugend (Sg.)", "youth; young people", "Die Jugend von heute ist engagierter, als viele denken.", "Young people today are more committed than many people think.", "", 0],
      ["die Kälte (Sg.)", "cold, coldness", "Wegen der Kälte bleibt die Notunterkunft heute auch tagsüber offen.", "Because of the cold, the emergency shelter is staying open during the day today too.", "", 0],
      ["klettern", "to climb", "Bis die Feuerwehr kam, war die Katze schon allein vom Baum heruntergeklettert.", "By the time the fire brigade arrived, the cat had already climbed down from the tree by itself.", "", 0],
      ["die Klinik, -en", "clinic, hospital", "In der Klinik besuchen Freiwillige Patienten, die keine Angehörigen haben.", "At the clinic volunteers visit patients who have no relatives.", "", 0],
      ["der Kreis, -e", "circle; district (Zurich)", "Zu Beginn setzen sich alle Kinder in einen Kreis und erzählen von ihren Ferien.", "At the start all the children sit in a circle and talk about their holidays.", "", 0],
      ["der Kuckuck, -e", "cuckoo", "Im Wald hörten wir den ganzen Morgen einen Kuckuck rufen.", "We heard a cuckoo calling in the forest all morning.", "", 0],
      ["lebensfroh", "full of life, cheerful", "Trotz ihrer Krankheit ist meine Nachbarin immer lebensfroh.", "Despite her illness my neighbour is always full of life.", "", 0],
      ["liebenswert", "lovable, endearing", "Herr Meier ist ein liebenswerter alter Mann, der allen im Haus hilft.", "Mr Meier is a lovable old man who helps everyone in the building.", "", 0],
      ["die Lüge, -n", "lie", "Ist es eine Lüge, wenn ich sage, dass mir das Geschenk gefällt?", "Is it a lie if I say I like the present?", "", 0],
      ["die Massnahme, -n", "measure, step", "Die Stadt plant neue Massnahmen gegen Einsamkeit im Alter.", "The city is planning new measures against loneliness in old age.", "DE: Maßnahme", 0],
      ["mehrmals", "several times", "Ich habe mehrmals beim Verein angerufen, bis endlich jemand abgenommen hat.", "I called the association several times until someone finally answered.", "", 0],
      ["offensichtlich", "obvious(ly)", "Sie hat sich offensichtlich über die Blumen gefreut.", "She was obviously pleased with the flowers.", "", 0],
      ["ökologisch", "ecological; organic", "Im Gemeinschaftsgarten bauen wir das Gemüse ökologisch an.", "In the community garden we grow the vegetables organically.", "", 0],
      ["die Organisation, -en", "organisation", "Diese Organisation hilft Familien, die wenig Geld haben.", "This organisation helps families who don't have much money.", "", 0],
      ["der/die Pflegebedürftige, -n", "person in need of care", "Viele Pflegebedürftige möchten so lange wie möglich zu Hause wohnen.", "Many people in need of care want to live at home for as long as possible.", "", 0],
      ["die Philosophie, -n", "philosophy", "Die Philosophie unseres Vereins ist einfach: Jeder hilft, wie er kann.", "Our association's philosophy is simple: everyone helps as best they can.", "", 0],
      ["das Publikum (Sg.)", "audience", "Nach der Aufführung klatschte das Publikum lange.", "After the performance the audience applauded for a long time.", "", 0],
      ["restaurieren", "to restore", "Freiwillige haben die alte Mühle restauriert, ohne dafür Geld zu bekommen.", "Volunteers restored the old mill without being paid for it.", "", 0],
      ["der Sanitäter, -", "paramedic; first-aider", "Die Sanitäter waren schon nach fünf Minuten da.", "The paramedics were there within five minutes.", "CH auch: die Sanität (= Rettungsdienst)", 0],
      ["schön·reden", "to gloss over, sugar-coat", "Man sollte die Probleme nicht schönreden, sondern etwas dagegen tun.", "You shouldn't gloss over the problems, but do something about them.", "", 0],
      ["die Schwierigkeit, -en", "difficulty", "Am Anfang hatte er Schwierigkeiten, die Kinder zu verstehen, weil sie Schweizerdeutsch sprachen.", "At first he had difficulty understanding the children because they spoke Swiss German.", "", 0],
      ["die Selbsthilfegruppe, -n", "self-help group, support group", "Seitdem sie in der Selbsthilfegruppe ist, fühlt sie sich weniger allein.", "Since joining the support group she has felt less alone.", "", 0],
      ["solange", "as long as; while", "Solange die Eltern im Kurs sind, spielen die Kinder im Nebenraum.", "While the parents are in class, the children play in the room next door.", "", 0],
      ["sonstig- (sonstige Fragen …)", "other, further", "Bei sonstigen Fragen wenden Sie sich bitte an den Vorstand.", "If you have any other questions, please contact the committee.", "", 0],
      ["das Tagebuch, -¨er", "diary", "In ihrem Tagebuch schrieb sie über ihre Zeit als Freiwillige im Ausland.", "In her diary she wrote about her time as a volunteer abroad.", "", 0],
      ["die Tagesmutter, -¨", "childminder", "Bis zum Kindergarten geht unser Sohn dreimal pro Woche zu einer Tagesmutter.", "Until he starts kindergarten our son goes to a childminder three times a week.", "CH auch: die Tagesfamilie", 0],
      ["der Theologe, -n", "theologian", "Im Kirchgemeindehaus hielt ein Theologe einen Vortrag über Nächstenliebe.", "A theologian gave a talk about loving your neighbour at the parish hall.", "", 0],
      ["der Tierschutz (Sg.)", "animal welfare, animal protection", "Meine Tochter interessiert sich sehr für Tierschutz und hilft im Tierheim.", "My daughter is very interested in animal welfare and helps out at the animal shelter.", "", 0],
      ["tolerant", "tolerant", "Kinder sind oft toleranter als Erwachsene.", "Children are often more tolerant than adults.", "", 0],
      ["der Töpferkurs, -e", "pottery course", "Ausser mir sind im Töpferkurs nur Seniorinnen.", "Apart from me, there are only senior women in the pottery course.", "DE: Außer", 0],
      ["über- (überglücklich, überfüllt …)", "over-, extremely (prefix)", "Die Kinder waren überglücklich, als die Feuerwehr zu Besuch kam.", "The children were overjoyed when the fire brigade came to visit.", "", 0],
      ["der Umweltschutz (Sg.)", "environmental protection", "Indem wir Lebensmittel retten, tun wir auch etwas für den Umweltschutz.", "By saving food we're also doing something for environmental protection.", "", 0],
      ["unterstützen", "to support", "Wir unterstützen das Projekt, indem wir jeden Monat zwanzig Franken spenden.", "We support the project by donating twenty francs every month.", "", 0],
      ["veranstalten", "to organise, hold (an event)", "Unser Verein veranstaltet jedes Jahr im Juni ein Strassenfest.", "Our association holds a street party every June.", "DE: Straßenfest", 0],
      ["verantwortlich (für + Akk.)", "responsible (for), in charge (of)", "Wer ist im Lager für die Küche verantwortlich?", "Who is in charge of the kitchen at the camp?", "", 0],
      ["das Ablaufdatum, -daten", "expiry date, best-before date", "Lebensmittel kurz vor dem Ablaufdatum muss man nicht wegwerfen.", "You don't have to throw away food that's close to its expiry date.", "DE: das Verfallsdatum", 0],
      ["die Vermittlung, -en", "arranging, placement; mediation", "Die Vermittlung von Wohnungen an Geflüchtete ist oft schwierig.", "Arranging flats for refugees is often difficult.", "", 0],
      ["vernünftig", "sensible, reasonable", "Ist es vernünftig, ein teures Geschenk zu behalten, das man nie benutzt?", "Is it sensible to keep an expensive present that you never use?", "", 0],
      ["versorgen", "to provide (for), supply; to look after", "Die Nachbarn versorgen den alten Herrn mit Essen, seitdem er nicht mehr einkaufen kann.", "The neighbours have been providing the old gentleman with food since he could no longer go shopping.", "", 0],
      ["verteilen", "to distribute, hand out", "Am Bahnhof verteilen Freiwillige warme Suppe an Obdachlose.", "At the station volunteers hand out hot soup to homeless people.", "", 0],
      ["vorgestern", "the day before yesterday", "Vorgestern haben wir mit den Kindern aus dem Ferienprogramm Pizza gebacken.", "The day before yesterday we baked pizza with the children from the holiday programme.", "", 0],
      ["vor·lesen", "to read aloud", "Herr Keller liest den Bewohnern des Altersheims jeden Morgen die Zeitung vor.", "Mr Keller reads the newspaper aloud to the residents of the care home every morning.", "DE: Altenheim", 0],
      ["der Vormarsch (Sg.)", "advance (auf dem Vormarsch = on the rise)", "Repair-Cafés sind in unserer Stadt auf dem Vormarsch.", "Repair cafés are on the rise in our town.", "", 0],
      ["der Vorstand, -¨e", "committee, board", "Seit letztem Jahr ist sie im Vorstand des Turnvereins.", "She has been on the committee of the gymnastics club since last year.", "", 0],
      ["wöchentlich", "weekly", "Ausser in den Schulferien findet der Deutschkurs wöchentlich statt.", "The German course takes place weekly, except during the school holidays.", "DE: Außer", 0],
      ["wohltätig", "charitable", "Der Erlös des Konzerts geht an einen wohltätigen Zweck.", "The proceeds of the concert go to a charitable cause.", "", 0],
      ["die Wolle (Sg.)", "wool", "Aus der Wolle, die übrig war, strickte sie Socken für den Weihnachtsbasar.", "With the leftover wool she knitted socks for the Christmas bazaar.", "", 0],
      ["zukünftig", "future; in future", "Zukünftig möchte die Gemeinde mehr Kurse für Seniorinnen und Senioren anbieten.", "In future the municipality wants to offer more courses for senior citizens.", "", 0],
      ["der Zirkus, -se", "circus", "Im Ferienprogramm verwandeln die Kinder die Turnhalle in einen Zirkus.", "In the holiday programme the children turn the gym into a circus.", "", 0],
      ["das Gemeinschaftszentrum, -zentren (GZ)", "community centre", "In den Sommerferien bietet das GZ ein Ferienprogramm für Kinder an.", "During the summer holidays the community centre offers a holiday programme for children.", "DE: das Stadtteilzentrum", 1],
      ["die Freiwilligenarbeit (Sg.)", "volunteer work", "Ohne Freiwilligenarbeit könnten viele Vereine nicht existieren.", "Without volunteer work many associations couldn't exist.", "DE: das Ehrenamt", 1],
      ["die Spielgruppe, -n", "playgroup (before kindergarten)", "Seit August geht unsere Tochter zweimal pro Woche in die Spielgruppe.", "Since August our daughter has been going to playgroup twice a week.", "", 1],
      ["die Badi, -s", "outdoor swimming pool, lido", "Bei schönem Wetter geht das Ferienprogramm am Nachmittag in die Badi.", "When the weather's nice the holiday programme goes to the outdoor pool in the afternoon.", "DE: das Freibad", 1],
      ["das Brockenhaus, -¨er (Brocki)", "second-hand shop (often charity-run)", "Das ungeliebte Geschenk habe ich ins Brockenhaus gebracht.", "I took the unwanted present to the second-hand shop.", "DE: das Sozialkaufhaus", 1],
      ["die Generalversammlung, -en (GV)", "annual general meeting (AGM)", "An der Generalversammlung wählten die Mitglieder einen neuen Präsidenten.", "At the AGM the members elected a new president.", "DE: die Mitgliederversammlung", 1],
    ] },
    { id: "L13", n: 13, title: "Aus Politik und Geschichte", book: "B1.2", cards: [
      ["die Ansicht, -en", "opinion, view", "Meiner Ansicht nach sollte die Stadt mehr Velowege bauen.", "In my view, the city should build more cycle paths.", "", 0],
      ["die Bildung (Sg.)", "education", "Den grössten Teil seines Lohns hat er in die Bildung seiner Kinder investiert.", "He invested most of his wages in his children's education.", "DE: größten", 0],
      ["die Bombe, -n", "bomb", "Bei Bauarbeiten wurde eine alte Bombe aus dem Zweiten Weltkrieg gefunden.", "An old Second World War bomb was found during construction work.", "", 0],
      ["der Stadtpräsident, -en / der Gemeindepräsident, -en", "mayor (of a city / of a municipality)", "Unser Gemeindepräsident ist schon zum dritten Mal gewählt worden.", "Our mayor has now been elected for the third time.", "DE: der Bürgermeister", 0],
      ["die Demonstration, -en", "demonstration (protest)", "Die Demonstration war viel grösser, als die Polizei erwartet hatte.", "The demonstration was much bigger than the police had expected.", "DE: größer", 0],
      ["empfangen", "to receive; to welcome (guests)", "Die Sportlerinnen wurden am Flughafen Zürich wie Heldinnen empfangen.", "The athletes were welcomed like heroines at Zurich Airport.", "", 0],
      ["das Ereignis, -se", "event, occurrence", "Für ihn war die Flucht aus Ungarn das wichtigste Ereignis seines Lebens.", "For him, fleeing Hungary was the most important event of his life.", "", 0],
      ["fair", "fair", "Ist es fair, dass Ausländer auf nationaler Ebene nicht abstimmen dürfen?", "Is it fair that foreigners can't vote at national level?", "", 0],
      ["feucht", "damp; humid", "Die erste Wohnung der Familie in Zürich war klein und feucht.", "The family's first flat in Zurich was small and damp.", "", 0],
      ["folgend- (am folgenden Tag)", "following, next", "Am folgenden Tag ist er über die Grenze nach Österreich geflohen.", "The following day he fled across the border to Austria.", "", 0],
      ["fördern", "to support, promote, encourage", "Sein Verein fördert Kinder, die in der Schule Mühe haben.", "His association supports children who are struggling at school.", "", 0],
      ["der Fortschritt, -e", "progress, advance", "Mit der Aufgabenhilfe macht Leo jede Woche grössere Fortschritte.", "With the homework help, Leo is making greater progress every week.", "DE: größere", 0],
      ["der Gegensatz, -¨e", "contrast; opposite (im Gegensatz zu = unlike)", "Im Gegensatz zu seinem Bruder interessiert er sich sehr für Politik.", "Unlike his brother, he is very interested in politics.", "", 0],
      ["geistig", "mental; intellectual", "Mit 85 Jahren ist er geistig noch sehr aktiv.", "At 85, he is still mentally very active.", "", 0],
      ["geschehen", "to happen, occur", "Was 1291 genau geschehen ist, weiss heute niemand mit Sicherheit.", "No one today knows for certain exactly what happened in 1291.", "DE: weiß", 0],
      ["die Geschwindigkeit, -en", "speed", "Ich schlage vor, die Geschwindigkeit in den Wohnquartieren auf 30 km/h zu begrenzen.", "I suggest limiting the speed in residential areas to 30 km/h.", "", 0],
      ["das Gesetz, -e", "law", "Das neue Gesetz ist vom Volk deutlich angenommen worden.", "The new law has been clearly approved by the people.", "", 0],
      ["halten von (+ Dat.)", "to think of, have an opinion of", "Was hältst du von der Idee, im Quartier einen Gemeinschaftsgarten anzulegen?", "What do you think of the idea of creating a community garden in the neighbourhood?", "", 0],
      ["kämpfen", "to fight; to campaign (für = for)", "Viele Frauen haben jahrzehntelang für das Stimmrecht gekämpft.", "Many women fought for decades for the right to vote.", "", 0],
      ["körperlich", "physical(ly)", "Die Arbeit auf der Baustelle war körperlich sehr anstrengend.", "The work on the building site was physically very hard.", "", 0],
      ["der Krieg, -e", "war", "Seine Eltern hatten den Krieg überlebt, aber ihr Haus war zerstört worden.", "His parents had survived the war, but their house had been destroyed.", "", 0],
      ["sich (Dat.) etwas leisten", "to afford (sth.); to treat oneself to", "Als Student konnte er sich keine eigene Wohnung leisten.", "As a student, he couldn't afford a flat of his own.", "", 0],
      ["die Macht, -¨e", "power", "Im Bundesrat ist die Macht auf sieben Personen verteilt.", "In the Federal Council, power is shared among seven people.", "", 0],
      ["das Ministerium, Ministerien", "ministry (government department)", "Ihr Bruder arbeitet in einem Ministerium in Wien.", "Her brother works at a ministry in Vienna.", "CH: beim Bund das Departement", 0],
      ["national", "national", "Am 1. August, dem nationalen Feiertag, gibt es überall Feuerwerk.", "On 1 August, the national holiday, there are fireworks everywhere.", "", 0],
      ["die Nationalhymne, -n", "national anthem", "Vor dem Spiel sangen nicht alle Spieler die Nationalhymne mit.", "Before the match, not all the players sang along to the national anthem.", "", 0],
      ["offiziell", "official(ly)", "Die Schweiz ist erst 2002 offiziell Mitglied der UNO geworden.", "Switzerland only officially became a member of the UN in 2002.", "", 0],
      ["örtlich", "local", "Laut der örtlichen Zeitung soll im Quartier ein neues Schulhaus gebaut werden.", "According to the local paper, a new school is to be built in the neighbourhood.", "", 0],
      ["passen (= in Ordnung sein)", "to be OK, suit (sb.)", "Passt es dir, wenn wir uns am Freitag um sieben treffen?", "Is it OK with you if we meet on Friday at seven?", "", 0],
      ["politisch", "political(ly)", "Er war politisch nie aktiv, aber er ging immer abstimmen.", "He was never politically active, but he always went to vote.", "", 0],
      ["der Protest, -e", "protest", "Trotz vieler Proteste wurde das alte Kino abgerissen.", "Despite many protests, the old cinema was demolished.", "", 0],
      ["protestieren", "to protest", "Tausende Studierende protestierten gegen die höheren Studiengebühren.", "Thousands of students protested against the higher tuition fees.", "", 0],
      ["die Reportage, -n", "report, documentary feature", "Gestern lief im Fernsehen eine spannende Reportage über Flüchtlinge aus Ungarn.", "Yesterday there was a fascinating documentary on TV about refugees from Hungary.", "", 0],
      ["die Revolution, -en", "revolution", "Nach der Revolution von 1956 flohen viele Ungarn in den Westen.", "After the 1956 revolution, many Hungarians fled to the West.", "", 0],
      ["städtisch", "municipal, city-run; urban", "Das städtische Hallenbad ist letztes Jahr renoviert worden.", "The municipal indoor pool was renovated last year.", "", 0],
      ["der Streik, -s", "strike", "Wegen eines Streiks fielen in Italien viele Züge aus.", "Because of a strike, many trains were cancelled in Italy.", "", 0],
      ["töten", "to kill", "Bei dem Unfall wurde zum Glück niemand getötet.", "Luckily, nobody was killed in the accident.", "", 0],
      ["verbinden", "to connect, link; to bandage", "Die neue Velobrücke soll die beiden Quartiere besser verbinden.", "The new cycle bridge is meant to connect the two neighbourhoods better.", "", 0],
      ["die Vereinbarkeit (Sg.)", "compatibility; balancing (family and work)", "Für viele Eltern ist die Vereinbarkeit von Familie und Beruf schwierig.", "For many parents, combining family and career is difficult.", "", 0],
      ["die Vielfalt (Sg.)", "diversity, variety", "Die sprachliche Vielfalt gehört zur Schweiz wie die Berge.", "Linguistic diversity is as much a part of Switzerland as the mountains.", "", 0],
      ["sich weiter·bilden", "to do further training, continue one's education", "Neben der Arbeit hat sie sich abends weitergebildet.", "Alongside her job, she did further training in the evenings.", "", 0],
      ["das Zeichen, -", "sign; signal", "Als Zeichen des Protests trugen viele Frauen etwas Violettes.", "As a sign of protest, many women wore something purple.", "", 0],
      ["die Zone, -n", "zone", "In einer Begegnungszone dürfen Autos höchstens 20 km/h fahren.", "In a shared zone, cars may drive at no more than 20 km/h.", "", 0],
      ["zu·bereiten", "to prepare (food)", "Das Essen für das Quartierfest wurde von den Nachbarn zubereitet.", "The food for the neighbourhood party was prepared by the neighbours.", "", 0],
      ["zusammen·fassen", "to summarise", "Fassen Sie bitte die wichtigsten Punkte der Rede kurz zusammen.", "Please briefly summarise the main points of the speech.", "", 0],
      ["der Zusammenhang, -¨e", "connection; context", "Gibt es einen Zusammenhang zwischen Bildung und Gesundheit?", "Is there a connection between education and health?", "", 0],
      ["zittern", "to tremble, shiver", "Bei ihrer ersten Rede im Parlament zitterte ihre Stimme.", "Her voice trembled during her first speech in parliament.", "", 0],
      ["die Eidgenossenschaft (Sg.)", "(Swiss) Confederation", "Seit 1848 ist die Eidgenossenschaft ein moderner Bundesstaat.", "Since 1848 the Confederation has been a modern federal state.", "", 1],
      ["der Kanton, -e", "canton", "Die Schweiz besteht aus 26 Kantonen, und jeder hat seine eigene Verfassung.", "Switzerland is made up of 26 cantons, and each has its own constitution.", "DE: ≈ das Bundesland", 1],
      ["der Bundesrat, -¨e", "Federal Council (Swiss government); federal councillor", "Die erste Frau im Bundesrat wurde 1984 gewählt.", "The first woman on the Federal Council was elected in 1984.", "DE: ≈ die Bundesregierung", 1],
      ["der Nationalrat, -¨e", "National Council (lower house of parliament); member of it", "Sie ist mit 28 Jahren in den Nationalrat gewählt worden.", "She was elected to the National Council at the age of 28.", "DE: ≈ der Bundestag", 1],
      ["das Frauenstimmrecht (Sg.)", "women's suffrage, women's right to vote", "Auf Bundesebene wurde das Frauenstimmrecht erst 1971 eingeführt.", "At federal level, women's suffrage was only introduced in 1971.", "DE: das Frauenwahlrecht", 1],
      ["die Abstimmung, -en / ab·stimmen (über + Akk.)", "vote, ballot / to vote (on an issue)", "Im Juni stimmen wir über einen neuen Park am See ab.", "In June we're voting on a new park by the lake.", "", 1],
      ["die Volksinitiative, -n", "popular initiative (citizens' proposal to change the constitution)", "Für eine Volksinitiative müssen 100'000 Unterschriften gesammelt werden.", "For a popular initiative, 100,000 signatures have to be collected.", "", 1],
      ["das Referendum, Referenden", "referendum (popular vote to challenge a law)", "Gegen das neue Gesetz ist das Referendum ergriffen worden.", "A referendum has been launched against the new law.", "", 1],
      ["die Tagesschule, -n", "all-day school (with lunch and afternoon care)", "Dank der Tagesschule können beide Eltern arbeiten.", "Thanks to the all-day school, both parents can work.", "DE: die Ganztagsschule", 1],
      ["die Aufgabenhilfe (Sg.)", "homework help, homework club", "Zweimal pro Woche gehen die Kinder nach der Schule in die Aufgabenhilfe.", "Twice a week the children go to homework club after school.", "DE: die Hausaufgabenhilfe", 1],
    ] },
    { id: "L14", n: 14, title: "Alte und neue Heimat", book: "B1.2", cards: [
      ["die Demokratie, -n", "democracy", "Woran erkennt man deiner Meinung nach eine gute Demokratie?", "In your view, how can you recognise a good democracy?", "", 0],
      ["der Einwohner, -", "inhabitant, resident", "Wie viele Einwohner hat das Dorf, in dem du aufgewachsen bist?", "How many inhabitants does the village you grew up in have?", "", 0],
      ["die EU", "the EU (European Union)", "Die Schweiz ist kein Mitglied der EU, liegt aber mitten in Europa.", "Switzerland isn't a member of the EU, but it lies right in the middle of Europe.", "", 0],
      ["die Fläche, -n", "area (size); surface", "Gemessen an der Fläche ist die Schweiz ein eher kleines Land.", "In terms of area, Switzerland is a fairly small country.", "", 0],
      ["gastfreundlich", "hospitable", "In meiner alten Heimat sind die Menschen besonders gastfreundlich.", "In my old home country people are especially hospitable.", "", 0],
      ["das Gebäck, -e", "pastries, biscuits; baked goods", "Die Gäste haben sich sehr über das Gebäck aus Portugal gefreut.", "The guests were really delighted with the pastries from Portugal.", "", 0],
      ["die Geborgenheit (Sg.)", "sense of security, feeling safe and sheltered", "Für mich bedeutet Heimat vor allem Geborgenheit.", "For me, home means above all feeling safe and secure.", "", 0],
      ["das Geräusch, -e", "noise, sound", "Wenn ich das Geräusch von Kuhglocken höre, denke ich an meine Kindheit.", "When I hear the sound of cowbells, I think of my childhood.", "", 0],
      ["der Glaube (Sg.)", "faith; belief", "Ihr Glaube ist ihr sehr wichtig, deshalb spricht sie oft darüber.", "Her faith is very important to her, which is why she often talks about it.", "", 0],
      ["integrieren", "to integrate", "Die Gemeinde möchte neue Einwohner besser integrieren.", "The municipality wants to integrate new residents better.", "", 0],
      ["der Kontinent, -e", "continent", "In meinem Deutschkurs sitzen Leute von vier verschiedenen Kontinenten.", "In my German class there are people from four different continents.", "", 0],
      ["die Migration, -en", "migration", "In dem Roman geht es um Migration und die Suche nach Heimat.", "The novel is about migration and the search for a home.", "", 0],
      ["die Mobilität (Sg.)", "mobility", "Die Mobilität in Europa ist heute viel grösser als früher.", "Mobility in Europe is much greater today than it used to be.", "DE: größer", 0],
      ["ordnen", "to sort, put in order", "Am Sonntag habe ich endlich meine alten Fotos aus der Heimat geordnet.", "On Sunday I finally sorted out my old photos from back home.", "", 0],
      ["der Profi, -s", "pro, professional", "Nach drei Jahren Deutschkurs bin ich zwar kein Profi, aber ich verstehe schon viel.", "After three years of German classes I'm admittedly no pro, but I already understand a lot.", "", 0],
      ["pulen", "to peel (shrimps); to pick (at)", "In Hamburg hat mir ein Fischer gezeigt, wie man Krabben pult.", "In Hamburg a fisherman showed me how to peel shrimps.", "CH: eher schälen (pulen ist norddeutsch)", 0],
      ["das Rührei (Sg.)", "scrambled egg(s)", "Zum Brunch gibt es bei uns immer Rührei mit Schnittlauch.", "We always have scrambled eggs with chives for brunch.", "", 0],
      ["rühren", "to stir; to move (emotionally)", "Beim Fondue muss man immer wieder rühren, damit der Käse nicht anbrennt.", "With fondue you have to keep stirring so that the cheese doesn't burn.", "", 0],
      ["die Solidarität (Sg.)", "solidarity", "Nach dem Unwetter zeigte das ganze Dorf grosse Solidarität.", "After the storm the whole village showed great solidarity.", "DE: große", 0],
      ["speziell", "special, specific; peculiar", "Gibt es in deiner Heimat ein spezielles Gericht für Feiertage?", "Is there a special dish for holidays in your home country?", "", 0],
      ["die Staatsangehörigkeit, -en", "nationality, citizenship", "Seit letztem Jahr hat sie die schweizerische und die italienische Staatsangehörigkeit.", "Since last year she has held both Swiss and Italian citizenship.", "CH auch: die Nationalität", 0],
      ["die Tradition, -en", "tradition", "In unserer Familie ist es Tradition, im Advent Guetzli zu backen.", "In our family it's a tradition to bake Christmas biscuits during Advent.", "DE: Plätzchen", 0],
      ["traditionell", "traditional(ly)", "Beim Fest der Vielfalt trugen viele Gäste traditionelle Kleidung aus ihrer Heimat.", "At the diversity festival many guests wore traditional clothes from their home countries.", "", 0],
      ["trocknen", "to dry", "Im Sommer trocknet meine Mutter Kräuter aus dem Garten für den Winter.", "In summer my mother dries herbs from the garden for the winter.", "", 0],
      ["überwinden", "to overcome", "Meine Angst vor dem Sprechen habe ich inzwischen überwunden.", "I have now overcome my fear of speaking.", "", 0],
      ["ursprünglich", "originally; original", "Ursprünglich wollte ich nur ein Jahr in Zürich bleiben.", "Originally I only wanted to stay in Zurich for one year.", "", 0],
      ["das Volk, -¨er", "people, nation", "In der Schweiz stimmt das Volk mehrmals pro Jahr über politische Fragen ab.", "In Switzerland the people vote on political issues several times a year.", "", 0],
      ["das Volksfest, -e", "public festival, fair", "Auf dem Volksfest gab es Musik, Tanz und Essen aus aller Welt.", "At the public festival there was music, dancing and food from all over the world.", "", 0],
      ["die Währung, -en", "currency", "Die Schweiz hat mit dem Franken eine eigene Währung.", "Switzerland has its own currency, the franc.", "", 0],
      ["das Zuhause (Sg.)", "home", "Seit ich in Zürich wohne, träume ich manchmal von meinem alten Zuhause.", "Since I've been living in Zurich, I sometimes dream about my old home.", "", 0],
      ["zu·sehen (+ Dat.)", "to watch", "Die Kinder sahen den Tänzern aus Brasilien begeistert zu.", "The children watched the dancers from Brazil with great excitement.", "", 0],
      ["die Rösti (Sg.)", "rösti (Swiss fried grated potatoes)", "Am Sonntag macht mein Vater oft eine Rösti mit Spiegelei.", "On Sundays my father often makes rösti with a fried egg.", "", 1],
      ["das Fondue, -s", "(cheese) fondue", "Im Winter treffen wir uns gern mit Freunden zum Fondue.", "In winter we like to get together with friends for fondue.", "", 1],
      ["das Raclette, -s", "raclette (melted cheese dish)", "Zum Raclette gehören Kartoffeln, Cornichons und Silberzwiebeln.", "Potatoes, gherkins and pickled onions go with raclette.", "", 1],
      ["das Läckerli, -", "Läckerli (spiced honey biscuit from Basel)", "Meine Kollegin aus Basel hat Läckerli fürs ganze Team mitgebracht.", "My colleague from Basel brought Läckerli for the whole team.", "", 1],
      ["der Tirggel, -", "Tirggel (thin Zurich honey biscuit for Christmas)", "In der Adventszeit gibt es in Zürcher Bäckereien Tirggel zu kaufen.", "During Advent you can buy Tirggel in Zurich bakeries.", "", 1],
      ["der Zopf, -¨e", "plaited bread (Sunday loaf); plait", "Am Sonntagmorgen gibt es bei uns frischen Zopf mit Butter und Honig.", "On Sunday mornings we have fresh plaited bread with butter and honey.", "DE: der Hefezopf", 1],
      ["die Deutschschweiz (Sg.)", "German-speaking Switzerland", "In der Deutschschweiz spricht man im Alltag fast immer Dialekt.", "In German-speaking Switzerland people almost always speak dialect in everyday life.", "", 1],
      ["der Röstigraben (Sg.)", "«rösti ditch» (divide between German- and French-speaking Switzerland)", "Bei manchen Abstimmungen sieht man den Röstigraben sehr deutlich.", "In some referendums the rösti ditch is very clearly visible.", "", 1],
      ["das Sechseläuten (Sg.)", "Sechseläuten (Zurich spring festival where the Böögg snowman is burnt)", "Woran denkst du beim Sechseläuten zuerst? – An den Böögg natürlich!", "What's the first thing you think of with Sechseläuten? – The Böögg, of course!", "", 1],
    ] },
  ];

  /* ---------- pure logic (covered by tests/karteikasten.test.js) ---------- */

  // Progress keys on the German headword, not the card's position, so adding
  // or reordering cards in a lesson keeps the learner's progress intact.
  function keyOf(card) { return card[0]; }

  // Turns a stored record (or null) into a complete, valid state.
  function normalize(rec, lessons) {
    const r = rec || {};
    const known = {};
    if (r.known && typeof r.known === 'object') {
      for (const id of Object.keys(r.known)) {
        if (Array.isArray(r.known[id])) known[id] = r.known[id].filter(k => typeof k === 'string');
      }
    }
    return {
      lesson: lessons.some(l => l.id === r.lesson) ? r.lesson : lessons[0].id,
      dir: r.dir === 'en' ? 'en' : 'de',
      shuffle: r.shuffle !== false,
      known,
    };
  }

  // Counts the lesson's cards that are marked known. A stored key whose card
  // left the deck does not count.
  function knownCount(lesson, keys) {
    const k = new Set(keys);
    let n = 0;
    for (const c of lesson.cards) if (k.has(keyOf(c))) n++;
    return n;
  }

  // Fisher-Yates over a copy. `rnd` defaults to Math.random; tests inject one.
  function shuffle(arr, rnd) {
    const r = rnd || Math.random;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  // Indices of the lesson's unknown cards, in book order or shuffled.
  function buildQueue(lesson, keys, shuffled, rnd) {
    const k = new Set(keys);
    const q = [];
    lesson.cards.forEach((c, i) => { if (!k.has(keyOf(c))) q.push(i); });
    return shuffled ? shuffle(q, rnd) : q;
  }

  function requeue(queue, i) {
    const out = queue.slice();
    out.splice(Math.min(AGAIN_GAP, out.length), 0, i);
    return out;
  }

  function markKnown(known, lesson, card) {
    const keys = known[lesson.id] || [];
    const k = keyOf(card);
    const out = Object.assign({}, known);
    out[lesson.id] = keys.includes(k) ? keys.slice() : keys.concat(k);
    return out;
  }

  function forget(known, lesson) {
    const out = Object.assign({}, known);
    delete out[lesson.id];
    return out;
  }

  function summarize(lessons, known) {
    let total = 0, n = 0;
    for (const l of lessons) {
      total += l.cards.length;
      n += knownCount(l, known[l.id] || []);
    }
    return { total, known: n, lessons: lessons.length };
  }

  /* ---------- persistence (through the app's storage seam) ---------- */

  function loadRecord() {
    const S = global.Storage;
    if (!S || !S.loadDeck) return null;
    return S.loadDeck(DECK_ID);
  }

  function save() {
    const S = global.Storage;
    if (!S || !S.saveDeck) return;
    S.saveDeck(DECK_ID, {
      deckId: DECK_ID, version: 1, kind: 'karteikasten',
      lesson: st.lesson, dir: st.dir, shuffle: st.shuffle, known: st.known,
    });
  }

  /* ---------- view ---------- */

  let view = null;          // the mounted root element, or null when closed
  let onCloseHook = null;
  let st = null;            // normalized state: { lesson, dir, shuffle, known }
  let queue = [];           // card indices still to show in this round
  let flipped = false;
  let card = null, front = null, back = null;
  let resetArmed = false;
  let resetTimer = null;

  function isOpen() { return view !== null; }
  function $k(id) { return view && view.querySelector('#' + id); }

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function lessonIndex() { return LESSONS.findIndex(l => l.id === st.lesson); }
  function lesson() { return LESSONS[lessonIndex()]; }
  function knownKeys(L) { return st.known[L.id] || []; }

  function build() {
    queue = buildQueue(lesson(), knownKeys(lesson()), st.shuffle);
  }

  function renderBooks() {
    const box = $k('kk-books');
    box.textContent = '';
    for (const [book, label] of BOOKS) {
      const g = el('div');
      g.appendChild(el('div', 'kk-book-label', label));
      const row = el('div', 'kk-chips');
      LESSONS.forEach(L => {
        if (L.book !== book) return;
        const b = el('button', 'kk-chip');
        b.type = 'button';
        b.setAttribute('data-lesson', L.id);
        b.setAttribute('aria-pressed', String(L.id === st.lesson));
        b.setAttribute('aria-label', 'Lektion ' + L.n + ': ' + L.title);
        b.title = 'Lektion ' + L.n + ' · ' + L.title;
        b.appendChild(el('span', null, String(L.n)));
        const bar = el('span', 'kk-bar'), fill = el('i');
        fill.style.width = (100 * knownCount(L, knownKeys(L)) / L.cards.length) + '%';
        bar.appendChild(fill);
        b.appendChild(bar);
        row.appendChild(b);
      });
      g.appendChild(row);
      box.appendChild(g);
    }
  }

  function renderHead() {
    const L = lesson(), k = knownCount(L, knownKeys(L)), n = L.cards.length;
    $k('kk-eyebrow').textContent = 'Lektion ' + L.n + ' · ' + L.book;
    $k('kk-title').textContent = L.title;
    const c = $k('kk-count');
    c.textContent = '';
    c.append(el('strong', null, String(k)), ' von ' + n + ' gewusst');
    $k('kk-round').textContent = queue.length ? 'noch ' + queue.length + ' in dieser Runde' : '';
    $k('kk-bar').style.width = (100 * k / n) + '%';
    const dir = $k('kk-dir');
    dir.textContent = st.dir === 'de' ? 'Deutsch → Englisch' : 'Englisch → Deutsch';
    dir.setAttribute('aria-pressed', String(st.dir === 'en'));
    const shuf = $k('kk-shuf');
    shuf.textContent = st.shuffle ? 'Gemischt' : 'In Buchreihenfolge';
    shuf.setAttribute('aria-pressed', String(st.shuffle));
  }

  function faceHead(label, c) {
    const h = el('div', 'kk-face-head');
    h.appendChild(el('span', null, label));
    const b = el('span', 'kk-badges');
    if (c[5]) b.appendChild(el('span', 'kk-badge', 'CH'));
    h.appendChild(b);
    return h;
  }

  function germanFace(c, withRef) {
    const f = document.createDocumentFragment();
    f.appendChild(faceHead('Deutsch', c));
    const body = el('div', 'kk-face-body');
    body.appendChild(el('p', 'kk-word', c[0]));
    body.appendChild(el('p', 'kk-sentence', c[2]));
    if (c[4]) {
      const n = el('p', 'kk-note');
      n.append(el('b', null, 'Hinweis '), c[4]);
      body.appendChild(n);
    }
    if (withRef) body.appendChild(el('p', 'kk-ref', c[1]));
    f.appendChild(body);
    return f;
  }

  function englishFace(c, withRef) {
    const f = document.createDocumentFragment();
    f.appendChild(faceHead('English', c));
    const body = el('div', 'kk-face-body');
    body.appendChild(el('p', 'kk-word kk-en', c[1]));
    body.appendChild(el('p', 'kk-sentence kk-it', c[3]));
    if (withRef) body.appendChild(el('p', 'kk-ref', c[0]));
    f.appendChild(body);
    return f;
  }

  // Screen readers read only the face that is showing: the card's accessible
  // name comes from its content, and the hidden face is aria-hidden.
  function syncFaces() {
    card.classList.toggle('kk-flipped', flipped);
    front.setAttribute('aria-hidden', String(flipped));
    back.setAttribute('aria-hidden', String(!flipped));
  }

  function renderCard() {
    const study = $k('kk-study');
    if (!queue.length) { renderDone(); return; }
    if (!card.isConnected) {
      study.textContent = '';
      const stage = el('div', 'kk-stage');
      stage.appendChild(card);
      study.appendChild(stage);
    }
    const c = lesson().cards[queue[0]];
    // Turn the new card face-up without playing the flip animation backwards.
    card.classList.add('kk-no-anim');
    flipped = false;
    syncFaces();
    void card.offsetWidth;
    card.classList.remove('kk-no-anim');
    front.textContent = '';
    back.textContent = '';
    if (st.dir === 'de') { front.appendChild(germanFace(c, false)); back.appendChild(englishFace(c, true)); }
    else { front.appendChild(englishFace(c, false)); back.appendChild(germanFace(c, true)); }
    $k('kk-hint').hidden = false;
    renderActions();
  }

  function renderActions() {
    const a = $k('kk-actions');
    a.textContent = '';
    if (!queue.length) return;
    if (!flipped) {
      const b = el('button', 'kk-btn kk-flip', 'Umdrehen');
      b.type = 'button';
      b.setAttribute('data-act', 'flip');
      a.appendChild(b);
    } else {
      const again = el('button', 'kk-btn kk-again');
      again.type = 'button';
      again.setAttribute('data-act', 'again');
      again.append('Nochmal', el('small', null, 'kommt gleich wieder'));
      const good = el('button', 'kk-btn kk-good');
      good.type = 'button';
      good.setAttribute('data-act', 'good');
      good.append('Gewusst', el('small', null, 'aus dieser Runde'));
      a.append(again, good);
    }
  }

  function renderDone() {
    const L = lesson(), li = lessonIndex(), study = $k('kk-study');
    study.textContent = '';
    const d = el('div', 'kk-done');
    d.appendChild(el('h3', null, 'Lektion ' + L.n + ' geschafft'));
    d.appendChild(el('p', null, 'Du hast alle ' + L.cards.length + ' Karten als gewusst markiert.'));
    const row = el('div', 'kk-row');
    const again = el('button', 'kk-tool', 'Alle nochmal üben');
    again.type = 'button';
    again.setAttribute('data-act', 'restart');
    row.appendChild(again);
    if (li < LESSONS.length - 1) {
      const next = el('button', 'kk-tool', 'Weiter zu Lektion ' + LESSONS[li + 1].n);
      next.type = 'button';
      next.setAttribute('aria-pressed', 'true');
      next.setAttribute('data-lesson', LESSONS[li + 1].id);
      row.appendChild(next);
    }
    d.appendChild(row);
    study.appendChild(d);
    $k('kk-hint').hidden = true;
    $k('kk-actions').textContent = '';
  }

  function renderList() {
    const L = lesson(), k = new Set(knownKeys(L)), ul = $k('kk-list');
    $k('kk-listsum').textContent = 'Alle ' + L.cards.length + ' Wörter dieser Lektion';
    ul.textContent = '';
    if (!$k('kk-listbox').open) return;
    for (const c of L.cards) {
      const li = el('li');
      const de = el('span', k.has(keyOf(c)) ? 'kk-k' : null, c[0] + (c[5] ? '  · CH' : ''));
      li.append(de, el('span', null, c[1]));
      ul.appendChild(li);
    }
  }

  function renderAll() { renderBooks(); renderHead(); renderCard(); renderList(); }

  function flip() {
    if (!queue.length) return;
    flipped = !flipped;
    syncFaces();
    renderActions();
  }

  function answer(knew) {
    if (!flipped || !queue.length) return;
    const L = lesson(), i = queue.shift();
    if (knew) { st.known = markKnown(st.known, L, L.cards[i]); save(); }
    else queue = requeue(queue, i);
    renderBooks();
    renderHead();
    renderCard();
    if ($k('kk-listbox').open) renderList();
  }

  function restartLesson() {
    st.known = forget(st.known, lesson());
    save();
    build();
    renderAll();
  }

  function selectLesson(id) {
    st.lesson = id;
    save();
    disarmReset();
    build();
    renderAll();
    view.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function disarmReset() {
    resetArmed = false;
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
    const b = $k('kk-reset');
    if (b) { b.textContent = 'Neu starten'; b.classList.remove('kk-warn'); }
  }

  function loadFonts() {
    if (document.getElementById('kk-fonts')) return;
    const l = document.createElement('link');
    l.id = 'kk-fonts';
    l.rel = 'stylesheet';
    l.href = FONTS_HREF;
    document.head.appendChild(l);
  }

  function onKey(ev) {
    if (!isOpen()) return;
    const t = ev.target;
    const tag = t && t.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    // Let buttons and the word list keep their native Enter/Space activation.
    if ((tag === 'BUTTON' || tag === 'SUMMARY') && (ev.key === ' ' || ev.key === 'Enter')) return;
    if (ev.key === ' ' || (ev.key === 'Enter' && t === card)) { ev.preventDefault(); flip(); }
    else if (ev.key === 'ArrowLeft' || ev.key === '1') answer(false);
    else if (ev.key === 'ArrowRight' || ev.key === '2') answer(true);
  }

  const SHELL =
    '<div class="kk-wrap">' +
      '<header class="kk-top">' +
        '<button type="button" class="kk-menu" id="kk-menu">← Menü</button>' +
        '<h1>B1 Karteikasten</h1>' +
        '<span class="kk-sub">Schritte plus Neu · Ausgabe Schweiz</span>' +
      '</header>' +
      '<nav class="kk-books" id="kk-books" aria-label="Lektion wählen"></nav>' +
      '<section class="kk-lhead" aria-live="polite">' +
        '<div class="kk-eyebrow" id="kk-eyebrow"></div>' +
        '<h2 id="kk-title"></h2>' +
        '<div class="kk-meta"><span id="kk-count"></span><span id="kk-round"></span></div>' +
        '<div class="kk-progress"><i id="kk-bar"></i></div>' +
        '<div class="kk-tools">' +
          '<button class="kk-tool" id="kk-dir" type="button"></button>' +
          '<button class="kk-tool" id="kk-shuf" type="button"></button>' +
          '<button class="kk-tool" id="kk-reset" type="button">Neu starten</button>' +
        '</div>' +
      '</section>' +
      '<section id="kk-study"></section>' +
      '<p class="kk-hint" id="kk-hint">Tippen zum Umdrehen · Leertaste, ← Nochmal, → Gewusst</p>' +
      '<div class="kk-actions" id="kk-actions"></div>' +
      '<details id="kk-listbox">' +
        '<summary id="kk-listsum"></summary>' +
        '<ul class="kk-list" id="kk-list"></ul>' +
      '</details>' +
    '</div>';

  function open(onClose) {
    if (view) return;
    onCloseHook = onClose || null;
    st = normalize(loadRecord(), LESSONS);
    loadFonts();
    view = document.createElement('div');
    view.id = 'kkView';
    view.innerHTML = SHELL;
    document.body.appendChild(view);
    document.body.classList.add('drill-open');

    card = el('div', 'kk-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    front = el('article', 'kk-face kk-front');
    back = el('article', 'kk-face kk-back');
    card.append(front, back);
    card.addEventListener('click', flip);

    $k('kk-menu').onclick = () => close();
    $k('kk-books').addEventListener('click', ev => {
      const b = ev.target.closest('[data-lesson]');
      if (b) selectLesson(b.getAttribute('data-lesson'));
    });
    $k('kk-study').addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.getAttribute('data-act') === 'restart') restartLesson();
      else if (b.hasAttribute('data-lesson')) selectLesson(b.getAttribute('data-lesson'));
    });
    $k('kk-actions').addEventListener('click', ev => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      if (act === 'flip') flip();
      else answer(act === 'good');
    });
    $k('kk-dir').onclick = () => { st.dir = st.dir === 'de' ? 'en' : 'de'; save(); renderHead(); renderCard(); };
    $k('kk-shuf').onclick = () => { st.shuffle = !st.shuffle; save(); build(); renderHead(); renderCard(); };
    $k('kk-reset').onclick = () => {
      if (!resetArmed) {
        resetArmed = true;
        const b = $k('kk-reset');
        b.textContent = 'Fortschritt löschen? Tippen zum Bestätigen';
        b.classList.add('kk-warn');
        resetTimer = setTimeout(disarmReset, 4000);
        return;
      }
      disarmReset();
      restartLesson();
    };
    $k('kk-listbox').addEventListener('toggle', renderList);

    document.addEventListener('keydown', onKey);
    if (global.history && history.pushState) {
      history.pushState({ karteikasten: true }, '', '#karteikasten');
    }

    build();
    renderAll();
    // Move focus into the section. Otherwise focus stays on the menu button
    // behind the overlay, and Space presses that button instead of flipping
    // the card.
    (card.isConnected ? card : $k('kk-menu')).focus({ preventScroll: true });
  }

  function teardown() {
    document.removeEventListener('keydown', onKey);
    disarmReset();
    view.remove();
    view = null;
    card = front = back = null;
    document.body.classList.remove('drill-open');
    const hook = onCloseHook;
    onCloseHook = null;
    if (hook) hook();
  }

  function close() {
    if (!view) return;
    const pushed = global.history && history.state && history.state.karteikasten;
    teardown();
    if (pushed) history.back();
  }

  // Back-button support: engine-ui's popstate handler calls this after it has
  // ruled out an open drill. Tears down without touching history again.
  function handlePop() {
    if (!view) return false;
    teardown();
    return true;
  }

  // Summary for the menu entry, computed without mounting the view.
  function menuSummary() {
    return summarize(LESSONS, normalize(loadRecord(), LESSONS).known);
  }

  const Karteikasten = {
    DECK_ID, AGAIN_GAP, BOOKS, LESSONS,
    keyOf, normalize, knownCount, shuffle, buildQueue, requeue, markKnown, forget, summarize,
    open, close, isOpen, handlePop, menuSummary,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Karteikasten;
  } else {
    global.Karteikasten = Karteikasten;
  }
})(typeof window !== 'undefined' ? window : globalThis);
