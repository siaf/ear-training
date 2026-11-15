// What the History path teaches: the eras of Western music, composers, forms, inventions,
// and jazz and popular music. Facts are kept to the well established (dates from standard
// references; eras use the conventional boundaries, which are approximate by nature).
// Each quiz fact has its right answer first in `options`; questions shuffle them.

export const ERAS = ['medieval', 'renaissance', 'baroque', 'classical', 'romantic', 'modern'] as const;
export type Era = (typeof ERAS)[number];

export const ERA_INFO: Record<Era, { name: string; dates: string; hallmark: string }> = {
  medieval: { name: 'Medieval', dates: 'c. 500–1400', hallmark: 'plainchant, then the first harmony (organum)' },
  renaissance: { name: 'Renaissance', dates: 'c. 1400–1600', hallmark: 'smooth, many-voiced choral music' },
  baroque: { name: 'Baroque', dates: 'c. 1600–1750', hallmark: 'driving rhythm, a busy bass line, fugues and the first operas' },
  classical: { name: 'Classical', dates: 'c. 1750–1820', hallmark: 'clear, balanced tunes over simple accompaniment' },
  romantic: { name: 'Romantic', dates: 'c. 1820–1900', hallmark: 'big emotion, rich chromatic harmony, virtuoso soloists' },
  modern: { name: '20th century', dates: '1900 onward', hallmark: 'new sounds: impressionism, atonality, jazz, minimalism' },
};

export interface Composer {
  name: string;
  short: string;
  dates: string;
  era: Era;
  known: string;
}

export const COMPOSERS: Record<string, Composer> = {
  hildegard: { name: 'Hildegard of Bingen', short: 'Hildegard', dates: '1098–1179', era: 'medieval', known: 'an abbess whose chants are some of the earliest music by a named composer' },
  perotin: { name: 'Pérotin', short: 'Pérotin', dates: 'active c. 1200', era: 'medieval', known: 'organum for Notre-Dame in Paris, in up to four voices' },
  machaut: { name: 'Guillaume de Machaut', short: 'Machaut', dates: 'c. 1300–1377', era: 'medieval', known: 'poet and composer; his Messe de Nostre Dame is a landmark mass setting' },
  josquin: { name: 'Josquin des Prez', short: 'Josquin', dates: 'c. 1450–1521', era: 'renaissance', known: 'masses and motets that set the model for flowing, imitative polyphony' },
  tallis: { name: 'Thomas Tallis', short: 'Tallis', dates: 'c. 1505–1585', era: 'renaissance', known: 'English church music, including the 40-voice Spem in alium' },
  palestrina: { name: 'Giovanni Pierluigi da Palestrina', short: 'Palestrina', dates: 'c. 1525–1594', era: 'renaissance', known: 'serene masses, still taught as the model of Renaissance counterpoint' },
  purcell: { name: 'Henry Purcell', short: 'Purcell', dates: '1659–1695', era: 'baroque', known: 'the English opera Dido and Aeneas' },
  vivaldi: { name: 'Antonio Vivaldi', short: 'Vivaldi', dates: '1678–1741', era: 'baroque', known: 'hundreds of concertos, including The Four Seasons' },
  bach: { name: 'Johann Sebastian Bach', short: 'J. S. Bach', dates: '1685–1750', era: 'baroque', known: 'fugues, cantatas and The Well-Tempered Clavier' },
  handel: { name: 'George Frideric Handel', short: 'Handel', dates: '1685–1759', era: 'baroque', known: 'the oratorio Messiah and Water Music' },
  haydn: { name: 'Joseph Haydn', short: 'Haydn', dates: '1732–1809', era: 'classical', known: '104 symphonies and the string quartet as a form' },
  mozart: { name: 'Wolfgang Amadeus Mozart', short: 'Mozart', dates: '1756–1791', era: 'classical', known: 'operas like The Marriage of Figaro, symphonies and piano concertos' },
  beethoven: { name: 'Ludwig van Beethoven', short: 'Beethoven', dates: '1770–1827', era: 'classical', known: 'nine symphonies; his later works lead into the Romantic era' },
  schubert: { name: 'Franz Schubert', short: 'Schubert', dates: '1797–1828', era: 'romantic', known: 'more than 600 songs (Lieder) for voice and piano' },
  chopin: { name: 'Frédéric Chopin', short: 'Chopin', dates: '1810–1849', era: 'romantic', known: 'piano music: nocturnes, études, mazurkas' },
  clara: { name: 'Clara Schumann', short: 'Clara Schumann', dates: '1819–1896', era: 'romantic', known: 'one of the century\'s great pianists, and a composer' },
  verdi: { name: 'Giuseppe Verdi', short: 'Verdi', dates: '1813–1901', era: 'romantic', known: 'Italian operas: La traviata, Aida, Rigoletto' },
  wagner: { name: 'Richard Wagner', short: 'Wagner', dates: '1813–1883', era: 'romantic', known: 'huge music dramas, the Ring cycle and Tristan und Isolde' },
  brahms: { name: 'Johannes Brahms', short: 'Brahms', dates: '1833–1897', era: 'romantic', known: 'four symphonies and the German Requiem' },
  tchaikovsky: { name: 'Pyotr Ilyich Tchaikovsky', short: 'Tchaikovsky', dates: '1840–1893', era: 'romantic', known: 'the ballets Swan Lake and The Nutcracker' },
  debussy: { name: 'Claude Debussy', short: 'Debussy', dates: '1862–1918', era: 'modern', known: 'impressionism: Clair de lune, La mer' },
  schoenberg: { name: 'Arnold Schoenberg', short: 'Schoenberg', dates: '1874–1951', era: 'modern', known: 'atonal music and the twelve-tone method' },
  stravinsky: { name: 'Igor Stravinsky', short: 'Stravinsky', dates: '1882–1971', era: 'modern', known: 'The Rite of Spring, whose 1913 premiere caused an uproar' },
  bartok: { name: 'Béla Bartók', short: 'Bartók', dates: '1881–1945', era: 'modern', known: 'music built on Hungarian folk song' },
  copland: { name: 'Aaron Copland', short: 'Copland', dates: '1900–1990', era: 'modern', known: 'an American sound: Appalachian Spring' },
  shostakovich: { name: 'Dmitri Shostakovich', short: 'Shostakovich', dates: '1906–1975', era: 'modern', known: '15 symphonies written under Soviet rule' },
  reich: { name: 'Steve Reich', short: 'Steve Reich', dates: 'born 1936', era: 'modern', known: 'minimalism: slowly shifting repeated patterns' },
};

export interface Fact {
  title: string; // short, for review lists
  prompt: string;
  options: [string, string, string, string]; // right answer first
  explain: string;
}

export const FACTS: Record<string, Fact> = {
  // The eras in order.
  renaissance_dates: { title: 'The Renaissance, 1400–1600', prompt: 'Which era runs from about 1400 to 1600?', options: ['Renaissance', 'Medieval', 'Baroque', 'Classical'], explain: 'The Renaissance (about 1400–1600) is the age of Josquin and Palestrina: smooth choral music where every voice is equal.' },
  baroque_dates: { title: 'The Baroque, 1600–1750', prompt: 'Which era runs from about 1600 to 1750?', options: ['Baroque', 'Renaissance', 'Classical', 'Romantic'], explain: 'The Baroque runs from the first operas, around 1600, to the death of J. S. Bach in 1750.' },
  classical_dates: { title: 'The Classical era, 1750–1820', prompt: 'Which era runs from about 1750 to 1820?', options: ['Classical', 'Baroque', 'Romantic', 'Renaissance'], explain: 'The Classical era is Haydn, Mozart and early Beethoven: balanced phrases and clear forms like the symphony and sonata.' },
  romantic_dates: { title: 'The Romantic era, 1820–1900', prompt: 'Which era runs from about 1820 to 1900?', options: ['Romantic', 'Classical', 'Baroque', 'Medieval'], explain: 'The Romantic era (about 1820–1900) chased big emotion: Chopin, Wagner, Brahms, Tchaikovsky.' },
  first_era: { title: 'The earliest era', prompt: 'Which of these eras came first?', options: ['Medieval', 'Renaissance', 'Baroque', 'Classical'], explain: 'Medieval (about 500–1400), then Renaissance, Baroque, Classical, Romantic and the 20th century.' },
  after_baroque: { title: 'What came after the Baroque', prompt: 'Which era came right after the Baroque?', options: ['Classical', 'Romantic', 'Renaissance', 'Medieval'], explain: 'After Bach and Handel came Haydn and Mozart: the Classical era, from about 1750.' },
  before_baroque: { title: 'What came before the Baroque', prompt: 'Which era came right before the Baroque?', options: ['Renaissance', 'Classical', 'Medieval', 'Romantic'], explain: 'The Renaissance (about 1400–1600) led into the Baroque around 1600.' },
  twentieth: { title: 'The 20th century', prompt: 'Atonal music, jazz and electronic music all arrived in which century?', options: ['The 20th', 'The 18th', 'The 19th', 'The 17th'], explain: 'The 20th century broke the old rules: Schoenberg\'s atonality, jazz from New Orleans, electronic studios after 1945.' },

  // Forms and famous works.
  fugue: { title: 'The fugue', prompt: 'A fugue, where voices enter one by one with the same theme, is a hallmark of which era?', options: ['Baroque', 'Romantic', 'Medieval', '20th century'], explain: 'The fugue peaked in the Baroque. Bach\'s Well-Tempered Clavier and Art of Fugue are the models still studied.' },
  opera_birth: { title: 'Where opera began', prompt: 'Opera was born around 1600 in which country?', options: ['Italy', 'Germany', 'France', 'England'], explain: 'Opera began in Italy around 1600. Monteverdi\'s L\'Orfeo (1607) is the earliest opera still regularly staged.' },
  sonata_form: { title: 'Sonata form', prompt: 'Sonata form (exposition, development, recapitulation) took shape in which era?', options: ['Classical', 'Medieval', 'Renaissance', 'Baroque'], explain: 'Sonata form grew up in the Classical era with Haydn and Mozart, and shaped symphonies for the next century.' },
  quartet_father: { title: 'Father of the string quartet', prompt: 'Who is called the father of the string quartet (and of the symphony)?', options: ['Joseph Haydn', 'J. S. Bach', 'Frédéric Chopin', 'Antonio Vivaldi'], explain: 'Joseph Haydn wrote 68 string quartets and 104 symphonies, and set the shape of both.' },
  madrigal: { title: 'The madrigal', prompt: 'Madrigals, songs for several unaccompanied voices, flourished in which era?', options: ['Renaissance', 'Romantic', 'Classical', '20th century'], explain: 'The madrigal flourished in the Renaissance, in Italy and then England.' },
  chant: { title: 'Gregorian chant', prompt: 'Gregorian chant is…', options: ['One melody, sung in unison, with no accompaniment', 'Four-part harmony with organ', 'A solo song with piano', 'A tune over guitar chords'], explain: 'Chant is monophonic: one line, sung in unison in Latin, in the church modes. Harmony grew out of it later, as organum.' },
  lieder: { title: 'Lieder', prompt: 'Schubert wrote over 600 songs for voice and piano. What are they called in German?', options: ['Lieder', 'Arias', 'Madrigals', 'Chorales'], explain: 'Lied means song; Schubert\'s Lieder, like Erlkönig, made the piano an equal partner to the voice.' },
  nocturnes: { title: 'Nocturnes and études', prompt: 'Which composer is best known for piano nocturnes, études and mazurkas?', options: ['Frédéric Chopin', 'Giuseppe Verdi', 'Henry Purcell', 'Joseph Haydn'], explain: 'Chopin wrote almost only for piano, and his nocturnes and études are central to every pianist\'s repertoire.' },
  four_seasons: { title: 'The Four Seasons', prompt: 'Vivaldi\'s The Four Seasons is a set of…', options: ['Violin concertos', 'Operas', 'Piano sonatas', 'String quartets'], explain: 'The Four Seasons is four violin concertos, published in 1725, each painting a season.' },
  ode_to_joy: { title: 'Ode to Joy', prompt: 'Whose Ninth Symphony ends with a choir singing the "Ode to Joy"?', options: ['Beethoven', 'Mozart', 'Brahms', 'Haydn'], explain: 'Beethoven\'s Ninth (1824) was one of the first symphonies to bring in a choir and solo singers.' },
  rite_of_spring: { title: 'The Rite of Spring', prompt: 'Which ballet caused an uproar at its Paris premiere in 1913?', options: ['The Rite of Spring', 'Swan Lake', 'The Nutcracker', 'Boléro'], explain: 'Stravinsky\'s The Rite of Spring, with its pounding, irregular rhythms, provoked shouting in the audience.' },

  // Instruments and firsts.
  piano: { title: 'The first piano', prompt: 'Who built the first piano, around 1700?', options: ['Bartolomeo Cristofori', 'Antonio Stradivari', 'Adolphe Sax', 'Johann Maelzel'], explain: 'Cristofori, in Florence, built a harpsichord-like instrument whose hammers could play soft or loud: the piano(forte).' },
  staff_notation: { title: 'Staff notation', prompt: 'Which 11th-century monk helped invent staff notation and the syllables ut, re, mi?', options: ['Guido of Arezzo', 'Pérotin', 'Hildegard of Bingen', 'Machaut'], explain: 'Guido of Arezzo used lines to fix pitch and named notes ut, re, mi, fa, sol, la. Ut later became do.' },
  saxophone: { title: 'The saxophone', prompt: 'The saxophone was invented in the 1840s by…', options: ['Adolphe Sax', 'Thomas Edison', 'Bartolomeo Cristofori', 'Antonio Stradivari'], explain: 'Adolphe Sax, a Belgian instrument maker, patented the saxophone in 1846.' },
  phonograph: { title: 'The phonograph', prompt: 'Who invented the phonograph, the first machine to record and play back sound, in 1877?', options: ['Thomas Edison', 'Alexander Graham Bell', 'Adolphe Sax', 'Guglielmo Marconi'], explain: 'Edison\'s phonograph (1877) recorded sound on tinfoil. Recording changed how music was heard forever.' },
  well_tempered: { title: 'The Well-Tempered Clavier', prompt: 'Bach\'s The Well-Tempered Clavier has a prelude and fugue in…', options: ['All 24 major and minor keys', 'Only C major', 'The seven church modes', 'Twelve major keys'], explain: 'Two books, each with 24 preludes and fugues, one in every major and minor key, showing that a well-tuned keyboard could play in them all.' },
  stradivari: { title: 'Stradivari', prompt: 'Antonio Stradivari is famous for making…', options: ['Violins', 'Pianos', 'Organs', 'Flutes'], explain: 'Stradivari (c. 1644–1737) made violins, violas and cellos in Cremona; several hundred survive and are among the most prized instruments in the world.' },
  electric_guitar: { title: 'The electric guitar', prompt: 'Electric guitars first appeared in which decade?', options: ['The 1930s', 'The 1890s', 'The 1960s', 'The 1910s'], explain: 'The first electric guitars with magnetic pickups appeared in the early 1930s, so guitarists could be heard over big bands.' },
  metronome: { title: 'The metronome', prompt: 'The metronome was patented around 1815 by…', options: ['Johann Maelzel', 'Ludwig van Beethoven', 'Thomas Edison', 'Adolphe Sax'], explain: 'Johann Maelzel patented the metronome around 1815. Beethoven was one of the first composers to add metronome marks to his music.' },

  // Jazz and popular music.
  ragtime: { title: 'Ragtime', prompt: 'Scott Joplin, composer of the "Maple Leaf Rag", is known as the king of…', options: ['Ragtime', 'Bebop', 'Swing', 'The blues'], explain: 'Ragtime, around 1900, set syncopated tunes over a steady oom-pah left hand. It fed straight into early jazz.' },
  twelve_bar: { title: 'The 12-bar blues', prompt: 'The most common blues form is how many bars long?', options: ['12', '8', '16', '32'], explain: 'The 12-bar blues: four bars on I, two on IV, two on I, then V, IV, I. It underlies blues, early rock and roll and much jazz.' },
  new_orleans: { title: 'Where jazz began', prompt: 'Jazz grew up in the early 1900s in which city?', options: ['New Orleans', 'Chicago', 'New York', 'Memphis'], explain: 'Jazz grew from blues, ragtime and brass bands in New Orleans, then spread to Chicago and New York.' },
  swing_era: { title: 'The swing era', prompt: 'Big bands led by Duke Ellington and Count Basie defined which era of jazz?', options: ['Swing', 'Bebop', 'Cool jazz', 'Fusion'], explain: 'The swing era (1930s to mid-1940s) was jazz as dance music, played by big bands.' },
  bebop: { title: 'Bebop', prompt: 'Charlie Parker and Dizzy Gillespie led which fast, complex style of 1940s jazz?', options: ['Bebop', 'Ragtime', 'Swing', 'Dixieland'], explain: 'Bebop took jazz from the dance floor to the listening room: fast tempos, complex chords, virtuoso solos.' },
  modal_jazz: { title: 'Kind of Blue', prompt: 'Miles Davis\'s album Kind of Blue (1959) is the landmark of which approach?', options: ['Modal jazz', 'Bebop', 'Ragtime', 'Free jazz'], explain: 'Kind of Blue improvised over modes and slow-moving harmony instead of fast chord changes. It is the best-selling jazz album.' },
  rock_and_roll: { title: 'Rock and roll', prompt: 'Rock and roll took off in which decade?', options: ['The 1950s', 'The 1930s', 'The 1970s', 'The 1910s'], explain: 'Rock and roll broke through in the mid-1950s with Chuck Berry, Little Richard and Elvis Presley, built on rhythm and blues.' },
  motown: { title: 'Motown', prompt: 'Motown Records was founded in 1959 in which city?', options: ['Detroit', 'Memphis', 'Los Angeles', 'Nashville'], explain: 'Berry Gordy founded Motown in Detroit; its soul and pop hits (the Supremes, Stevie Wonder) crossed over to every audience.' },
  hip_hop: { title: 'Where hip hop began', prompt: 'Hip hop began in the 1970s in which New York borough?', options: ['The Bronx', 'Manhattan', 'Brooklyn', 'Queens'], explain: 'Hip hop began at Bronx block parties, where DJs like Kool Herc looped the drum breaks of funk records.' },
};
