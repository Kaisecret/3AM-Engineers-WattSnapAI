export const PROVINCES = ["Antique", "Aklan", "Capiz", "Iloilo"] as const;

export type LocationHierarchy = Record<string, Record<string, string[]>>;

export const PHILIPPINE_LOCATIONS: LocationHierarchy = {
  "Antique": {
    "Anini-y": [
      "Baybay", "Bato Cueva", "Bongayan", "Cabariwan", "Casay", "Iba", "Mabuyong", "Magdalena",
      "Nato", "Poblacion", "San Francisco", "San Jose", "San Ramon", "Sagua", "Tagaytay", "Tig-hoad", "Traposo"
    ],
    "Barbaza": [
      "Baghari", "Bahayan", "Berangan", "Cadiao", "Calangcang", "Esparar", "Guisijan", "Ibo",
      "Igpalge", "Igtunao", "Insubuan", "Jinalinan", "Layog", "Lombuyan", "Mablad", "Magtulis",
      "Maris", "Nalook", "Narra", "Palma", "Poblacion", "San Antonio", "San Ramon", "Solong", "Yapo"
    ],
    "Belison": [
      "Borocboroc", "Buenavista", "Concepcion", "Delima", "Ipil", "Maradiona", "Mojon",
      "Poblacion", "Rombang", "Salvacion", "Sinaja"
    ],
    "Bugasong": [
      "Bagacay", "Baluche", "Bicbica", "Centro Ilawod", "Centro Ilaya", "Cubay North", "Cubay South",
      "Guija", "Igbalahi", "Igcabuyo", "Igcado", "Igsoro", "Ilaures", "Jinalinan", "Maris",
      "Pangalcagan", "Poblacion", "Sabang East", "Sabang West", "Tagudtud", "Talus", "Tica", "Tono", "Yapao", "Zaragosa"
    ],
    "Caluya": [
      "Alegria", "Bacong", "Banago", "Bonifacio", "Dauis", "Harigue", "Hambil", "Imba",
      "Masidlak", "Poblacion", "Semirara", "Sibato", "Sibay", "Tinogboc"
    ],
    "Culasi": [
      "Alegria", "Bagacay", "Balac-balac", "Batbatan Island", "Bitadton Norte", "Bitadton Sur",
      "Buenavista", "Buhi", "Camancijan", "Carit-an", "Centro Poblacion", "Condes", "Esperanza",
      "Fe", "Flores", "Jalandoni", "Janlagasi", "Lamputong", "Lipata", "Malalison Island",
      "Maniguin Island", "Maracanan", "Naba", "Osorio", "Salde", "San Antonio", "San Bernardo",
      "San Gabriel", "San Jose", "San Juan", "San Pedro", "San Rafael", "San Vicente", "Simun",
      "Sula", "Tigmamale", "Tinabusan", "Tomao", "Valderrama"
    ],
    "Hamtic": [
      "Apdo", "Asluman", "Banawang", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)",
      "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Botbot",
      "Budasan", "Buhang", "Calala", "Calancacan", "Calo-oy", "Caridad", "Carit-an",
      "Casalngan", "Dangcalan", "Del Pilar", "Fabrica", "Funda", "General Fullon", "Guba",
      "Guisijan", "Igbalogo", "Igbical", "Igbucagay", "Inabasan", "Ingwan-Batangan", "La Paz",
      "Lili-on", "Linaban", "Malandog", "Mapatag", "Masanag", "Nalihusan", "Pasungwi",
      "Piape I", "Piape II", "Piape III", "Pili 1", "Pili 2", "Pili 3", "Pu-ao", "San Jose",
      "Timonan", "Villavert-Jimenez"
    ],
    "Laua-an": [
      "Bagongbayan", "Banban", "Cadajug", "Canituan", "Capnayan", "Casit-an", "Guinbanga-an",
      "Guiamon", "Jinalinan", "Laua-an", "Lindero", "Lugta", "Magtumbao", "Maria", "Poblacion", "San Ramon"
    ],
    "Libertad": [
      "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5", "Bulanao", "Cubay",
      "Igpuro", "Inyawan", "Mararison", "Pajo", "San Roque", "Tinogboc", "Union", "Taboc"
    ],
    "Pandan": [
      "Aracay", "Badiangan", "Bagumbayan", "Baybay", "Cabugao", "Candari", "Carmen",
      "Centro Norte", "Centro Sur", "Duhoc", "Idiayan", "Luhod-bayang", "Mag-aba", "Mauring",
      "Napasahan", "Nauring", "Patria", "San Andres", "San Joaquin", "Santa Ana", "Santa Cruz",
      "Santa Fe", "Santo Rosario", "Talabahan", "Tingib", "Zaldivar"
    ],
    "Patnongon": [
      "Alvañiz", "Amparo", "Apgahan", "Aureliana", "Bago", "Bitas", "Carit-an", "Cuyapiao",
      "Gella", "Igbalogo", "Igbobon", "Igtuba", "La Rioja", "Mabasa", "Macarina", "Magparasan",
      "Padang", "Pandanan", "Patnongon", "Poblacion", "Salawagan", "San Rafael", "Tamason",
      "Villa Elio", "Villa Salomon", "Yapu"
    ],
    "San Jose de Buenavista": [
      "Atabay", "Badiang", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)",
      "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", "Barangay 7 (Poblacion)",
      "Barangay 8 (Poblacion)", "Bariri", "Bubon", "Cansadan", "Dalipe", "Durog", "Fundi",
      "Igbators", "Inabasan", "Madrangca", "Magcalon", "Malaiba", "Maybato North", "Maybato South",
      "Mojon", "Pantao", "Payao", "San Angel", "San Fernando"
    ],
    "San Remigio": [
      "Agbalogo", "Agcarope", "Alimodian", "Bacan", "Bagumbayan", "Baladjay", "Bangar",
      "Bongbongan", "Cabiawan", "Cadolonan", "General Luna", "Igcabuyo", "Igdalaquit",
      "Iglinab", "Nagbangi", "Orquia", "Poblacion", "Ramon Magsaysay", "San Rafael", "Sinundolan", "Tubudan", "Vilvar"
    ],
    "Sebaste": [
      "Abiera", "Aguila", "Alegria", "Aras-asan", "Bacolod", "Callan", "Nauhon",
      "Poblacion", "P. Javier", "San Jose"
    ],
    "Sibalom": [
      "Alimodian", "Biga-a", "Bongbongan I", "Bongbongan II", "Catmon", "District I (Poblacion)",
      "District II (Poblacion)", "District III (Poblacion)", "District IV (Poblacion)", "Esperanza",
      "Igdalaquit", "Iglanot", "Igpanolong", "Igtuba", "Ilabas", "Imparayan", "Inabasan",
      "Indag-an", "Luna", "Luyang", "Maasin", "Mabini", "Millamena", "Mojon", "Nagdayao",
      "Nazareth", "Odiong", "Olaga", "Pangpang", "Pasong", "Pis-anan", "Rombang", "Salvacion",
      "San Juan", "Solong", "Tabongtabong", "Tig-o", "Tigabusan", "Tula-tula", "Villafont", "Villar"
    ],
    "Tibiao": [
      "Alegria", "Amar", "Bandoja", "Castillo", "Esparar", "Importante", "Lapaz",
      "Malabor", "Martinez", "Natividad", "Poblacion", "Salazar", "San Francisco",
      "San Isidro", "Santa Ana", "Santa Justa", "Santo Rosario", "Tigbaboy", "Tuno"
    ],
    "Tobias Fornier (Dao)": [
      "Abaca", "Aras-asan", "Aroma", "Bagumbayan", "Ballenas", "Caba-an", "Camandagan",
      "Cato-ogan", "Danawan", "Datu Sumakwel", "Gamutan", "Igbalogo", "Igcabuyo", "Igdalaquit",
      "Igpuro", "Lawigan", "Maniba", "Opsan", "Paciencia", "Poblacion Norte", "Poblacion Sur",
      "Quezon", "Salde", "San Bernardo", "Santa Fe", "Santo Tomas", "Tigbalogo", "Villa Dione", "Villa Elio"
    ],
    "Valderrama": [
      "Alilisan", "Bakisquis", "Borocboroc", "Bugnay", "Buluangan", "Bunsod", "Busog",
      "Cananghan", "Cansilayan", "Culyat", "Iglinab", "Igmasandig", "Lublub", "Manlacbo",
      "Pandanan", "Poblacion", "San Agustin", "Takas", "Tigmamale", "Ubos"
    ]
  },
  "Aklan": {
    "Altavas": ["Cabugao", "Catmon", "Dalipdip", "Ginictan", "Linayasan", "Lumaynay", "Lupo", "Man-up", "Odia", "Poblacion", "Talon", "Tibiao"],
    "Balete": ["Aranas", "Bantud", "Cabacungan", "Calizo", "Cortes", "Feliciano", "Fulad", "Guanko", "Morales", "Oquendo", "Poblacion"],
    "Banga": ["Agbanawan", "Bacan", "Badiangan", "Cerrudo", "Cupang", "Daguitan", "Daja Norte", "Daja Sur", "Linabuan Sur", "Mambog", "Poblacion", "Polo", "Sigcay", "Torralba", "Ugsod"],
    "Batan": ["Ambolong", "Angono", "Cabugao", "Camaligan", "Camanci", "Ipil", "Lalab", "Mando-o", "Magpag-ong", "Magparang", "Napti", "Poblacion", "Tabon"],
    "Buruanga": ["Alegria", "Bagongbayan", "Balusbos", "Bel-is", "Cabugan", "El Progreso", "Habana", "Katipunan", "Mayapay", "Nazareth", "Poblacion", "Santander", "Tag-osip"],
    "Ibajay": ["Agdugayan", "Antipolo", "Aparicio", "Bacan", "Bagacay", "Batuan", "Capilijan", "Colong-colong", "Laguinaban Alfaro", "Naile", "Ondoy", "Poblacion", "Polo", "Regador", "San Isidro", "Tagbaya"],
    "Kalibo": [
      "Andagao", "Bachaw Norte", "Bachaw Sur", "Briones", "Buswang New", "Buswang Old",
      "Caano", "Estancia", "Linabuan Norte", "Mabilo", "Mobo", "Old Buswang", "Poblacion",
      "Pook", "Tigayon", "Tinigaw"
    ],
    "Lezo": ["Agcawilan", "Bagto", "Bugasongan", "Carugdog", "Cogon", "Ibao", "Poblacion", "Santa Cruz", "Silakat-Nonok", "Sta. Cruz Biga-a"],
    "Libacao": ["Agmailig", "Alfonso XII", "Batobato", "Bonza", "Calacabian", "Can-Awan", "Dalagsan", "Guadalupe", "Janlud", "Julita", "Luctogan", "Magugba", "Ogsip", "Ortega", "Oyang", "Poblacion", "Rivera", "Rosal", "Sibalew"],
    "Madalag": ["Alaminos", "Bacolod", "Cabangahan", "Cabilawan", "Catabana", "Dit-ana", "Galindo", "Logohon", "Mamba", "Maria Cristina", "Medina", "Panayakan", "Poblacion", "San Jose", "Singay", "Tigbawan"],
    "Makato": ["Agbalogo", "Aglasan", "Bagong Barrio", "Baybay", "Cabtang", "Calangcang", "Calimbajan", "Castillo", "Cayangwan", "Dumga", "Mantiguib", "Poblacion", "Tibo", "Tina"],
    "Malay (Boracay)": [
      "Argao", "Balabag (Boracay)", "Caticlan", "Cubay Norte", "Cubay Sur", "Manoc-Manoc (Boracay)",
      "Motag", "Naasug", "Nabaoy", "Napaan", "Poblacion", "San Pedro", "Sambiray", "Yapak (Boracay)"
    ],
    "Malinao": ["Banaybanay", "Biga-a", "Bulabud", "Cabayugan", "Cogon", "Dangcalan", "Kinalangay Viejo", "Lilo-an", "Malindog", "Manhanip", "Navitas", "Poblacion", "Rosario", "San Dimas", "San Ramon", "Sugnod", "Tambuan", "Tigpalas"],
    "Nabas": ["Alimbo Baybay", "Buenasuerte", "Gibon", "Habana", "Laserna", "Libertad", "Magallanes", "Matabana", "Nagustan", "Pawa", "Pinatuad", "Poblacion", "Rizal", "Solido", "Tagororoc", "Toledo", "Unidos"],
    "New Washington": ["Candelaria", "Dumaguit", "Fatima", "Guinbaliwan", "Jalas", "Jugas", "Lawacan", "Mabilo", "Mat-i", "Ochando", "Pinamuk-an", "Poblacion", "Puis", "Tambak"],
    "Numancia": ["Albasan", "Badio", "Bubog", "Bulwang", "Camanci Norte", "Camanci Sur", "Dongon East", "Dongon West", "Laguinaban", "Navitas", "Poblacion", "Pusio", "Tabunan"],
    "Tangalan": ["Afga", "Dapdap", "Dike", "Jawili", "Lanipga", "Pagsanghan", "Panayakan", "Poblacion", "Tagas", "Tamalagon", "Tamuan", "Tondog", "Vivo"]
  },
  "Capiz": {
    "Roxas City": [
      "Adlawan", "Bago", "Balijuagan", "Banica", "Barra", "Bato", "Baybay", "Bolo",
      "Cabugao", "Cagay", "Cogon", "Culajao", "Culasi", "Dayao", "Dinginan", "Dumolog",
      "Inzo Arnaldo Village", "Jumbo", "Lanot", "Lawa-an", "Liongs", "Loctugan", "Malipayon",
      "Milagrosa", "Milibili", "Mongpong", "Olutayan", "Punta Cogon", "Punta Tabuc", "San Jose",
      "Sibaguan", "Talon", "Tanque", "Tanza", "Tiglawigan"
    ],
    "Cuartero": ["Agbalogo", "Aglangit", "Agloco", "Angub", "Bito-on Ilawod", "Bito-on Ilaya", "Carataya", "Lunayan", "Maindang", "Nagba", "Poblacion Ilawod", "Poblacion Ilaya", "San Antonio", "Sinabsaban"],
    "Dao": ["Agbamban", "Agcarope", "Agkilo", "Balucuan", "Bitaogan", "Daplas", "Duyoc", "Ilawod", "Ilaya", "Lacaron", "Malonoy", "Manhoy", "Mapulang Bato", "Matagnop", "Nasunogan", "Poblacion", "Quinabcaban", "San Jose", "Tapikan"],
    "Dumalag": ["Agbolay", "Agsanayan", "Alaminos", "Camp Peralta", "Caridad", "Dolores", "Duran", "Poblacion", "San Agustin", "San Jose", "San Martin", "San Miguel", "San Rafael", "San Roque", "Santa Cruz", "Santa Monica", "Santa Rita", "Santo Angel", "Santo Niño"],
    "Dumarao": ["Agbatuan", "Agdalipe", "Agstayan", "Balanacan", "Bantayan", "Codingle", "Dacuton", "Gibato", "Ilaures", "Janguslob", "Lawaan", "Malitbog", "Poblacion", "Salcedo", "San Juan", "Sibariwan", "Tamulalod", "Tinaytayan"],
    "Ivisan": ["Agmalobo", "Agustin Navarra", "Balaring", "Basiao", "Cabugao", "Cudian", "Ilaya", "Malocloc Norte", "Malocloc Sur", "Matnog", "Mianay", "Poblacion Norte", "Poblacion Sur", "Santa Cruz", "Talon"],
    "Jamindan": ["Agambulong", "Agcawayan", "Agflowop", "Agil-it", "Aglibut", "Bayuyan", "Cabangahan", "Camp Macario Peralta", "Esperanza", "Fe", "Guintas", "Igang", "Jaena Norte", "Jaena Sur", "Jagnaya", "Linambasan", "Lucero", "Maayan", "Milan", "Molet", "Pangbatuan", "Pasol-o", "Poblacion", "San Jose", "San Juan", "San Roque", "San Vicente", "Santo Rosario"],
    "Maayon": ["Agbalog", "Aglanot", "Alayunan", "Balat-an", "Bongbongan", "Cabatuan", "Carataya", "Dul-agan", "Fernandez", "Guinbi-alan", "Indayagan", "Jebaca", "Manlinab", "Palaca", "Parallan", "Pina", "Poblacion Ilawod", "Poblacion Ilaya", "Quinabucan", "Quinayuya", "Tuburan"],
    "Mambusao": ["Atiplo", "Balat-an", "Balisong", "Bating", "Bato Bato", "Bayuyan", "Bergante", "Bungsi", "Burias", "Caidquid", "Cala-agus", "Dulang", "Najus-an", "Pangpang Norte", "Pangpang Sur", "Pinamalatican", "Poblacion Proper", "Sinundolan", "Tapa", "Tumalalud"],
    "Panay": ["Agojo", "Anhawan", "Bago Chiquito", "Bago Grande", "Bahit", "Buntod", "Butacal", "Candual", "Cogon", "Daga", "Ilibjan", "Linao", "Linateran", "Magubihan", "Navitas", "Pawa", "Poblacion", "Talo-to"],
    "Panitan": ["Agbalogo", "Agkilo", "Bailan", "Cabugao", "Cadio", "Calaan", "Capagao", "Cogon", "Conciencia", "Ilawod", "Pasugue", "Poblacion", "Salocon", "Tabuc", "Tincupon"],
    "Pilar": ["Balasan", "Binaobawan", "Casanayan", "Dulangan", "Monteflor", "Natividad", "Olacao", "Poblacion", "Rosario", "San Antonio", "San Blas", "San Esteban", "San Nicolas", "San Pedro", "San Ramon", "San Silvestre", "Santa Fe", "Tabun-acan", "Yating"],
    "Pontevedra": ["Agbanog", "Agbalogo", "Ameligan", "Bailan", "Binuntucan", "Cabugao", "Guba", "Hipona", "Intampilan", "Jolongajog", "Lantangan", "Linampongan", "Malag-it", "Manapao", "Poblacion", "Rizal", "San Pedro", "Solo", "Sublangon", "Tabuc", "Tacuyan", "Yating"],
    "President Roxas": ["Aranguel", "Badiangon", "Bayuyan", "Cabugao", "Carmencita", "Culasi", "Goce", "Hanglid", "Ibaca", "Madulano", "Manoling", "Marita", "Pantalan", "Pinamihagan", "Poblacion", "Pondol", "Quiajo", "Sanggalang", "Santo Niño"],
    "Sapi-an": ["Agtiangay", "Bilao", "Damayan", "Dapdapan", "Lonoy", "Majanlud", "Maninang", "Poblacion", "San Francisco"],
    "Sigma": ["Acña", "Amaga", "Balucuan", "Bangayan", "Capuyhan", "Cogon", "Dayhagan", "Guintas", "Malapad Cogon", "Mangoso", "Mansacul", "Matangcong", "Oyonsing", "Pagalungan", "Poblacion Norte", "Poblacion Sur", "Pinamalatican", "San Juan", "Tawog"],
    "Tapaz": ["Abangay", "Acan", "Agcagay", "Bag-ong Barrio", "Bato-bato", "Camburanan", "Candelaria", "Carida", "Cristina", "Da-an Banwa", "Da-an Norte", "Da-an Sur", "Garcia", "Gebio-an", "Hilwan", "Initan", "Katipunan", "Lagdungan", "Lahug", "Libertad", "Maliao", "Poblacion", "Rizal", "Roosevelt", "San Antonio", "San Jose", "San Julian", "San Miguel", "San Nicolas", "San Pedro", "San Rafael", "San Roque", "San Vicente", "Santa Ana", "Santa Petronila", "Senon", "Siya", "Switch", "Tabun-ac", "Tafalla", "Wright"]
  },
  "Iloilo": {
    "Iloilo City": [
      "City Proper", "Jaro", "La Paz", "Mandurriao", "Molo", "Arevalo", "Lapuz",
      "Bo. Obrero", "Calumpang", "Dungon A", "Dungon B", "Kalo-kalo", "Mansaya",
      "Nabitasan", "San Isidro", "San Rafael", "Santa Barbara", "Santa Rosa", "Sooc", "Tabuc Suba", "Tagbac"
    ],
    "Passi City": ["Agdahon", "Agdayao", "Aglalana", "Bacuranan", "Bagacay", "Batu", "Dalicanan", "Gines Viejo", "Impunen", "Magdungao", "Man-it", "Poblacion Ilawod", "Poblacion Ilaya", "Quinagbangan", "Salngan", "Santo Tomas"],
    "Ajuy": ["Adcadarao", "Agbon", "Badiangan", "Bucana", "Culasi", "Lanjagan", "Malayuan", "Pantalan Nabaye", "Pedada", "Pili", "Pinantan", "Poblacion", "Progreso", "Puente Bunglas", "San Antonio", "Silagon", "Tagubanhan", "Tuburan"],
    "Alimodian": ["Bagumbayan", "Balabago", "Cabuyao", "Colongan", "Cuyona", "Dalid", "Dao", "Gumamela", "Ingore", "Lay-ahan", "Poblacion", "Sinamay", "Tabug", "Ulay-Bugang"],
    "Anilao": ["Balunos", "Bantique", "Cagay", "Camiros", "Dangulaan", "Ilaures", "Mostro", "Pal-agon", "Pantalan", "Poblacion", "San Carlos", "Santo Rosario", "Vargas"],
    "Badiangan": ["Agusipan", "Astorga", "Bita-oyan", "Cabayogan", "Calansanan", "Catubig", "Iniligan", "Linayasan", "Odiongan", "Poblacion", "San Julian", "Sariri", "Talaba", "Tamocol"],
    "Balasan": ["Aranguel", "Bacaltos", "Caballero", "Camambugan", "Crusada", "Ginot-an", "Lawis", "Malapoc", "Mamhut Norte", "Mamhut Sur", "Maya", "Pani-an", "Poblacion", "Salong", "Zaragoza"],
    "Banate": ["Alacaygan", "Arguelles", "Baliguian", "Belon", "Bonguian", "Carmelo", "De La Paz", "Dugwakan", "Juanico", "Magdalo", "Maninila", "Merced", "Poblacion", "San Salvador", "Talokgokan"],
    "Barotac Nuevo": ["Acuit", "Agcuyawan Calsada", "Agcuyawan Pulo", "Bagongbong", "Baras", "Batu", "Bungca", "Cabilauan", "Cruz", "Guintas", "Igbong", "Ilaud Pob.", "Ilaya Pob.", "Jalaud", "Lag-asan", "Linao", "Monpon", "Salihid", "So-ol", "Tabuc-Suba Pob.", "Tiwi"],
    "Barotac Viejo": ["Bugnay", "California", "Del Pilar", "General Luna", "La Fortuna", "Lipata", "Natividad", "Nueva Invencion", "Poblacion", "Puerto Del Sol", "Rizal", "San Antonio", "San Francisco", "San Lucas", "San Matias", "San Roque", "Santo Domingo", "Vista Alegre"],
    "Batad": ["Alapasco", "Amancajes", "Bacan", "Bagacay", "Banban", "Batad Viejo", "Binon-an", "Bolobolo", "Bulak Sur", "Calangag", "Caw-i", "Dr. Ondoy", "Empedrado", "Hamod", "Malico", "Nangca", "Poblacion", "Salong", "Santa Cruz", "Tad-y"],
    "Bingawan": ["Agba-o", "Alabidhan", "Bulabog", "Cairohan", "Guinhulacan", "Inamyungan", "Malitbog Ilawod", "Malitbog Ilaya", "Ngingi-an", "Poblacion", "Quinangyana", "Quinar-upan", "Tapacon", "Tubod"],
    "Cabatuan": ["Acao", "Amerang", "Ayong", "Banguit", "Buluangan", "Cadoldolan", "Calao", "Duyanduyan", "Gines", "Inabasan", "Janipaan Central", "Lubacan", "Manguna", "Poblacion", "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Salacay", "Talanghauan", "Tiring"],
    "Calinog": ["Agcalaga", "Agdahon", "Alibunan", "Badlan Grande", "Banban Grande", "Binolosan Pequeño", "Cabugao", "Camalobalo", "Caratagan", "Dalid", "Gama Pequeño", "Guinbonyugan", "Malitbog Centro", "Nalbugan", "Poblacion Center", "Poblacion Delgado", "Simsiman", "Toyungan", "Ulayan"],
    "Carles": ["Abet", "Alipata", "Asluman", "Bancal", "Barangay Polopiña", "Barroc", "Batad", "Bito-on", "Bolo", "Buaya", "Cabrera", "Dayhagan", "Gabi", "Granada", "Guinbiosan", "Isla de Gigantes Norte", "Isla de Gigantes Sur", "Lantangan", "Manlot", "Poblacion", "Punta Batuanan", "San Fernando", "Tarong", "Tupaz"],
    "Concepcion": ["Aglatimbang", "Bacjawan Norte", "Bacjawan Sur", "Bagongon", "Batiti", "Botlog Island", "Calangaman", "Dungon", "Igbon Island", "Macalbang", "Malangabang", "Nipoo", "Poblacion", "Polopiña", "Salvacion", "Talotu-an", "Tambaliza"],
    "Dingle": ["Abangay", "Agba-o", "Bongloy", "Caguyuman", "Calicuang", "Camambugan", "Gumamela", "Libo-o", "Licu-an", "Matangharon", "Moroboro", "Nazuni", "Pandac", "Poblacion", "San Matias", "Sinamay", "Tabugon", "Tangasan", "Tulatulaan"],
    "Dueñas": ["Agdahon", "Anepahan", "Badiangan", "Balangigan", "Cabudian", "Calaca-an", "Capaycapay", "Guibuangan", "Lacag", "Maribuyong", "Monpon", "Poblacion", "Ponong Grande", "San Antonio", "Santo Niño", "Tinorian"],
    "Dumangas": ["Balabag", "Balud", "Bantud", "Bolilao", "Calasgasan", "Capalonga", "Compayan", "Dacutan", "Ermita", "Ilaya 1st", "Ilaya 2nd", "Ilaya 3rd", "Lacturan", "Paloc Bigque", "Patlad", "Poblacion", "Sapao", "Sulangan", "Victorias"],
    "Estancia": ["Bayas", "Bayistao", "Botlog", "Bulaqueña", "Calagna-an", "Canoan", "Daan Banwa", "Gogo", "Jolog", "Loguingot", "Malbog", "Manipulon", "Paon", "Poblacion", "San Roque", "Tabunan", "Tanza", "Villa Pani-an"],
    "Guimbal": ["Ansing", "Bagumbayan", "Bongol San Miguel", "Bongol San Vicente", "Bulad", "Calampitao", "Camangahan", "Generosa Cristobal", "Gerona-Gimeno", "Girado-Magsaysay", "Gotera", "Igcaphang", "Lubacan", "Nahapay", "Particion", "Pescadores", "Rizal-Tuguis", "Santa Rosa-Laguna"],
    "Igbaras": ["Alameda", "Amorador", "Bagacay", "Balibagan", "Bantayan", "B kano", "B kano", "Buenavista", "Buga", "Corucuan", "Igcabugao", "Igpigus", "Labuan", "Passi", "Poblacion", "Rima", "Signe", "Talayatay"],
    "Janiuay": ["Abangay", "Aquino", "Atimonan", "Barasalon", "Canawili", "Caraudan", "Damires", "Gines", "Golgot", "Madong", "Matag-ub", "Monte-Maguas", "Panuran", "Poblacion", "Santo Tomas", "Tambal", "Yacman"],
    "Lambunao": ["Agcuyawan", "Aglibacao", "Bagongbayan", "Bancal", "Binaba-an Labayno", "Binaba-an Portigo", "Cabunlawan", "Calangigan", "Caninguan", "Daanbanwa", "Guba", "Jayobo", "Misi", "Natividad", "Poblacion Ilawod", "Poblacion Ilaya", "Pughanan", "Tranghawan"],
    "Leganes": ["Agcuyawan Calsada", "Bigke", "Buntatala", "Cagbang", "Calaboa", "Camangahan", "Cari Mayor", "Cari Minor", "Guihaman", "Guintas", "Lapayon", "Nabitasan", "Napnud", "Poblacion", "San Vicente"],
    "Lemery": ["Agpipili", "Alcantara", "Anapinan", "Bagakay", "Bankal", "Cabalic", "Cabantohan", "Capiñahan", "Dallao", "Layog", "Marapal", "Milan", "Nasi", "Poblacion", "San Jose", "Sepanton", "Tuburan", "Velasco"],
    "Leon": ["Agboy Norte", "Agboy Sur", "Bacan", "Baje", "Bobon", "Bucari", "Camando", "Cananaman", "Carara-an", "Dorog", "Dusacan", "Malublub", "Marirong", "Omambong", "Poblacion", "Talacuan", "Ticuan"],
    "Maasin": ["Abilay", "Agcarope", "Bago", "Buntalan", "Cabangcalan", "Cata-an", "Dagami", "Daja", "Del Caray", "Linabuan", "Mandog", "Naslo", "Poblacion", "Punong", "Sinamay", "Tigbauan", "Tranghawan"],
    "Miagao": ["Agdugayan", "Aguiauan", "Alimodias", "Bagumbayan", "Banuyao", "Baraciyan", "Baybaygan", "Bolho", "Cacawalayan", "Calampitao", "Cubay", "Damilisan", "Guibongan", "Igbita", "Kirayan Norte", "Kirayan Sur", "Mat-y", "Narat-an", "Nonoc", "Oyungan", "Poblacion", "San Fernando", "San Rafael", "Sapa", "Tigbagacay"],
    "Mina": ["Agmanaphao", "Badiangan", "Bangcal", "Cabugao", "Capul-an", "Dama", "Guibuangan", "Janipa-an", "Naslo", "Poblacion", "Singay", "Talibong Grande", "Talibong Pequeño", "Tipolo", "Tolobohan", "Tumay", "Yugot"],
    "New Lucena": ["Bacolod", "Bacan", "Bilidan", "Bololacao", "Buri", "Cabilauan", "Cabuya-an", "Calumbuyan", "Damires", "Dawis", "General Delgado", "Guinobatan", "Janipa-an Oeste", "Janipa-an Este", "Pasil", "Poblacion", "Wari-wari"],
    "Oton": ["Abilay Norte", "Abilay Sur", "Batuan Ilaud", "Batuan Ilaya", "Bita Norte", "Bita Sur", "Botong", "Buray", "Cabanbanan", "Calam-isan", "Galang", "Lambuyao", "Pakiad", "Poblacion", "Pulo Maestra Vita", "Rizal", "San Antonio", "San Nicolas", "Santa Clara", "Santa Monica", "Santa Rita", "Tagbac Norte", "Tagbac Sur", "Trapiche"],
    "Pavia": ["Aganan", "Amparo", "Anilao", "Balabag", "Cabugao Norte", "Cabugao Sur", "Campao", "Jibao-an", "Mali-ao", "Pal-agon", "Pandac", "Pavia (Poblacion)", "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Tigum", "Ungka I", "Ungka II"],
    "Pototan": ["Abangay", "Amamaros", "Bagacay", "Barasan", "Batangan", "Bongco", "Cahaguichican", "Callan", "Cansilayan", "Casalsagan", "Cato-ogan", "Dulay", "Fernando Parcon", "Guibuangan", "Igang", "Intongcan", "Lumbo", "Malusgod", "Naslo", "Poblacion", "Primitivo Ledesma", "Rumbang", "San Jose", "Sibaluca", "Tuburan"],
    "San Dionisio": ["Agdaliran", "Amayong", "Bagacay", "Batuan", "Bondulan", "Boroñgon", "Canas", "Capinang", "Cudionan", "Hacienda Conchita", "Madalag", "Mandu-awak", "Moto", "Pangi", "Pase", "Poblacion", "San Nicolas", "Santol", "Siempreviva", "Sua", "Talo-ato", "Tiabas", "Tuburan"],
    "San Enrique": ["Abaca", "Asisig", "Bantayan", "Braulan", "Cabugao Nuevo", "Cabugao Viejo", "Cubay", "Dacal", "Dumangas", "Garin", "Gines Nuevo", "Imbang Pequeño", "Lip-ac", "Madarag", "Mapili", "Poblacion Ilawod", "Poblacion Ilaya", "Quinar-upan", "San Antonio", "Tambunac"],
    "San Joaquin": ["Amboyu-an", "Andres Bonifacio", "Bad-as", "Balabago", "Bayit", "Bucaya", "Cadluman", "Camaba-an", "Camalig", "Crossing Dapuyan", "Doldol", "Escalantera", "Igbagacay", "Igbinangon", "Igburi", "Lawigan", "Mabini", "Naba", "Navitas", "Poblacion", "Qui-anan", "San Bernardo", "San Jose", "Santa Ana", "Sinogbuhan", "Talagutac", "Tapikan", "Tiolas"],
    "San Miguel": ["Consolacion", "Igtambo", "Inanawan", "Mandu-awak", "Poblacion", "Roxas", "San Angel", "San Antonio", "San Jose", "San Raymundo", "Santa Cruz", "Santa Teresa", "Santo Angel", "Santo Niño"],
    "San Rafael": ["Aripdip", "Bagacay", "Calaigang", "Ilongbukid", "Posadas", "San Andres", "San Dionisio", "San Florentino"],
    "Santa Barbara": ["Agutayan", "Alibunan", "Bagumbayan", "Balabag", "Bitaog-Guba", "Bolong Este", "Bolong Oeste", "Cabugao Norte", "Cabugao Sur", "Cadagmayan Norte", "Cadagmayan Sur", "Canipayan", "Daga", "Dalid", "Duyanduyan", "Gen. Martin T. Delgado", "Lanag", "Magcalon", "Poblacion", "San Sebastian", "Tuguis"],
    "Sara": ["Aguirre", "Aldeguer", "Alibayog", "Anjawan", "Apologista", "Aposaga", "Aranjuez", "Bagacao", "Castor", "Crespo", "Del Castillo", "Domingo", "Ferraris", "General Luna", "Labrador", "Lanka", "Lawi", "Malapaya", "Muyco", "Poblacion", "Posadas", "Preciosa", "Salcedo", "San Luis", "Tanza", "Tentay", "Zerrudo"],
    "Tigbauan": ["Alipata", "Atabayan", "Bagacay", "Baggingin", "Bagungbong", "Bantud", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", "Barangay 7 (Poblacion)", "Barangay 8 (Poblacion)", "Barangay 9 (Poblacion)", "Bayuco", "Bito-on", "Buenavista", "Bugasongan", "Buyu-an", "Canabuan", "Cansilayan", "Cordova Norte", "Cordova Sur", "Danao", "Duyan-duyan", "Linobayan", "Nagba", "Namocon", "Napnapan Norte", "Napnapan Sur", "Olo Barroc", "Parache", "San Rafael", "Supa", "Tan Pael", "Tigcaray"],
    "Tubungan": ["Adgao", "Ago", "Ambuan", "Bacan", "Badiang", "Bagunanay", "Batayan", "Bika-bika", "Buenavista", "Cadabdab", "Daga", "Igdampao", "Igdocto", "Igpaho", "Ingay", "Isauan", "Jolason", "Lane", "Male", "Mayang", "Molina", "Morcillas", "Nagba", "Navitas", "Pinamacauan", "Poblacion", "Sibucauan", "Singayan", "Tabat", "Tagpu-an", "Teniente Benito", "Victoria"],
    "Zarraga": ["Balud Lilo-an", "Balud I", "Balud II", "Dawis Centro", "Dawis Norte", "Dawis Sur", "Gahit", "Inagdangan Centro", "Inagdangan Norte", "Inagdangan Sur", "Jalaud Norte", "Jalaud Sur", "Libongcogon", "Malunang", "Poblacion", "Parian", "Sambag", "Sigangao", "Talibong", "Tuburan", "Tuburan Sulbod"]
  }
};

export function getMunicipalitiesForProvince(provinceName: string): string[] {
  if (!provinceName) return [];
  const normalized = provinceName.trim().toLowerCase();
  const found = Object.keys(PHILIPPINE_LOCATIONS).find(k => k.toLowerCase() === normalized);
  return found ? Object.keys(PHILIPPINE_LOCATIONS[found]).sort((a, b) => a.localeCompare(b)) : [];
}

export function getBarangaysForMunicipality(provinceName: string, municipalityName: string): string[] {
  if (!provinceName || !municipalityName) return [];
  const normProvince = provinceName.trim().toLowerCase();
  const normMunicipality = municipalityName.trim().toLowerCase();
  const provKey = Object.keys(PHILIPPINE_LOCATIONS).find(k => k.toLowerCase() === normProvince);
  if (!provKey) return [];
  const munKey = Object.keys(PHILIPPINE_LOCATIONS[provKey]).find(k => k.toLowerCase() === normMunicipality);
  return munKey ? [...PHILIPPINE_LOCATIONS[provKey][munKey]].sort((a, b) => a.localeCompare(b)) : [];
}
