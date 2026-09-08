(function (global) {
  /* ============================================================
     extr@ auf Deutsch — Vokabelkarten

     A standalone flashcard section. It deliberately does NOT go through the
     deck engine: no cloze/text/choice primitives, no scaffolding ladder, no
     deck JSON, no validator. It is a plain two-sided card deck with its own
     Leitner boxes, rendered in its own visual language.

     The one thing it shares with the rest of the app is the persistence seam:
     progress is written through Storage under the deck key `extra-vocab`, so
     it survives reloads via IndexedDB and rides along in Export / Import
     backups for free.
     ============================================================ */

  const DECK_ID = 'extra-vocab';
  const DAY = 86400000;
  /* days until a card comes back, indexed by Leitner box */
  const INTERVALS = [0, 1, 2, 4, 9, 20, 45];
  const MASTERED_BOX = 4;

  const EPISODES = [
    'Sams Ankunft', 'Sam geht einkaufen', 'Sam hat ein Date', 'Sam sucht einen Job',
    'Ein Star ist geboren', 'Lotto-Tag', 'Der Zwilling', 'Die Kusine der Vermieterin',
    'Jobs für Nic und Sam', 'Anna demonstriert', 'Ferienzeit', 'Verrückt nach Fußball',
    'Hochzeitspläne',
  ];

  /* [episode, German, English, German example, English translation] */
  const DATA = [
    [1, 'der Brieffreund, die Brieffreundin', 'pen pal', 'Vor sieben Jahren waren wir Brieffreunde.', 'Seven years ago we were pen pals.'],
    [1, 'Post bekommen', 'to get mail', 'Sascha bekommt Post aus Amerika.', 'Sascha gets mail from America.'],
    [1, 'die Vermieterin, der Vermieter', 'landlady, landlord', 'Hilfe, es ist die Vermieterin!', "Help, it's the landlady!"],
    [1, 'die Hausordnung', 'house rules (of a building)', 'In der Hausordnung steht: keine Besuche nach 23 Uhr.', 'The house rules say: no visitors after 11 p.m.'],
    [1, 'übernachten', 'to stay the night', 'Kann er bei uns übernachten?', 'Can he stay the night at our place?'],
    [1, 'das Kissen, -', 'cushion, pillow', 'Hier ist ein Kissen für dich.', "Here's a cushion for you."],
    [1, 'die Fernbedienung', 'remote control', 'Und das ist die Fernbedienung.', 'And this is the remote control.'],
    [1, 'Fühl dich wie zu Hause.', 'Make yourself at home.', 'Setz dich, fühl dich wie zu Hause.', 'Sit down, make yourself at home.'],
    [1, 'Mir ist heiß.', "I'm hot (temperature).", 'Nicht „Ich bin heiß“ – das heißt etwas ganz anderes.', 'Not „Ich bin heiß“ – that means something else entirely.'],
    [1, 'Das ist mir egal.', "I don't care.", 'Er duscht gerade? Das ist mir egal!', "He's in the shower? I don't care!"],
    [1, 'Keine Ahnung.', 'No idea.', 'Wo ist meine Zeitschrift? – Keine Ahnung.', "Where's my magazine? – No idea."],
    [1, 'rausfliegen', 'to get thrown out', 'Der Typ fliegt raus, und zwar sofort!', 'That guy is out of here, and right now!'],
    [1, 'altmodisch', 'old-fashioned', 'Seine Klamotten sind furchtbar altmodisch.', 'His clothes are terribly old-fashioned.'],
    [1, 'die Klamotten (Pl.)', 'clothes (colloquial)', 'Aber seine Klamotten! Schrecklich.', 'But his clothes! Awful.'],
    [1, 'verliebt sein in (+Akk)', 'to be in love with', 'Nic ist in Sascha verliebt.', 'Nic is in love with Sascha.'],
    [1, 'Auf keinen Fall!', 'No way!', 'Bei mir wohnen? Auf keinen Fall!', 'Live at my place? No way!'],
    [1, 'Halt die Klappe!', 'Shut up! (rude)', 'Halt die Klappe, Nic!', 'Shut up, Nic!'],
    [1, 'der Typ', 'guy (colloquial)', 'Der Typ ist echt komisch.', 'That guy is really weird.'],
    [1, 'anfassen', 'to touch', 'Niemand darf mein Fahrrad anfassen!', 'Nobody is allowed to touch my bike!'],

    [2, 'einkaufen gehen', 'to go shopping', 'Wir gehen für Sam einkaufen.', "We're going shopping for Sam."],
    [2, 'die Einkaufsliste', 'shopping list', 'Schreib bitte eine Einkaufsliste.', 'Please write a shopping list.'],
    [2, 'anprobieren', 'to try on', 'Darf ich die Hose anprobieren?', 'May I try the trousers on?'],
    [2, 'die Umkleidekabine', 'fitting room', 'Die Umkleidekabine ist da hinten links.', 'The fitting room is back there on the left.'],
    [2, 'Welche Größe haben Sie?', 'What size do you take?', 'Welche Größe haben Sie? – Zweiundvierzig.', 'What size do you take? – Forty-two.'],
    [2, 'passen (+Dat)', 'to fit (size)', 'Das Hemd passt mir nicht.', "The shirt doesn't fit me."],
    [2, 'stehen (+Dat)', 'to suit (look good on)', 'Blau steht dir wirklich gut.', 'Blue really suits you.'],
    [2, 'umtauschen', 'to exchange (a purchase)', 'Kann ich das umtauschen?', 'Can I exchange this?'],
    [2, 'der Kassenbon, die Quittung', 'receipt', 'Ohne Kassenbon geht das leider nicht.', "Without a receipt I'm afraid that's not possible."],
    [2, 'im Angebot', 'on offer, on sale', 'Die Jacke ist diese Woche im Angebot.', 'The jacket is on offer this week.'],
    [2, 'Was kostet das?', 'How much is that?', 'Was kostet das Hemd?', 'How much is the shirt?'],
    [2, 'bar oder mit Karte zahlen', 'to pay cash or by card', 'Zahlen Sie bar oder mit Karte?', 'Are you paying cash or by card?'],
    [2, 'Ich schaue nur.', "I'm just looking.", 'Kann ich helfen? – Danke, ich schaue nur.', 'Can I help? – Thanks, I’m just looking.'],
    [2, 'die Kasse', 'checkout, till', 'Bitte zahlen Sie vorne an der Kasse.', 'Please pay at the checkout at the front.'],
    [2, 'das Sonderangebot', 'special offer', 'Heute gibt es ein Sonderangebot auf Schuhe.', "There's a special offer on shoes today."],
    [2, 'geschmacklos', 'tasteless, in bad taste', 'Dieses Hemd ist wirklich geschmacklos.', 'This shirt is in really bad taste.'],

    [3, 'die Anzeige', 'advertisement, personal ad', 'Die Anzeige steht seit heute Morgen im Internet.', 'The ad has been online since this morning.'],
    [3, 'eine Anzeige aufgeben', 'to place an ad', 'Nic gibt heimlich eine Anzeige für Sam auf.', 'Nic secretly places an ad for Sam.'],
    [3, 'jemanden kennenlernen', 'to get to know someone', 'Ich möchte endlich nette Leute kennenlernen.', "I'd finally like to meet some nice people."],
    [3, 'sich verabreden', 'to arrange to meet', 'Wir haben uns für Freitag verabredet.', "We've arranged to meet on Friday."],
    [3, 'sich lustig machen über (+Akk)', 'to make fun of', 'Sascha und Nic machen sich über Anna lustig.', 'Sascha and Nic make fun of Anna.'],
    [3, 'enttäuscht sein', 'to be disappointed', 'Anna ist ziemlich enttäuscht.', 'Anna is rather disappointed.'],
    [3, 'schüchtern', 'shy', 'Anna ist eher schüchtern und zurückhaltend.', 'Anna is fairly shy and reserved.'],
    [3, 'selbstbewusst', 'self-confident', 'Nic ist ziemlich selbstbewusst.', 'Nic is pretty self-confident.'],
    [3, 'auf jemanden stehen', 'to fancy someone', 'Sascha steht auf starke Männer.', 'Sascha goes for strong men.'],
    [3, 'sich verlieben in (+Akk)', 'to fall in love with', 'Sam verliebt sich in Anna.', 'Sam falls in love with Anna.'],
    [3, 'absagen', 'to cancel (an arrangement)', 'Sie hat das Date wieder abgesagt.', 'She cancelled the date again.'],
    [3, 'der Traummann, die Traumfrau', 'dream man, dream woman', 'Sie sucht ihren Traummann.', "She's looking for her dream man."],
    [3, 'ehrlich, treu, humorvoll', 'honest, loyal, funny', 'Er soll ehrlich, treu und humorvoll sein.', 'He should be honest, loyal and funny.'],
    [3, 'Wie wäre es mit …?', 'How about …?', 'Wie wäre es mit Samstagabend?', 'How about Saturday evening?'],
    [3, 'jemandem gefallen', 'to appeal to someone', 'Der Typ gefällt mir eigentlich ganz gut.', 'I actually quite like that guy.'],
    [3, 'prahlen mit (+Dat)', 'to brag about', 'Nic prahlt damit, dass das für ihn ganz leicht ist.', 'Nic brags that it is dead easy for him.'],

    [4, 'eine Stelle suchen', 'to look for a job', 'Sam sucht eine Stelle in Berlin.', 'Sam is looking for a job in Berlin.'],
    [4, 'sich bewerben um (+Akk)', 'to apply for', 'Er bewirbt sich um einen Job als Kellner.', 'He applies for a job as a waiter.'],
    [4, 'der Lebenslauf', 'CV, résumé', 'Schick mir bitte deinen Lebenslauf.', 'Please send me your CV.'],
    [4, 'das Vorstellungsgespräch', 'job interview', 'Morgen habe ich ein Vorstellungsgespräch.', 'I have a job interview tomorrow.'],
    [4, 'der Kellner, bedienen', 'waiter, to wait on', 'Als Kellner muss man schnell bedienen.', 'As a waiter you have to serve quickly.'],
    [4, 'die Speisekarte', 'menu', 'Bringen Sie mir bitte die Speisekarte.', 'Please bring me the menu.'],
    [4, 'bestellen', 'to order', 'Was möchten Sie bestellen?', 'What would you like to order?'],
    [4, 'jemanden zum Essen einladen', 'to invite someone to dinner', 'Sascha lädt ihren Chef zum Essen ein.', 'Sascha invites her boss to dinner.'],
    [4, 'der Chef, die Chefin', 'boss', 'Ihr Chef heißt Stefan.', 'Her boss is called Stefan.'],
    [4, 'verdienen', 'to earn', 'Wie viel verdient man denn da?', 'So how much do you earn doing that?'],
    [4, 'die Erfahrung', 'experience', 'Ich habe leider keine Erfahrung als Kellner.', 'Unfortunately I have no experience as a waiter.'],
    [4, 'gute Manieren', 'good manners', 'Eigentlich hat Sam sehr gute Manieren.', 'Sam actually has very good manners.'],
    [4, 'jemanden anmachen', 'to hit on someone (pejorative)', 'Stefan macht Sascha ziemlich unangenehm an.', 'Stefan hits on Sascha rather unpleasantly.'],
    [4, 'kündigen', 'to quit, to give notice', 'Nach dem Abend will sie am liebsten kündigen.', "After that evening she'd rather just quit."],
    [4, 'auf die Probe stellen', 'to put to the test', 'Seine Fähigkeiten werden auf die Probe gestellt.', 'His skills are put to the test.'],

    [5, 'die Werbung', 'advertising, commercials', 'Anna liebt Fernsehwerbung.', 'Anna loves TV adverts.'],
    [5, 'der Werbespot', 'TV commercial', 'Sie spielt die Werbespots nach.', 'She acts out the commercials.'],
    [5, 'nachspielen', 'to act out, to reenact', 'Anna spielt die Spots im Wohnzimmer nach.', 'Anna reenacts the ads in the living room.'],
    [5, 'eifersüchtig sein auf (+Akk)', 'to be jealous of', 'Sascha ist eifersüchtig auf Anna.', 'Sascha is jealous of Anna.'],
    [5, 'das Rezept', 'recipe', 'Hast du ein Rezept für eine Eisbombe?', 'Do you have a recipe for an ice-cream bombe?'],
    [5, 'die Zutaten (Pl.)', 'ingredients', 'Uns fehlen noch ein paar Zutaten.', "We're still missing a few ingredients."],
    [5, 'die Lieblingsspeise', 'favourite dish', 'Die Schoko-Eisbombe ist ihre Lieblingsspeise.', 'The chocolate ice-cream bombe is her favourite dish.'],
    [5, 'der Wetterbericht', 'weather forecast', 'Nic macht jetzt den Wetterbericht.', 'Nic does the weather forecast now.'],
    [5, 'das Wetter vorhersagen', 'to forecast the weather', 'Er sagt im Fernsehen das Wetter voraus.', 'He forecasts the weather on television.'],
    [5, 'die Nachrichten (Pl.)', 'the news', 'Abends schauen sie die Nachrichten.', 'In the evening they watch the news.'],
    [5, 'sich blamieren', 'to embarrass oneself', 'Er blamiert sich vor der ganzen WG.', 'He embarrasses himself in front of the whole flatshare.'],
    [5, 'die Rolle', 'role, part', 'Er hat keine Rolle in der Serie bekommen.', "He didn't get a part in the series."],
    [5, 'jemanden links liegen lassen', 'to ignore someone', 'Sam lässt Sascha völlig links liegen.', 'Sam ignores Sascha completely.'],
    [5, 'sich Mühe geben', 'to make an effort', 'Er gibt sich große Mühe mit dem Essen.', 'He goes to a lot of trouble over the meal.'],
    [5, 'berühmt', 'famous', 'Plötzlich ist Nic fast berühmt.', 'Suddenly Nic is almost famous.'],

    [6, 'Lotto spielen', 'to play the lottery', 'Spielst du jeden Samstag Lotto?', 'Do you play the lottery every Saturday?'],
    [6, 'der Lottoschein', 'lottery ticket', 'Wo ist mein Lottoschein?', "Where's my lottery ticket?"],
    [6, 'die Zahlen ankreuzen', 'to tick the numbers', 'Kreuz sechs Zahlen an.', 'Tick six numbers.'],
    [6, 'der Gewinn', 'winnings, prize', 'Wie hoch ist der Gewinn?', 'How big is the prize?'],
    [6, 'Wenn ich gewinnen würde, …', 'If I won, …', 'Wenn ich gewinnen würde, würde ich um die Welt reisen.', "If I won, I'd travel around the world."],
    [6, 'Ich würde … kaufen.', 'I would buy …', 'Ich würde mir sofort ein Haus kaufen.', "I'd buy myself a house straight away."],
    [6, 'Glück haben', 'to be lucky', 'Heute habe ich wirklich Glück.', "I'm really in luck today."],
    [6, 'Pech haben', 'to be unlucky', 'So ein Pech, nur drei Richtige.', 'What bad luck – only three correct numbers.'],
    [6, 'Geld ausgeben', 'to spend money', 'Er gibt viel zu viel Geld aus.', 'He spends far too much money.'],
    [6, 'sparen', 'to save (money)', 'Wir sparen für den Urlaub.', "We're saving up for the holiday."],
    [6, 'sich etwas leisten können', 'to be able to afford something', 'Das kann ich mir nicht leisten.', "I can't afford that."],
    [6, 'die Ziehung', 'the draw', 'Die Ziehung ist heute Abend um acht.', 'The draw is at eight this evening.'],
    [6, 'teilen', 'to share, to split', 'Wir teilen den Gewinn durch vier.', "We'll split the winnings four ways."],
    [6, 'reich werden', 'to get rich', 'Damit wird man nicht reich.', "That won't make you rich."],

    [7, 'der Zwilling, die Zwillingsschwester', 'twin, twin sister', 'Sascha hat eine Zwillingsschwester: Maria.', 'Sascha has a twin sister: Maria.'],
    [7, 'sich ähnlich sehen', 'to look alike', 'Die beiden sehen sich unglaublich ähnlich.', 'The two of them look incredibly alike.'],
    [7, 'verwechseln', 'to mix up, to confuse', 'Die anderen verwechseln Maria mit Sascha.', 'The others mix Maria up with Sascha.'],
    [7, 'das Verwirrspiel', 'game of confusion, mix-up', 'Als Maria kommt, beginnt ein Verwirrspiel.', 'When Maria arrives, the mix-ups begin.'],
    [7, 'die Stimmung', 'mood, atmosphere', 'Ihre Stimmung ändert sich von einer Minute auf die andere.', 'Her mood changes from one minute to the next.'],
    [7, 'gut gelaunt sein', 'to be in a good mood', 'Eben war sie noch gut gelaunt.', 'She was in a good mood just a moment ago.'],
    [7, 'sich ausgeben als', 'to pass oneself off as', 'Maria gibt sich als Sascha aus.', 'Maria passes herself off as Sascha.'],
    [7, 'zaubern, der Zaubertrick', 'to do magic, magic trick', 'Anna lernt zaubern und zeigt einen Zaubertrick.', 'Anna is learning magic and performs a trick.'],
    [7, 'sich verkleiden', 'to dress up, to disguise oneself', 'Nic verkleidet sich als Arzt.', 'Nic dresses up as a doctor.'],
    [7, "Ich kann's nicht glauben!", "I can't believe it!", "Zwei Saschas? Ich kann's nicht glauben!", "Two Saschas? I can't believe it!"],
    [7, 'Dein Geheimnis ist sicher bei mir.', "Your secret's safe with me.", 'Keine Sorge, dein Geheimnis ist sicher bei mir.', "Don't worry, your secret's safe with me."],
    [7, 'das Gepäck verlieren', "to lose one's luggage", 'Sie hat unterwegs ihr Gepäck verloren.', 'She lost her luggage on the way.'],
    [7, 'genauso … wie', 'just as … as', 'Maria ist genauso groß wie Sascha.', 'Maria is exactly as tall as Sascha.'],
    [7, 'auffallen', 'to stand out, to be noticed', 'Ist euch denn gar nichts aufgefallen?', "Didn't any of you notice anything?"],
    [7, 'verrückt werden', 'to go crazy', 'Ist Sascha verrückt geworden?', 'Has Sascha gone mad?'],

    [8, 'die Kusine (Cousine)', 'female cousin', 'Die Kusine der Vermieterin kommt zu Besuch.', "The landlady's cousin is coming to visit."],
    [8, 'die Verwandten (Pl.)', 'relatives', 'Sie hat viele Verwandte in Berlin.', 'She has a lot of relatives in Berlin.'],
    [8, 'der Mietvertrag', 'lease, rental agreement', 'Steht das wirklich im Mietvertrag?', 'Is that really in the lease?'],
    [8, 'die Miete bezahlen', 'to pay the rent', 'Am Ersten müssen wir die Miete bezahlen.', 'We have to pay the rent on the first of the month.'],
    [8, 'sich benehmen', 'to behave', 'Benimm dich bitte einmal!', 'Please behave yourself for once!'],
    [8, 'streng', 'strict', 'Die Vermieterin ist unglaublich streng.', 'The landlady is incredibly strict.'],
    [8, 'die Regeln einhalten', 'to follow the rules', 'Wir halten die Regeln ein, versprochen.', "We'll stick to the rules, promise."],
    [8, 'vorbeikommen', 'to drop by', 'Sie kommt jede Woche unangemeldet vorbei.', 'She drops by unannounced every week.'],
    [8, 'aufräumen', 'to tidy up', 'Räum bitte schnell das Wohnzimmer auf.', 'Please tidy up the living room quickly.'],
    [8, 'einen guten Eindruck machen', 'to make a good impression', 'Wir wollen einen guten Eindruck machen.', 'We want to make a good impression.'],
    [8, 'sich verstecken', 'to hide (oneself)', 'Schnell, versteck dich im Schlafzimmer!', 'Quick, hide in the bedroom!'],
    [8, 'auf die Nerven gehen', "to get on someone's nerves", 'Das geht mir langsam auf die Nerven.', "That's starting to get on my nerves."],
    [8, 'der Besuch', 'visit, visitors', 'Wir haben heute Abend Besuch.', 'We have visitors this evening.'],
    [8, 'peinlich', 'embarrassing', 'Das war mir echt peinlich.', 'That was really embarrassing for me.'],

    [9, 'der Beruf', 'profession', 'Welcher Beruf passt eigentlich zu ihm?', 'Which profession actually suits him?'],
    [9, 'die Stellenanzeige', 'job advert', 'Ich habe eine gute Stellenanzeige gefunden.', "I've found a good job advert."],
    [9, 'geeignet sein für (+Akk)', 'to be suited to', 'Für diesen Job ist er nicht geeignet.', "He isn't suited to this job."],
    [9, 'die Fähigkeiten (Pl.)', 'skills, abilities', 'Welche Fähigkeiten bringst du mit?', 'What skills do you bring with you?'],
    [9, 'die Ausbildung', 'training, apprenticeship', 'Er hat keine Ausbildung gemacht.', "He didn't do any training."],
    [9, 'das Gehalt', 'salary', 'Wie hoch ist das Gehalt?', 'How much is the salary?'],
    [9, 'Vollzeit, Teilzeit', 'full-time, part-time', 'Ich suche eine Stelle in Teilzeit.', "I'm looking for a part-time position."],
    [9, 'die Probezeit', 'probation period', 'Die Probezeit dauert drei Monate.', 'The probation period lasts three months.'],
    [9, 'zuverlässig', 'reliable', 'Sie ist sehr zuverlässig.', 'She is very reliable.'],
    [9, 'pünktlich', 'punctual, on time', 'Bitte sei morgen pünktlich.', 'Please be on time tomorrow.'],
    [9, 'der Kollege, die Kollegin', 'colleague', 'Meine Kollegen sind ziemlich nett.', 'My colleagues are pretty nice.'],
    [9, 'Feierabend machen', 'to finish work for the day', 'Ich mache jetzt Feierabend.', "I'm finishing work for the day now."],
    [9, 'der Vertrag', 'contract', 'Hast du den Vertrag schon unterschrieben?', 'Have you signed the contract yet?'],
    [9, 'entlassen werden', 'to be let go, to be laid off', 'Er wurde letzte Woche entlassen.', 'He was let go last week.'],

    [10, 'demonstrieren', 'to demonstrate, to protest', 'Anna geht demonstrieren.', 'Anna is going to a protest.'],
    [10, 'die Demo, die Demonstration', 'demo, protest march', 'Gehst du morgen auf die Demo?', 'Are you going to the demo tomorrow?'],
    [10, 'protestieren gegen (+Akk)', 'to protest against', 'Sie protestieren gegen die neuen Pläne.', "They're protesting against the new plans."],
    [10, 'die Umwelt', 'the environment', 'Wir müssen die Umwelt besser schützen.', 'We have to protect the environment better.'],
    [10, 'das Plakat', 'poster, placard', 'Sie malt ein großes Plakat.', "She's painting a big placard."],
    [10, 'meiner Meinung nach', 'in my opinion', 'Meiner Meinung nach ist das falsch.', "In my opinion that's wrong."],
    [10, 'sich einsetzen für (+Akk)', 'to campaign for', 'Sie setzt sich für die Sache ein.', 'She campaigns for the cause.'],
    [10, 'die Unterschrift, unterschreiben', 'signature, to sign', 'Wir sammeln Unterschriften. Unterschreibst du?', "We're collecting signatures. Will you sign?"],
    [10, 'ungerecht', 'unfair, unjust', 'Das ist einfach ungerecht.', "That's simply unfair."],
    [10, 'Ich bin dafür. / Ich bin dagegen.', "I'm for it. / I'm against it.", 'Ich bin absolut dagegen.', "I'm absolutely against it."],
    [10, 'verbieten', 'to ban, to forbid', 'So etwas sollte man verbieten.', 'Something like that ought to be banned.'],
    [10, 'sich beschweren über (+Akk)', 'to complain about', 'Die Nachbarn beschweren sich über den Lärm.', 'The neighbours are complaining about the noise.'],
    [10, 'die Verantwortung', 'responsibility', 'Wir tragen alle Verantwortung.', 'We all bear responsibility.'],
    [10, 'überzeugen', 'to convince', 'Sie versucht, alle zu überzeugen.', 'She tries to convince everyone.'],

    [11, 'die Ferien vs. der Urlaub', 'school holidays vs. (work) holiday', 'Schüler haben Ferien, Berufstätige nehmen Urlaub.', 'Pupils have holidays; working people take leave.'],
    [11, 'verreisen', 'to go away, to travel', 'Wir verreisen Anfang August.', "We're going away at the beginning of August."],
    [11, 'den Koffer packen', 'to pack the suitcase', 'Hast du schon den Koffer gepackt?', 'Have you packed the suitcase yet?'],
    [11, 'zelten, der Campingplatz', 'to camp, campsite', 'Wir zelten auf einem Campingplatz am See.', "We're camping at a campsite by the lake."],
    [11, 'buchen', 'to book', 'Ich habe schon ein Hotel gebucht.', "I've already booked a hotel."],
    [11, 'die Unterkunft', 'accommodation', 'Die Unterkunft war überraschend günstig.', 'The accommodation was surprisingly cheap.'],
    [11, 'sich erholen', 'to rest, to recover', 'Ich muss mich mal richtig erholen.', 'I need a proper rest for once.'],
    [11, 'der Sonnenbrand', 'sunburn', 'Er hat einen üblen Sonnenbrand.', 'He has a nasty sunburn.'],
    [11, 'die Fahrkarte', 'ticket (train, bus)', 'Ich kaufe die Fahrkarten online.', "I'm buying the tickets online."],
    [11, 'ans Meer / in die Berge fahren', 'to go to the sea / to the mountains', 'Dieses Jahr fahren wir ans Meer.', "This year we're going to the seaside."],
    [11, 'das Heimweh', 'homesickness', 'Sam hat manchmal Heimweh.', 'Sam sometimes gets homesick.'],
    [11, 'Gute Reise!', 'Have a good trip!', 'Gute Reise, bis nächste Woche!', 'Have a good trip, see you next week!'],
    [11, 'die Sehenswürdigkeit', 'sight, attraction', 'Wir haben alle Sehenswürdigkeiten gesehen.', 'We saw all the sights.'],
    [11, 'sich sonnen', 'to sunbathe', 'Sie sonnt sich den ganzen Tag.', 'She sunbathes all day long.'],

    [12, 'verrückt nach (+Dat)', 'crazy about', 'Nic ist völlig verrückt nach Fußball.', 'Nic is completely mad about football.'],
    [12, 'die Mannschaft', 'team', 'Welche Mannschaft ist deine?', 'Which team is yours?'],
    [12, 'der Verein', 'club', 'Er spielt in einem kleinen Verein.', 'He plays for a small club.'],
    [12, 'ein Tor schießen', 'to score a goal', 'Er hat zwei Tore geschossen.', 'He scored two goals.'],
    [12, "Wie steht's?", "What's the score?", "Wie steht's? – Zwei zu eins.", "What's the score? – Two-one."],
    [12, 'unentschieden', 'a draw, tied', 'Das Spiel endete unentschieden.', 'The match ended in a draw.'],
    [12, 'der Schiedsrichter', 'referee', 'Der Schiedsrichter hat nichts gesehen.', "The referee didn't see a thing."],
    [12, 'der Elfmeter', 'penalty kick', 'Das war ganz klar ein Elfmeter!', 'That was clearly a penalty!'],
    [12, 'anfeuern', 'to cheer on', 'Wir feuern die Mannschaft an.', 'We cheer the team on.'],
    [12, 'die Halbzeit', 'half-time', 'In der Halbzeit holen wir was zu essen.', "At half-time we'll grab something to eat."],
    [12, 'jemandem die Daumen drücken', "to keep one's fingers crossed", 'Ich drücke dir die Daumen.', "I'll keep my fingers crossed for you."],
    [12, 'gewinnen, verlieren', 'to win, to lose', 'Wir haben leider wieder verloren.', 'Unfortunately we lost again.'],
    [12, 'das Endspiel', 'the final', 'Am Sonntag ist das Endspiel.', 'The final is on Sunday.'],
    [12, 'der Fan, die Fans', 'fan, fans', 'Die Fans sitzen schon vor dem Fernseher.', 'The fans are already sitting in front of the TV.'],

    [13, 'heiraten', 'to marry, to get married', 'Wollt ihr wirklich heiraten?', 'Do you two really want to get married?'],
    [13, 'sich verloben', 'to get engaged', 'Sie haben sich gestern verlobt.', 'They got engaged yesterday.'],
    [13, 'der Verlobte, die Verlobte', 'fiancé, fiancée', 'Das ist übrigens meine Verlobte.', 'This is my fiancée, by the way.'],
    [13, 'der Heiratsantrag', 'marriage proposal', 'Er hat ihr einen Heiratsantrag gemacht.', 'He proposed to her.'],
    [13, 'die Braut, der Bräutigam', 'bride, groom', 'Die Braut kommt natürlich zu spät.', 'The bride is late, of course.'],
    [13, 'die Vorbereitungen (Pl.)', 'preparations', 'Die Vorbereitungen dauern Wochen.', 'The preparations take weeks.'],
    [13, 'jemandem über den Kopf wachsen', 'to become too much for someone', 'Die Hochzeit wächst ihnen über den Kopf.', 'The wedding is getting to be too much for them.'],
    [13, 'absagen, abblasen', 'to call off', 'Sie beschließen, die Hochzeit abzublasen.', 'They decide to call the wedding off.'],
    [13, 'die Einladung', 'invitation', 'Hast du die Einladung schon bekommen?', 'Have you got the invitation yet?'],
    [13, 'die Flitterwochen (Pl.)', 'honeymoon', 'Wohin geht ihr in die Flitterwochen?', 'Where are you going on honeymoon?'],
    [13, 'Herzlichen Glückwunsch!', 'Congratulations!', 'Herzlichen Glückwunsch zur Hochzeit!', 'Congratulations on your wedding!'],
    [13, 'auf dem Weg sein', 'to be on the way', 'Sams Mutter ist schon auf dem Weg nach Berlin.', "Sam's mother is already on her way to Berlin."],
    [13, 'die Feier, feiern', 'celebration, to celebrate', 'Es soll eine große Feier werden.', "It's meant to be a big celebration."],
    [13, 'sich etwas wünschen', 'to wish for something', 'Heimlich wünscht sie sich auch einen Verlobten.', 'Secretly she wants a fiancé too.'],
  ];

  /* ---------- pure logic (exercised directly by tests) ---------- */

  // Stable per-card identity. Episode is part of the key so a term that
  // genuinely recurs in two episodes is scheduled independently.
  function keyOf(row) { return row[0] + '|' + row[1]; }

  // Indices into `data` for the current episode filter. `sel` is a set-like
  // object of episode number -> truthy.
  function activeIndices(data, all, sel) {
    const out = [];
    for (let i = 0; i < data.length; i++) {
      if (all || (sel && sel[data[i][0]])) out.push(i);
    }
    return out;
  }

  function isDue(entry, now) { return !entry || entry.d <= now; }

  // Leitner step. A miss drops all the way back to box 0 (due immediately);
  // a hit moves one box further out, capped at the last interval.
  function nextEntry(entry, correct, now) {
    const box = correct ? Math.min((entry ? entry.b : 0) + 1, INTERVALS.length - 1) : 0;
    return { b: box, d: now + INTERVALS[box] * DAY };
  }

  function dueIndices(data, indices, progress, now) {
    return indices.filter(i => isDue(progress[keyOf(data[i])], now));
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

  function summarize(data, indices, progress, now) {
    let fresh = 0, learning = 0, solid = 0, due = 0;
    for (const i of indices) {
      const p = progress[keyOf(data[i])];
      if (!p) fresh++;
      else if (p.b >= MASTERED_BOX) solid++;
      else learning++;
      if (isDue(p, now)) due++;
    }
    return { total: indices.length, fresh, learning, solid, due };
  }

  // Anki-friendly TSV: German, English, example, translation, tag.
  function toTSV(data, indices) {
    return indices.map(i => {
      const r = data[i];
      const ep = r[0] < 10 ? '0' + r[0] : String(r[0]);
      return [r[1], r[2], r[3], r[4], 'extra ep' + ep].join('\t');
    }).join('\n');
  }

  /* ---------- persistence (through the app's storage seam) ---------- */

  function loadProgress() {
    const S = global.Storage;
    if (!S || !S.loadDeck) return {};
    const rec = S.loadDeck(DECK_ID);
    return (rec && rec.cards) || {};
  }

  function saveProgress(progress) {
    const S = global.Storage;
    if (!S || !S.saveDeck) return;
    S.saveDeck(DECK_ID, { deckId: DECK_ID, version: 1, kind: 'extra-vocab', cards: progress });
  }

  /* ---------- view ---------- */

  let view = null;          // the mounted root element, or null when closed
  let onCloseHook = null;
  let all = true;
  let sel = {};
  let dir = 'de';           // 'de' = German first, 'en' = English first
  let progress = {};
  let queue = [];
  let current = null;       // index into DATA, or null
  let shown = false;
  let resetArmed = false;
  let resetTimer = null;

  function isOpen() { return view !== null; }
  function $x(id) { return view && view.querySelector('#' + id); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function indices() { return activeIndices(DATA, all, sel); }

  function build() {
    queue = shuffle(dueIndices(DATA, indices(), progress, Date.now()));
    current = null;
    shown = false;
  }

  function next() {
    shown = false;
    current = queue.length ? queue.shift() : null;
    render();
  }

  function renderPicker() {
    let h = '<button type="button" class="ep ep-all' + (all ? ' on' : '') +
            '" data-ep="all" aria-pressed="' + all + '">Alle Folgen</button>';
    for (let e = 1; e <= EPISODES.length; e++) {
      const on = !all && !!sel[e];
      h += '<button type="button" class="ep' + (on ? ' on' : '') + '" data-ep="' + e +
           '" aria-pressed="' + on + '"><b>' + (e < 10 ? '0' + e : e) + '</b><span>' +
           esc(EPISODES[e - 1]) + '</span></button>';
    }
    $x('ex-eps').innerHTML = h;
  }

  function renderStats() {
    const s = summarize(DATA, indices(), progress, Date.now());
    $x('ex-count').textContent = s.total + (s.total === 1 ? ' Karte' : ' Karten');
    $x('ex-stats').textContent =
      'Diese Runde noch: ' + (queue.length + (current === null ? 0 : 1)) +
      ' · neu: ' + s.fresh + ' · im Lernen: ' + s.learning + ' · gefestigt: ' + s.solid;
  }

  function gradesHTML() {
    return '<div class="gradehead">Wusstest du es?</div><div class="grades">' +
      '<button type="button" class="g0" data-g="0">Nein' +
        '<small><kbd>1</kbd>kommt in dieser Runde wieder</small></button>' +
      '<button type="button" class="g1" data-g="1">Ja' +
        '<small><kbd>2</kbd>für heute erledigt</small></button></div>';
  }

  function render() {
    const c = $x('ex-card');
    if (!c) return;
    if (current === null) {
      c.className = 'idle';
      c.removeAttribute('role');
      c.removeAttribute('tabindex');
      c.innerHTML = '<div class="empty">Für diese Auswahl ist gerade nichts fällig.<br>' +
        'Wähl weitere Folgen dazu oder komm später wieder.</div>';
      $x('ex-controls').innerHTML = '';
      renderStats();
      return;
    }
    c.setAttribute('role', 'button');
    c.setAttribute('tabindex', '0');
    const row = DATA[current];
    const front = dir === 'de' ? row[1] : row[2];
    const back = dir === 'de' ? row[2] : row[1];
    let h = '<div class="term' + (front.length > 26 ? ' small' : '') + '">' + esc(front) + '</div>';
    if (shown) {
      h += '<div class="answer"><div class="gloss">' + esc(back) + '</div>' +
           '<div class="ex">' + esc(row[3]) + '</div>' +
           '<div class="ex-en">' + esc(row[4]) + '</div></div>' +
           '<div class="tag">Folge ' + row[0] + ' · ' + esc(EPISODES[row[0] - 1]) + '</div>';
      c.className = 'rev';
    } else {
      h += '<div class="hint">Antippen oder Leertaste zum Umdrehen</div>';
      c.className = '';
    }
    c.innerHTML = h;
    $x('ex-controls').innerHTML = shown
      ? gradesHTML()
      : '<div class="flipbar"><button type="button" id="ex-flip">Umdrehen</button></div>';
    renderStats();
  }

  function flip() {
    if (current !== null && !shown) { shown = true; render(); }
  }

  function grade(g) {
    if (current === null || !shown) return;
    const k = keyOf(DATA[current]);
    progress[k] = nextEntry(progress[k], g === 1, Date.now());
    // A miss comes back a few cards later in the same round.
    if (g === 0) queue.splice(Math.min(queue.length, 4), 0, current);
    saveProgress(progress);
    next();
  }

  function closePanel() { const p = $x('ex-panel'); if (p) p.innerHTML = ''; }

  function disarmReset() {
    resetArmed = false;
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
    const b = $x('ex-reset');
    if (b) { b.textContent = 'Fortschritt löschen'; b.className = ''; }
  }

  function dirLabel() {
    $x('ex-dir').textContent = dir === 'de' ? 'Richtung: DE → EN' : 'Richtung: EN → DE';
  }

  function openExport() {
    const p = $x('ex-panel');
    if (p.innerHTML) { closePanel(); return; }
    const idx = indices();
    const tsv = toTSV(DATA, idx);
    p.innerHTML = '<div class="panel"><p>' + idx.length + ' Karten, tab-getrennt: Deutsch · Englisch · ' +
      'Beispiel · Übersetzung · Tag. In Anki über „Datei → Importieren“ einlesen, Feldtrenner Tab, letzte Spalte als Tags.</p>' +
      '<textarea id="ex-tsv" readonly></textarea>' +
      '<p style="margin:8px 0 0"><button type="button" id="ex-copy">Kopieren</button> ' +
      '<button type="button" id="ex-dl">Als Datei speichern</button></p></div>';
    $x('ex-tsv').value = tsv;
    $x('ex-copy').onclick = function () {
      const btn = this;
      const done = ok => {
        btn.textContent = ok ? 'Kopiert' : 'Bitte manuell kopieren';
        setTimeout(() => { btn.textContent = 'Kopieren'; }, 2500);
      };
      const ta = $x('ex-tsv');
      ta.focus();
      ta.select();
      if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tsv).then(() => done(true), () => done(legacyCopy()));
        return;
      }
      done(legacyCopy());
    };
    $x('ex-dl').onclick = function () {
      const btn = this;
      try {
        const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extra-vokabeln.tsv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        btn.textContent = 'Download blockiert – bitte kopieren';
      }
    };
  }

  function legacyCopy() {
    try { return document.execCommand('copy'); } catch (e) { return false; }
  }

  function onKey(ev) {
    if (!isOpen()) return;
    const t = ev.target;
    const tag = t && t.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    // Let buttons keep their native Enter/Space activation.
    if (tag === 'BUTTON' && (ev.key === ' ' || ev.key === 'Enter')) return;
    if (ev.key === ' ' || ev.key === 'Enter') {
      if (current !== null && !shown) { ev.preventDefault(); flip(); }
      return;
    }
    if (!shown) return;
    if (ev.key === '1' || ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); grade(0); }
    else if (ev.key === '2' || ev.key === 'j' || ev.key === 'J') { ev.preventDefault(); grade(1); }
  }

  const SHELL =
    '<div class="wrap">' +
      '<div class="mast">' +
        '<button type="button" class="ex-back" id="ex-back">← Menü</button>' +
        '<div class="logo">extr@</div>' +
        '<h1>Vokabelkarten zur Serie</h1>' +
        '<div class="count" id="ex-count"></div>' +
      '</div>' +
      '<div class="picker">' +
        '<div class="picker-head">Folgen auswählen</div>' +
        '<div class="eps" id="ex-eps"></div>' +
      '</div>' +
      '<div class="stage"><div id="ex-card" role="button" tabindex="0" aria-live="polite"></div></div>' +
      '<div id="ex-controls"></div>' +
      '<div class="tools">' +
        '<button id="ex-dir" type="button"></button>' +
        '<button id="ex-shuffle" type="button">Neu mischen</button>' +
        '<button id="ex-export" type="button">Exportieren</button>' +
        '<span class="spacer"></span>' +
        '<button id="ex-reset" type="button">Fortschritt löschen</button>' +
      '</div>' +
      '<div class="stats" id="ex-stats"></div>' +
      '<div id="ex-panel"></div>' +
    '</div>';

  function open(onClose) {
    if (view) return;
    onCloseHook = onClose || null;
    progress = loadProgress();
    view = document.createElement('div');
    view.id = 'extraView';
    view.innerHTML = SHELL;
    document.body.appendChild(view);
    document.body.classList.add('drill-open');

    $x('ex-eps').addEventListener('click', ev => {
      const b = ev.target.closest('[data-ep]');
      if (!b) return;
      const v = b.getAttribute('data-ep');
      if (v === 'all') { all = true; sel = {}; }
      else {
        const e = parseInt(v, 10);
        if (all) { all = false; sel = {}; sel[e] = true; }
        else {
          sel[e] = !sel[e];
          if (!Object.keys(sel).some(k => sel[k])) all = true;
        }
      }
      closePanel();
      renderPicker();
      build();
      next();
    });
    $x('ex-card').addEventListener('click', flip);
    $x('ex-controls').addEventListener('click', ev => {
      const flipBtn = ev.target.closest('#ex-flip');
      if (flipBtn) { flip(); return; }
      const b = ev.target.closest('[data-g]');
      if (b) grade(parseInt(b.getAttribute('data-g'), 10));
    });
    $x('ex-back').onclick = () => close();
    $x('ex-dir').onclick = () => { dir = dir === 'de' ? 'en' : 'de'; dirLabel(); render(); };
    $x('ex-shuffle').onclick = () => { build(); next(); };
    $x('ex-export').onclick = openExport;
    $x('ex-reset').onclick = function () {
      if (!resetArmed) {
        resetArmed = true;
        this.textContent = 'Wirklich löschen?';
        this.className = 'armed';
        resetTimer = setTimeout(() => { if (resetArmed) disarmReset(); }, 4000);
        return;
      }
      disarmReset();
      progress = {};
      saveProgress(progress);
      build();
      next();
    };

    document.addEventListener('keydown', onKey);
    if (global.history && history.pushState) {
      history.pushState({ extra: true }, '', '#extra');
    }

    renderPicker();
    dirLabel();
    build();
    next();
  }

  function close() {
    if (!view) return;
    document.removeEventListener('keydown', onKey);
    disarmReset();
    view.remove();
    view = null;
    document.body.classList.remove('drill-open');
    if (global.history && history.state && history.state.extra) history.back();
    const hook = onCloseHook;
    onCloseHook = null;
    if (hook) hook();
  }

  // Back-button support: engine-ui's popstate handler calls this after it has
  // ruled out an open drill. Tears down without touching history again.
  function handlePop() {
    if (!view) return false;
    document.removeEventListener('keydown', onKey);
    disarmReset();
    view.remove();
    view = null;
    document.body.classList.remove('drill-open');
    const hook = onCloseHook;
    onCloseHook = null;
    if (hook) hook();
    return true;
  }

  // Summary for the menu entry, computed without mounting the view.
  function menuSummary() {
    const p = loadProgress();
    return summarize(DATA, activeIndices(DATA, true, {}), p, Date.now());
  }

  const ExtraVocab = {
    DECK_ID, DAY, INTERVALS, MASTERED_BOX, EPISODES, DATA,
    keyOf, activeIndices, isDue, nextEntry, dueIndices, shuffle, summarize, toTSV,
    open, close, isOpen, handlePop, menuSummary,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtraVocab;
  } else {
    global.ExtraVocab = ExtraVocab;
  }
})(typeof window !== 'undefined' ? window : globalThis);
