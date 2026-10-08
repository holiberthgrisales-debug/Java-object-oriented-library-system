// 
// sistema canonico de generos literarios y multi-idioma
// sincronizacion bidireccional perfecta en: es, en, fr, de, it, pt
// 

export const generas = [
    {
        id: 'ficcion',
        es: 'Ficción', en: 'Fiction', fr: 'Fiction', de: 'Belletristik', it: 'Narrativa', pt: 'Ficção',
        subgeneros: [
            { es: 'Novela', en: 'Novel', fr: 'Roman', de: 'Roman', it: 'Romanzo', pt: 'Romance', keywords: ['novel', 'novela', 'roman', 'romanzo'] },
            { es: 'Novela corta', en: 'Novella', fr: 'Nouvelle', de: 'Novelle', it: 'Racconto lungo', pt: 'Novela', keywords: ['novella'] },
            { es: 'Cuento', en: 'Short Story', fr: 'Conte', de: 'Kurzgeschichte', it: 'Racconto', pt: 'Conto', keywords: ['short story', 'short stories', 'cuento', 'cuentos', 'racconti'] },
            { es: 'Microrrelato', en: 'Flash Fiction', fr: 'Micronouvelle', de: 'Kürzestgeschichte', it: 'Microracconto', pt: 'Microconto', keywords: ['flash fiction', 'microrrelato'] },
            { es: 'Relato', en: 'Tale', fr: 'Récit', de: 'Erzählung', it: 'Novella', pt: 'Relato', keywords: ['tale', 'tales', 'relato', 'récit'] },
            { es: 'Ficción histórica', en: 'Historical Fiction', fr: 'Fiction historique', de: 'Historischer Roman', it: 'Narrativa storica', pt: 'Ficção histórica', keywords: ['historical fiction', 'ficción histórica', 'narrativa storica'] },
            { es: 'Ficción contemporánea', en: 'Contemporary Fiction', fr: 'Fiction contemporaine', de: 'Gegenwartsliteratur', it: 'Narrativa contemporanea', pt: 'Ficção contemporânea', keywords: ['contemporary fiction'] },
            { es: 'Ficción literaria', en: 'Literary Fiction', fr: 'Littérature', de: 'Literatur', it: 'Narrativa letteraria', pt: 'Ficção literária', keywords: ['literary fiction', 'belles-lettres'] },
            { es: 'Ficción especulativa', en: 'Speculative Fiction', fr: 'Fiction spéculative', de: 'Spekulative Fiktion', it: 'Narrativa speculativa', pt: 'Ficção especulativa', keywords: ['speculative fiction'] },
            { es: 'Ficción psicológica', en: 'Psychological Fiction', fr: 'Fiction psychologique', de: 'Psychologischer Roman', it: 'Narrativa psicologica', pt: 'Ficção psicológica', keywords: ['psychological fiction'] }
        ]
    },
    {
        id: 'fantasia',
        es: 'Fantasía', en: 'Fantasy', fr: 'Fantastique', de: 'Fantasy', it: 'Fantasy', pt: 'Fantasia',
        subgeneros: [
            { es: 'Fantasía juvenil', en: 'Young Adult Fantasy', fr: 'Fantastique jeunesse', de: 'Jugend-Fantasy', it: 'Fantasy per ragazzi', pt: 'Fantasia juvenil', keywords: ['harry potter', 'wizards', 'witches', 'witchcraft', 'magic', 'magia', 'magos', 'hechicería', 'hogwarts', 'juvenile fantasy', 'ya fantasy', 'sorcery'] },
            { es: 'Fantasía épica', en: 'Epic Fantasy', fr: 'Fantasy épique', de: 'Epische Fantasy', it: 'Fantasy epico', pt: 'Fantasia épica', keywords: ['epic fantasy', 'fantasía épica', 'sword and sorcery', 'high fantasy', 'tolkien', 'dragons', 'dragones'] },
            { es: 'Alta fantasía', en: 'High Fantasy', fr: 'Haute fantasy', de: 'High Fantasy', it: 'High Fantasy', pt: 'Alta fantasia', keywords: ['high fantasy'] },
            { es: 'Baja fantasía', en: 'Low Fantasy', fr: 'Basse fantasy', de: 'Low Fantasy', it: 'Low Fantasy', pt: 'Baixa fantasia', keywords: ['low fantasy'] },
            { es: 'Fantasía oscura', en: 'Dark Fantasy', fr: 'Dark fantasy', de: 'Dark Fantasy', it: 'Dark Fantasy', pt: 'Fantasia sombria', keywords: ['dark fantasy'] },
            { es: 'Fantasía urbana', en: 'Urban Fantasy', fr: 'Fantasy urbaine', de: 'Urban Fantasy', it: 'Urban Fantasy', pt: 'Fantasia urbana', keywords: ['urban fantasy'] },
            { es: 'Fantasía histórica', en: 'Historical Fantasy', fr: 'Fantasy historique', de: 'Historische Fantasy', it: 'Fantasy storico', pt: 'Fantasia histórica', keywords: ['historical fantasy'] },
            { es: 'Fantasía romántica', en: 'Romantic Fantasy', fr: 'Fantasy romantique', de: 'Romantische Fantasy', it: 'Fantasy romantico', pt: 'Fantasia romântica', keywords: ['romantic fantasy', 'romantasy'] },
            { es: 'Grimdark', en: 'Grimdark', fr: 'Grimdark', de: 'Grimdark', it: 'Grimdark', pt: 'Grimdark', keywords: ['grimdark'] },
            { es: 'Espada y brujería', en: 'Sword and Sorcery', fr: 'Sword and sorcery', de: 'Sword and Sorcery', it: 'Sword and Sorcery', pt: 'Espada e feitiçaria', keywords: ['sword and sorcery'] },
            { es: 'Fantasía mitológica', en: 'Mythological Fantasy', fr: 'Fantasy mythologique', de: 'Mythologische Fantasy', it: 'Fantasy mitologico', pt: 'Fantasia mitológica', keywords: ['mythology', 'mythological', 'mitología', 'mitologia'] },
            { es: 'Realismo mágico', en: 'Magic Realism', fr: 'Réalisme magique', de: 'Magischer Realismus', it: 'Realismo magico', pt: 'Realismo mágico', keywords: ['magic realism', 'magical realism', 'realismo mágico', 'garcia marquez'] },
            { es: 'Portal fantasy', en: 'Portal Fantasy', fr: 'Portal fantasy', de: 'Portal-Fantasy', it: 'Portal fantasy', pt: 'Portal fantasy', keywords: ['portal fantasy', 'narnia'] }
        ]
    },
    {
        id: 'ciencia_ficcion',
        es: 'Ciencia ficción', en: 'Science Fiction', fr: 'Science-fiction', de: 'Science-Fiction', it: 'Fantascienza', pt: 'Ficção científica',
        subgeneros: [
            { es: 'Ciencia ficción dura', en: 'Hard Sci-Fi', fr: 'Hard science-fiction', de: 'Hard Science-Fiction', it: 'Fantascienza hard', pt: 'Ficção científica hard', keywords: ['hard science fiction', 'hard sci-fi'] },
            { es: 'Ciencia ficción blanda', en: 'Soft Sci-Fi', fr: 'Soft science-fiction', de: 'Soft Science-Fiction', it: 'Fantascienza soft', pt: 'Ficção científica soft', keywords: ['soft sci-fi'] },
            { es: 'Space opera', en: 'Space Opera', fr: 'Space opera', de: 'Space Opera', it: 'Space opera', pt: 'Space opera', keywords: ['space opera', 'space exploration', 'intergalactic', 'galaxy', 'star wars', 'dune'] },
            { es: 'Cyberpunk', en: 'Cyberpunk', fr: 'Cyberpunk', de: 'Cyberpunk', it: 'Cyberpunk', pt: 'Cyberpunk', keywords: ['cyberpunk', 'cyborg', 'hacker', 'virtual reality', 'matrix'] },
            { es: 'Steampunk', en: 'Steampunk', fr: 'Steampunk', de: 'Steampunk', it: 'Steampunk', pt: 'Steampunk', keywords: ['steampunk', 'steam power'] },
            { es: 'Biopunk', en: 'Biopunk', fr: 'Biopunk', de: 'Biopunk', it: 'Biopunk', pt: 'Biopunk', keywords: ['biopunk', 'genetic'] },
            { es: 'Solarpunk', en: 'Solarpunk', fr: 'Solarpunk', de: 'Solarpunk', it: 'Solarpunk', pt: 'Solarpunk', keywords: ['solarpunk'] },
            { es: 'Distopía', en: 'Dystopian', fr: 'Dystopie', de: 'Dystopie', it: 'Distopia', pt: 'Distopia', keywords: ['dystopia', 'dystopian', 'distopía', 'orwell', 'totalitarian'] },
            { es: 'Utopía', en: 'Utopian', fr: 'Utopie', de: 'Utopie', it: 'Utopia', pt: 'Utopia', keywords: ['utopia', 'utopian', 'utopía'] },
            { es: 'Postapocalíptica', en: 'Post-Apocalyptic', fr: 'Post-apocalyptique', de: 'Postapokalyptisch', it: 'Postapocalittico', pt: 'Pós-apocalíptico', keywords: ['post-apocalyptic', 'apocalypse', 'wasteland', 'zombie apocalypse'] },
            { es: 'Viajes en el tiempo', en: 'Time Travel', fr: 'Voyage dans le temps', de: 'Zeitreisen', it: 'Viaggi nel tempo', pt: 'Viagem no tempo', keywords: ['time travel', 'viaje en el tiempo', 'timeline'] },
            { es: 'Inteligencia artificial', en: 'Artificial Intelligence', fr: 'Intelligence artificielle', de: 'Künstliche Intelligenz', it: 'Intelligenza artificiale', pt: 'Inteligência artificial', keywords: ['artificial intelligence', 'ai', 'robot', 'robots', 'android', 'asimov'] },
            { es: 'Colonización espacial', en: 'Space Colonization', fr: 'Colonisation spatiale', de: 'Raumkolonisation', it: 'Colonizzazione spaziale', pt: 'Colonização espacial', keywords: ['space colonization', 'mars colonization'] }
        ]
    },
    {
        id: 'misterio_suspense',
        es: 'Misterio y Suspense', en: 'Mystery & Suspense', fr: 'Mystère & Suspense', de: 'Krimi & Thriller', it: 'Mistero e Suspense', pt: 'Mistério e Suspense',
        subgeneros: [
            { es: 'Policial / Detectivesco', en: 'Detective & Police', fr: 'Policier / Détective', de: 'Detektiv / Polizei', it: 'Poliziesco', pt: 'Policial / Investigação', keywords: ['detective', 'police', 'policial', 'detectivesco', 'sherlock', 'poirot', 'investigation'] },
            { es: 'Novela negra (Noir)', en: 'Noir / Hardboiled', fr: 'Roman noir', de: 'Krimi (Noir)', it: 'Giallo / Noir', pt: 'Romance policial (Noir)', keywords: ['noir', 'hardboiled', 'novela negra', 'crime fiction'] },
            { es: 'Thriller psicológico', en: 'Psychological Thriller', fr: 'Thriller psychologique', de: 'Psychothriller', it: 'Thriller psicologico', pt: 'Thriller psicológico', keywords: ['psychological thriller', 'thriller psicológico'] },
            { es: 'Thriller legal', en: 'Legal Thriller', fr: 'Thriller juridique', de: 'Justizthriller', it: 'Thriller legale', pt: 'Thriller jurídico', keywords: ['legal thriller', 'courtroom'] },
            { es: 'Thriller médico', en: 'Medical Thriller', fr: 'Thriller médical', de: 'Medizinthriller', it: 'Thriller medico', pt: 'Thriller médico', keywords: ['medical thriller'] },
            { es: 'Thriller tecnológico', en: 'Techno-Thriller', fr: 'Techno-thriller', de: 'Technothriller', it: 'Technothriller', pt: 'Techno-thriller', keywords: ['techno-thriller', 'technological thriller'] },
            { es: 'Espionaje', en: 'Espionage / Spy', fr: 'Espionnage', de: 'Spionage', it: 'Spionaggio', pt: 'Espionagem', keywords: ['espionage', 'spy', 'espionaje', 'mi6', 'cia'] },
            { es: 'Whodunit', en: 'Whodunit', fr: 'Whodunit', de: 'Whodunit', it: 'Giallo classico', pt: 'Quem matou?', keywords: ['whodunit', 'agatha christie', 'misterio'] },
            { es: 'Cozy mystery', en: 'Cozy Mystery', fr: 'Cozy mystery', de: 'Cosy-Krimi', it: 'Cozy mystery', pt: 'Cozy mystery', keywords: ['cozy mystery'] }
        ]
    },
    {
        id: 'terror_horror',
        es: 'Terror y Horror', en: 'Horror', fr: 'Horreur', de: 'Horror', it: 'Horror', pt: 'Terror e Horror',
        subgeneros: [
            { es: 'Terror cósmico (Lovecraftiano)', en: 'Cosmic Horror', fr: 'Horreur cosmique', de: 'Kosmischer Horror', it: 'Horror cosmico', pt: 'Horror cósmico', keywords: ['cosmic horror', 'lovecraft', 'cthulhu'] },
            { es: 'Terror gótico', en: 'Gothic Horror', fr: 'Horreur gothique', de: 'Gothic Horror', it: 'Horror gotico', pt: 'Terror gótico', keywords: ['gothic horror', 'gothic', 'frankenstein', 'dracula', 'haunted'] },
            { es: 'Terror psicológico', en: 'Psychological Horror', fr: 'Horreur psychologique', de: 'Psychologischer Horror', it: 'Horror psicologico', pt: 'Terror psicológico', keywords: ['psychological horror', 'stephen king'] },
            { es: 'Horror corporal', en: 'Body Horror', fr: 'Body horror', de: 'Body Horror', it: 'Body horror', pt: 'Horror corporal', keywords: ['body horror'] },
            { es: 'Slasher', en: 'Slasher', fr: 'Slasher', de: 'Slasher', it: 'Slasher', pt: 'Slasher', keywords: ['slasher', 'serial killer'] },
            { es: 'Fantasmas / Casas encantadas', en: 'Haunted Houses & Ghosts', fr: 'Fantômes & Maisons hantées', de: 'Geister / Spukhäuser', it: 'Fantasmi / Case infestate', pt: 'Fantasmas e Casas assombradas', keywords: ['ghost', 'ghosts', 'haunted', 'fantasmas', 'haunting'] },
            { es: 'Vampiros', en: 'Vampires', fr: 'Vampires', de: 'Vampire', it: 'Vampiri', pt: 'Vampiros', keywords: ['vampire', 'vampires', 'vampiros', 'dracula'] },
            { es: 'Hombres lobo', en: 'Werewolves', fr: 'Loups-garous', de: 'Werwölfe', it: 'Licantropi', pt: 'Lobisomens', keywords: ['werewolf', 'werewolves', 'licántropos'] },
            { es: 'Zombis', en: 'Zombies', fr: 'Zombies', de: 'Zombies', it: 'Zombie', pt: 'Zumbis', keywords: ['zombie', 'zombies', 'zombis', 'undead'] },
            { es: 'Folk horror', en: 'Folk Horror', fr: 'Folk horror', de: 'Folk Horror', it: 'Folk horror', pt: 'Folk horror', keywords: ['folk horror', 'pagan'] }
        ]
    },
    {
        id: 'romance',
        es: 'Romance', en: 'Romance', fr: 'Romance', de: 'Liebesroman', it: 'Romanzo rosa', pt: 'Romance',
        subgeneros: [
            { es: 'Romance contemporáneo', en: 'Contemporary Romance', fr: 'Romance contemporaine', de: 'Zeitgenössischer Liebesroman', it: 'Romance contemporaneo', pt: 'Romance contemporâneo', keywords: ['contemporary romance', 'love story'] },
            { es: 'Romance histórico', en: 'Historical Romance', fr: 'Romance historique', de: 'Historischer Liebesroman', it: 'Romance storico', pt: 'Romance histórico', keywords: ['historical romance', 'pride and prejudice'] },
            { es: 'Romance paranormal', en: 'Paranormal Romance', fr: 'Romance paranormale', de: 'Paranormaler Liebesroman', it: 'Romance paranormale', pt: 'Romance paranormal', keywords: ['paranormal romance', 'twilight'] },
            { es: 'Comedia romántica', en: 'Romantic Comedy (Rom-Com)', fr: 'Comédie romantique', de: 'Romantische Komödie', it: 'Commedia romantica', pt: 'Comédia romântica', keywords: ['rom-com', 'romantic comedy'] },
            { es: 'New Adult', en: 'New Adult', fr: 'New Adult', de: 'New Adult', it: 'New Adult', pt: 'New Adult', keywords: ['new adult'] },
            { es: 'Young Adult romance', en: 'YA Romance', fr: 'Romance YA', de: 'Jugend-Liebesroman', it: 'Romance YA', pt: 'Romance YA', keywords: ['ya romance', 'teen romance'] },
            { es: 'Romance de época', en: 'Regency / Period Romance', fr: 'Romance d’époque', de: 'Regency-Romance', it: 'Romance d’epoca', pt: 'Romance de época', keywords: ['regency romance', 'bridgerton'] }
        ]
    },
    {
        id: 'no_ficcion',
        es: 'No Ficción', en: 'Non-Fiction', fr: 'Non-fiction', de: 'Sachbuch', it: 'Saggistica', pt: 'Não Ficção',
        subgeneros: [
            { es: 'Biografía', en: 'Biography', fr: 'Biographie', de: 'Biografie', it: 'Biografia', pt: 'Biografia', keywords: ['biography', 'biografía', 'biographies'] },
            { es: 'Autobiografía', en: 'Autobiography', fr: 'Autobiographie', de: 'Autobiografie', it: 'Autobiografia', pt: 'Autobiografia', keywords: ['autobiography', 'autobiografía'] },
            { es: 'Memorias', en: 'Memoir', fr: 'Mémoires', de: 'Memoiren', it: 'Memorie', pt: 'Memórias', keywords: ['memoir', 'memoirs', 'memorias'] },
            { es: 'Ensayo', en: 'Essay', fr: 'Essai', de: 'Essay', it: 'Saggio', pt: 'Ensaio', keywords: ['essay', 'essays', 'ensayo'] },
            { es: 'Divulgación científica', en: 'Popular Science', fr: 'Vulgarisation scientifique', de: 'Populärwissenschaft', it: 'Divulgazione scientifica', pt: 'Divulgação científica', keywords: ['popular science', 'science', 'ciencias', 'scientific'] },
            { es: 'Historia', en: 'History', fr: 'Histoire', de: 'Geschichte', it: 'Storia', pt: 'História', keywords: ['history', 'historia', 'world war', 'civilization'] },
            { es: 'Filosofía', en: 'Philosophy', fr: 'Philosophie', de: 'Philosophie', it: 'Filosofia', pt: 'Filosofia', keywords: ['philosophy', 'filosofía', 'philosophical'] },
            { es: 'Psicología', en: 'Psychology', fr: 'Psychologie', de: 'Psychologie', it: 'Psicologia', pt: 'Psicologia', keywords: ['psychology', 'psicología', 'psychological'] },
            { es: 'Autoayuda / Desarrollo personal', en: 'Self-Help / Personal Growth', fr: 'Développement personnel', de: 'Selbsthilfe', it: 'Crescita personale', pt: 'Autoajuda', keywords: ['self-help', 'autoayuda', 'personal development', 'motivation'] },
            { es: 'Sociología', en: 'Sociology', fr: 'Sociologie', de: 'Soziologie', it: 'Sociologia', pt: 'Sociologia', keywords: ['sociology', 'sociología'] },
            { es: 'Negocios / Finanzas', en: 'Business & Finance', fr: 'Business & Finance', de: 'Wirtschaft & Finanzen', it: 'Economia e Finanza', pt: 'Negócios e Finanças', keywords: ['business', 'finance', 'finanzas', 'economics', 'investing'] },
            { es: 'Tecnología', en: 'Technology / Computers', fr: 'Technologie & Informatique', de: 'Technologie & Informatik', it: 'Tecnologia e Informatica', pt: 'Tecnologia e Informática', keywords: ['technology', 'computers', 'software', 'programming', 'informatica'] }
        ]
    },
    {
        id: 'infantil_juvenil',
        es: 'Infantil y Juvenil', en: "Children's & YA", fr: 'Jeunesse', de: 'Kinder & Jugend', it: 'Ragazzi e Giovani', pt: 'Infantil e Juvenil',
        subgeneros: [
            { es: 'Aventura juvenil', en: 'Action & Adventure', fr: 'Aventure jeunesse', de: 'Jugendabenteuer', it: 'Avventura per ragazzi', pt: 'Aventura juvenil', keywords: ['action & adventure', 'adventure', 'aventura', 'action and adventure'] },
            { es: 'Álbum ilustrado', en: 'Picture Book', fr: 'Livre illustré', de: 'Bilderbuch', it: 'Libro illustrato', pt: 'Livro ilustrado', keywords: ['picture book', 'illustrated'] },
            { es: 'Cuento infantil', en: "Children's Story / Fairy Tale", fr: 'Conte pour enfants', de: 'Kindermärchen', it: 'Fiabe per bambini', pt: 'Conto infantil', keywords: ['fairy tale', 'fairy tales', 'children story', 'fable', 'infantil'] },
            { es: 'Middle Grade (8-12 años)', en: 'Middle Grade (8-12 yrs)', fr: 'Lecteurs 8-12 ans', de: 'Kinderbuch (8-12 J.)', it: 'Lettura 8-12 anni', pt: 'Leitores 8-12 anos', keywords: ['middle grade', 'children', 'juvenile literature'] },
            { es: 'Young Adult (12-18 años)', en: 'Young Adult (12-18 yrs)', fr: 'Young Adult (12-18 ans)', de: 'Young Adult (12-18 J.)', it: 'Young Adult (12-18 anni)', pt: 'Young Adult (12-18 anos)', keywords: ['young adult', 'teen fiction', 'ya fiction', 'teen'] },
            { es: 'Novela de iniciación', en: 'Coming of Age', fr: 'Roman d’apprentissage', de: 'Bildungsroman', it: 'Romanzo di formazione', pt: 'Novela de formação', keywords: ['coming of age', 'bildungsroman'] }
        ]
    },
    {
        id: 'poesia_teatro',
        es: 'Poesía y Teatro', en: 'Poetry & Drama', fr: 'Poésie & Théâtre', de: 'Lyrik & Drama', it: 'Poesia e Teatro', pt: 'Poesia e Teatro',
        subgeneros: [
            { es: 'Poesía lírica', en: 'Lyric Poetry', fr: 'Poésie lyrique', de: 'Lyrik', it: 'Poesia lirica', pt: 'Poesia lírica', keywords: ['poetry', 'poesía', 'poems', 'poème', 'gedicht'] },
            { es: 'Poesía épica', en: 'Epic Poetry', fr: 'Poésie épique', de: 'Epische Dichtung', it: 'Poesia epica', pt: 'Poesia épica', keywords: ['epic poem', 'epic poetry', 'ilíada', 'odisea'] },
            { es: 'Poesía contemporánea', en: 'Contemporary Poetry', fr: 'Poésie contemporaine', de: 'Moderne Lyrik', it: 'Poesia contemporanea', pt: 'Poesia contemporânea', keywords: ['contemporary poetry'] },
            { es: 'Haiku', en: 'Haiku', fr: 'Haïku', de: 'Haiku', it: 'Haiku', pt: 'Haiku', keywords: ['haiku'] },
            { es: 'Sonetos', en: 'Sonnets', fr: 'Sonnets', de: 'Sonette', it: 'Sonetti', pt: 'Sonetos', keywords: ['sonnet', 'sonnets', 'sonetos'] },
            { es: 'Tragedia', en: 'Tragedy', fr: 'Tragédie', de: 'Tragödie', it: 'Tragedia', pt: 'Tragédia', keywords: ['tragedy', 'shakespeare tragedy'] },
            { es: 'Comedia dramática', en: 'Dramedy', fr: 'Comédie dramatique', de: 'Tragikomödie', it: 'Commedia drammatica', pt: 'Comédia dramática', keywords: ['dramedy', 'comedy drama'] },
            { es: 'Monólogo', en: 'Monologue', fr: 'Monologue', de: 'Monolog', it: 'Monologo', pt: 'Monólogo', keywords: ['monologue'] },
            { es: 'Teatro clásico', en: 'Classic Drama / Theater', fr: 'Théâtre classique', de: 'Klassisches Drama', it: 'Teatro classico', pt: 'Teatro clássico', keywords: ['theater', 'theatre', 'teatro', 'drama', 'play'] }
        ]
    },
    {
        id: 'otros',
        es: 'Otros', en: 'Others', fr: 'Autres', de: 'Sonstiges', it: 'Altri', pt: 'Outros',
        subgeneros: [
            { es: 'Novela gráfica / Cómic', en: 'Graphic Novel / Comic', fr: 'Bande dessinée / Roman graphique', de: 'Graphic Novel / Comic', it: 'Fumetti / Graphic Novel', pt: 'Banda desenhada / Graphic Novel', keywords: ['comic', 'comics', 'graphic novel', 'historieta', 'bande dessinée'] },
            { es: 'Manga', en: 'Manga', fr: 'Manga', de: 'Manga', it: 'Manga', pt: 'Mangá', keywords: ['manga', 'manhwa'] },
            { es: 'Humor / Sátira', en: 'Humor & Satire', fr: 'Humour & Satire', de: 'Humor & Satire', it: 'Umorismo e Satira', pt: 'Humor e Sátira', keywords: ['humor', 'satire', 'comedy', 'satírico'] },
            { es: 'Religión / Espiritualidad', en: 'Religion & Spirituality', fr: 'Religion & Spiritualité', de: 'Religion & Spiritualität', it: 'Religione e Spiritualità', pt: 'Religião e Espiritualidade', keywords: ['religion', 'spirituality', 'bible', 'teología'] },
            { es: 'Gastronomía', en: 'Cooking & Gastronomy', fr: 'Cuisine & Gastronomie', de: 'Kochen & Gastronomie', it: 'Cucina e Gastronomia', pt: 'Culinária e Gastronomia', keywords: ['cooking', 'food', 'gastronomy', 'recetas', 'cuisine'] },
            { es: 'Viajes / Guías', en: 'Travel & Guides', fr: 'Voyages & Guides', de: 'Reisen & Reiseführer', it: 'Viaggi e Guide', pt: 'Viagens e Guias', keywords: ['travel', 'viajes', 'guidebook', 'tourism'] },
            { es: 'Arte / Fotografía', en: 'Art & Photography', fr: 'Art & Photographie', de: 'Kunst & Fotografie', it: 'Arte e Fotografia', pt: 'Arte e Fotografia', keywords: ['art', 'photography', 'arte', 'fotografía', 'design'] }
        ]
    }
];

// matriz retrocompatible con codigo existente
export const MATRIZ_GENEROS = generas.map(cat => ({
    categoria: cat.es,
    subgeneros: cat.subgeneros.map(s => s.es)
}));

// mapa bidireccional rapido: cualquier nombre en cualquier idioma -> objeto subgenero canonico
const MAPA_NOMBRES_A_SUBGENERO = new Map();
const MAPA_NOMBRES_A_CATEGORIA = new Map();

generas.forEach(cat => {
    ['es', 'en', 'fr', 'de', 'it', 'pt'].forEach(lang => {
        const catName = cat[lang];
        if (catName) {
            MAPA_NOMBRES_A_CATEGORIA.set(catName.toLowerCase(), cat);
        }
    });

    cat.subgeneros.forEach(sub => {
        ['es', 'en', 'fr', 'de', 'it', 'pt'].forEach(lang => {
            const subName = sub[lang];
            if (subName) {
                MAPA_NOMBRES_A_SUBGENERO.set(subName.toLowerCase(), sub);
            }
        });
    });
});

let tomSelectGenero = null;

// obtiene el idioma activo
function obtenerIdiomaActual() {
    if (typeof window.obtenerIdiomaActivo === 'function') {
        const l = window.obtenerIdiomaActivo();
        if (l) return l.toLowerCase();
    }
    const sel = document.getElementById('custom-lang-select');
    return (sel?.value || 'es').toLowerCase();
}

// inicializa o recrea tomselect adaptado al idioma activo
export function initTomSelectGenero(langParam) {
    const el = document.getElementById('l-genero');
    if (!el || typeof TomSelect === 'undefined') return;

    const lang = (langParam || obtenerIdiomaActual()).toLowerCase();

    if (tomSelectGenero) {
        try {
            tomSelectGenero.destroy();
        } catch { }
        tomSelectGenero = null;
    }

    const options = [];
    const optgroups = [];

    generas.forEach(cat => {
        const catNombre = cat[lang] || cat.es;
        optgroups.push({ value: catNombre, label: catNombre });
        cat.subgeneros.forEach(sub => {
            const subNombre = sub[lang] || sub.es;
            options.push({ value: subNombre, text: subNombre, optgroup: catNombre });
        });
    });

    const placeholderText = {
        es: 'Buscar o seleccionar género...',
        en: 'Search or select genre...',
        fr: 'Rechercher ou sélectionner un genre...',
        de: 'Genre suchen oder auswählen...',
        it: 'Cerca o seleziona genere...',
        pt: 'Pesquisar ou selecionar gênero...'
    }[lang] || 'Buscar o seleccionar género...';

    tomSelectGenero = new TomSelect('#l-genero', {
        options: options,
        optgroups: optgroups,
        optgroupField: 'optgroup',
        labelField: 'text',
        valueField: 'value',
        searchField: ['text', 'optgroup'],
        create: false, // previene la creacion de generos corruptos / etiquetas tecnicas arbitrarias
        placeholder: placeholderText,
        maxItems: 1
    });

    window.tomSelectGenero = tomSelectGenero;
    return tomSelectGenero;
}

// actualiza las opciones y el valor seleccionado de tomselect cuando se cambia el idioma del sistema
export function actualizarTomSelectIdioma(nuevoLang) {
    const el = document.getElementById('l-genero');
    if (!el || typeof TomSelect === 'undefined') return;

    const targetLang = (nuevoLang || 'es').toLowerCase();
    const valorActual = el.value || (window.tomSelectGenero ? window.tomSelectGenero.getValue() : '');

    // traducir el valor actual si existe
    const valorTraducido = valorActual ? traducirOAdaptarGenero(valorActual, targetLang) : '';

    // reconstruir tomselect completamente para garantizar etiquetas perfectas
    initTomSelectGenero(targetLang);

    if (valorTraducido && window.tomSelectGenero) {
        window.tomSelectGenero.setValue(valorTraducido, true);
    }
}

// traduce un genero bidireccionalmente entre cualquier par de idiomas sin perdidas ni corrupcion
export function traducirOAdaptarGenero(rawCat, langDestino = 'es') {
    if (!rawCat || typeof rawCat !== 'string') return '';
    const clean = rawCat.trim();
    if (!clean) return '';

    const target = (langDestino || 'es').toLowerCase();
    const cleanLower = clean.toLowerCase();

    // 1. coincidencia directa en el mapa de subgeneros
    if (MAPA_NOMBRES_A_SUBGENERO.has(cleanLower)) {
        const sub = MAPA_NOMBRES_A_SUBGENERO.get(cleanLower);
        return sub[target] || sub.es;
    }

    // 2. coincidencia en categorias principales
    if (MAPA_NOMBRES_A_CATEGORIA.has(cleanLower)) {
        const cat = MAPA_NOMBRES_A_CATEGORIA.get(cleanLower);
        return cat[target] || cat.es;
    }

    // 3. coincidencia por palabras clave de los subgeneros
    for (const cat of generas) {
        for (const sub of cat.subgeneros) {
            for (const kw of sub.keywords) {
                if (cleanLower === kw || cleanLower.includes(kw)) {
                    return sub[target] || sub.es;
                }
            }
        }
    }

    // 4. si es una categoria generica comun en ingles
    const equivalenciasRapidas = {
        'fiction': { es: 'Novela', en: 'Novel', fr: 'Roman', de: 'Roman', it: 'Romanzo', pt: 'Romance' },
        'fantasy': { es: 'Fantasía épica', en: 'Epic Fantasy', fr: 'Fantasy épique', de: 'Epische Fantasy', it: 'Fantasy epico', pt: 'Fantasia épica' },
        'magic': { es: 'Fantasía juvenil', en: 'Young Adult Fantasy', fr: 'Fantastique jeunesse', de: 'Jugend-Fantasy', it: 'Fantasy per ragazzi', pt: 'Fantasia juvenil' },
        'science fiction': { es: 'Ciencia ficción dura', en: 'Hard Sci-Fi', fr: 'Hard science-fiction', de: 'Hard Science-Fiction', it: 'Fantascienza hard', pt: 'Ficção científica hard' },
        'mystery': { es: 'Policial / Detectivesco', en: 'Detective & Police', fr: 'Policier / Détective', de: 'Detektiv / Polizei', it: 'Poliziesco', pt: 'Policial / Investigação' },
        'thriller': { es: 'Thriller psicológico', en: 'Psychological Thriller', fr: 'Thriller psychologique', de: 'Psychothriller', it: 'Thriller psicologico', pt: 'Thriller psicológico' },
        'horror': { es: 'Terror y Horror', en: 'Horror', fr: 'Horreur', de: 'Horror', it: 'Horror', pt: 'Terror e Horror' },
        'romance': { es: 'Romance contemporáneo', en: 'Contemporary Romance', fr: 'Romance contemporaine', de: 'Zeitgenössischer Liebesroman', it: 'Romance contemporaneo', pt: 'Romance contemporâneo' },
        'biography': { es: 'Biografía', en: 'Biography', fr: 'Biographie', de: 'Biografie', it: 'Biografia', pt: 'Biografia' },
        'history': { es: 'Historia', en: 'History', fr: 'Histoire', de: 'Geschichte', it: 'Storia', pt: 'História' },
        'children': { es: 'Cuento infantil', en: "Children's Story / Fairy Tale", fr: 'Conte pour enfants', de: 'Kindermärchen', it: 'Fiabe per bambini', pt: 'Conto infantil' },
        'juvenile': { es: 'Aventura juvenil', en: 'Action & Adventure', fr: 'Aventure jeunesse', de: 'Jugendabenteuer', it: 'Avventura per ragazzi', pt: 'Aventura juvenil' },
        'poetry': { es: 'Poesía lírica', en: 'Lyric Poetry', fr: 'Poésie lyrique', de: 'Lyrik', it: 'Poesia lirica', pt: 'Poesia lírica' },
        'comic': { es: 'Novela gráfica / Cómic', en: 'Graphic Novel / Comic', fr: 'Bande dessinée / Roman graphique', de: 'Graphic Novel / Comic', it: 'Fumetti / Graphic Novel', pt: 'Banda desenhada / Graphic Novel' }
    };

    for (const [k, obj] of Object.entries(equivalenciasRapidas)) {
        if (cleanLower.includes(k)) {
            return obj[target] || obj.es;
        }
    }

    // 5. si no se puede clasificar, devuelve el texto limpio capitalizado
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// filtra etiquetas tecnicas como series:harry_potter, accessible_book, etc.
// y extrae el genero literario real canonico.
export function resolverMejorGenero(listaSubjects, langDestino = 'es') {
    const target = (langDestino || 'es').toLowerCase();
    if (!listaSubjects) return target === 'es' ? 'Novela' : 'Novel';

    const items = Array.isArray(listaSubjects) ? listaSubjects : [listaSubjects];
    if (items.length === 0) return target === 'es' ? 'Novela' : 'Novel';

    // 1. extraer todos los textos como strings limpios
    const strings = items.map(it => {
        if (typeof it === 'string') return it.trim();
        if (typeof it === 'object' && it && it.name) return String(it.name).trim();
        return String(it || '').trim();
    }).filter(s => s.length > 0);

    const fullBlob = strings.join(' ').toLowerCase();

    // 2. comprobar palabras clave prioritarias en todo el acervo de subjects
    // prioridad 1: fantasia / harry potter / magia
    if (fullBlob.includes('harry potter') || fullBlob.includes('hogwarts') || fullBlob.includes('wizard') || fullBlob.includes('witches') || fullBlob.includes('witchcraft')) {
        return traducirOAdaptarGenero('Fantasía juvenil', target);
    }

    // prioridad 2: realismo magico
    if (fullBlob.includes('magic realism') || fullBlob.includes('magical realism') || fullBlob.includes('realismo mágico')) {
        return traducirOAdaptarGenero('Realismo mágico', target);
    }

    // prioridad 3: puntuacion de coincidencia con la matriz canonica
    let mejorSub = null;
    let maxPuntos = 0;

    for (const cat of generas) {
        for (const sub of cat.subgeneros) {
            let puntos = 0;
            // coincidencia con nombre en cualquier idioma
            ['es', 'en', 'fr', 'de', 'it', 'pt'].forEach(l => {
                const nombre = (sub[l] || '').toLowerCase();
                if (nombre && fullBlob.includes(nombre)) {
                    puntos += 15;
                }
            });
            // coincidencia con palabras clave
            sub.keywords.forEach(kw => {
                if (fullBlob.includes(kw)) {
                    puntos += (kw.length > 6 ? 8 : 4);
                }
            });

            if (puntos > maxPuntos) {
                maxPuntos = puntos;
                mejorSub = sub;
            }
        }
    }

    if (mejorSub && maxPuntos > 0) {
        return mejorSub[target] || mejorSub.es;
    }

    // 3. si no hubo puntos clave, buscar el primer termino que no sea tecnico
    for (const s of strings) {
        const low = s.toLowerCase();
        // ignorar basura tecnica: series:, person:, id:, accessible_book, in_library, etc.
        if (low.includes(':') || low.includes('_') || low.includes('library') ||
            low.includes('accessible') || low.includes('protected') || low.includes('reading level') ||
            low.includes('staff picks') || low.includes('bestseller') || low.includes('materials') ||
            low.includes('open library') || low.includes('internet archive') || low.startsWith('id')) {
            continue;
        }

        const res = traducirOAdaptarGenero(s, target);
        if (res) return res;
    }

    // fallback estandar
    return target === 'es' ? 'Novela' : 'Novel';
}

// traductor de texto libre (titulos, notas) con cache
const cacheTraduccionTexto = new Map();

export async function traducirTextoLibre(texto, langDestino = 'es') {
    if (!texto || typeof texto !== 'string' || !texto.trim()) return texto;
    const cleanText = texto.trim();
    const target = (langDestino || 'es').toLowerCase();
    const cacheKey = `${target}:${cleanText}`;

    if (cacheTraduccionTexto.has(cacheKey)) {
        return cacheTraduccionTexto.get(cacheKey);
    }

    // 1. google translate api
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(cleanText)}`;
        const resGoogle = await fetch(googleUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resGoogle.ok) {
            const dataGoogle = await resGoogle.json();
            if (Array.isArray(dataGoogle?.[0])) {
                const trad = dataGoogle[0].map(item => item?.[0] || '').join('').trim();
                if (trad) {
                    cacheTraduccionTexto.set(cacheKey, trad);
                    return trad;
                }
            }
        }
    } catch { }

    // 2. mymemory api
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=autodetect|${encodeURIComponent(target)}`;
        const resMem = await fetch(myMemoryUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resMem.ok) {
            const dataMem = await resMem.json();
            const rawTrad = dataMem?.responseData?.translatedText;
            if (rawTrad && !rawTrad.includes('MYMEMORY WARNING') && !rawTrad.includes('PLEASE SELECT TWO DISTINCT')) {
                const trad = rawTrad.trim();
                cacheTraduccionTexto.set(cacheKey, trad);
                return trad;
            }
        }
    } catch { }

    cacheTraduccionTexto.set(cacheKey, cleanText);
    return cleanText;
}

// inicializacion automatica
document.addEventListener('DOMContentLoaded', () => {
    initTomSelectGenero();
});

// exportaciones globales
window.initTomSelectGenero = initTomSelectGenero;
window.actualizarTomSelectIdioma = actualizarTomSelectIdioma;
window.MATRIZ_GENEROS = MATRIZ_GENEROS;
window.TABLA_GENEROS_CANONICA = generas;
window.traducirOAdaptarGenero = traducirOAdaptarGenero;
window.resolverMejorGenero = resolverMejorGenero;
window.traducirTextoLibre = traducirTextoLibre;
