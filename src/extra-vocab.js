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
    [1, 'die Tarantel', "tarantula; the girls' nickname for the landlady", 'Hilfe, es ist die Vermieterin! – Was? Die Tarantel?', "Help, it's the landlady! – What? The Tarantula?"],
    [1, 'übernachten', 'to stay the night', 'Ach so – er will hier übernachten.', 'Oh, I see – he wants to stay the night here.'],
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
    [1, 'auf jemanden stehen', 'to fancy someone, to go for someone', 'Sascha steht auf starke Männer mit starken Beinen.', 'Sascha goes for strong men with strong legs.'],
    [1, 'Es ist vorbei!', "It's over! (a relationship)", 'Jo, ich hab dir doch gesagt: Es ist vorbei!', "Jo, I told you: it's over!"],
    [1, 'heulen', 'to cry, to blubber (colloquial)', 'Und jetzt heul bitte nicht!', "And now please don't start crying!"],
    [1, 'Männer!', 'Men! (exasperated)', 'Sein Deutsch ist katastrophal! Männer!', 'His German is a disaster! Men!'],
    [1, 'Ach du liebe Zeit!', 'Oh my goodness! Good grief!', 'Ach du liebe Zeit! Jetzt erinnere ich mich wieder.', 'Good grief! Now I remember.'],
    [1, 'Das ist … Jahre her.', 'That was … years ago.', 'Er war mein Brieffreund. Aber das ist sieben Jahre her.', 'He was my pen pal. But that was seven years ago.'],
    [1, 'Was geht ab?', "What's up? (slang)", 'Na, Ladies, was geht so ab?', "So, ladies, what's up?"],
    [1, 'Mensch!', 'Man! Gosh! (exclamation)', 'Mensch, Sam, du bist total reich!', "Man, Sam, you're totally rich!"],
    [1, 'Kapiert?', 'Got it? (colloquial)', 'Wer mein Fahrrad anfasst, fliegt raus, kapiert?', 'Anyone who touches my bike is out, got it?'],
    [1, 'Mach mal langsam!', 'Slow down! Take it easy!', 'Hey, hey, hey! Mach mal langsam.', 'Hey, hey, hey! Take it easy.'],
    [1, 'die Bücherei, -en', 'library', 'Ich lese … Ich liebe die Bücherei.', 'I read … I love the library.'],
    [1, 'das Spielzeug', 'toy, toys', 'Sam spielt mit Spielzeugautos!', 'Sam plays with toy cars!'],
    [1, "Das gibt's doch nicht!", "I don't believe it! That can't be true!", "Er spielt mit Spielzeugautos. Das gibt's doch nicht!", "He plays with toy cars. I don't believe it!"],
    [1, 'süß', 'cute, sweet (of a person)', 'Aber er ist so süß …', "But he's so cute …"],
    [1, 'nebenan', 'next door', 'Ich bin Nic. Ich wohne nebenan.', "I'm Nic. I live next door."],
    [1, 'der Portier, -s', 'porter, doorman', 'Du bist der Portier, oder? – Portier? Ich bin Nic.', "You're the porter, right? – Porter? I'm Nic."],
    [1, 'Was ist denn mit dir los?', "What's wrong with you?", 'Gepäck? Wie bitte? Was ist denn mit dir los?', "Luggage? Pardon? What's wrong with you?"],
    [1, 'Pass auf!', 'Listen! Pay attention! / Watch out!', 'Also pass auf: Das hier ist der Ofen.', 'Now listen: this here is the oven.'],
    [1, "Das war's!", "That's it! (that does it)", "Das war's! Der Typ fliegt raus!", "That's it! The guy is out!"],
    [1, 'der Dienstbote, -n', 'servant', 'Und wer ist das? – Deine Dienstboten?', "And who's that? – Your servants?"],
    [1, 'Kein Wort zu …!', 'Not a word to …!', 'Kein Wort zu den Mädchen!', 'Not a word to the girls!'],
    [1, 'Ich muss los!', 'I have to go!', 'Was? Die Tarantel? Ich muss los!', 'What? The Tarantula? I have to go!'],
    [1, 'reich', 'rich', 'Familie Scott – eine der reichsten Familien Amerikas.', 'The Scott family – one of the richest families in America.'],
    [1, 'sich erinnern (an +Akk)', 'to remember', 'Der Brief ist von Sam! Jetzt erinnere ich mich wieder.', 'The letter is from Sam! Now I remember.'],
    [1, 'zurückbringen', 'to bring back, to return', 'Hallo Nic! – Ich bring eure Milch zurück.', "Hi Nic! – I'm bringing your milk back."],
    [1, 'Doch nicht etwa …?', 'Surely not …? (worried disbelief)', 'Unsere Milch? Doch nicht etwa die Milch von vor drei Wochen?', 'Our milk? Surely not the milk from three weeks ago?'],
    [1, 'männlich, weiblich', 'male, female', '„Sie“ ist ein „Er“. Sam ist männlich!', '"She" is a "he". Sam is male!'],
    [1, 'der Ami, -s', 'Yank, American (colloquial)', 'Ach so … ein cooler Ami, ja?', 'Oh, I see … a cool Yank, eh?'],
    [1, 'komisch', 'strange, weird (also: funny)', 'Saschas Brieffreund ist heute angekommen. Der Typ ist komisch!', "Sascha's pen pal arrived today. The guy is weird!"],
    [1, 'blöd', 'stupid, silly (colloquial)', 'Er hat gesagt: „Der Hund ist im Ofen.“ So ein blöder Witz!', 'He said: "The dog is in the oven." What a stupid joke!'],
    [1, '…, nicht wahr?', "…, isn't that right? (tag question)", 'Sam bleibt hier bei uns. Nicht wahr, Sam?', "Sam is staying here with us. Isn't that right, Sam?"],
    [1, 'der Ofen, Öfen', 'oven', 'Anna – der Hund ist im Ofen!', 'Anna – the dog is in the oven!'],
    [1, 'Das will ich sehen!', "I'd like to see that! (doubt)", 'Du kannst 50 Kilometer Fahrrad fahren? Niemals! Das will ich sehen.', "You can cycle 50 kilometres? Never! I'd like to see that."],
    [1, 'finden (+Akk + Adjektiv)', 'to think, to find (opinion)', 'Rot oder blau? – Blau finde ich besser. – Findest du?', 'Red or blue? – I think blue is better. – Do you think so?'],
    [1, 'wieso', 'why (colloquial for warum)', 'Der Typ fliegt raus! – Aber wieso? Er ist doch so nett …', "The guy is out! – But why? He's so nice …"],
    [1, 'Ich mach das schon.', "I'll handle it. Leave it to me.", 'Alles klar! Ich mach das schon.', "All right! I'll handle it."],
    [1, 'richtig', 'real, proper (also: correct)', 'Warum willst du hier wohnen? – Ich will richtige Freunde.', 'Why do you want to live here? – I want real friends.'],
    [1, 'schrecklich', 'terrible, awful', 'Die Leute mögen dich nur, weil du reich bist? Das ist ja schrecklich!', "People only like you because you're rich? That's terrible!"],
    [1, 'arm', 'poor (der Arm = arm)', 'Oh ja, der arme kleine Amerikaner!', 'Oh yes, the poor little American!'],
    [1, 'nennen', 'to call (by a name)', 'Sam, du kannst mich Cha Cha nennen.', 'Sam, you can call me Cha Cha.'],
    [1, 'hochkommen', 'to come up (the stairs)', 'Ja hallo? … Ja, kommen Sie bitte hoch.', 'Hello? … Yes, please come up.'],
    [1, 'verpassen', 'to miss (a show, a bus)', 'Nächstes Mal in Extra … Das dürft ihr nicht verpassen!', "Next time in Extra … You mustn't miss it!"],
    [1, 'was (= etwas)', 'something (colloquial)', 'Möchtest du was trinken, Nic?', 'Would you like something to drink, Nic?'],

    [2, 'einkaufen gehen', 'to go shopping', 'Wir gehen für Sam einkaufen.', "We're going shopping for Sam."],
    [2, 'das Hundefutter', 'dog food', 'Wir brauchen Eier, Äpfel, Hundefutter!', 'We need eggs, apples, dog food!'],
    [2, 'anprobieren', 'to try on', 'Das hier hab ich für dich – probier es mal an!', 'I got this for you – try it on!'],
    [2, 'der Kunde, die Kundin', 'customer', 'Ich bin der Verkäufer und du bist der Kunde.', "I'm the shop assistant and you're the customer."],
    [2, 'Welche Größe haben Sie?', 'What size do you take?', 'Welche Größe haben Sie? – Zweiundvierzig.', 'What size do you take? – Forty-two.'],
    [2, 'aussehen', 'to look (appearance)', 'Also, sehe ich cool aus?', 'So, do I look cool?'],
    [2, 'tragen', 'to wear; to carry', 'Du musst Designer-Klamotten tragen!', 'You have to wear designer clothes!'],
    [2, 'statt', 'instead of', 'Du hast Apfelsinen statt Äpfel gekauft!', 'You bought oranges instead of apples!'],
    [2, 'die Apfelsine, -n', 'orange (the fruit; also: die Orange)', 'So viele Apfelsinen!', 'So many oranges!'],
    [2, 'viel zu teuer', 'far too expensive', 'Das ist zu viel! Das ist viel zu teuer!', "That's too much! That's far too expensive!"],
    [2, 'Das macht … Euro.', 'That comes to … euros.', 'Das macht sechstausend Euro!', 'That comes to six thousand euros!'],
    [2, 'mit Karte zahlen', 'to pay by card', 'Kann ich mit einer Kreditkarte bezahlen?', 'Can I pay by credit card?'],
    [2, 'Kann ich Ihnen helfen?', 'Can I help you?', 'Guten Morgen. Kann ich Ihnen helfen?', 'Good morning. Can I help you?'],
    [2, 'messen', 'to measure', 'Welche Größe? – Dann müssen wir Sie messen.', "What size? – Then we'll have to measure you."],
    [2, 'erkältet sein', 'to have a cold', 'Sam, ich bin erkältet. – Ja, ich auch!', 'Sam, I have a cold. – Yes, me too!'],
    [2, 'der Schal, -s', 'scarf', 'Du meinst einen Schal für den Hals. Das hier ist ein Schaf.', 'You mean a scarf for your neck. This here is a sheep.'],
    [2, 'jemandem gefallen', 'to appeal to someone, to like', 'Gefällt Ihnen diese Hose?', 'Do you like these trousers?'],
    [2, 'Schluss machen', 'to stop, to sign off (also: to break up)', 'Muss Schluss machen! Bis bald!', 'Have to stop now! See you soon!'],
    [2, 'aufwachen', 'to wake up', 'Sam, wach auf! Raus aus dem Bett!', 'Sam, wake up! Out of bed!'],
    [2, 'der Schlafanzug', 'pyjamas', 'Cooler Schlafanzug!', 'Cool pyjamas!'],
    [2, 'hören auf (+Akk)', 'to listen to (take advice from)', 'Sam! Hör nicht auf Nic! Hör auf mich!', "Sam! Don't listen to Nic! Listen to me!"],
    [2, 'Das ist nichts für dich!', "That's not for you! (not your style)", 'Nein, Sam. Das ist nichts für dich!', "No, Sam. That's not for you!"],
    [2, 'die Lederjacke, -n', 'leather jacket', 'Er braucht eine Lederjacke – wie ich!', 'He needs a leather jacket – like me!'],
    [2, 'die Maschine, -n', 'machine; here: motorbike (colloquial)', 'Eine Lederjacke … und eine schnelle Maschine!', 'A leather jacket … and a fast motorbike!'],
    [2, 'der Verkäufer, die Verkäuferin', 'shop assistant, salesperson', 'Sascha und ich sind die Verkäuferinnen.', 'Sascha and I are the shop assistants.'],
    [2, 'Am besten …', "It's best if … / Best to …", 'Am besten, du antwortest nicht!', "It's best if you don't answer!"],
    [2, 'reinlassen', 'to let in', 'Und ach … lass die Tarantel nicht rein!', "And oh … don't let the Tarantula in!"],
    [2, "Mach's gut!", 'Take care! (goodbye)', "Tschüs, Sam! Mach's gut!", 'Bye, Sam! Take care!'],
    [2, 'es gut meinen', 'to mean well', 'Er hat es gut gemeint …', 'He meant well …'],
    [2, 'gespannt sein (auf +Akk)', 'to be eager to see, to be curious', 'Okay, wir sind schon gespannt!', "Okay, we can't wait to see!"],
    [2, 'Jetzt geht das wieder los!', 'Here we go again!', 'Jetzt geht das wieder los … Du kannst nicht allein einkaufen gehen!', "Here we go again … You can't go shopping on your own!"],
    [2, 'bis zum Umfallen', 'until you drop', 'Wir zeigen dir, wie man richtig einkauft – bis zum Umfallen!', "We'll show you how to shop properly – until you drop!"],
    [2, 'die heiße Zitrone', 'hot lemon (a drink for colds)', 'Wo ist meine heiße Zitrone, Nic?', "Where's my hot lemon, Nic?"],
    [2, 'das Taschentuch, -tücher', 'tissue, handkerchief', 'Nic! Sind hier noch irgendwo Taschentücher?', 'Nic! Are there any tissues left anywhere here?'],
    [2, 'Alter!', 'dude, mate (slang)', 'Wow, Alter! Total cool, Mensch!', 'Wow, dude! Totally cool, man!'],
    [2, 'merkwürdig', 'strange, odd', 'Das ist merkwürdig … das sind sehr viele Dosen.', "That's strange … that's a lot of cans."],
    [2, 'die Dose, -n', 'can, tin', 'Warum stehen 400 Dosen Hundefutter vor dem Eingang?', 'Why are there 400 cans of dog food at the entrance?'],
    [2, 'schlank', 'slim', 'Groß, schlank … ein cooler Amerikaner.', 'Tall, slim … a cool American.'],
    [2, 'immer noch', 'still', 'Schläft Sam immer noch? – Ja.', 'Is Sam still asleep? – Yes.'],
    [2, 'echt', 'really (colloquial); real, genuine', 'Das Auto ist echt cool. Du musst auch cool aussehen.', 'The car is really cool. You have to look cool too.'],
    [2, 'viel zu tun haben', 'to have a lot to do', 'Aber Sascha, du hast so viel zu tun. Ich geh mit ihm einkaufen.', "But Sascha, you've got so much to do. I'll go shopping with him."],
    [2, 'das Tuch, die Weste', 'neckerchief (cloth), waistcoat (vest)', 'Ein Jeanshemd, ein Tuch und eine Weste – der Cowboy-Look!', 'A denim shirt, a neckerchief and a waistcoat – the cowboy look!'],
    [2, 'allein', 'alone, on your own', 'Ich war allein einkaufen!', 'I went shopping on my own!'],
    [2, 'das Geschäft, -e', 'shop (also: business)', 'Also, das ist ein Geschäft. Ich verkaufe – und du kaufst.', 'So, this is a shop. I sell – and you buy.'],
    [2, 'die Packung, -en', 'pack, box, carton', 'Zwölf Packungen Eier? Das sind 144 Eier!', 'Twelve cartons of eggs? That is 144 eggs!'],
    [2, 'bestellen', 'to order', 'Na ja, er hat 12 Packungen Eier bestellt!', 'Well, he ordered 12 cartons of eggs!'],
    [2, 'genug', 'enough', 'Okay, Eier. Aber zwölf Eier sind doch genug!', 'Okay, eggs. But twelve eggs are enough!'],
    [2, 'überhaupt nicht', 'not at all (= gar nicht)', 'Nein, ich sehe überhaupt nicht cool aus.', "No, I don't look cool at all."],
    [2, 'schon mal (schon einmal)', 'ever, before', 'Sam, warst du schon einmal im Supermarkt?', 'Sam, have you ever been to a supermarket?'],
    [2, 'entscheiden', 'to decide', 'Wir haben entschieden! Wir zeigen dir, wie man richtig einkauft!', "We've decided! We'll show you how to shop properly!"],
    [2, 'etwa', 'about, roughly', 'Sechstausend Euro sind etwa sechstausend Dollar!', 'Six thousand euros is about six thousand dollars!'],
    [2, 'Ich komm ja schon!', "I'm coming, I'm coming! (impatient)", 'Hey! Bleib cool! Ich komm ja schon!', "Hey! Keep calm! I'm coming!"],
    [2, 'die Überraschung, -en', 'surprise', 'Und dann gibt es eine große Überraschung!', "And then there's a big surprise!"],
    [2, 'prima', 'great, excellent (colloquial)', 'Ach so, Eier, Äpfel und Hundefutter! Prima, Sam!', 'I see, eggs, apples and dog food! Great, Sam!'],

    [3, 'flirten', 'to flirt', 'Anna hat im Internet geflirtet!', 'Anna has been flirting on the internet!'],
    [3, 'wetten', 'to bet', 'Ich wette, ich kann eine Freundin übers Internet finden.', 'I bet I can find a girlfriend on the internet.'],
    [3, 'sich treffen', 'to meet (up)', 'Können wir uns heute treffen?', 'Can we meet today?'],
    [3, 'ausgehen', 'to go out (in the evening)', 'Hallo Nic und Sam! Wir gehen heute Abend aus!', "Hi Nic and Sam! We're going out tonight!"],
    [3, 'Igitt!', 'Yuck! Eww!', 'Igitt! Was ist denn das für ein Typ?', 'Eww! What kind of guy is that?'],
    [3, 'die Freundin, -nen', 'girlfriend (also: female friend)', 'Was? Du hast noch nie eine Freundin gehabt?', "What? You've never had a girlfriend?"],
    [3, 'der Lügner, die Lügnerin', 'liar', 'Hey, ich bin ein absoluter Tierfan … – Lügner!', "Hey, I'm a huge animal lover … – Liar!"],
    [3, 'sich auskennen', "to know all about something, to know one's way around", 'Ich kenn mich da aus, Sam, vertrau mir!', 'I know all about this, Sam, trust me!'],
    [3, 'wunderschön', 'beautiful, gorgeous', 'Du hast wunderschöne Augen.', 'You have beautiful eyes.'],
    [3, 'das Lächeln', 'smile', 'Dein Lächeln ist so süß …', 'Your smile is so sweet …'],
    [3, 'Mach meinen Traum wahr!', 'Make my dream come true!', 'Hallo Traum-Girl! Mach meinen Traum wahr!', 'Hello dream girl! Make my dream come true!'],
    [3, 'der Tierfan, -s', 'animal lover', 'Ich bin 19 und ein absoluter Tierfan.', "I'm 19 and a total animal lover."],
    [3, "Na gut … weil du's bist.", 'Oh, all right … just for you.', "Komm schon, Anna … – Na gut … weil du's bist.", 'Come on, Anna … – Oh, all right … just for you.'],
    [3, 'Na klar!', 'Of course! Sure!', 'Du hast schon Freundinnen gehabt? – Na klar! Total viele!', "You've had girlfriends before? – Of course! Loads!"],
    [3, 'Nanu?', "Huh? Well, what's this? (surprise)", 'Nanu? Was ist das denn?', "Huh? What's that?"],
    [3, 'startklar', 'ready to go', "Hey Leute, seid ihr startklar? Los geht's!", "Hey guys, are you ready to go? Let's go!"],
    [3, 'weitermachen', 'to carry on, to keep going', 'Na, mach weiter, Sam!', 'Come on, keep going, Sam!'],
    [3, 'schlappmachen', 'to give up, to flag (colloquial)', 'Hey, na los, nicht schlappmachen!', "Hey, come on, don't give up!"],
    [3, 'Mir tut … weh.', 'My … hurts.', 'Mir tun die Beine weh!', 'My legs hurt!'],
    [3, 'der Tierpräparator, -en', 'taxidermist', 'Sag mal … was ist ein Tierpräparator?', "Tell me … what's a taxidermist?"],
    [3, 'Schon gut!', "It's all right! Never mind!", 'Schon gut, Louis!', "It's all right, Louis!"],
    [3, 'Es kommt darauf an.', 'It depends.', 'Es kommt darauf an, wie du schreibst – und nicht was.', 'It depends on how you write – not what.'],
    [3, 'Doch!', 'Yes, I can / Yes, it is! (contradicting a negative)', 'Ich wette, du kannst das nicht! – Doch, ich kann das!', "I bet you can't do it! – Yes, I can!"],
    [3, 'die Waschmaschine, -n', 'washing machine', 'Sam? Mach mal die Waschmaschine an!', 'Sam? Switch on the washing machine!'],
    [3, 'Geht in Ordnung!', 'Sure! Will do!', 'Kannst du bitte meine Blumen mit Wasser besprühen? – Ja, geht in Ordnung!', 'Can you spray my flowers with water, please? – Sure, will do!'],
    [3, 'besprühen', 'to spray', 'Sam hat meine Pflanze mit Parfüm besprüht.', 'Sam sprayed my plant with perfume.'],
    [3, 'Genial!', "Brilliant! (not English 'genial')", 'Genial! Komm, das müssen wir feiern!', 'Brilliant! Come on, we have to celebrate!'],
    [3, 'riechen', 'to smell', "Päh! Wie riecht's denn hier?", "Ugh! What's that smell in here?"],
    [3, 'ahnen', 'to suspect, to have a hunch', 'Ich ahne etwas …', "I've got a feeling about this …"],
    [3, 'kleben', 'to stick, to glue', 'Die haben einfach ihre Fotos auf das Auto geklebt!', 'They simply stuck their photos on the car!'],
    [3, 'Das ist doch ein Witz!', "You must be joking! That's ridiculous!", 'Das ist doch ein Witz! Und dafür bekommen sie 633 E-Mails.', "That's ridiculous! And they get 633 emails for it."],
    [3, 'ungefähr', 'roughly, sort of', 'Tänzerinnen? – Ja, so ungefähr …', 'Dancers? – Yes, sort of …'],
    [3, 'sich anhören', 'to sound (like)', 'Die hören sich ja fantastisch an!', 'They sound fantastic!'],
    [3, 'glänzen', 'to shine', 'Dein Haar glänzt so schön …', 'Your hair shines so beautifully …'],
    [3, 'Sehr witzig!', 'Very funny! (sarcastic)', 'Sehr witzig! Und ein guter Trick, um mit Mädchen zu flirten.', 'Very funny! And a good trick to flirt with girls.'],
    [3, 'herausfinden', 'to find out', 'Nic findet heraus, dass Sam sehr, sehr reich ist.', 'Nic finds out that Sam is very, very rich.'],
    [3, 'Sport machen', 'to do sport, to exercise', 'Hallo Nic – wir machen Sport!', "Hi Nic – we're doing exercise!"],
    [3, 'Lass mich mal sehen!', 'Let me see!', 'Anna hat im Internet geflirtet … – Lass mich mal sehen!', 'Anna has been flirting on the internet … – Let me see!'],
    [3, 'Sag mal, …', 'Tell me … / Say … (to start a question)', 'Sag mal, Baby, willst du Tennis mit mir spielen?', 'Say, baby, do you want to play tennis with me?'],
    [3, 'ausgestopft', 'stuffed (dead animals)', 'Ich bin auch ein absoluter Tierfan! Ausgestopft sehen sie toll aus!', "I'm a total animal lover too! They look great stuffed!"],
    [3, 'die Pflanze, -n', 'plant', 'Meine Pflanze! Meine arme Pflanze!', 'My plant! My poor plant!'],
    [3, 'unglaublich', 'unbelievable; incredibly', 'Sie hat drei katastrophale Antworten bekommen! Unglaublich!', 'She got three disastrous replies! Unbelievable!'],
    [3, 'einfach', 'easy, simple; (adverb) simply, just', 'Im Internet flirten? Das ist total einfach!', "Flirting on the internet? That's totally easy!"],
    [3, 'Du weißt schon …', 'You know … (you know what I mean)', 'Freundinnen? – Du weißt schon, Freundinnen – na, Girls.', 'Girlfriends? – You know, girlfriends – well, girls.'],
    [3, 'noch nie', 'never (before), not ever', 'Ach so … keine Freundinnen … noch nie.', 'Oh, I see … no girlfriends … not ever.'],
    [3, 'leer', 'empty', 'Mein Parfüm ist leer!', 'My perfume is empty!'],
    [3, 'Wer war das?', 'Who did that?', 'Meine arme Pflanze! Das ist Mord! Wer war das?', 'My poor plant! This is murder! Who did that?'],
    [3, 'Schau dir das mal an!', 'Take a look at this!', '633 E-Mails! Jetzt schau dir das mal an.', '633 emails! Now take a look at this.'],
    [3, 'der Tänzer, die Tänzerin', 'dancer', 'Hallo Sam und Nic, wir sind zwei Ballett-Tänzerinnen.', "Hi Sam and Nic, we're two ballet dancers."],
    [3, 'zu Ende sein', 'to be over, to be finished', 'Wenn unsere Show zu Ende ist, treffen wir euch in eurer Wohnung!', "When our show is over, we'll meet you at your flat!"],
    [3, 'Wäsche waschen', 'to do the washing (laundry)', 'Und er hat Wäsche gewaschen. Aber sehr heiß!', 'And he did the washing. But very hot!'],
    [3, 'weniger als', 'fewer than, less than', 'Na ja … also … es waren schon weniger als 100 …', 'Well … um … it was actually fewer than 100 …'],
    [3, 'Nicht ganz.', 'Not quite.', 'Fünfzig? – Mmh … nicht ganz.', 'Fifty? – Hmm … not quite.'],
    [3, 'hecheln', 'to pant (like a dog)', 'Dein Hecheln ist so süß … – Nein! Nicht Hecheln! Dein Lächeln!', 'Your panting is so sweet … – No! Not panting! Your smile!'],

    [4, 'sich einen Job suchen', 'to look for a job (for oneself)', 'Ich … suche mir … einen Job!', "I'm … going to find myself … a job!"],
    [4, 'das Jobangebot, -e', 'job offer, job ad', 'Okay, hier sind Jobangebote aus dem Internet.', 'Okay, here are job offers from the internet.'],
    [4, 'die Rechnung, -en', 'bill (invoice; restaurant bill)', 'Wir können nicht mal die Rechnungen bezahlen.', "We can't even pay the bills."],
    [4, 'der Spitzname, -n', 'nickname', 'Sein Spitzname ist „Oktopus“!', 'His nickname is „Octopus“!'],
    [4, 'der Kellner, die Kellnerin', 'waiter, waitress', 'Nein, Nic. Sam soll als Kellner arbeiten.', 'No, Nic. Sam is supposed to work as a waiter.'],
    [4, 'die Speisekarte', 'menu', 'Nein! Nicht die Rechnung, die Speisekarte!', 'No! Not the bill, the menu!'],
    [4, 'das Gericht des Tages', 'dish of the day', 'Das Gericht des Tages ist Nudelauflauf.', 'The dish of the day is pasta bake.'],
    [4, 'zum Essen kommen', 'to come for a meal', 'Stefan, mein Chef, kommt zum Essen.', 'Stefan, my boss, is coming for dinner.'],
    [4, 'der Chef, die Chefin', 'boss', 'Ihr Chef heißt Stefan.', 'Her boss is called Stefan.'],
    [4, 'Ich zeig es dir!', "I'll show you!", 'Ja, hey, kein Problem! Ich zeig es dir!', "Yeah, hey, no problem! I'll show you!"],
    [4, 'der Gang', 'course (of a meal)', 'Der zweite Gang! Hühnersuppe!', 'The second course! Chicken soup!'],
    [4, 'der Schleimer', 'creep, slimeball (colloquial)', 'Warte nur, du Schleimer!', 'Just you wait, you creep!'],
    [4, 'kündigen', 'to quit, to give notice', 'Du bist gefeuert! – Zu spät! Ich kündige!', "You're fired! – Too late! I quit!"],
    [4, 'Du bist gefeuert!', "You're fired!", 'Tschüs, Stefan! – Du bist gefeuert!', "Bye, Stefan! – You're fired!"],
    [4, 'Geld ausgeben', 'to spend money', 'Ich würde nie Geld für dich ausgeben! Niemals!', "I'd never spend money on you! Never!"],
    [4, 'sparen', 'to save (money)', 'Genau, und da hast du das Geld dafür gespart.', "Exactly, and that's how you saved the money for it."],
    [4, 'fleißig', 'hard-working', 'Charakter: fleißig, zuverlässig, selbstbewusst, nervenstark.', 'Character: hard-working, reliable, self-confident, with nerves of steel.'],
    [4, 'wirken', 'to seem, to come across', 'Alter: zwanzig … nein, dreißig – das wirkt besser.', 'Age: twenty … no, thirty – that comes across better.'],
    [4, 'Aua! / Autsch!', 'Ow! / Ouch!', 'Aua, aua, autsch!', 'Ow, ow, ouch!'],
    [4, 'hart gekocht', 'hard-boiled', 'Möchte jemand schwarze, hart gekochte Eier?', 'Would anyone like black hard-boiled eggs?'],
    [4, 'Spinnst du?', 'Are you crazy? (colloquial)', 'Was machst du nur? Spinnst du?', 'What on earth are you doing? Are you crazy?'],
    [4, 'lieber', 'rather (preference)', 'Möchtest du lieber Käse?', 'Would you rather have cheese?'],
    [4, 'nicht mal', 'not even (colloquial for „nicht einmal“)', 'Ich wette, Stefan kann nicht mal Motorrad fahren.', "I bet Stefan can't even ride a motorbike."],
    [4, 'Warte mal.', 'Hang on. Wait a moment.', 'Warte mal. Hier! Das ist gut!', 'Hang on. Here! This is good!'],
    [4, 'gut aussehend', 'good-looking', 'Gut aussehende Kellner finde ich super!', 'I think good-looking waiters are great!'],
    [4, 'Ich habe nichts anzuziehen!', "I've got nothing to wear!", 'Was ziehe ich an? Hilfe! Ich habe nichts anzuziehen!', "What shall I wear? Help! I've got nothing to wear!"],
    [4, 'Das geht nicht!', "That won't work! That's not possible!", 'Hier? Nein, das geht nicht!', "Here? No, that won't work!"],
    [4, 'Komm schon!', 'Come on! (persuading)', 'Komm schon, Sascha. Bitte!', 'Come on, Sascha. Please!'],
    [4, 'Mach keinen Unsinn!', "Don't do anything silly!", 'Okay, aber mach keinen Unsinn! Stefan ist mein Chef!', "Okay, but don't do anything silly! Stefan is my boss!"],
    [4, 'der Nudelauflauf', 'pasta bake (Sam says „Pudelauflauf“: der Pudel = poodle)', 'Pudelauflauf? Du meinst Nudelauflauf!', 'Poodle bake? You mean pasta bake!'],
    [4, "Na, wie läuft's?", "So, how's it going?", "Na, wie läuft's? – Super! Nic ist ein super Lehrer!", "So, how's it going? – Great! Nic is a great teacher!"],
    [4, 'hübsch', 'pretty', 'Für die hübsche Sascha … von S.', 'For the pretty Sascha … from S.'],
    [4, 'sogar', 'even', 'Er hat mir sogar ein Kleid geschickt!', 'He even sent me a dress!'],
    [4, 'Keine Ursache.', "Don't mention it. You're welcome.", 'Oh, danke, Stefan. – Keine Ursache.', "Oh, thanks, Stefan. – Don't mention it."],
    [4, 'falsch', 'wrong; fake, insincere', 'Dein Lächeln ist total falsch.', 'Your smile is totally fake.'],
    [4, 'der Trottel', 'idiot, dope (rude)', 'Bring mir einen Kaffee, du Trottel!', 'Bring me a coffee, you idiot!'],
    [4, 'Das macht nichts.', "Never mind. It doesn't matter.", 'Es tut mir so leid. – Das macht nichts, Sam!', "I'm so sorry. – Never mind, Sam!"],
    [4, 'Geld ist nicht alles.', "Money isn't everything.", 'Weißt du, Geld ist wirklich nicht alles.', "You know, money really isn't everything."],
    [4, 'Das ist ja Klasse!', "That's great! (colloquial)", 'Mensch Sam, das ist ja Klasse!', "Wow, Sam, that's great!"],
    [4, 'deshalb', "that's why, therefore", 'Deshalb will ich euch Geld geben.', "That's why I want to give you money."],
    [4, 'als … arbeiten', 'to work as … (no article before the job)', 'Als was kann er arbeiten? – Als Gärtner? Oh nein!', 'What can he work as? – As a gardener? Oh no!'],
    [4, 'Mal sehen …', "Let's see …", 'Mal sehen … Was? So viel?', "Let's see … What? That much?"],
    [4, 'reden über (+Akk)', 'to talk about', 'Also Stefan, wollen wir über die Arbeit reden?', 'So, Stefan, shall we talk about work?'],
    [4, 'Lass uns …!', "Let's …!", 'Lass uns über dich und mich reden.', "Let's talk about you and me."],
    [4, 'nicht …, sondern …', 'not …, but (rather) …', 'Jetzt ist das nicht Claudias Kleid, sondern Saschas Kleid!', "Now it's not Claudia's dress, but Sascha's dress!"],
    [4, 'die Zeitschrift, -en', 'magazine', 'Das ist Claudias Kleid aus der Zeitschrift!', "That's Claudia's dress from the magazine!"],
    [4, 'lecker', 'tasty, delicious (colloquial)', 'Lecker! Mein Lieblingsessen.', 'Yummy! My favourite food.'],
    [4, 'das Schinkenbrot, -e', 'ham sandwich, bread with ham (Sam says „Stinke-Brot“: stinken = to stink)', 'Heute gibt es Stinke-Brot mit Ei. – Schinkenbrot!', "Today there's stink bread with egg. – Ham sandwich!"],
    [4, 'die Hühnersuppe', 'chicken soup (das Huhn, Hühner = chicken; Sam says „Hunde-Suppe“: der Hund = dog)', 'Was? Hunde-Suppe? – Hühnersuppe!', 'What? Dog soup? – Chicken soup!'],
    [4, 'Erfolg haben', 'to be successful', 'Mit deiner Figur wirst du auch viel Erfolg haben.', "With your figure you'll be very successful too."],
    [4, 'vergiften', 'to poison', 'Du Idiot! Willst du mich vergiften?', 'You idiot! Are you trying to poison me?'],
    [4, 'zurückschicken', 'to send back', 'Okay, wir schicken die teuren Kleider zurück.', "Okay, we'll send the expensive dresses back."],
    [4, 'als Dankeschön', 'as a thank-you', 'Aber warum schickst du uns Kleider? – Als Dankeschön …', 'But why are you sending us dresses? – As a thank-you …'],
    [4, 'werden', 'to become (Ich werde Stuntman. = I am going to be a stuntman.)', 'Nein! Ich werde Stuntman. So wie du, Nic!', "No! I'm going to be a stuntman. Just like you, Nic!"],
    [4, 'mitnehmen', 'to take along; to give someone a lift', 'Komm – ich nehm dich mit.', "Come on – I'll take you with me."],

    [5, 'die Werbung', 'advertising, commercials', 'Anna liebt Fernsehwerbung.', 'Anna loves TV adverts.'],
    [5, 'die Lieblingssendung', 'favourite (TV) programme', '„Der wahre Traum der Liebe“ ist Saschas Lieblingssendung.', "„The True Dream of Love“ is Sascha's favourite programme."],
    [5, 'nachspielen', 'to act out, to reenact', 'Anna spielt die Spots im Wohnzimmer nach.', 'Anna reenacts the ads in the living room.'],
    [5, 'Sei nicht böse!', "Don't be angry!", 'Sascha, bitte sei nicht böse!', "Sascha, please don't be angry!"],
    [5, 'schmelzen lassen', 'to melt (let something melt)', 'Die Schokolade über heißem Wasser schmelzen lassen.', 'Melt the chocolate over hot water.'],
    [5, 'die Eier trennen', 'to separate the eggs', 'Nun müsst ihr die Eier trennen – in zwei Schalen.', 'Now you have to separate the eggs – into two bowls.'],
    [5, 'Liebe geht durch den Magen.', "The way to someone's heart is through their stomach.", 'Liebe geht durch den Magen? Was bedeutet das?', 'The way to the heart is through the stomach? What does that mean?'],
    [5, 'der Wetterbericht', 'weather forecast', 'Nic macht jetzt den Wetterbericht.', 'Nic does the weather forecast now.'],
    [5, 'der Regenschirm, -e', 'umbrella', 'Vergessen Sie nicht Ihren Regenschirm!', "Don't forget your umbrella!"],
    [5, 'Was kommt im Fernsehen?', "What's on TV?", 'Also, was kommt im Fernsehen?', "So, what's on TV?"],
    [5, 'hinter jemandem her sein', 'to be after someone, to chase someone', 'Sie waren alle hinter mir her!', 'They were all after me!'],
    [5, 'die Rolle', 'role, part', 'Ich hab die Rolle! Ich hab die Rolle!', "I've got the part! I've got the part!"],
    [5, 'anklopfen', 'to knock (on the door)', 'Sam, du wohnst jetzt bei Nic, also klopf bitte an!', "Sam, you live at Nic's now, so please knock!"],
    [5, 'vermischen', 'to mix', 'Das Eigelb mit der Schokolade vermischen.', 'Mix the egg yolk with the chocolate.'],
    [5, 'es schaffen', 'to make it, to manage it', 'Nic, du hast es geschafft! Heute Berlin … morgen Hollywood!', "Nic, you've made it! Berlin today … Hollywood tomorrow!"],
    [5, 'das Ekel', 'nasty person, creep (das Ekel = person; der Ekel = disgust)', 'Und ihr Mann ist so ein Ekel …', 'And her husband is such a creep …'],
    [5, 'Du bist dran.', "It's your turn.", 'Du bist dran! Geh bitte ans Telefon.', "It's your turn! Please answer the phone."],
    [5, 'doof', 'stupid, dumb (colloquial)', '„Kurt Knall“ – so ein doofer Name!', '„Kurt Knall“ – what a stupid name!'],
    [5, 'die Razzia', 'police raid', 'Razzia! – FBI! Keine Bewegung!', "Raid! – FBI! Don't move!"],
    [5, 'Hier ist viel los.', "There's a lot going on here.", 'In dieser Wohnung ist sehr viel los!', "There's a lot going on in this flat!"],
    [5, 'das Schätzchen', 'sweetie, darling (colloquial)', 'Sascha, Schätzchen – hat jemand für mich angerufen?', 'Sascha, sweetie – did anybody call for me?'],
    [5, 'seine Ruhe haben', 'to have peace and quiet', 'Nie habe ich meine Ruhe hier!', 'I never get any peace here!'],
    [5, 'halb sieben', 'half past six (6:30, not 7:30)', 'Ich weiß es … es ist halb sieben.', "I know … it's half past six."],
    [5, 'Es geht um …', "It's about …", 'Es geht um einen Jungen aus Amerika und ein Mädchen aus Deutschland.', "It's about a boy from America and a girl from Germany."],
    [5, 'sich hinsetzen', 'to sit down', 'Komm herein, setz dich hin und schließ die Augen.', 'Come in, sit down and close your eyes.'],
    [5, 'probieren', 'to taste, to try', 'Willst du ein Stück vom Paradies probieren?', 'Do you want to taste a piece of paradise?'],
    [5, 'riesig', 'huge', 'Jeden Abend um sechs, vor einem riesigen Publikum!', 'Every evening at six, in front of a huge audience!'],
    [5, 'Das würde dir so passen!', "You'd like that, wouldn't you! (ironic)", 'Ha! Das würde dir so passen!', "Ha! You'd like that, wouldn't you!"],
    [5, 'eigentlich', 'actually; (in questions) anyway', 'Was ist eigentlich los hier?', 'What is going on here, anyway?'],
    [5, 'spannend', 'exciting, thrilling', 'Heiß und stürmisch … ein Drama! Wie spannend!', 'Hot and stormy … a drama! How exciting!'],
    [5, 'einen großen Abgang machen', 'to make a grand exit', 'So machen alle Superstars einen ganz großen Abgang!', 'This is how all superstars make a really grand exit!'],
    [5, 'Was meinst du damit?', 'What do you mean by that?', 'Zu viel Werbung? Was meinst du damit?', 'Too many ads? What do you mean by that?'],
    [5, 'Gut gemacht!', 'Well done!', 'Korrekt! Gut gemacht!', 'Correct! Well done!'],
    [5, 'köstlich', 'delicious', 'Ich zeige Ihnen, wie man eine köstliche Schoko-Eisbombe macht.', "I'll show you how to make a delicious chocolate ice-cream bombe."],
    [5, 'der Fleck, -en', 'stain', 'Als Mutter kämpfe ich täglich gegen schwierige Flecken.', 'As a mother I fight stubborn stains every day.'],
    [5, 'Hoppla!', 'Oops!', 'Anna, hast du mein neues rotes T-Shirt gesehen? – Hoppla.', 'Anna, have you seen my new red T-shirt? – Oops.'],
    [5, 'am Apparat', 'on the line, speaking (phone)', 'Mr. Spielberg ist am Apparat.', 'Mr Spielberg is on the line.'],
    [5, 'das Eigelb, das Eiweiß', 'egg yolk, egg white (das Eiweiß also means protein)', 'Zum Schluss das Eiweiß zur Schokolade geben.', 'Finally, add the egg white to the chocolate.'],
    [5, 'verquirlen', 'to whisk', 'Na los! Das Eiweiß verquirlen!', 'Go on! Whisk the egg white!'],
    [5, 'Das war aber nicht nötig!', "You shouldn't have!", 'Ach, Sam – Schoko-Eisbombe! Das war aber nicht nötig!', "Oh, Sam – chocolate ice-cream bombe! You shouldn't have!"],
    [5, 'umschalten', 'to switch channels', 'Sechs Uhr! Schnell – umschalten!', "Six o'clock! Quick – switch channels!"],
    [5, 'Das freut mich.', "I'm glad.", 'Oh Sam, das war ein Spaß! – Das freut mich.', "Oh Sam, that was fun! – I'm glad."],
    [5, 'der Agent, die Agentin', 'agent', 'Als Ihre Agentin bekomme ich zehn Prozent.', 'As your agent I get ten per cent.'],
    [5, 'der Anruf, -e', 'phone call', 'Verrückte Anrufe … verrückte Namen … und jetzt das FBI!', 'Crazy calls … crazy names … and now the FBI!'],
    [5, 'Hände hoch!', 'Hands up!', 'Hände hoch … Hände hoch, nicht Beine hoch!', 'Hands up … hands up, not legs up!'],
    [5, 'Du solltest …', 'You should …', 'Du solltest deine Rechnungen bezahlen!', 'You should pay your bills!'],
    [5, 'um Punkt …', 'at … on the dot, at … sharp', 'Jeden Abend um Punkt sechs!', 'Every evening at six on the dot!'],
    [5, 'danken (+Dat)', 'to thank', 'Und ich möchte meinen Eltern danken …', "And I'd like to thank my parents …"],
    [5, 'Wir sehen uns …!', "See you …! We'll meet …!", 'Auf Wiedersehen, Nic! Wir sehen uns bei den Oscars!', 'Goodbye, Nic! See you at the Oscars!'],
    [5, 'sich (Dat) etwas ansehen', 'to watch, to look at (something)', 'Ich glaube, du siehst dir zu viel Werbung an.', 'I think you watch too many adverts.'],
    [5, 'Weißt du noch, …?', 'Do you remember …?', 'Weißt du noch, mit dem neuen Waschmittel?', 'Do you remember, with the new detergent?'],
    [5, 'das Waschmittel, -', 'detergent, washing powder', 'Ich werde ein Hemd mit normalem Waschmittel waschen.', 'I will wash one shirt with normal detergent.'],
    [5, 'sauber, schmutzig', 'clean, dirty', 'Das Hemd mit dem normalen Waschmittel ist … noch schmutzig.', 'The shirt with the normal detergent is … still dirty.'],
    [5, 'irgendwo', 'somewhere; (in questions) anywhere', 'Anna, hast du irgendwo mein neues rotes Designer-T-Shirt gesehen?', 'Anna, have you seen my new red designer T-shirt anywhere?'],
    [5, 'der Unterschied, -e', 'difference', 'Der Unterschied ist: „A“ ist mit Kaninchen und „B“ ist mit Huhn!', "The difference is: 'A' is with rabbit and 'B' is with chicken!"],
    [5, 'Ich glaube schon.', 'I think so.', 'Weißt du jetzt, was ich meine? – Ich glaube schon.', 'Do you know what I mean now? – I think so.'],
    [5, 'Das heißt, …', 'That means …; that is …', 'Das heißt, wenn du das Mädchen liebst, dann koch für sie!', 'That means: if you love the girl, cook for her!'],
    [5, 'spazieren gehen', 'to go for a walk', 'Ich muss mit Louis spazieren gehen!', 'I have to take Louis for a walk!'],
    [5, 'dazugeben', 'to add (in cooking)', 'Die Butter dazugeben …', 'Add the butter …'],
    [5, 'der Süden, der Norden, der Osten, der Westen', 'south, north, east, west', 'Im Süden wird es heiß! Im Westen wird es windig.', 'In the south it will be hot! In the west it will be windy.'],

    [6, 'im Lotto gewinnen', 'to win the lottery', 'Anna, ich habe im Lotto gewonnen!', "Anna, I've won the lottery!"],
    [6, 'der Lottoschein', 'lottery ticket', 'Wo ist mein Lottoschein?', "Where's my lottery ticket?"],
    [6, 'sich (Dat) etwas aussuchen', 'to pick, to choose (for oneself)', 'Ich suche mir fünf Zahlen aus.', 'I pick five numbers.'],
    [6, 'der Gewinn', 'winnings, prize', 'Der Gewinn muss bis zehn Uhr heute Abend gemeldet werden.', "The win must be claimed by ten o'clock tonight."],
    [6, 'wegschenken', 'to give away', 'Und ich würde auch viel Geld wegschenken.', 'And I would give away a lot of money too.'],
    [6, 'im Luxus leben', 'to live in luxury', 'Von nun an werden wir im Luxus leben!', "From now on we'll live in luxury!"],
    [6, 'Glück haben', 'to be lucky', 'Heute habe ich wirklich Glück.', "I'm really in luck today."],
    [6, 'Unglück bringen', 'to bring bad luck', 'Diese Farbe bringt mir sehr viel Unglück.', 'This colour brings me a lot of bad luck.'],
    [6, 'weg sein', 'to be gone', 'Mein Lottoschein ist weg!', 'My lottery ticket is gone!'],
    [6, 'die Ziehung', 'the draw', 'Und nun die Ziehung der Lottozahlen!', 'And now the lottery draw!'],
    [6, 'sich (Dat) eine Wohnung teilen', 'to share a flat', 'Sascha und Anna teilen sich eine Wohnung in Berlin.', 'Sascha and Anna share a flat in Berlin.'],
    [6, 'Das ist deine Schuld!', "That's your fault!", 'Das ist auch deine Schuld!', 'This is your fault too!'],
    [6, 'verdienen', 'to earn', 'Ich habe Windschutzscheiben gewaschen und 100 Euro verdient!', 'I washed windscreens and earned 100 euros!'],
    [6, 'der Glückstag, der Unglückstag', 'lucky day, unlucky day', 'Heute ist mein Glückstag!', 'Today is my lucky day!'],
    [6, 'ausziehen', 'to take off (clothes)', 'Dein Hemd … zieh es aus!', 'Your shirt … take it off!'],
    [6, 'anhaben', 'to have on, to wear', 'Niemand darf etwas Oranges anhaben.', 'Nobody is allowed to wear anything orange.'],
    [6, 'ruhig bleiben', 'to stay calm', 'Aber ich weiß, wie ich ruhig bleiben kann.', 'But I know how I can stay calm.'],
    [6, 'abholen', 'to pick up, to collect', 'Kannst du mein Kleid von der Reinigung abholen?', "Can you pick up my dress from the dry cleaner's?"],
    [6, 'die Reinigung', "dry cleaner's", "Ich hab's! Wir gehen zur Reinigung!", "I've got it! We'll go to the dry cleaner's!"],
    [6, 'der Schein, -e', 'slip, ticket (also: banknote)', 'Der blaue Schein hängt am Brett.', 'The blue slip is hanging on the board.'],
    [6, 'die Puppe, -n', 'doll; (colloquial, dated) babe', 'Sam, heute habe ich eine Puppe kennengelernt.', 'Sam, today I met a real babe.'],
    [6, 'die Ampel, -n', 'traffic lights', 'Sie stand an der Ampel in ihrem Sportauto.', 'She was waiting at the traffic lights in her sports car.'],
    [6, 'der Kumpel', 'mate, buddy (colloquial)', 'He, Kumpel – vielleicht hat sie eine Schwester!', 'Hey, mate – maybe she has a sister!'],
    [6, 'mit jemandem auf Du und Du sein', 'to be on first-name terms with someone', 'Bald sind wir mit den Stars auf Du und Du.', "Soon we'll be on first-name terms with the stars."],
    [6, 'eine Nachricht hinterlassen', 'to leave a message', 'Wenn Sie eine Nachricht hinterlassen, rufen wir Sie zurück.', "If you leave a message, we'll call you back."],
    [6, 'abhauen', 'to clear off, to leave (colloquial)', "Ich kündige, ich gehe, ich hau' ab!", "I quit, I'm leaving, I'm out of here!"],
    [6, 'Stecken Sie sich Ihren Job an den Hut!', 'You can keep your job! (rude)', 'Klaus, ich kündige – stecken Sie sich Ihren Job an den Hut!', 'Klaus, I quit – you can keep your job!'],
    [6, 'Auf Wiederhören!', 'Goodbye! (on the phone)', 'Auf Wiederhören! – Gut! Das war klar und deutlich.', 'Goodbye! – Good! That was loud and clear.'],
    [6, 'verschwinden', 'to disappear', 'Ihr Lottoschein ist verschwunden!', 'Her lottery ticket has disappeared!'],
    [6, 'grinsen', 'to grin', 'Und du, hör auf zu grinsen!', 'And you, stop grinning!'],
    [6, 'nachdenken', 'to think (hard), to reflect', 'Na los! Denkt! Denkt nach!', 'Come on! Think! Think hard!'],
    [6, 'der Ärger', 'trouble', 'Krebs: Heute gibt es Ärger zu Hause.', 'Cancer: today there will be trouble at home.'],
    [6, 'Das kannst du laut sagen!', 'You can say that again!', 'Ärger zu Hause? Na, das kannst du laut sagen!', 'Trouble at home? Well, you can say that again!'],
    [6, 'der Müll', 'rubbish, trash', 'Ein Müllmann kann im Müll suchen!', 'A dustman can search through the rubbish!'],
    [6, 'auf dem Kopf stehen', 'to be upside down', 'Löwe: Ihr Leben wird auf dem Kopf stehen!', 'Leo: your life will be turned upside down!'],
    [6, 'vorhin', 'earlier, a little while ago', 'Der hat vorhin auf meinem Bett geschlafen.', 'He was sleeping on my bed a little while ago.'],
    [6, 'Gib her!', 'Give it here!', 'Das ist mein Lottoschein! Gib her!', "That's my lottery ticket! Give it here!"],
    [6, 'gehören (+Dat)', 'to belong to', 'Es ist mein Lottoschein … er gehört mir!', "It's my lottery ticket … it belongs to me!"],
    [6, 'der Löwe, der Krebs', 'Leo, Cancer (star signs; also: lion, crab)', 'Löwe: Heute werden Sie eine Veränderung im Beruf haben.', 'Leo: today you will have a change at work.'],
    [6, 'die Reihenfolge, -n', 'order, sequence', 'Und jetzt die Kissen in der speziellen Reihenfolge – grün … lila …', 'And now the cushions in the special order – green … purple …'],
    [6, 'niemand', 'nobody, no one (Akk: niemanden)', 'Sascha darf vor dem Lotto niemanden in dieser Farbe sehen!', "Before the lottery Sascha mustn't see anyone in this colour!"],
    [6, 'kennenlernen', 'to meet (for the first time), to get to know', 'Und wo hast du sie kennengelernt?', 'And where did you meet her?'],
    [6, 'beschäftigt sein', 'to be busy', 'Hallo, Mutter … Ich bin gerade beschäftigt …', "Hello, Mother … I'm busy right now …"],
    [6, 'kein … mehr', 'no more …, not … any more', 'Keine Arbeit mehr! Keine Chefs mehr!', 'No more work! No more bosses!'],
    [6, 'gleich', 'right away, in a moment', 'Genau, ich rufe gleich an und kündige.', "Exactly, I'll call right away and quit."],
    [6, 'ab heute', 'from today, from now on', 'Ab heute ist Sascha der Chef!', 'From today, Sascha is the boss!'],
    [6, 'die Neuigkeit, -en', '(piece of) news', 'Die gute Neuigkeit: Sascha hat im Lotto gewonnen!', 'The good news: Sascha has won the lottery!'],
    [6, 'die Mädels (Pl.)', 'girls (colloquial)', 'Ja, zwei Mädels an einem Tag! Alle Frauen lieben mich!', 'Yes, two girls in one day! All women love me!'],
    [6, 'Da steht … drauf.', '… is written on it.', 'Da steht Elkes Nummer drauf!', "Elke's number is on it!"],
    [6, 'der Laden, Läden', 'shop, store', 'Und dann waren wir beim Motorradladen. Super!', 'And then we were at the motorbike shop. Great!'],
    [6, 'unternehmen', 'to do (take action about something)', 'Also, was wollt ihr unternehmen?', 'So, what are you going to do?'],
    [6, 'die Suche (nach +Dat)', 'search (for)', 'Viel Glück bei der Suche nach dem Schein!', 'Good luck with the search for the ticket!'],
    [6, 'jemand anders', 'someone else', 'Also musst du jemand anders sein.', 'So you have to be someone else.'],
    [6, 'Wo bleibt …?', "Where's … got to? What's keeping …?", 'Wo bleibt Sam? Wo ist mein Schein?', "Where's Sam got to? Where's my ticket?"],
    [6, 'füttern', 'to feed (an animal)', 'Zehn vor zehn, und ich habe Louis nicht gefüttert!', "Ten to ten, and I haven't fed Louis!"],
    [6, 'endlich', 'finally, at last', 'Das heißt, wenn Sascha endlich fertig ist …', 'That is, when Sascha is finally finished …'],
    [6, 'Ich habe alle Zeit der Welt!', "I've got all the time in the world!", 'Ja, natürlich warte ich – ich habe alle Zeit der Welt!', "Yes, of course I'll wait – I've got all the time in the world!"],
    [6, 'Das war doch gar nichts.', 'It was nothing.', 'Bravo, Sam! – Ach, das war doch gar nichts …', 'Well done, Sam! – Oh, it was nothing …'],
    [6, 'der Anrufbeantworter, -', 'answering machine', 'Hey, schau! Da ist der Anrufbeantworter …', "Hey, look! There's the answering machine …"],

    [7, 'der Zwilling, die Zwillingsschwester', 'twin, twin sister', 'Sascha hat eine Zwillingsschwester: Maria.', 'Sascha has a twin sister: Maria.'],
    [7, 'sich ähnlich sehen', 'to look alike', 'Die beiden sehen sich unglaublich ähnlich.', 'The two of them look incredibly alike.'],
    [7, 'verwechseln', 'to mix up, to confuse', 'Die anderen verwechseln Maria mit Sascha.', 'The others mix Maria up with Sascha.'],
    [7, 'verwirrt sein', 'to be confused', 'Sam ist verwirrt: Sascha ist heute so komisch.', 'Sam is confused: Sascha is acting so strange today.'],
    [7, 'sich benehmen', 'to behave', 'Sascha, du hast dich so komisch benommen …', "Sascha, you've been acting so strangely …"],
    [7, 'sich ausgeben als', 'to pass oneself off as', 'Beim Zaubertrick gibt sich Maria als Sascha aus.', 'In the magic trick, Maria passes herself off as Sascha.'],
    [7, 'zaubern, der Zaubertrick', 'to do magic, magic trick', 'Anna lernt zaubern und zeigt einen Zaubertrick.', 'Anna is learning magic and performs a trick.'],
    [7, 'sich verkleiden', 'to dress up, to disguise oneself', 'Nic verkleidet sich als Arzt.', 'Nic dresses up as a doctor.'],
    [7, "Ich kann's nicht glauben!", "I can't believe it!", "Du gehst mit Sam ins Kino? Ich kann's nicht glauben!", "You're going to the cinema with Sam? I can't believe it!"],
    [7, 'Dein Geheimnis ist sicher bei mir.', "Your secret's safe with me.", 'Keine Sorge, dein Geheimnis ist sicher bei mir.', "Don't worry, your secret's safe with me."],
    [7, 'das Gepäck verlieren', "to lose one's luggage", 'Sie hat unterwegs ihr Gepäck verloren.', 'She lost her luggage on the way.'],
    [7, 'aussehen wie', 'to look like', 'Du siehst immer noch aus wie ein Teenager!', 'You still look like a teenager!'],
    [7, 'bemerken', 'to notice', 'Nic bemerkt mich gar nicht …', "Nic doesn't even notice me …"],
    [7, 'Sehnsucht haben nach (+Dat)', 'to long for, to miss badly', 'Ich hab Sehnsucht nach dir!', 'I miss you so much!'],
    [7, 'behandeln wie (+Akk)', 'to treat like', 'Meine Mutter behandelt mich auch wie ein Baby.', 'My mother treats me like a baby too.'],
    [7, 'Machen Sie sich frei!', 'Please undress. (doctor to patient)', 'Machen Sie sich frei, legen Sie sich hin!', 'Undress, lie down!'],
    [7, 'der Kittel, -', 'white coat, smock', 'Frauen lieben Männer im weißen Kittel!', 'Women love men in white coats!'],
    [7, 'die Beine übereinanderschlagen', "to cross one's legs", 'Okay – ich schlage die Beine übereinander.', "OK – I'll cross my legs."],
    [7, 'Keine Spur!', 'Not in the slightest!', 'Das tut überhaupt nicht weh, keine Spur!', "That doesn't hurt at all, not in the slightest!"],
    [7, 'Das dachte ich mir.', 'I thought so.', 'Bitte sagen Sie „Aah“. – Hmm … das dachte ich mir.', 'Please say „Aah“. – Hmm … I thought as much.'],
    [7, 'die Spritze, -n', 'injection, shot', 'So – ich muss Ihnen eine Spritze geben.', 'Right – I have to give you an injection.'],
    [7, 'sich bücken', 'to bend down, to bend over', 'Eine Spritze! Bitte bücken Sie sich!', 'An injection! Please bend over!'],
    [7, 'früh dran sein', 'to be early (colloquial)', 'Maria! Du bist früh dran! Komm rein!', "Maria! You're early! Come in!"],
    [7, 'schlampig', 'sloppy, careless (colloquial)', 'Fluglinien sind so schlampig …', 'Airlines are so sloppy …'],
    [7, 'Ich war es nicht!', "It wasn't me!", 'Ich war es nicht, Fräulein, es war bestimmt Maria!', "It wasn't me, Miss, it must have been Maria!"],
    [7, 'allerdings', 'indeed, you bet (also: however)', 'Wir haben uns alles geteilt! – Ja, allerdings …', 'We shared everything! – Yes, we certainly did …'],
    [7, 'der Notfall, -fälle', 'emergency', 'Keine Panik! Ich bin da! Wo ist der Notfall?', "Don't panic! I'm here! Where's the emergency?"],
    [7, 'widerstehen (+Dat)', 'to resist', 'Siehst du? Sascha kann mir nicht widerstehen!', "See? Sascha can't resist me!"],
    [7, 'sich frisch machen', 'to freshen up', 'Und jetzt muss ich mich frisch machen …', 'And now I have to freshen up …'],
    [7, 'Na, sag schon!', 'Come on, tell me!', 'Na, sag schon, Sam …', 'Come on, out with it, Sam …'],
    [7, 'Störe ich?', 'Am I interrupting?', 'Störe ich? – Ja. – Nein … nichts …', 'Am I interrupting? – Yes. – No … nothing …'],
    [7, 'dabei', 'and yet, even though (contrast)', 'Dabei sieht er gut aus in seinem Arztkittel …', 'And yet he looks good in his white coat …'],
    [7, 'unheimlich', 'incredibly, really (colloquial; also: creepy)', 'Ich mag Anna unheimlich gerne …', 'I like Anna an awful lot …'],
    [7, 'ausgehen mit (+Dat)', 'to go out with (on a date)', 'Frag sie, ob sie mit dir ausgehen will!', 'Ask her if she wants to go out with you!'],
    [7, 'der Liebling', 'darling', 'Nic, Nic, Liebling! Hallo!', 'Nic, Nic, darling! Hello!'],
    [7, 'woanders', 'somewhere else', 'Kannst du das Fahrrad woanders hinstellen?', 'Can you put the bike somewhere else?'],
    [7, 'zurückstellen', 'to put back', 'Los, stell es zurück … oder bist du nicht stark genug?', "Go on, put it back … or aren't you strong enough?"],
    [7, 'Mir reicht es!', "I've had enough!", 'Mir reicht es! Nic mag immer nur Sascha, Sascha, Sascha!', "I've had enough! Nic only ever likes Sascha, Sascha, Sascha!"],
    [7, 'Mist!', 'Damn! (colloquial; also: rubbish)', 'Ist das die Karte? – Nein … – Ach, Mist!', 'Is that the card? – No … – Oh, damn!'],
    [7, 'wohl', 'I wonder … (in questions); probably', 'Welchen Film wir uns wohl ansehen?', "I wonder which film we'll see?"],
    [7, 'einen Bärenhunger haben', "to be starving (lit. a bear's hunger)", 'Ich habe einen Bärenhunger!', "I'm starving!"],
    [7, 'Pfui Teufel!', 'Yuck! (strong disgust)', 'Bäh! Pfui Teufel! Ich hasse diese Kekse.', 'Ugh! Yuck! I hate these biscuits.'],
    [7, 'jemandem lieber sein', 'to be preferred by someone', 'Sagt mal, welcher Doktor ist euch lieber?', 'Tell me, which doctor do you prefer?'],
    [7, 'sich einen Spaß machen', 'to have some fun (with a prank)', 'Wir könnten uns damit einen Spaß machen …', 'We could have some fun with this …'],
    [7, 'Du wirst mir fehlen.', "I'll miss you.", 'Ach, Maria, du wirst mir fehlen.', "Oh, Maria, I'll miss you."],
    [7, 'eifersüchtig', 'jealous', 'Sie ist komisch … ist sie eifersüchtig?', "She's acting strange … is she jealous?"],
    [7, 'jemandem stehen', 'to suit someone (clothes, colours)', 'Übrigens, Anna: Die Farbe steht dir gar nicht …', "By the way, Anna: that colour doesn't suit you at all …"],
    [7, 'ein Paar sein', 'to be a couple', 'Na, Sam, seid ihr nun ein Paar, du und Anna?', 'So, Sam, are you a couple now, you and Anna?'],
    [7, 'klingen', 'to sound', 'Liebestanz der Delfine? – Klingt klasse!', 'Love dance of the dolphins? – Sounds great!'],
    [7, 'dauernd', 'constantly, all the time', 'Wir sprechen dauernd miteinander.', 'We talk to each other all the time.'],
    [7, 'Wo waren wir?', 'Where were we?', 'Na, Herr Doktor, wo waren wir?', 'So, doctor, where were we?'],
    [7, 'sich ändern', 'to change (oneself)', 'Sieh dich an! Du änderst dich nie!', 'Look at you! You never change!'],
    [7, 'der Kasten, Kästen', 'box, chest', 'Ich werde Sascha aus diesem Kasten wegzaubern …', "I'm going to make Sascha vanish from this box …"],
    [7, 'das Publikum', 'audience', 'Dem Publikum geht es nicht gut.', "The audience isn't feeling well."],
    [7, 'rechtzeitig', 'in time, on time', 'Ihr kommt gerade rechtzeitig für meinen Zaubertrick!', "You've come just in time for my magic trick!"],
    [7, 'zurzeit', 'at the moment, currently', 'Zurzeit läuft sowieso nur Mist im Kino!', "There's only rubbish on at the cinema at the moment anyway!"],
    [7, 'der Rücken, -', 'back (body part)', 'Aah! Mein Rücken!', 'Ow! My back!'],
    [7, 'hintenrum', 'round the back (colloquial)', 'Na klar! Sie geht hintenrum!', 'Of course! She goes round the back!'],

    [8, 'die Kusine (Cousine)', 'female cousin', 'Die Vermieterin ist im Urlaub. Deshalb ist ihre Kusine jetzt hier.', "The landlady is on holiday. That's why her cousin is here now."],
    [8, 'zuständig sein (für +Akk)', 'to be in charge (of)', 'Ihre Vermieterin hat Urlaub – also bin ich zuständig!', "Your landlady is on holiday – so I'm in charge!"],
    [8, 'gelten', 'to apply, to be valid (rules)', 'Die gleichen Regeln gelten! Keine Haustiere!', 'The same rules apply! No pets!'],
    [8, 'die Miete', 'rent', 'Wir müssen über die Miete sprechen … in deiner Wohnung?', 'We need to talk about the rent … in your flat?'],
    [8, 'Nur damit wir uns verstehen …', "Just so we're clear …", 'Nur damit wir uns verstehen: keine Partys!', "Just so we're clear: no parties!"],
    [8, 'streng', 'strict', 'Die Kusine ist sehr streng: keine Haustiere, keine Partys!', 'The cousin is very strict: no pets, no parties!'],
    [8, 'die Regel, -n', 'rule', 'Regel Nummer eins: Man muss immer erst die Anleitung lesen.', 'Rule number one: you always have to read the instructions first.'],
    [8, 'runterkommen', 'to come down (colloquial for herunterkommen)', 'Das war „das Rhinozeros“ – ich soll runterkommen!', "That was „the rhinoceros“ – I'm to go down!"],
    [8, 'wegräumen', 'to put away, to clear away', "Keine Unterwäsche auf der Heizung! – Ich räum' sie schon weg!", "No underwear on the radiator! – I'll put it away!"],
    [8, 'Für wen hält sich die eigentlich?', 'Who does she think she is?', 'Für wen hält sich die eigentlich? – Für die Kusine der Vermieterin?', "Who does she think she is? – The landlady's cousin?"],
    [8, 'jemanden verstecken', 'to hide someone', 'Hilfe! Versteckt mich!', 'Help! Hide me!'],
    [8, 'Die Frau ist echt zu viel!', 'That woman is just too much! (colloquial)', 'Ah, da kommt sie! Die Frau ist echt zu viel!', 'Ah, here she comes! That woman is just too much!'],
    [8, 'der Besucher, -', 'visitor', 'Keine Partys und keine Besucher!', 'No parties and no visitors!'],
    [8, 'Eine Frechheit ist das!', "What a cheek! That's outrageous!", 'Aber kein Sam? Kein Nic? Eine Frechheit ist das!', "But no Sam? No Nic? That's outrageous!"],
    [8, 'der Schuldschein, -e', 'IOU (a note promising to pay back)', 'Keine Milch da – nur ein Schuldschein von Nic!', 'No milk – just an IOU from Nic!'],
    [8, 'Nö.', 'Nope. (colloquial)', 'Du hast nicht gewusst, dass Sam reich ist? – Nö.', "You didn't know that Sam is rich? – Nope."],
    [8, 'Wir beide sprechen uns noch!', 'You and I will have words later! (threat)', 'Wir beide sprechen uns noch …', 'You and I will have words later …'],
    [8, 'Was sind das für …?', 'What kind of … are these?', 'He! Was sind das für Kartons, Anna?', 'Hey! What are these boxes, Anna?'],
    [8, 'das Regal, -e', 'shelf, bookcase', 'Das ist unser neues Regal, Sam.', "That's our new bookcase, Sam."],
    [8, 'die Anleitung, -en', 'instructions, manual', 'Ich helfe dir beim Aufbauen … Wo ist die Anleitung?', "I'll help you put it together … Where are the instructions?"],
    [8, 'und zwar', "and what's more, and in fact (for emphasis)", 'Ich soll runterkommen, und zwar sofort!', "I'm to go down, and right now!"],
    [8, 'aufbauen', 'to put together, to assemble', 'Hast du in deinem Leben schon mal ein Regal aufgebaut?', 'Have you ever put a bookcase together in your life?'],
    [8, 'Es ging so.', 'It was so-so.', 'Und, wie war „das Rhinozeros“? – Ach, na ja, es ging so.', 'So, how was „the rhinoceros“? – Oh well, so-so.'],
    [8, 'So geht das nicht!', "That's not how it works!", 'Nein, so geht das nicht!', "No, that's not how it works!"],
    [8, 'Nicht zu fassen!', 'Unbelievable!', 'Sams Familie ist die viertreichste Familie in Amerika! Nicht zu fassen!', "Sam's family is the fourth richest family in America! Unbelievable!"],
    [8, 'sich (Dat) etwas leihen', 'to borrow something', 'Er hat sich die Milch, das Brot und die Kekse geliehen.', 'He borrowed the milk, the bread and the biscuits.'],
    [8, 'Wo willst du hin?', 'Where are you off to?', 'Und wo willst du hin? Du siehst ja aus wie John Travolta!', 'And where are you off to? You look like John Travolta!'],
    [8, 'spitze', 'great, terrific (colloquial)', 'Du siehst ja spitze aus!', 'You look great!'],
    [8, 'vor allem', 'above all, especially', 'Und vor allem keine Jungs von nebenan!', 'And above all no boys from next door!'],
    [8, 'Der gehört mir!', "He's mine! (der = er, colloquial)", 'Und vor allem nicht Nic … der gehört mir!', "And above all not Nic … he's mine!"],
    [8, 'gerade', 'straight (also: just now)', 'Übrigens – das Regal ist nicht gerade!', "By the way – the bookcase isn't straight!"],
    [8, 'total fertig sein', 'to be completely worn out (colloquial; fertig also = finished)', 'Und eine Energie hat die Frau! Ich bin total fertig!', "And the energy that woman has! I'm completely worn out!"],
    [8, 'jemanden loswerden', 'to get rid of someone', 'Sam – werd sie irgendwie los, bitte!', 'Sam – get rid of her somehow, please!'],
    [8, 'der Igel, -', 'hedgehog', 'Nics Igel geht es nicht gut.', "Nic's hedgehog isn't well."],
    [8, 'fressen', 'to eat (of animals; rude of people)', 'Sag ihr, ich habe einen Igel gefressen!', "Tell her I've eaten a hedgehog!"],
    [8, 'treten auf (+Akk)', 'to step on (Perfekt: ist getreten)', 'Nic ist auf den Igel getreten – ohne Schuhe!', 'Nic stepped on the hedgehog – with no shoes on!'],
    [8, 'eben', "just, simply (particle: that's how it is)", 'Dann musst du eben mitkommen.', "Then you'll just have to come along."],
    [8, 'erschöpft', 'exhausted', 'Er sieht völlig erschöpft aus!', 'He looks completely exhausted!'],
    [8, 'nachjagen (+Dat)', 'to chase after (Perfekt: ist nachgejagt)', 'Dann hat mich Edeltraut gesehen – und ist mir nachgejagt!', 'Then Edeltraut saw me – and chased after me!'],
    [8, 'Mir fällt schon was ein.', "I'll think of something.", 'Aber wie? – Mir fällt schon was ein.', "But how? – I'll think of something."],
    [8, 'Wenn ich das meiner Kusine erzähle!', 'Wait till I tell my cousin!', 'Wenn ich das meiner Kusine erzähle! Ich fahre nach Hause!', "Wait till I tell my cousin! I'm going home!"],
    [8, 'der Albtraum, -träume', 'nightmare', 'Sam, dein Traum ist mein Albtraum.', 'Sam, your dream is my nightmare.'],
    [8, 'eher', 'rather, more (likely)', 'Ach Sam – ich glaube, du bist viel eher mein Typ …', "Oh Sam – I think you're much more my type …"],
    [8, 'die Heizung, -en', 'heating; radiator', 'Regel Nummer zwei: Keine Unterwäsche auf der Heizung!', 'Rule number two: no underwear on the radiator!'],
    [8, 'Die wären wir los!', "We're rid of her! (jemanden los sein = to be rid of someone)", 'So, die wären wir los!', "Right, we're rid of her!"],
    [8, 'die Tür zuwerfen', 'to slam the door', 'Auf Wiedersehen! – Und nicht die Tür zuwerfen …', "Goodbye! – And don't slam the door …"],
    [8, 'Na bitte!', 'There you go! See? (it worked)', 'So sollte es gehen … Na bitte!', 'That should work … There you go!'],
    [8, 'Halt mal!', 'Hold this! (halten = to hold)', 'Halt mal bitte, Anna.', 'Hold this, please, Anna.'],
    [8, 'der Bundeskanzler, die Bundeskanzlerin', 'Federal Chancellor (head of the German government)', 'Dein Vater hat seinen eigenen Jet und trifft den Bundeskanzler?', 'Your father has his own jet and is meeting the Chancellor?'],
    [8, 'das Fräulein', 'Miss (old-fashioned form of address; today: Frau)', 'Anna! Lass Fräulein Berg herein!', 'Anna! Let Miss Berg in!'],
    [8, 'der Mieter, die Mieterin', 'tenant', 'An alle Mieter: Die gleichen Regeln gelten!', 'To all tenants: the same rules apply!'],
    [8, 'das Haustier, -e', 'pet', 'Keine Haustiere! Keine Partys!', 'No pets! No parties!'],
    [8, 'gruselig', 'creepy, scary', 'Die Kusine der Tarantel – klingt gruselig!', "The Tarantula's cousin – sounds creepy!"],
    [8, 'der Mitbewohner, die Mitbewohnerin', 'flatmate, roommate', 'Sag deinem Mitbewohner, er soll dir was zu essen kaufen.', 'Tell your flatmate to buy you something to eat.'],
    [8, 'erkennen', 'to recognize', 'Erkennst du hier irgendjemanden?', 'Do you recognize anyone here?'],
    [8, 'der Zettel, -', 'note, slip of paper', 'Ihr habt auch so einen Zettel von unserer neuen Vermieterin.', "You've got one of those notes from our new landlady too."],
    [8, 'die Kröte, -n', 'toad', 'Die singt bestimmt wie eine Kröte!', 'I bet she sings like a toad!'],
    [8, 'das Brett, -er', 'board, plank (Regalbrett = shelf)', 'Das ist Brett Nummer 2. Ich habe Regalbrett Nummer 1.', "That's board number 2. I've got shelf number 1."],
    [8, 'vorlesen', 'to read out (loud)', 'Sam will, dass Anna die Anleitung vorliest.', 'Sam wants Anna to read out the instructions.'],
    [8, 'die Königin, -nen', 'queen', 'Ich bin die Karaoke-Königin!', "I'm the karaoke queen!"],
    [8, 'eklig', 'disgusting, gross', 'Igitt. Wie eklig!', 'Yuck. How disgusting!'],

    [9, 'die Stellenanzeige', 'job advert', 'Anna findet eine Stellenanzeige für Nic: Hamlet!', 'Anna finds a job advert for Nic: Hamlet!'],
    [9, 'pünktlich', 'punctual, on time', 'Bis morgen früh um acht, Sam – und bitte sei pünktlich!', 'See you tomorrow at eight, Sam – and please be on time!'],
    [9, 'Sein oder nicht sein – das ist hier die Frage.', 'To be or not to be – that is the question. (Hamlet)', 'Ich muss meinen Text lernen! Sein oder …', 'I have to learn my lines! To be or …'],
    [9, 'Was ist hier los?', "What's going on here?", 'Warum ist es hier so dunkel? Was ist hier los?', "Why is it so dark in here? What's going on?"],
    [9, 'das Stück, -e', 'play (theatre)', 'Ich werde eine Rolle in einem Shakespeare-Stück bekommen.', "I'm going to get a part in a Shakespeare play."],
    [9, 'kaputt', 'broken; (colloquial) worn out, exhausted', 'Ich bin so kaputt!', "I'm so worn out!"],
    [9, 'sich umziehen', 'to get changed (clothes)', 'Ich muss mich schnell umziehen.', 'I have to get changed quickly.'],
    [9, 'die Strumpfhose, -n', 'tights, pantyhose', 'Nic! Hast du meine Strumpfhose an?!', 'Nic! Are you wearing my tights?!'],
    [9, 'das Schnuckiputzi, das Schnuckelchen', 'sweetie, honey (pet names)', 'Hallo, Schnuckiputzi! – Hallo, Schnuckelchen!', 'Hi, sweetie! – Hi, honey!'],
    [9, 'beeindruckt sein von (+Dat)', 'to be impressed by (beeindrucken = to impress)', 'Mein neuer Chef wird von meiner Arbeit beeindruckt sein.', 'My new boss will be impressed by my work.'],
    [9, 'Na los!', 'Come on! Go on!', 'Na los! An die Arbeit!', 'Come on! Get to work!'],
    [9, 'kriegen', 'to get (colloquial for bekommen)', 'Wir kriegen doch CNN über Satellit, oder nicht?', "We get CNN by satellite, don't we?"],
    [9, 'bestimmt', 'surely, definitely, bound to', 'Ihr habt doch Kabelfernsehen. Bestimmt habt ihr CNN!', "You've got cable TV. You're bound to have CNN!"],
    [9, 'Worum geht es?', 'What is it about?', 'Hamlet – eine Tragödie! – Und worum geht es da?', "Hamlet – a tragedy! – And what's it about?"],
    [9, 'der Mord, ermorden', 'murder, to murder', 'Hamlets Vater wird von Hamlets Onkel ermordet.', "Hamlet's father is murdered by Hamlet's uncle."],
    [9, 'entweder … oder', 'either … or', 'Entweder du kaufst mir eine neue Strumpfhose – oder …!', 'Either you buy me new tights – or …!'],
    [9, 'sich Sorgen machen (um, wegen)', 'to worry (about)', 'Mach dir wegen Sascha keine Sorgen!', "Don't worry about Sascha!"],
    [9, 'berichten über (+Akk)', 'to report on', 'Egal, worüber ich berichte: Ich werde dich niemals vergessen.', 'No matter what I report on, I will never forget you.'],
    [9, 'der Zuschauer, -', 'viewer (TV), spectator', 'Regel Nummer drei: Die Zuschauer müssen dir vertrauen.', 'Rule number three: the viewers have to trust you.'],
    [9, 'vertrauen (+Dat)', 'to trust', 'Vertrauen Sie mir! Ich sage Ihnen die Wahrheit!', "Trust me! I'm telling you the truth!"],
    [9, 'der Redakteur, die Redakteurin', 'editor (TV, newspaper)', 'Der neue Redakteur wird gleich hier sein!', 'The new editor will be here any minute!'],
    [9, 'wütend sein auf (+Akk)', 'to be furious with', 'Ja, aber Sascha ist wütend auf mich!', 'Yes, but Sascha is furious with me!'],
    [9, 'Wie kannst du es wagen!', 'How dare you!', 'Halt die Klappe, Nic – wie kannst du es wagen!', 'Shut up, Nic – how dare you!'],
    [9, 'lächerlich', 'ridiculous', 'Es war total lächerlich! „Hallo Baby, Sam Scott hier.“', "It was totally ridiculous! 'Hello baby, Sam Scott here.'"],
    [9, 'mit jemandem Schluss machen', 'to break up with someone', 'Barbarella hat mit Jakob Schluss gemacht.', 'Barbarella broke up with Jakob.'],
    [9, 'übrigens', 'by the way', 'Übrigens, ich bin deine neue Redakteurin.', "By the way, I'm your new editor."],
    [9, 'Recht haben', 'to be right', 'Ich bin die Redakteurin – ich habe immer Recht.', "I'm the editor – I'm always right."],
    [9, 'jemandem etwas wegschnappen', 'to snatch something (or someone) away from someone', 'Barbarella hat mir Jakob weggeschnappt!', 'Barbarella stole Jakob from me!'],
    [9, 'niemals', 'never', 'Du? Niemals!', 'You? Never!'],
    [9, 'berühmt', 'famous', 'Wenn ich berühmt bin, dann werde ich auch süß sein …', "When I'm famous, I'll be sweet too …"],
    [9, 'sterben', 'to die (stirbt, starb, ist gestorben)', 'Der neue Hamlet-Burger – der ist so gut, dass man für ihn sterben könnte.', "The new Hamlet burger – it's so good you could die for it."],
    [9, 'werden + Infinitiv', 'will (future): ich werde …, du wirst …, er wird …', 'Die Kameras werden dich lieben!', 'The cameras will love you!'],
    [9, 'zurückgeben', 'to give back (gibt zurück, gab zurück, zurückgegeben)', 'Nic, gib mir meine Strumpfhose zurück – sofort!', 'Nic, give me back my tights – right now!'],
    [9, 'wäre (Konjunktiv II von sein)', 'would be (ich wäre, du wärst)', 'Und ich, ich wäre der perfekte Hamlet!', 'And me, I would be the perfect Hamlet!'],
    [9, 'der Unfall, -fälle', 'accident', 'Äh … Sascha – ich hatte einen Unfall …', 'Er … Sascha – I had an accident …'],
    [9, 'zu …, um … zu …', 'too … to …', 'Ich bin zu wütend, um mit dir zu sprechen.', "I'm too furious to talk to you."],
    [9, 'Falsch verbunden.', 'Wrong number. (on the phone)', 'Wer war das? – Falsch verbunden.', 'Who was that? – Wrong number.'],
    [9, 'Lange nicht gesehen!', 'Long time no see!', 'Lange nicht gesehen, was, Sascha?', 'Long time no see, eh, Sascha?'],
    [9, 'erstens, zweitens', 'first(ly), second(ly)', 'Erstens: Ich bin die Redakteurin. Zweitens: Du bist die Assistentin.', "First: I'm the editor. Second: you're the assistant."],
    [9, 'Herzlichen Glückwunsch!', 'Congratulations!', 'Ich wollte dir nur sagen, dass du den Job bekommst. Herzlichen Glückwunsch!', "I just wanted to tell you that you're getting the job. Congratulations!"],
    [9, 'Sehr erfreut!', 'Pleased to meet you!', 'Barbarella – das ist Sam. – Sam! Sehr erfreut!', 'Barbarella – this is Sam. – Sam! Pleased to meet you!'],
    [9, 'zusammenbleiben', 'to stay together', 'Du und ich, wir werden immer zusammenbleiben!', 'You and I, we will always stay together!'],
    [9, 'Es ist Zeit, … zu …', "It's time to …", 'Aber jetzt ist es Zeit, auf Wiedersehen zu sagen …', "But now it's time to say goodbye …"],
    [9, 'überrascht sein', 'to be surprised', 'Ich bin deine neue Redakteurin. Na, überrascht?', "I'm your new editor. Well, surprised?"],
    [9, 'die Bühne, -n', 'stage (theatre)', 'Lieben Sie es, auf der Bühne zu stehen?', 'Do you love being on stage?'],
    [9, 'in Wirklichkeit', 'in reality, actually', 'In Wirklichkeit ist der Reichstag eine Raumstation mit Aliens …', 'In reality the Reichstag is a space station with aliens …'],
    [9, 'eines Tages', 'one day, some day', 'Lacht ihr nur. Aber eines Tages – nein, diese Woche – werde ich eine Rolle bekommen.', "Go on, laugh. But one day – no, this week – I'll get a part."],
    [9, 'Was ist mit …?', 'What about …?', 'Für Sams neuen Job? Und was ist mit meinem neuen Job?', "For Sam's new job? And what about my new job?"],

    [10, 'demonstrieren', 'to demonstrate, to protest', 'Wir demonstrieren heute um drei – bis später!', "We're demonstrating at three today – see you later!"],
    [10, 'die Demo, die Demonstration', 'demo, protest march', 'Diese Demonstration ist sehr wichtig!', 'This demonstration is very important!'],
    [10, 'das Plakat', 'poster, placard', 'Hallo, Siggy! Komm rein! Die Plakate sind da.', 'Hi, Siggy! Come in! The placards are here.'],
    [10, 'Hä?', 'Huh? What? (colloquial, a bit rude)', 'Hä? Wer ist da?', "Huh? Who's there?"],
    [10, 'die Nachtschicht', 'night shift', 'Sam hat heute Nachtschicht.', 'Sam is on the night shift today.'],
    [10, 'aufpassen auf (+Akk)', 'to look after, to keep an eye on', 'Das sind meine Babys – pass gut auf sie auf!', 'These are my babies – take good care of them!'],
    [10, 'jemandem Bescheid sagen', 'to let someone know', 'Um drei Uhr – sag den anderen Bescheid!', "At three o'clock – let the others know!"],
    [10, 'Tiere sind auch nur Menschen.', "Animals are people too. (Anna's slogan)", 'Das neue Motto von Kanal 9 ist: Tiere sind auch nur Menschen.', 'The new motto of Channel 9 is: animals are people too.'],
    [10, 'eine Entscheidung treffen', 'to make a decision', 'Ich muss wirklich wichtige Entscheidungen treffen.', 'I really have to make important decisions.'],
    [10, 'Rate mal!', 'Guess!', 'Und dann mein Mittagessen … rate mal, mit wem!', 'And then my lunch … guess who with!'],
    [10, 'außer (+Dat)', 'apart from, besides', 'Da werden außer mir noch 45 andere Journalisten sein.', 'Apart from me, there will be 45 other journalists there.'],
    [10, 'jedenfalls', 'anyway, in any case', 'Jedenfalls sind diese Tierversuche einfach unmöglich!', 'Anyway, these animal experiments are simply outrageous!'],
    [10, 'der Tierversuch, -e', 'animal experiment, animal testing', 'Diese Fabrik macht Tierversuche für Kosmetik.', 'This factory does animal testing for cosmetics.'],
    [10, 'das Meerschweinchen, -', 'guinea pig', 'Hast du die Meerschweinchen?', 'Do you have the guinea pigs?'],
    [10, 'Wahnsinn!', 'Amazing! Crazy! (colloquial)', 'Ich treffe mich heute mit Leonardo DiCaprio zum Mittagessen. Wahnsinn!', "I'm meeting Leonardo DiCaprio for lunch today. Amazing!"],
    [10, 'So ein Quatsch!', 'What nonsense! (colloquial)', 'Tierversuche mit Meerschweinchen? So ein Quatsch!', 'Animal testing on guinea pigs? What nonsense!'],
    [10, 'etwas stehlen', 'to steal something (stahl, gestohlen)', 'Diese Hippies haben seine Meerschweinchen gestohlen!', 'These hippies have stolen his guinea pigs!'],
    [10, 'unbedingt', 'absolutely, at all costs', 'Er will sie unbedingt zurückhaben.', 'He absolutely wants them back.'],
    [10, 'der Anführer, die Anführerin', 'leader (of a group)', 'Finde den Anführer! Den Koordinator!', 'Find the leader! The coordinator!'],
    [10, 'denken an (+Akk)', 'to think of, to remember', 'Sam – denk daran, wer Herr Garrier ist!', 'Sam – remember who Mr Garrier is!'],
    [10, 'behalten', 'to keep', 'Du willst doch deinen Job behalten – oder nicht?', "You do want to keep your job – don't you?"],
    [10, 'in Sicherheit sein', 'to be safe', 'Die Meerschweinchen sind in Sicherheit.', 'The guinea pigs are safe.'],
    [10, 'Ich kann das erklären!', 'I can explain!', 'Anna! Schnuckiputzi! Ich kann das erklären!', 'Anna! Sweetie! I can explain!'],
    [10, 'sauer sein auf (+Akk)', 'to be cross with (colloquial)', 'Anna war richtig sauer auf Sam.', 'Anna was really cross with Sam.'],
    [10, 'Was soll das?', "What's the idea? What's all this about?", 'Ey, was soll das?', "Hey, what's the idea?"],
    [10, 'Das war es wert.', 'It was worth it.', 'Es war wirklich teuer, aber das war es wert.', 'It was really expensive, but it was worth it.'],
    [10, 'Ich kann es kaum erwarten!', 'I can hardly wait!', 'Heute Abend gehe ich zu einer Premiere! Ich kann es kaum erwarten!', "Tonight I'm going to a premiere! I can hardly wait!"],
    [10, 'sich fertig machen', 'to get ready', 'Aber jetzt muss ich mich fertig machen.', 'But now I have to get ready.'],
    [10, 'das Tierheim, -e', 'animal shelter', 'Ich muss sie ins Tierheim bringen!', 'I have to take them to the animal shelter!'],
    [10, 'feuern', 'to fire, to sack (colloquial)', 'Sam! Dein Job! Sie hat dich gefeuert!', "Sam! Your job! She's fired you!"],
    [10, 'kämpfen gegen (+Akk)', 'to fight against', 'Jetzt will Barbarella, dass Kanal 9 gegen Tierversuche kämpft.', 'Now Barbarella wants Channel 9 to fight animal testing.'],
    [10, 'fehlen', 'to be missing', 'Ein Meerschweinchen fehlt immer noch.', 'One guinea pig is still missing.'],
    [10, 'fast', 'almost, nearly', 'Leonardo DiCaprio und du – ganz allein? – Na ja, fast.', 'Leonardo DiCaprio and you – all alone? – Well, almost.'],
    [10, 'der Forscher, die Forscherin', 'researcher, scientist', 'Diese Forscher testen Haarfarbe und Lippenstifte an den armen Tieren.', 'These researchers test hair dye and lipsticks on the poor animals.'],
    [10, 'insgesamt', 'in total, altogether', 'Das sind jetzt insgesamt sieben … ein Meerschweinchen fehlt immer noch.', "That's seven in total now … one guinea pig is still missing."],
    [10, 'die Ecke, -n', 'corner', 'Es sitzt bestimmt in irgendeiner Ecke …', "It's bound to be sitting in some corner …"],
    [10, 'weil', 'because (the verb goes to the end)', 'Diese Demonstration ist wichtig, weil diese Fabrik Tierversuche für Kosmetik macht!', 'This demonstration is important because this factory does animal testing for cosmetics!'],
    [10, 'Bist du sicher?', 'Are you sure?', 'Welches Outfit gefällt dir am besten? – Äh … das hier. – Bist du sicher?', 'Which outfit do you like best? – Er … this one. – Are you sure?'],
    [10, 'mitkommen', 'to come along', 'Sascha, ich gehe jetzt zu Kanal 9 – kommst du mit?', "Sascha, I'm going to Channel 9 now – are you coming along?"],
    [10, 'die Fabrik, -en', 'factory', 'Anna und ihre Hippie-Freunde wollen heute vor einer Kosmetikfabrik demonstrieren.', 'Anna and her hippie friends want to protest in front of a cosmetics factory today.'],
    [10, 'sich (Akk) vorstellen', 'to introduce oneself (≠ sich (Dat) etwas vorstellen = to imagine)', 'So – ich stelle mich erst mal vor. Ich heiße Nic.', "So – first I'll introduce myself. My name is Nic."],
    [10, 'eine Frage stellen', 'to ask a question', 'Na los! Stell ihr eine Frage!', 'Go on! Ask her a question!'],
    [10, 'furchtbar', 'terrible, awful', 'Das ist ja furchtbar. Die armen Tiere!', "That's terrible. The poor animals!"],
    [10, 'die Leidenschaft, die Gewalt', 'passion, violence', 'Drama! Leidenschaft! Gewalt! Einfach wunderbar!', 'Drama! Passion! Violence! Simply wonderful!'],
    [10, 'der Karton, -s', 'cardboard box', 'Gestern hat mir Anna einen Karton gegeben … mit Meerschweinchen.', 'Yesterday Anna gave me a box … with guinea pigs.'],
    [10, 'Ich frage mich, ob …', 'I wonder whether …', 'Ich frage mich, ob Leonardo auch da sein wird.', 'I wonder whether Leonardo will be there too.'],
    [10, 'zuhören (+Dat)', 'to listen (to)', 'Anna! Ich kann dir das erklären! Bitte hör mir zu!', 'Anna! I can explain! Please listen to me!'],
    [10, 'ziemlich', 'quite, rather, pretty', 'Ja, die Fragen waren ziemlich schlecht …', 'Yes, the questions were pretty bad …'],
    [10, 'überall', 'everywhere', 'Und – wo sind sie, Nic? – Überall?', 'And – where are they, Nic? – Everywhere?'],
    [10, 'leider', 'unfortunately', 'Ich hab leider keine Karte für dich!', "Unfortunately I don't have a ticket for you!"],
    [10, 'nicht müssen', "not to have to, not to need to (NOT 'must not')", 'Ihr müsst nicht auf mich warten!', "You don't have to wait for me!"],
    [10, 'noch mal', 'again, once more', 'Frag sie noch mal! Noch mal!', 'Ask her again! Again!'],

    [11, 'die Ferien vs. der Urlaub', 'school holidays vs. (work) holiday', 'Schüler haben Ferien, Berufstätige nehmen Urlaub.', 'Pupils have holidays; working people take leave.'],
    [11, 'in den Urlaub fahren', 'to go on holiday', 'Ich hab den ganzen Tag gesehen, wie andere Leute in den Urlaub fahren.', 'I spent the whole day watching other people go on holiday.'],
    [11, 'einpacken', 'to pack', 'Ach du liebe Zeit, Sascha – was hast du denn alles eingepackt?', 'Good grief, Sascha – what on earth have you packed?'],
    [11, 'der Pass, Pässe', 'passport', 'Alles, was du zum Reisen brauchst, sind deine Tickets, dein Geld und dein Pass.', 'All you need to travel is your tickets, your money and your passport.'],
    [11, 'der Strand, Strände', 'beach', 'Hmm, am Strand treffe ich viele schöne Mädchen.', 'Hmm, I meet lots of pretty girls on the beach.'],
    [11, 'k.o. sein', 'to be worn out, exhausted (colloquial)', 'Ja, ich weiß, was du meinst – ich bin auch völlig k.o.', "Yes, I know what you mean – I'm completely worn out too."],
    [11, 'Wer will schon …?', 'Who wants … anyway? (rhetorical)', 'Hah! Wer will schon Madonna sehen!', 'Hah! Who wants to see Madonna anyway!'],
    [11, 'die Garderobe, -n', 'dressing room; cloakroom', 'Sie hätte gern 22 Garderoben? Aber wir haben nur zwei!', "She'd like 22 dressing rooms? But we only have two!"],
    [11, 'jemanden wahnsinnig machen', 'to drive someone crazy', 'Diese Frau macht mich wahnsinnig!', 'This woman is driving me crazy!'],
    [11, 'So kann das nicht weitergehen.', "Things can't go on like this.", 'Ach, so kann das nicht weitergehen.', "Oh, things can't go on like this."],
    [11, 'die Hexe, -n', 'witch', 'Barbarella ist eine Hexe!', 'Barbarella is a witch!'],
    [11, 'das Ferienziel, -e', 'holiday destination', 'Wenn ich mir ein Ferienziel aussuchen könnte, dann würde ich auf Mauritius Urlaub machen.', "If I could pick a holiday destination, I'd go on holiday to Mauritius."],
    [11, 'früher', 'in the past, (I) used to', 'Früher bin ich immer mit meinen Eltern nach London geflogen.', 'I always used to fly to London with my parents.'],
    [11, 'der Reiseführer, -', 'tour guide; guidebook', 'Na klar, und du bist unser Reiseführer.', "Of course, and you're our tour guide."],
    [11, 'die Königsfamilie', 'the royal family', 'Dann kann ich endlich mit der Königsfamilie Tee trinken.', 'Then I can finally have tea with the royal family.'],
    [11, 'übersetzen', 'to translate', 'Sam, du musst mir beim Flirten helfen und für mich übersetzen!', 'Sam, you have to help me flirt and translate for me!'],
    [11, 'sein Bestes tun', "to do one's best", 'Ich werde mein Bestes tun.', "I'll do my best."],
    [11, 'die Bügelwäsche', 'ironing (clothes to be ironed)', 'Sam, hier ist noch deine Bügelwäsche!', "Sam, here's your ironing as well!"],
    [11, 'ausprobieren', 'to try out', 'Jetzt kann ich meine Flirttricks bei den englischen Girls ausprobieren!', 'Now I can try out my flirting tricks on the English girls!'],
    [11, 'garantiert', 'definitely, guaranteed (colloquial)', 'Die können mir garantiert nicht widerstehen!', "They definitely won't be able to resist me!"],
    [11, 'Stell dir vor, …', 'Imagine …', 'Stell dir vor, ich sehe ein hübsches englisches Mädchen.', 'Imagine I see a pretty English girl.'],
    [11, 'leuchten', 'to shine, to glow', 'Deine Augen sind wie Sterne, sie leuchten in der Nacht.', 'Your eyes are like stars, they shine in the night.'],
    [11, 'etwas abstellen', 'to put something down', 'Stell das bitte da ab – ich muss alles noch mal checken.', 'Please put that down there – I have to check everything again.'],
    [11, 'Man weiß nie, was passiert.', 'You never know what will happen.', 'Man weiß nie, was passiert. Vielleicht gehen wir ins Ballett.', 'You never know what will happen. Maybe we will go to the ballet.'],
    [11, 'Ist doch das Gleiche!', "It's the same thing anyway!", 'Einen Kilt trägt man in Schottland. – Ist doch das Gleiche!', 'You wear a kilt in Scotland. – Same thing!'],
    [11, 'Wessen …?', 'Whose …?', 'Wessen Gepäck ist das hier? – Saschas!', "Whose luggage is this? – Sascha's!"],
    [11, 'betrunken', 'drunk', 'Sie denkt, dass du denkst, dass sie betrunken ist!', "She thinks that you think she's drunk!"],
    [11, 'den Tisch decken', 'to set the table', 'Sie muss den Tisch noch decken.', 'She still has to set the table.'],
    [11, 'sich anpassen (+Dat)', 'to adapt to, to fit in with', 'Man sollte sich immer der Kultur des Reiselandes anpassen.', 'You should always adapt to the culture of the country you visit.'],
    [11, 'Was für ein …?', 'What kind of …? (as an exclamation: What a …!)', 'Was für einen Tee möchtest du?', 'What kind of tea would you like?'],
    [11, 'Ich hätte gern …', "I'd like … (polite order)", "Ich hätte gern 'ne Cola.", "I'd like a Coke. ('ne = eine, colloquial)"],
    [11, 'die Tussi, -s', 'airhead, bimbo (colloquial, rude)', 'Das ist eine Tussi …', "She's such an airhead …"],
    [11, 'dort drüben', 'over there', 'Dort drüben … in der Ecke.', 'Over there … in the corner.'],
    [11, 'Das kann nicht sein!', "That can't be (true)!", 'Prinz William? Bist du sicher? Das kann nicht sein!', "Prince William? Are you sure? That can't be!"],
    [11, 'immer wieder die Alte', 'the same as ever, never changes (colloquial; of a man: der Alte)', 'Ja ja, Sascha – immer wieder die Alte …', 'Yeah, yeah, Sascha – same old Sascha …'],
    [11, 'nicht mein Typ sein', 'not to be my type', 'Na ja, die ist eigentlich nicht mein Typ.', "Well, she's not really my type."],
    [11, 'bisher', 'so far, until now', 'Bisher ist noch keine Engländerin dein Typ gewesen.', 'So far no Englishwoman has been your type.'],
    [11, 'So dumm bin ich auch wieder nicht.', "I'm not that stupid.", 'Natürlich nicht mit Prinz William – so dumm bin ich auch wieder nicht.', "Not with Prince William, of course – I'm not that stupid."],
    [11, 'voller', 'full of', 'Wir gehen in einen Club voller englischer Mädchen!', "We're going to a club full of English girls!"],
    [11, "Wie wär's mit …?", 'How about …?', "Hey! Wie wär's denn mit Las Vegas?", 'Hey! How about Las Vegas?'],
    [11, 'am liebsten', 'most of all, best of all (gern → lieber → am liebsten)', 'Mit welchen Stars würdest du in den Ferien am liebsten flirten?', 'Which stars would you most like to flirt with on holiday?'],
    [11, 'schwierig', 'difficult', 'Mmh, schwierig – mit allen dreien!', 'Mmm, difficult – with all three!'],
    [11, 'doch (in statements)', 'after all, you know (reminds the listener of something obvious)', 'Aber wir fahren doch nur drei Tage …', "But we're only going for three days, after all …"],
    [11, 'üben', 'to practise', 'Hey, wir können doch schon mal üben gehen.', 'Hey, we can go and practise already.'],
    [11, 'küssen', 'to kiss', 'Ich weiß genau, was du denkst … Du würdest mich gern küssen …', "I know exactly what you're thinking … You'd like to kiss me …"],
    [11, 'einladen (zu +Dat)', 'to invite (to)', 'Vielleicht lädt uns die Queen zu einer Gartenparty ein.', 'Maybe the Queen will invite us to a garden party.'],
    [11, 'Wem …?', '(to) whom? (dative of wer)', 'Wem werden die Engländer nicht widerstehen können?', "Who won't the English be able to resist?"],
    [11, 'das Zeug', 'stuff, things (colloquial)', 'Du willst das ganze Zeug hier mitnehmen?', 'You want to take all this stuff with you?'],
    [11, 'Das wird … sein.', "That'll be … (a guess about the present)", 'Das wird das Taxi sein!', "That'll be the taxi!"],
    [11, 'erst', 'only (less or earlier than expected); not until', 'Fünf Uhr? Aber es ist erst drei.', "Five o'clock? But it's only three."],
    [11, 'die Pommes (Pl.)', 'chips, French fries (short for Pommes frites)', 'Also alles mit Pommes.', 'So everything comes with chips.'],

    [12, 'verrückt nach (+Dat)', 'crazy about', 'Nic ist völlig verrückt nach Fußball.', 'Nic is completely mad about football.'],
    [12, 'die Mannschaft', 'team', 'Welche Mannschaft ist deine?', 'Which team is yours?'],
    [12, 'die Abwehr', 'defence (sport)', 'Aber eure Abwehr ist schwach.', 'But your defence is weak.'],
    [12, 'ein Tor schießen', 'to score a goal', 'Nein! England hat ein Tor geschossen!', 'No! England has scored a goal!'],
    [12, 'zwei zu eins für …', 'two-one to … (score)', 'Noch ein Tor! Zwei zu eins für Deutschland!', 'Another goal! Two-one to Germany!'],
    [12, 'anfeuern', 'to cheer on', 'Nic feuert Deutschland an: „Na los, Deutschland!“', 'Nic cheers Germany on: "Come on, Germany!"'],
    [12, 'das Halbfinale', 'semi-final', 'Heute ist Halbfinale! Deutschland spielt gegen Amerika.', 'Today is the semi-final! Germany is playing America.'],
    [12, 'gewinnen, verlieren', 'to win, to lose', 'Wir haben gewonnen! Deutschland ist im Finale!', "We've won! Germany is in the final!"],
    [12, 'das Finale', 'the final', 'Die Engländer schlagen wir dann im Finale.', "Then we'll beat the English in the final."],
    [12, 'der Fan, die Fans', 'fan, fans', 'Ja, aber er ist auch Fußball-Fan.', "Yes, but he's a football fan too."],
    [12, 'der Heiratsantrag', 'marriage proposal', 'Sam macht Anna während des WM-Finales einen Heiratsantrag.', 'Sam proposes to Anna during the World Cup final.'],
    [12, 'das Knabberzeug', 'nibbles, snacks (colloquial)', 'Und jetzt noch die Getränke und das Knabberzeug.', 'And now just the drinks and the snacks.'],
    [12, 'laufen (Spiel, Film)', 'to be on (TV, cinema)', 'Ich will nichts verpassen, wenn das Spiel läuft.', "I don't want to miss anything while the match is on."],
    [12, 'die Weltmeisterschaft (WM)', 'World Cup, world championship', 'Mann, das ist die Weltmeisterschaft! Das ist mega-wichtig!', "Man, this is the World Cup! It's mega-important!"],
    [12, 'die Nase voll haben von (+Dat)', 'to be fed up with (colloquial)', 'Ich hab die Nase voll von der Weltmeisterschaft!', "I'm fed up with the World Cup!"],
    [12, 'die Unterhose, -n', 'underpants', 'Ich trage meine ganz spezielle Weltmeisterschaftsunterhose – die bringt Glück!', "I'm wearing my very special World Cup underpants – they bring luck!"],
    [12, 'während (+Gen)', 'during', 'Die ziehe ich während der Weltmeisterschaft nicht aus.', "I don't take them off during the World Cup."],
    [12, 'vorbereiten', 'to prepare, to get ready', 'Sam, ich hab alles vorbereitet: Cola, Kartoffelchips.', "Sam, I've got everything ready: cola, crisps."],
    [12, 'schlagen', 'to beat (in a match); to hit', 'Aber wir haben Jamaika vier zu null geschlagen.', 'But we beat Jamaica four-nil.'],
    [12, 'der Stürmer, -', 'striker, forward', 'Aber wir haben die besten Stürmer der Welt!', 'But we have the best strikers in the world!'],
    [12, 'wenigstens', 'at least', 'Heute kommt Toby an. Er ist wenigstens ein richtiger Mann.', "Toby arrives today. At least he's a real man."],
    [12, 'der Vorsprechtermin, -e', 'audition (appointment)', 'Was, ein Vorsprechtermin? Für mich?', 'What, an audition? For me?'],
    [12, 'ausgerechnet', 'of all (times, things, people)', 'Aber warum ausgerechnet heute Mittag?', 'But why today at noon, of all times?'],
    [12, 'eine Frage von Leben und Tod', 'a matter of life and death', 'Es gibt Leute, für die ist Fußball eine Frage von Leben und Tod.', 'For some people, football is a matter of life and death.'],
    [12, 'aufnehmen', 'to record (TV, video)', 'Nic, wir können dir das Spiel doch aufnehmen.', 'Nic, we can record the match for you.'],
    [12, 'das Ergebnis, -se', 'result, score', 'Und das Ergebnis sagen wir nicht.', "And we won't tell you the result."],
    [12, 'verraten', 'to give away, to reveal (a secret)', 'Und ihr verratet mir das Ergebnis wirklich nicht?', "And you really won't give away the result?"],
    [12, 'Versprochen!', 'Promise! / I promise!', 'Versprochen? – Versprochen …', 'Promise? – Promise …'],
    [12, 'Na und?', 'So what?', 'Heute spielt Deutschland gegen Amerika. Na und?', 'Germany is playing America today. So what?'],
    [12, 'die Frisur, -en', 'hairstyle, haircut', 'Ich brauche eine Frisur, die ein fußballverrückter Engländer toll finden würde.', 'I need a hairstyle that a football-mad Englishman would love.'],
    [12, 'daneben', 'wide, off target (shot)', 'Oh nein … Der deutsche Stürmer schießt daneben!', 'Oh no … The German striker shoots wide!'],
    [12, 'so … wie möglich', 'as … as possible', 'Wir müssen so normal wie möglich aussehen.', 'We have to look as normal as possible.'],
    [12, 'nach jemandem sehen', 'to check on someone', 'Dann werd ich mal nach Sam sehen.', "Then I'll go and check on Sam."],
    [12, "…, stimmt's?", "…, right? / …, didn't you?", "Ihr habt gewonnen, stimmt's?", "You won, didn't you?"],
    [12, 'trotzdem', 'anyway, nevertheless', 'Ich weiß es trotzdem. Du bist so happy!', "I know anyway. You're so happy!"],
    [12, "Ich hab's doch gewusst!", 'I knew it!', "Ich hab's doch gewusst! Die armen Deutschen!", 'I knew it! The poor Germans!'],
    [12, 'die Redewendung, -en', 'phrase, expression', 'Nur ein paar kleine Redewendungen … für meinen süßen Toby.', 'Just a few little phrases … for my sweet Toby.'],
    [12, 'der Friseur, die Friseurin', 'hairdresser', 'Ich muss los … zum Friseur. Neue Frisur – neues Leben.', 'I have to go … to the hairdresser. New hairstyle – new life.'],
    [12, 'Ganz im Gegenteil.', 'Quite the opposite.', 'Nein, nein, nein. Ganz im Gegenteil.', 'No, no, no. Quite the opposite.'],
    [12, 'sich gefasst machen auf (+Akk)', 'to brace oneself for', 'Macht euch auf das Schlimmste gefasst!', 'Prepare yourselves for the worst!'],
    [12, 'aufheitern', 'to cheer up', 'Du, hör zu! Das wird dich aufheitern!', 'Hey, listen! This will cheer you up!'],
    [12, 'jemandem Unterricht geben', 'to give someone lessons', 'Sam hat mir Unterricht gegeben.', 'Sam gave me lessons.'],
    [12, 'wiederholen', 'to repeat', 'Sie hat nur die Sätze wiederholt!', 'She was only repeating the sentences!'],
    [12, 'Wie dumm von mir!', 'How stupid of me!', 'Wie dumm von mir! Ich dachte, dass Sascha und du …', 'How stupid of me! I thought that Sascha and you …'],
    [12, 'Willst du mich heiraten?', 'Will you marry me?', 'Also, Anna? Willst du … mich heiraten?', 'So, Anna? Will you … marry me?'],
    [12, 'ankommen', 'to arrive', 'Und heute Abend kommt Toby an.', 'And Toby arrives this evening.'],
    [12, 'langweilig', 'boring', 'Och! Wie langweilig!', 'Oh! How boring!'],
    [12, 'besonders', 'especially, particularly', 'Ich liebe Fußball! Besonders die muskulösen deutschen Fußballer!', 'I love football! Especially the muscular German footballers!'],
    [12, 'Ach so!', 'Oh, I see!', 'Ach so – stark! You are so strong!', 'Oh, I see – strong! You are so strong!'],
    [12, 'nur noch', 'only … left, only … more', 'Nur noch zwei Stunden …', 'Only two more hours …'],
    [12, 'seit (+Dat)', 'for, since (with the present tense)', 'Aber die WM läuft schon seit drei Wochen!', 'But the World Cup has been on for three weeks!'],
    [12, 'kindisch', 'childish', 'Ach, ihr seid so kindisch.', "Oh, you're so childish."],
    [12, 'Ehrlich?', 'Really? Honestly?', 'Ehrlich? Und ihr verratet mir das Ergebnis wirklich nicht?', "Really? And you really won't give away the result?"],
    [12, "Ich hab's!", "I've got it! (an idea)", "Ich hab's! Charlotte. Sie kann mir helfen.", "I've got it! Charlotte. She can help me."],
    [12, 'in der Klemme sein', 'to be in a fix, to be in a tight spot (colloquial)', 'Sam ist in der Klemme.', 'Sam is in a fix.'],
    [12, 'schlimm', 'bad, serious', 'So schlimm kann es doch nicht sein.', "It can't be that bad."],
    [12, 'jeden Moment', 'any moment (now)', 'Toby wird jeden Moment hier sein.', 'Toby will be here any moment.'],
    [12, 'jemandem etwas reichen', 'to pass someone something (at the table)', 'Sam, kannst du Anna bitte die Kartoffelchips reichen?', 'Sam, can you please pass Anna the crisps?'],
    [12, 'Wen …?', 'whom? (accusative of wer)', 'Wen denn? – Jemanden wie … mich zum Beispiel.', 'Who, then? – Someone like … me, for example.'],

    [13, 'heiraten', 'to marry, to get married', 'Wollt ihr wirklich heiraten?', 'Do you two really want to get married?'],
    [13, 'die Braut, der Bräutigam', 'bride, groom', 'Wo ist meine süße kleine Braut?', 'Where is my sweet little bride?'],
    [13, 'die Vorbereitungen (Pl.)', 'preparations', 'Ich komme bald nach Berlin, um euch bei den Vorbereitungen zu helfen.', "I'm coming to Berlin soon to help you with the preparations."],
    [13, 'canceln', 'to cancel, to call off (colloquial)', 'Vielleicht sollten wir die Hochzeit doch canceln.', 'Maybe we should call off the wedding after all.'],
    [13, 'die Hochzeitsreise, -n', 'honeymoon (trip)', 'Ein Paket von Frau Scott – Broschüren für Hochzeitsreisen.', 'A parcel from Mrs Scott – brochures for honeymoons.'],
    [13, 'auf dem Weg sein', 'to be on the way', 'Sams Mutter ist schon auf dem Weg nach Berlin.', "Sam's mother is already on her way to Berlin."],
    [13, 'die Feier, feiern', 'celebration, to celebrate', 'Das ist viel besser! Das müssen wir feiern!', "That's much better! We have to celebrate that!"],
    [13, 'Wie gern würde ich …!', "How I'd love to …!", 'Wie gern würde ich einen gut aussehenden Mann mit Humor heiraten.', "How I'd love to marry a good-looking man with a sense of humour."],
    [13, 'buchen', 'to book', 'Hast du die Gedächtniskirche schon gebucht?', 'Have you already booked the Memorial Church?'],
    [13, 'genau das Richtige', 'just the thing, exactly right', 'Schau mal, Sam, das ist genau das Richtige für uns!', "Look, Sam, that's just the thing for us!"],
    [13, 'Was steht in …?', 'What does … say? (a text)', 'Was steht denn in der E-Mail?', 'So what does the e-mail say?'],
    [13, 'die Brautjungfer, -n', 'bridesmaid', 'Wie viele Brautjungfern wird Anna haben? Zehn oder zwölf?', 'How many bridesmaids will Anna have? Ten or twelve?'],
    [13, 'mieten', 'to rent, to hire', 'Habt ihr schon die Kirche gemietet?', 'Have you already hired the church?'],
    [13, 'sich einmischen (in +Akk)', 'to interfere (in)', 'Deine Mutter ist wirklich nett, aber sie darf sich da nicht einmischen!', "Your mother is really nice, but she mustn't interfere!"],
    [13, 'zulassen', 'to allow, to let happen', 'Das ist schon okay. Ich werde das nicht zulassen.', "It's OK. I won't let that happen."],
    [13, 'deswegen', "that's why, for that reason", 'Deswegen habe ich „Bye-bye“ zu Toby gesagt.', "That's why I said \"bye-bye\" to Toby."],
    [13, 'der Feuerwehrmann, die Feuerwehr', 'firefighter, fire brigade', 'Er spielt den Feuerwehrmann Benno in der Serie „Notruf 112“.', 'He plays Benno the firefighter in the series "Notruf 112".'],
    [13, 'Viel Vergnügen!', 'Have fun! Enjoy!', '„Notruf 112“ … viel Vergnügen!', '"Notruf 112" … enjoy!'],
    [13, 'Das würde ich nicht tun!', "I wouldn't do that!", 'Was? Das würde ich nicht tun!', "What? I wouldn't do that!"],
    [13, 'etwas mit sich bringen', 'to bring something with it, to involve', 'So eine Hochzeit bringt auch Probleme mit sich.', 'A wedding like that brings problems with it too.'],
    [13, 'dafür', 'in return, on the other hand', 'Aber dafür wirst du dann Frau Scott sein.', "But in return you'll be Mrs Scott."],
    [13, 'irgendwas', 'something (or other) (colloquial)', 'Sie hat irgendwas von Hochzeit erzählt.', 'She said something about a wedding.'],
    [13, 'plötzlich', 'suddenly', 'Sie ist plötzlich so nett zu mir.', "She's suddenly so nice to me."],
    [13, 'eitel', 'vain', 'Du findest ihn eitel.', 'You think he is vain.'],
    [13, 'Das wirst du schon sehen.', "You'll see.", 'Mmh … Das wirst du schon sehen …', "Mmh … You'll see …"],
    [13, 'der Vorteil, -e', 'advantage', 'Es gibt einen Vorteil beim Heiraten: die Junggesellen-Party!', "There's one advantage to getting married: the stag party!"],
    [13, 'die Junggesellenparty', 'stag party, bachelor party', 'Ich organisiere eine tolle Junggesellenparty für Sam.', "I'm organising a great stag party for Sam."],
    [13, 'tagelang', 'for days (on end)', 'Nie mehr tagelang im Bett liegen und Fußball sehen …', 'Never again lying in bed for days watching football …'],
    [13, 'retten', 'to rescue, to save', 'Ich hab mal wieder ganz Berlin gerettet.', 'I saved the whole of Berlin again.'],
    [13, 'brennen', 'to burn, to be on fire', 'Du trägst sie doch aus den brennenden Häusern heraus.', 'You carry them out of the burning houses.'],
    [13, 'Du zuerst!', 'You first!', 'Sorry, du zuerst … – Nein, du zuerst …', 'Sorry, you first … – No, you first …'],
    [13, 'Bist du so weit?', 'Are you ready?', 'Bist du so weit? – Ja. – Eins, zwei, drei!', 'Are you ready? – Yes. – One, two, three!'],
    [13, 'zum Glück', 'luckily, fortunately', 'Zum Glück ist sie noch weit, weit weg in Amerika.', "Luckily she's still far, far away in America."],
    [13, 'losfliegen', 'to take off, to set off (by plane)', 'Du musst es ihr sagen, bevor sie losfliegt!', 'You have to tell her before she flies off!'],
    [13, 'Es kommt noch schlimmer.', 'It gets worse.', 'Es kommt noch schlimmer – ich sollte Anna und Mom zur gleichen Zeit treffen.', 'It gets worse – I was supposed to meet Anna and Mom at the same time.'],
    [13, 'Mach dir nichts draus!', "Never mind! Don't let it bother you.", 'Ach, du liebe Zeit! Sam, mach dir nichts draus.', "Oh dear! Sam, don't let it bother you."],
    [13, 'sowieso', 'anyway, in any case', 'Frauen vergessen sowieso immer alles.', 'Women forget everything anyway.'],
    [13, 'merken', 'to notice, to realise', 'Die merken gar nicht, dass du nicht da bist.', "They won't even notice that you're not there."],
    [13, 'der Streit', 'argument, quarrel', 'Oh, der erste Streit des Hochzeitspaares!', "Oh, the wedding couple's first argument!"],
    [13, 'Ich will es gar nicht wissen.', "I don't even want to know.", 'Ich will es gar nicht wissen …', "I don't even want to know …"],
    [13, 'warten mit (+Dat)', 'to hold off on, to wait with', 'Anna und ich warten mit der Hochzeit.', 'Anna and I are holding off on the wedding.'],
    [13, 'traumhaft', 'dreamy, gorgeous', 'Ja! Genau! Er ist einfach traumhaft.', "Yes! Exactly! He's simply gorgeous."],
    [13, 'doch noch', 'after all, still (in the end)', 'Vielleicht wird es ja doch noch eine Hochzeit geben.', 'Maybe there will be a wedding after all.'],
    [13, 'danach', 'afterwards, after that', 'Danach kann man sich nie mehr die Beine auf der Toilette rasieren.', 'After that, you can never shave your legs on the toilet again.'],
    [13, 'hoffen', 'to hope', 'Hast du einen Freund, Sascha? – Ich hoffe, dass ich einen habe.', 'Have you got a boyfriend, Sascha? – I hope I have one.'],
    [13, 'die Hochzeit, -en', 'wedding (not "high time")', 'Ich will wirklich nur eine kleine Hochzeit.', 'I really only want a small wedding.'],
    [13, 'Das mit …', 'the thing with …, the business about …', 'Das mit Toby ist vorbei.', 'The thing with Toby is over.'],
    [13, 'einzig', 'only, single', 'Das einzige Problem ist: Ich bin immer die Brautjungfer und nie die Braut.', "The only problem is: I'm always the bridesmaid and never the bride."],
    [13, 'stark', 'strong', 'Oh! Du bist so stark!', "Oh! You're so strong!"],
    [13, 'noch nicht', 'not yet', 'Also, dann heiraten wir nicht … noch nicht!', "So we won't get married, then … not yet!"],
    [13, 'Vergiss nicht, …!', "Don't forget to …!", 'Und vergiss nicht, es deiner Mutter zu sagen.', "And don't forget to tell your mother."],
    [13, 'froh', 'glad', 'Ich bin so froh, dass wir nicht heiraten.', "I'm so glad that we're not getting married."],
    [13, 'jemandem wichtig sein', 'to be important to someone, to matter to someone', 'Andere Dinge sind dir viel wichtiger als ich!', 'Other things are much more important to you than me!'],
    [13, 'unmöglich', 'impossible', 'Heute war es wirklich, wirklich … unmöglich.', 'Today it was really, really … impossible.'],
    [13, 'für immer', 'forever', 'Und werden sie für immer glücklich sein?', 'And will they be happy forever?'],
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
    let h = '<button type="button" class="xv-ep xv-ep-all' + (all ? ' xv-on' : '') +
            '" data-ep="all" aria-pressed="' + all + '">Alle Folgen</button>';
    for (let e = 1; e <= EPISODES.length; e++) {
      const on = !all && !!sel[e];
      h += '<button type="button" class="xv-ep' + (on ? ' xv-on' : '') + '" data-ep="' + e +
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
    return '<div class="xv-gradehead">Wusstest du es?</div><div class="xv-grades">' +
      '<button type="button" class="xv-g0" data-g="0">Nein' +
        '<small><kbd>1</kbd>kommt in dieser Runde wieder</small></button>' +
      '<button type="button" class="xv-g1" data-g="1">Ja' +
        '<small><kbd>2</kbd>für heute erledigt</small></button></div>';
  }

  function render() {
    const c = $x('ex-card');
    if (!c) return;
    if (current === null) {
      c.className = 'xv-idle';
      c.removeAttribute('role');
      c.removeAttribute('tabindex');
      c.innerHTML = '<div class="xv-empty">Für diese Auswahl ist gerade nichts fällig.<br>' +
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
    let h = '<div class="xv-term' + (front.length > 26 ? ' xv-small' : '') + '">' + esc(front) + '</div>';
    if (shown) {
      h += '<div class="xv-answer"><div class="xv-gloss">' + esc(back) + '</div>' +
           '<div class="xv-ex">' + esc(row[3]) + '</div>' +
           '<div class="xv-ex-en">' + esc(row[4]) + '</div></div>' +
           '<div class="xv-tag">Folge ' + row[0] + ' · ' + esc(EPISODES[row[0] - 1]) + '</div>';
      c.className = 'xv-rev';
    } else {
      h += '<div class="xv-hint">Antippen oder Leertaste zum Umdrehen</div>';
      c.className = '';
    }
    c.innerHTML = h;
    $x('ex-controls').innerHTML = shown
      ? gradesHTML()
      : '<div class="xv-flipbar"><button type="button" id="ex-flip">Umdrehen</button></div>';
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
    p.innerHTML = '<div class="xv-panel"><p>' + idx.length + ' Karten, tab-getrennt: Deutsch · Englisch · ' +
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
    '<div class="xv-wrap">' +
      '<div class="xv-mast">' +
        '<button type="button" class="xv-ex-back" id="ex-back">← Menü</button>' +
        '<div class="xv-logo">extr@</div>' +
        '<h1>Vokabelkarten zur Serie</h1>' +
        '<div class="xv-count" id="ex-count"></div>' +
      '</div>' +
      '<div class="xv-picker">' +
        '<div class="xv-picker-head">Folgen auswählen</div>' +
        '<div class="xv-eps" id="ex-eps"></div>' +
      '</div>' +
      '<div class="xv-stage"><div id="ex-card" role="button" tabindex="0" aria-live="polite"></div></div>' +
      '<div id="ex-controls"></div>' +
      '<div class="xv-tools">' +
        '<button id="ex-dir" type="button"></button>' +
        '<button id="ex-shuffle" type="button">Neu mischen</button>' +
        '<button id="ex-export" type="button">Exportieren</button>' +
        '<span class="xv-spacer"></span>' +
        '<button id="ex-reset" type="button">Fortschritt löschen</button>' +
      '</div>' +
      '<div class="xv-stats" id="ex-stats"></div>' +
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
        this.className = 'xv-armed';
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
