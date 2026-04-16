# IMvision Lager & Order - Användarmanual

## Innehållsförteckning

1. [Introduktion](#introduktion)
2. [Komma igång](#komma-igång)
3. [Startsidan](#startsidan-home)
4. [Lagersidan](#lagersidan-inventory)
5. [Skanna-sidan](#skanna-sidan-scan)
6. [Ordersidan](#ordersidan-orders)
7. [Inköpssidan](#inköpssidan-purchaseorders)
8. [Mottagningssidan](#mottagningssidan-receivepurchaseorder)
9. [Reparationssidan](#reparationssidan-repairs)
10. [Lagerställen-sidan](#lagerställen-sidan-warehouses)
11. [Okända leveranser](#okända-leveranser-sidan-unknowndeliveries)
12. [Admin-sidan](#admin-sidan-admin)
13. [Tips och tricks](#tips-och-tricks)
14. [Felsökning](#felsökning)

---

## Introduktion

IMvision Lager & Order är ett komplett lagerstyrningssystem designat för att hantera LED-skärmar, komponenter och tillbehör. Systemet är optimerat för både mobil och desktop-användning och fungerar även offline.

### Huvudfunktioner

- **Mobiloptimerad skanning** - Använd kameran för att registrera artiklar direkt
- **AI-driven dataigenkänning** - Extrahera automatiskt information från etiketter
- **Komplett lagerstyrning** - Fullständig spårbarhet och kontroll
- **Orderhantering** - Från offert till faktura
- **Inköpshantering** - Planera och följ upp leveranser
- **Offline-stöd** - Arbeta även utan internetuppkoppling
- **Reparationsspårning** - Håll koll på artiklar på service

---

## Komma igång

### Första inloggningen

1. Öppna systemet i din webbläsare eller som PWA-app
2. Logga in med ditt användarnamn och lösenord
3. Du hamnar direkt på startsidan med en översikt

### PWA-installation (rekommenderas)

**På iPhone/iPad:**
1. Öppna systemet i Safari
2. Tryck på Dela-knappen (fyrkant med pil)
3. Välj "Lägg till på hemskärmen"
4. Bekräfta med "Lägg till"

**På Android:**
1. Öppna systemet i Chrome
2. Tryck på meny (tre punkter)
3. Välj "Installera app" eller "Lägg till på startskärmen"
4. Bekräfta installationen

**Fördelar med PWA:**
- Snabbare laddning
- Fungerar offline
- Push-notifieringar
- Känns som en riktig app

### Användarroller

Systemet har två huvudroller:

- **Användare** - Kan registrera artiklar, hantera lager, plocka ordrar och ta emot varor
- **Admin** - Har full tillgång till alla funktioner inklusive användarhantering, rapporter och systeminställningar

---

## Startsidan (Home)

**Vad systemet gör:**
Startsidan är din kommandocentral som ger en realtidsöversikt över lagerstatus, pendande arbetsuppgifter och senaste aktiviteter. Här hittar du snabba genvägar till de mest använda funktionerna.

**Så använder du sidan:**

### Snabbåtgärder (överst)

**Snabb utplockning (orange kort)**
- **Klicka på kortet** för att öppna dialog
- Ange artikelnamn eller batch
- Ange antal att plocka ut
- Lägg till kundkommentar (vart ska det)
- Systemet minskar lagersaldo direkt
- Används för: Interna uttag, akut behov, testuttag

**Inleverans (grönt kort)**
- **Klicka på kortet** för att öppna kameran
- Fotografera etikett på ny vara
- AI extraherar data automatiskt
- Perfekt för snabb mottagning utan inköpsorder

**Sök artikel (blått kort)**
- **Klicka på kortet** för att aktivera sökfältet
- Skriv namn, batch eller hyllplats
- Resultatet visar direkt lagersaldo och position
- Klicka på artikel för att se detaljer och hyllplats i stort format

### Ordrar att plocka (blå sektion)

**Vad visas:**
- Ordrar i status "Klar att plocka", "Plockas" eller "Plockad" som inte är fakturerade
- Antal väntande ordrar
- De tre mest prioriterade ordrarna

**Användning:**
1. **Klicka direkt på en order** för att öppna plockvy
2. **Klicka "Alla"** för att se fullständig orderlista
3. Ordrar sorteras automatiskt efter prioritet och datum

### Statistikrutor (5 kort på desktop, 2-4 på mobil)

**Artiklar (blå)** - Totalt antal artikeltyper i systemet
- **Klicka** för att öppna lagersidan med alla artiklar

**Totalt i lager (grön)** - Summa av alla enheter
- **Klicka** för att se aktiva artiklar

**Lågt lager (gul)** - Artiklar under minsta lagernivå
- **Klicka** för att se lista med artiklar att beställa
- Kräver åtgärd!

**Slut i lager (röd)** - Artiklar med saldo 0
- **Klicka** för att se vilka som behöver beställas akut
- Kräver åtgärd!

**På reparation (orange)** - Artiklar ute på service
- **Klicka** för att se status på reparationer

### Varningar (röd/gul sektion - visas om det finns varningar)

**Vad visas:**
- Max 3 artiklar med mest kritisk status
- Artikelnamn, batch och nuvarande saldo
- Färgkodning: Röd = slut, Gul = lågt

**Användning:**
- **Klicka på en artikel** för att öppna artikeldetaljer direkt
- Hantera direkt (beställ mer eller justera minsta nivå)

### Senaste aktivitet (höger kolumn)

**Vad visas:**
- De 5 senaste lagerrörelserna
- Typ av rörelse med färgkodad ikon:
  - Grön pil upp = Inleverans
  - Gul pil ner = Uttag
  - Blå = Inventering
  - Grå = Justering
- Artikelnamn och tidsstämpel

**Användning:**
- **Klicka på en rörelse** för att se artikeldetaljer
- Använd för att snabbt spåra senaste förändringarna
- Verifiera att plockning/mottagning registrerats korrekt

### Dokumentation (lila kort)

**Klicka på kortet** för att öppna fullständig dokumentation:
- Användarmanual
- Systemdokumentation  
- AI Agent Guide

---

## Lagersidan (Inventory)

**Vad systemet gör:**
Lagersidan är ditt huvudverktyg för att hantera alla artiklar. Här ser du realtidssaldo, kan söka, filtrera, redigera och exportera lagerdata. Systemet visar inkommande beställningar och låter dig hantera artiklar både enskilt och i bulk.

**Så använder du sidan:**

### Översikt och knappar överst

**Excel-knapp** - Exportera alla artiklar till Excel-fil med full data
**CSV-knapp** - Exportera till CSV-format för Google Sheets etc.
**Importera-knapp** - Importera artiklar från Excel-fil med kolumnmappning
**Skanna-knapp** - Öppna kameran för att registrera nya artiklar

### Sök och filterfunktioner

**Sökfält (stort fält med förstoringsglas):**
- Sök i realtid medan du skriver
- Söker i: Artikelnummer, batch, benämning, tillverkare
- Resultatet uppdateras direkt

**Sortering (flik med pil-ikon):**
- **Nyast** - Senast skapade/uppdaterade först
- **Namn** - Alfabetisk ordning på benämning
- **Batch** - Sorterat på batch-nummer
- **Hylla** - Grupperat per hyllplats
- **Leverantör** - Grupperat per tillverkare
- **Saldo** - Högsta lagersaldo först

**Status-filter (flikar):**
- **Alla** - Visa samtliga artiklar
- **I lager** - Endast artiklar med positivt saldo
- **Lågt** - Under minsta lagernivå
- **Slut** - Saldo 0
- **Reparation** - Artiklar på service

**Lagerställe (dropdown):**
- Filtrera på specifikt lagerställe
- Visar endast artiklar i valt lager

**Lagertyp (dropdown):**
- **Företagsägt** - Eget lager
- **Kundägt** - Konsignationslager

**Kategori (dropdown):**
- LED Module, Cabinet, Power Supply, etc.
- Filtrera per produktkategori

### Artikellista

**Desktop-vy (tabell):**
Kolumner från vänster till höger:
- **Checkbox** - För bulkhantering
- **Bild** - Miniatyrbild eller standard-ikon
- **Saldo** - Nuvarande lagersaldo (stor siffra)
- **Artikelnummer** - SKU eller batch
- **Benämning** - Artikelnamn med tillverkare under
- **Hyllplats** - Fysisk position
- **Lager** - Lagerställe (kod)
- **Status** - Badge med färgkodning

**Mobil-vy (kort):**
Varje kort visar:
- Checkbox till vänster
- Bild
- Saldo (stor) till höger
- Benämning, batch, tillverkare
- Hyllplats och status som badges

**Inkommande varor:**
Om en artikel har varor på väg visas blå badge "Inkommande (X st) - Datum"

### Visa artikeldetaljer

**Klicka på en artikel** för att öppna detaljvy:

**Översikt-fliken:**
- Fullständig artikelinformation
- Bilder (klicka för att förstora)
- Lagersaldo med historik
- Dimensioner och vikt
- Tekniska specifikationer
- Snabbknappar: +1, -1, Justera saldo, Redigera, Ta bort

**Struktur-fliken:**
- Visa ingående komponenter (BOM)
- Lägg till delkomponenter
- Ange antal per enhet
- Används för sammansatta produkter

**Filer-fliken:**
- Ladda upp CFG-filer
- Ritningar och datablad
- Andra dokument

**Historik-fliken:**
- Alla lagerrörelser för artikeln
- Datum, typ, kvantitet, anledning
- Vem som utförde ändringen

**Ordrar-fliken:**
- Vilka ordrar innehåller artikeln
- Historiska uttag
- Reservation i pågående ordrar

**Reparationer-fliken:**
- Reparationshistorik
- Status och datumspann
- Anteckningar från tidigare ärenden

### Redigera artikel

1. Öppna artikeldetaljer
2. Klicka **Redigera** (penna-ikon)
3. Modal öppnas med alla fält
4. Uppdatera önskade värden:
   - Artikelnummer, benämning, tillverkare
   - Batch, serie, pixel pitch
   - Dimensioner och vikt
   - Lagerställe och hyllplats
   - Minsta lagernivå
   - Leverantör och enhetskostnad
   - Ladda upp bilder
5. **Föreslå placering** - AI föreslår optimal hyllplats
6. Klicka **Spara ändringar**

### Justera lagersaldo

**Snabbknappar (+1 / -1):**
- Direkt från artikeldetaljer
- Klicka **+1** för att lägga till 1 enhet
- Klicka **-1** för att ta ut 1 enhet
- Lagerrörelse skapas automatiskt

**Manuell justering:**
1. Klicka **Justera saldo**
2. Välj **Lägg till** eller **Ta bort**
3. Ange antal
4. Lägg till anledning (rekommenderat)
5. Bekräfta

### Bulkredigering

**När du vill uppdatera flera artiklar samtidigt:**

1. Klicka på checkbox för första artikeln (aktiverar bulk-läge)
2. Markera önskade artiklar genom att klicka deras checkboxar
3. Blått verktygsfält dyker upp överst:
   - Visar antal valda artiklar
   - **Redigera-knapp** - Uppdatera fält för alla
   - **Ta bort-knapp** - Radera flera artiklar
   - **X** - Avbryt och rensa urval

**Fält som kan uppdateras i bulk:**
- Lagerställe
- Status
- Lagertyp

4. Välj värden och klicka **Spara ändringar**
5. Alla markerade artiklar uppdateras samtidigt

### Import och export

**Exportera till Excel:**
1. Klicka **Excel**-knappen
2. Fil laddas ner med alla artiklar
3. Innehåller: SKU, namn, batch, saldo, hyllplats, dimensioner, etc.

**Exportera till CSV:**
1. Klicka **CSV**-knappen
2. Kan öppnas i Excel, Google Sheets
3. Samma data som Excel-exporten

**Importera artiklar:**

1. Klicka **Importera**
2. Välj Excel-fil (.xlsx)
3. **Systemet analyserar filen:**
   - Upptäcker kolumner automatiskt
   - Om det inte går - visa kolumnmappning
4. **Kolumnmappning (om nödvändig):**
   - Matcha Excel-kolumner mot systemfält
   - "Artikelnummer" → name
   - "Batch" → batch_number
   - etc.
   - Klicka **Bekräfta mappning**
5. **Förhandsgranskning:**
   - Se alla artiklar som ska importeras
   - Gröna = Nya artiklar
   - Blåa = Uppdatering av befintliga (matchas på batch)
   - Markera vilka som ska importeras (alla markerade som standard)
6. **Välj lagerställe** för nya artiklar
7. Klicka **Importera artiklar**
8. Systemet skapar/uppdaterar artiklar och visar resultat

**Tips för lyckad import:**
- Använd export som mall
- Se till att batch-nummer är unika
- Inkludera hyllplatser
- Kontrollera förhandsvisningen noga

---

## Skanna-sidan (Scan)

**Vad systemet gör:**
Skanna-sidan använder din enhets kamera och AI för att automatiskt identifiera och registrera artiklar. Systemet kan läsa etiketter, extrahera data (batch, tillverkare, dimensioner, etc.) och automatiskt matcha mot befintliga artiklar eller skapa nya. Fungerar för inleverans, inventering, streckkodsskanning och hantering av okända leveranser.

**Så använder du sidan:**

### Välj skanningsläge

När du öppnar sidan visas fyra lägen:

**1. Streckkodsskanning**
- **Vad det gör:** Skannar EAN/QR-koder för snabb identifiering
- **Användning:** 
  - Klicka på kortet
  - Håll kameran över streckkod
  - Systemet söker automatiskt i databasen
  - Visar artikel om den finns
  - Används mest för uttag och inventering

**2. Inleverans** (mest använt)
- **Vad det gör:** Fotografera etikett → AI extraherar data → Lägg till/uppdatera artikel
- **Användning:**
  - Klicka på kortet
  - Fotografera artikelns etikett
  - Vänta medan AI analyserar (5-15 sekunder)
  - Granska och komplettera extraherad data
  - Spara som ny artikel eller uppdatera befintlig

**3. Inventering**
- **Vad det gör:** Fotografera artiklar och uppdatera lagersaldo
- **Användning:**
  - Klicka på kortet
  - Fotografera etikett
  - Ange räknat saldo
  - Systemet jämför mot registrerat saldo
  - Avvikelse loggas

**4. Okänd leverans**
- **Vad det gör:** Registrera paket utan dokumentation för utredning
- **Användning:**
  - Klicka på kortet
  - Fotografera förpackning och innehåll
  - Fyll i referensnummer och beskrivning
  - Tilldela ansvarig
  - Skapar utredningsärende

### Fotografera etikett (Inleverans)

1. **Välj "Inleverans"**
2. Kameran aktiveras med förhandsgranskning
3. **Fotografera etikett:**
   - Bra ljus (undvik skuggor och reflexer)
   - Håll kameran stadigt
   - Fyll bilden med etiketten
   - Tydlig, fokuserad bild
4. Klicka **Ta bild**
5. **AI-analys startar:**
   - Systemet läser texten
   - Extraherar strukturerad data
   - Söker på webben för att berika data
   - Jämför mot befintliga artiklar

**Tips för bästa resultat:**
- Fotografera i dagsljus eller med god belysning
- Undvik mobilkameraskakningar (använd stativ eller stöd)
- Ha etiketten helt i bild
- Fotografera rakt framifrån (inte i vinkel)

### AI-extrahering och granskning

Efter fotografering analyserar AI bilden och extraherar:

**Extraherade fält:**
- Artikelnamn/benämning
- Batch-nummer
- Tillverkare
- Serie och produktversion
- Pixel pitch (för LED)
- Dimensioner (bredd, höjd, djup)
- Vikt
- Ljusstyrka (nits)
- Leverantör

**Konfidensindikator per fält:**
- **Grön bock** = Hög säkerhet (90-100%)
- **Gul varning** = Medium säkerhet (60-89%)
- **Röd varning** = Låg säkerhet (<60%) eller gissning

**Granska varje fält:**
1. Kontrollera alla gröna fält
2. Verifiera gula och röda fält noga
3. Fyll i saknade fält manuellt
4. **Ange hyllplats** (viktigt!)
5. Ange lagersaldo (antal som tas emot)
6. Välj lagerställe

### Matchning mot befintliga artiklar

**Om AI hittar liknande artiklar:**

Systemet visar matchningssektion med:
- Liknande artiklar ur databasen
- Matchningspoäng (%)
- Artikeldata sida vid sida

**Vad kan du göra:**
- **"Använd denna"** - Uppdatera befintlig artikel med nya data
  - Ökar lagersaldo
  - Uppdaterar eventuellt saknade fält
  - Behåller historik
- **"Skapa ny"** - Lägg till som helt ny artikel
  - Om det verkligen är en ny artikel
  - Batch skiljer sig åt
  - Annan version

### Spara artikel

1. Klicka **Spara artikel**
2. Artikeln skapas/uppdateras i databasen
3. En lagerrörelse (inleverans) skapas automatiskt
4. **Val efter spara:**
   - **Skriv ut etikett** - Generera och skriv ut etikett direkt
   - **Skanna nästa** - Börja om för att skanna fler artiklar
   - **Gå till lagret** - Se artikeln i lagervy

### Streckkodsskanning

1. Välj **"Streckkodsskanning"**
2. Rikta kameran mot streckkod/QR-kod
3. Systemet skannar automatiskt när koden är i fokus
4. **Om artikel hittas:**
   - Visar artikeldetaljer
   - Nuvarande saldo
   - Hyllplats
5. **Om artikel inte hittas:**
   - Visar meddelande
   - Alternativ att registrera som ny artikel

---

## Ordersidan (Orders)

**Vad systemet gör:**
Ordersidan hanterar hela orderflödet från skapande till fakturering. Systemet reserverar lager automatiskt, genererar plocklistor, spårar plockningsstatus och håller koll på ofakturerade leveranser. Du kan filtrera ordrar efter status, exportera till Excel och hantera partiella leveranser.

**Så använder du sidan:**

### Översikt över orderlistor

**Filterknappar överst:**
- **Alla** - Visa samtliga ordrar
- **Plockas** - Ordrar under plockning just nu
- **Plockad** - Klara för leverans
- **Ofakturerad** - Levererade men ej fakturerade (kräver åtgärd!)
- **Levererad** - Avslutade ordrar

**Varje orderkort visar:**
- Ordernummer och kundnamn
- Status med färgkodad badge
- Leveransdatum
- Antal artikelrader
- Prioritet (om hög/urgent)
- "Kräver beställning" om något är slut

**Klicka på ett orderkort** för att öppna orderdetaljer

### Skapa ny order

1. Klicka **+ Ny order** (överst till höger)
2. **Fyll i orderformulär:**
   - **Ordernummer** - Unikt nummer (valfritt, genereras automatiskt annars)
   - **Kundnamn** - Företag eller person (obligatoriskt)
   - **Kundreferens** - Kontaktperson eller projektkod
   - **Leveransadress** - Full adress
   - **Önskat leveransdatum** - När kunden vill ha det
   - **Prioritet** - Normal, Hög eller Urgent
   - **Anteckningar** - Övrig viktig info
3. Klicka **Skapa order**
4. Ordern skapas i status **"Utkast"**

### Lägg till artiklar i order

1. Öppna ordern (klicka på orderkortet)
2. Klicka **+ Lägg till artikel**
3. **Sök efter artikel:**
   - Skriv namn, batch eller artikelnummer
   - Välj från resultatlistan
4. Ange **önskad kvantitet**
5. **Systemet visar direkt:**
   - Tillgängligt saldo i lager
   - Reserverat av andra ordrar
   - Om det finns tillräckligt
6. Klicka **Lägg till**

**Om det inte finns tillräckligt på lager:**
- Ordern får badge "Kräver beställning"
- Du kan fortfarande lägga till artikeln
- Plockningssteget anpassas efter tillgänglighet

### Orderstatus-flöde

1. **Utkast** - Nyskapat, kan redigeras fritt
   - Lägg till/ta bort artiklar
   - Ändra kvantiteter
   - Uppdatera kundinfo

2. **Klar att plocka** - Bekräftad, väntar på plockning
   - Lagersaldo har reserverats
   - Syns på startsidan under "Ordrar att plocka"
   - Klicka **"Börja plocka"** för att starta

3. **Plockas** - Någon har börjat plocka
   - Plockpersonen ser artiklar med hyllplatser
   - Andra användare ser att plockning pågår

4. **Plockad** - Alla artiklar plockade
   - Klar för leverans
   - Kan skrivas ut plocklista/följesedel
   - Markera som "Levererad" när skickat

5. **Levererad** - Skickad till kund
   - Väntar på fakturering
   - Syns under "Ofakturerad"-filter

6. **Fakturerad** - Helt avslutad
   - Filtreras bort från standardvy
   - Finns kvar i historik

7. **Avbruten** - Order makulerad
   - Lagerreservation frigörs
   - Kan inte återaktiveras

### Plocka order

**Starta plockning:**
1. Klicka **"Börja plocka"** från orderdetaljer
2. Eller klicka på order från startsidan under "Ordrar att plocka"
3. Plockningsvy öppnas

**Plockningsvy - varje artikelrad visar:**
- **Artikelnamn och batch** (stor text)
- **Hyllplats** (mycket stor, tydlig text i grönt)
- Beställt antal
- Redan plockat
- Kvarvarande att plocka
- **+1 / -1 knappar** för att ange plockat antal
- **Indatafält** för att ange exakt antal direkt

**Plocka artiklar:**
1. Gå till angiven hyllplats
2. Plocka rätt antal enheter
3. Klicka **+1** för varje enhet, ELLER
4. Ange antal direkt i fältet
5. **Grön bock** visas när raden är klar (plockat = beställt)
6. Gå vidare till nästa artikel

**Partiell plockning:**
- Om du inte kan plocka allt (artikeln saknas delvis):
  - Plocka så många som finns
  - Lämna resten oplockat
  - Ordern markeras automatiskt som "Ofullständig"
  - Kan plockas klart senare eller beställas

**Avsluta plockning:**
1. När alla rader har något plockat (även om ofullständigt)
2. Klicka **"Slutför plockning"**
3. Bekräfta att allt är korrekt
4. **Lagersaldon uppdateras:**
   - Plockat antal dras från lager
   - Lagerrörelser skapas
5. Ordern flyttas till status **"Plockad"**

### Skriv ut plocklista

**Innan plockning (rekommenderat):**
1. Öppna ordern
2. Klicka **"Skriv ut plocklista"**
3. PDF genereras med:
   - Ordernummer och kundnamn
   - Alla artiklar med namn, batch, antal
   - Hyllplatser (stor text)
   - Checkboxar för manuell avprickning
   - Plats för signatur
4. Skriv ut och ta med i lagret
5. Kryssa av medan du plockar

### Markera som levererad

När ordern är plockad och klar att skicka:

1. Öppna ordern
2. Klicka **"Markera som levererad"**
3. Bekräfta
4. Ordern flyttas till status **"Levererad"**
5. Syns nu under filter "Ofakturerad"

### Fakturera order

När ordern är levererad och ska faktureras:

1. Öppna ordern
2. Klicka **"Markera som fakturerad"**
3. **Dialog öppnas:**
   - Ange fakturanummer från Fortnox (valfritt)
   - Lägg till datum (automatiskt dagens datum)
4. Klicka **"Bekräfta"**
5. Ordern markeras som fakturerad
6. **Filtreras bort från standardlistor** (för att inte störa)
7. Finns kvar i fullständig historik

### Exportera ordrar

**Enskild order:**
1. Öppna ordern
2. Klicka **"Exportera till Excel"**
3. Excel-fil laddas ner med:
   - Orderinformation
   - Alla artikelrader med kvantiteter
   - Priser och totalsumma

**Flera ordrar:**
1. Klicka **"Exportera flera ordrar"** från orderlistan
2. Modal öppnas med lista över ordrar
3. **Filtrera:**
   - Datumintervall
   - Status
   - Kund
4. Markera önskade ordrar
5. Klicka **"Exportera"**
6. En kombinerad Excel-fil skapas

---

## Inköpssidan (PurchaseOrders)

**Vad systemet gör:**
Inköpssidan hanterar alla beställningar till leverantörer. Systemet genererar beställningsdokument, följer upp leveranser, visar förväntade leveransdatum i lagervyn och skapar automatiskt mottagningsunderlag. Du kan hantera partiella leveranser och spåra vad som är på väg.

**Så använder du sidan:**

### Översikt över inköpsordrar

**Filterknappar:**
- **Alla** - Samtliga inköpsordrar
- **Utkast** - Planerade men ej skickade
- **Beställd** - Skickade till leverantör, väntar leverans
- **Förskottsbetald** - Betalda, väntar leverans
- **Mottagen** - Helt levererade

**Varje inköpsorderkort visar:**
- PO-nummer och leverantör
- Projekt (Fortnox-nummer)
- Förväntat leveransdatum
- Antal artikelrader
- Totalt belopp
- Status med färgkodning

**Klicka på kort** för att öppna inköpsorderdetaljer

### Skapa inköpsorder

1. Klicka **+ Ny inköpsorder**
2. **Fyll i formulär:**
   - **Leverantör** - Välj från lista (måste finnas i systemet först)
   - **Projekt (Fortnox)** - Projektnummer för bokföring (obligatoriskt)
   - **Förväntat leveransdatum** - När du räknar med leverans
   - **Orderdatum** - Dagens datum (förifyllt)
   - **Anteckningar** - Övrig info
3. Klicka **Skapa**
4. Inköpsordern skapas i status **"Utkast"**

### Lägg till artiklar i inköpsorder

1. Öppna inköpsordern
2. Klicka **+ Lägg till artikel**
3. **Sök och välj artikel** från lager
4. Ange **beställd kvantitet**
5. Ange **enhetspris** (förifyllt med standardpris, kan ändras)
6. Klicka **Lägg till**
7. Artikelrad visas i listan

**Repeat för alla artiklar som ska beställas**

### Status på inköpsorder

1. **Utkast** - Planeras, inte skickad
   - Kan redigeras fritt
   - Lägg till/ta bort artiklar
   - Ändra kvantiteter och priser

2. **Beställd** - Skickad till leverantör
   - **I lagersidan visas "Inkommande (X st)"** på berörda artiklar
   - Förväntat leveransdatum visas
   - Hjälper planering

3. **Förskottsbetald** - Betalning gjord, väntar på leverans
   - För leverantörer som kräver förskottsbetalning
   - Samma funktionalitet som "Beställd"

4. **Mottagen** - Helt levererad och registrerad
   - Alla artiklar har tagits emot
   - Lagersaldon uppdaterade
   - Kan arkiveras

5. **Avbruten** - Order makulerad
   - Inget kommer levereras
   - Lagerplanering uppdaterad

### Skicka beställning till leverantör

1. Öppna inköpsordern (status Utkast)
2. Klicka **"Skicka beställning"**
3. **PDF genereras automatiskt** med:
   - Leverantörsuppgifter
   - Alla orderrader
   - Kvantiteter och priser
   - Totalsumma
   - Förväntat leveransdatum
   - Projektnummer
4. **Skicka PDF:en** till leverantören via e-post (systemet öppnar e-postklient)
5. Ordern ändras automatiskt till status **"Beställd"**

### Skriv ut inköpsorder

1. Öppna inköpsordern
2. Klicka **"Skriv ut"**
3. PDF öppnas i ny flik
4. Skriv ut för arkivering eller följesedel

### Ta emot varor från inköpsorder

När leveransen anländer:

1. Öppna inköpsordern
2. Klicka **"Ta emot varor"**
3. Du omdirigeras till **Mottagningssidan** (se separat avsnitt)

---

## Mottagningssidan (ReceivePurchaseOrder)

**Vad systemet gör:**
Mottagningssidan är där du registrerar inkomna varor från leverantörer. Systemet uppdaterar lagersaldon automatiskt, skapar lagerrörelser för spårbarhet, hanterar avvikelser (fel kvantitet, skador), låter dig ladda upp foton av följesedel/skador och genererar mottagningskvitton. Stöder partiella leveranser och kvalitetskontroll.

**Så använder du sidan:**

### Hitta inköpsorder att ta emot

1. Sidan öppnas vanligtvis från en specifik inköpsorder via knappen "Ta emot varar"
2. Alternativt: Navigera via URL-parameter med inköpsorder-ID
3. Alla orderrader visas med:
   - Artikelnamn och batch
   - Beställt antal
   - Redan mottaget
   - Kvarvarande att ta emot

### Mottagningsvy per artikel

För varje artikelrad ser du:

**Artikelinformation:**
- Namn (stor text)
- Batch-nummer
- Beställt antal
- Redan mottaget (från tidigare leveranser)
- **Kvarvarande** att ta emot

**Mottagningsfält:**
- **Mottaget antal** - Ange hur många som kom
- **Hyllplats** - Välj var artikeln ska förvaras (dropdown eller fritext)
- **Kvalitetskontroll OK** - Checkbox om allt ser bra ut
- **Har avvikelse** - Checkbox om något är fel
- **Avvikelseanledning** - Dropdown med vanliga orsaker + fritext
- **Bilder** - Ladda upp foton (följesedel, skador, förpackning)
- **Anteckningar** - Övrig information

### Ta emot artikel steg-för-steg

**För varje artikel i listan:**

1. **Kontrollera leveransen fysiskt:**
   - Räkna antal enheter
   - Inspektera för skador
   - Verifiera att det är rätt artikel (jämför batch)

2. **Ange mottaget antal:**
   - Skriv in exakt antal som kom
   - Kan vara mindre än beställt (partiell leverans)
   - Kan vara mer än beställt (överleveras)

3. **Välj hyllplats:**
   - Klicka dropdown och välj befintlig hylla
   - Eller skriv in ny hyllplats
   - **Viktigt!** Underlättar framtida plockning

4. **Kvalitetskontroll:**
   - Om allt är OK: **Markera "Kvalitetskontroll OK"**
   - Om något är fel: **Markera "Har avvikelse"**

5. **Hantera avvikelser (om något är fel):**
   - **Markera "Har avvikelse"**
   - Välj anledning från lista:
     - Fel kvantitet levererad
     - Skadad vara
     - Fel artikel levererad
     - Dålig kvalitet
     - Annan (beskriv)
   - **Ladda upp bilder** som bevis:
     - Foto på skador
     - Foto på fel artikel
     - Foto på förpackning
   - Skriv detaljerad beskrivning i **Anteckningar**

6. **Ladda upp bilder (rekommenderat):**
   - **Följesedel** - Alltid bra att ha
   - **Skador/avvikelser** - Om något är fel
   - **Allmän dokumentation** - Förpackningsetiketter etc.
   - Klicka kamera-ikonen eller dra och släpp

7. **Anteckningar:**
   - Skriv ner eventuella observationer
   - T.ex. "Låda 2 av 3 anlände"
   - "Följesedel saknades"

8. **Gå vidare** till nästa artikel

### Slutför mottagning

När alla artiklar är hanterade:

1. Klicka **"Slutför mottagning"**
2. **Systemet utför automatiskt:**
   - **Uppdaterar lagersaldon** - Lägger till mottagna enheter
   - **Skapar lagerrörelser** - Spårbarhet för varje artikel
   - **Uppdaterar hyllplatser** - Om nya platser angetts
   - **Loggar avvikelser** - För uppföljning
   - **Ändrar inköpsorderstatus:**
     - **"Mottagen"** om allt är levererat
     - **"Beställd"** om partiell leverans (väntar på mer)
3. **Mottagningskvitto genereras** (PDF)
4. Bekräftelse visas

### Partiella leveranser

**Om inte allt levereras på en gång:**

1. Ta emot det som kom (ange rätt antal per artikel)
2. Lämna resterande artiklar tomma eller ange 0
3. Klicka **"Slutför mottagning"**
4. **Inköpsordern förblir i status "Beställd"**
5. När nästa leverans kommer:
   - Öppna samma inköpsorder igen
   - Klicka "Ta emot varor"
   - Systemet visar kvarvarande att ta emot
   - Registrera nästa del
6. När allt är mottaget ändras status automatiskt till "Mottagen"

### Generera mottagningskvitto

Efter slutförd mottagning:

1. Klicka **"Generera mottagningskvitto"**
2. **PDF skapas med:**
   - Inköpsordernummer
   - Leverantör
   - Datum och tid för mottagning
   - Alla mottagna artiklar med kvantiteter
   - Hyllplatser
   - Eventuella avvikelser
   - Vem som tog emot
   - Uppladdade bilder (om några)
3. Spara eller maila till ekonomi/inköp

---

## Reparationssidan (Repairs)

**Vad systemet gör:**
Reparationssidan spårar alla artiklar som är ute på service. Systemet loggar när artiklar skickas på reparation, minskar lagersaldo automatiskt, följer upp status och hanterar återförsel av reparerade enheter. Du kan separera kasserade enheter från reparerade och hela reparationshistoriken sparas per artikel.

**Så använder du sidan:**

### Översikt över reparationer

**Filterknappar:**
- **Pågående** - Artiklar på reparation just nu
- **Slutförd** - Återförda till lager
- **Kasserad** - Enheter som inte gick att reparera

**Varje reparationskort visar:**
- Artikelnamn och batch
- Antal på reparation
- Datum skickat
- Anledning till reparation
- Status med färgkodning
- Vem som skickade

**Klicka på kort** för att öppna reparationsdetaljer

### Skicka artikel på reparation

**Från artikeldetaljer i lagersidan:**

1. Gå till **Lagersidan**
2. Öppna artikeln som ska repareras
3. Klicka **"Skicka på reparation"**
4. **Dialog öppnas:**
   - **Antal att reparera** - Hur många enheter ska skickas
   - **Anledning** - Beskriv felet/problemet (fritext)
   - **Anteckningar** - Övrig information
5. Klicka **"Skicka"**

**Vad händer:**
- Artikeln får status **"På reparation"**
- **Lagersaldot minskas** med antal skickat
- En **reparationslogg skapas** med:
  - Datum skickat
  - Antal
  - Anledning
  - Vem som skickade
- **Lagerrörelse** skapas (typ: reparation ut)
- Artikeln visas nu på Reparationssidan under "Pågående"

**Alternativ väg - Från reparationssidan:**

1. Gå till **Reparationssidan**
2. Klicka **"Skicka på reparation"**
3. Sök och välj artikel
4. Fyll i samma uppgifter som ovan

### Visa reparationsdetaljer

Klicka på ett reparationskort för att se:

**Översikt:**
- Artikelinformation
- Antal på reparation
- Datum skickat
- Förväntad återkomst (om angiven)
- Anledning (fullständig text)
- Anteckningar
- Status
- Vem som hanterar

**Historik:**
- Alla händelser för denna reparation
- Statusändringar
- Kommunikation
- Bilder (om uppladdade)

### Återföra från reparation

När artikeln kommer tillbaka från service:

1. Öppna reparationen (från listan)
2. Klicka **"Återför från reparation"**
3. **Dialog öppnas med fält:**
   - **Antal returnerat** - Hur många som är OK och kan återgå till lager
   - **Antal kasserat** - Hur många som inte gick att reparera
   - **Anteckningar** - Vad som gjordes, resultat, observationer
   - **Datum återfört** - Dagens datum (förifyllt)
4. Fyll i värdena:
   - T.ex. Skickade 10, fick tillbaka 8 OK och 2 kasserade
5. Klicka **"Återför"**

**Vad händer:**
- **Returnerade enheter återgår till lager:**
  - Lagersaldo ökas med antal returnerat
  - Lagerrörelse skapas (typ: reparation in)
- **Kasserade enheter loggas:**
  - Registreras som kasserade i systemet
  - Återgår INTE till lager
  - Synligt i reparationshistorik
- Reparationen markeras som **"Slutförd"**
- Artikelns status återgår till **"Aktiv"** (om saldo > 0)
- **Reparationsloggen uppdateras:**
  - Datum återfört
  - Resultat
  - Vem som hanterade återförsel

### Visa reparationshistorik per artikel

För att se alla reparationer för en specifik artikel:

1. Gå till **Lagersidan**
2. Öppna artikeln
3. Klicka på fliken **"Reparationer"**
4. **Se fullständig historik:**
   - Alla tidigare reparationer
   - Datum skickad och återförd
   - Anledning och resultat
   - Antal skickat/returnerat/kasserat
   - Vem som hanterade varje steg
   - Anteckningar

**Användning:**
- Identifiera återkommande problem
- Se mönster (samma fel flera gånger)
- Beslutsunderlag: Fortsätta reparera eller kassera artikel?

---

## Lagerställen-sidan (Warehouses)

**Vad systemet gör:**
Lagerställen-sidan hanterar fysiska lagerplatser och hyllstrukturer. Systemet låter dig skapa lagerställen, definiera hyllsystem med gång-ställning-plan-struktur, visualisera lagerlayout, ge placeringsförslag baserat på artikeldimensioner och hantera flera lager parallellt.

**Så använder du sidan:**

### Översikt över lagerställen

**Huvudvy visar:**
- Alla aktiva lagerställen
- Antal hyllplatser per lagerställe
- Antal artiklar lagrade där
- Beläggningsgrad (visuell stapel)
- Kontaktperson och adress

**Klicka på ett lagerställe** för att se detaljer

### Skapa nytt lagerställe

1. Klicka **"+ Nytt lagerställe"**
2. **Fyll i formulär:**
   - **Namn** - T.ex. "Huvudlager", "Lager A", "Källaren"
   - **Kod** - Kort kod (2-4 tecken) t.ex. "HL", "LA", "KÄ"
   - **Adress** - Fysisk adress (gatuadress, postnummer, stad)
   - **Kontaktperson** - Ansvarig för lagret
   - **Anteckningar** - Övrig info
3. Klicka **"Spara"**
4. Lagerställe skapas och visas i listan

### Lagerställedetaljer

Öppna ett lagerställe för att se:

**Översikt-fliken:**
- Fullständig information
- Statistik (antal hyllor, artiklar, beläggning)
- **Knapp: "Redigera lagerställe"**
- **Knapp: "Inaktivera"** (om du vill stänga ett lager)

**Hyllplatser-fliken:**
- Lista över alla hyllor i lagret
- Sök och filtrera hyllor
- Se vilka artiklar som finns på varje hylla
- **Knapp: "+ Ny hyllplats"** - Skapa enskild hylla
- **Knapp: "Skapa flera"** - Bulkskapa hyllsystem

**Artiklar-fliken:**
- Lista över alla artiklar i detta lagerställe
- Direkt översikt vad som finns var
- Klicka på artikel för att se detaljer

**Kartvy-fliken:**
- Visuell representation av lagret
- Färgkodade hyllor baserat på beläggning
- Klicka på hylla för att se innehåll

### Skapa hyllplats (enskild)

1. Öppna lagerställe
2. Gå till fliken **"Hyllplatser"**
3. Klicka **"+ Ny hyllplats"**
4. **Fyll i formulär:**
   - **Hyllkod** - Unikt namn, t.ex. "A1-B2" eller "G-04-03"
   - **Gång** - Bokstav (A, B, C, etc.)
   - **Ställning** - Nummer (1, 2, 3, etc.)
   - **Hyllplan** - Nivå (1=botten, 2, 3, etc.)
   - **Bredd (cm)** - Hyllans bredd
   - **Höjd (cm)** - Hyllans höjd
   - **Djup (cm)** - Hyllans djup
   - **Beskrivning** - T.ex. "Tunga kablar", "Små komponenter"
   - **Anteckningar** - Övrig info
5. Klicka **"Spara"**
6. Hyllplats skapas och visas i listan

### Skapa flera hyllplatser samtidigt (bulkskapa)

**För att snabbt skapa ett komplett hyllsystem:**

1. Öppna lagerställe
2. Gå till fliken **"Hyllplatser"**
3. Klicka **"Skapa flera"**
4. **Definiera struktur:**
   - **Gångar** - t.ex. "A-F" (skapar A, B, C, D, E, F)
   - **Ställningar** - t.ex. "1-10" (skapar 1, 2, 3... 10)
   - **Hyllplan** - t.ex. "1-4" (skapar 4 nivåer)
   - **Format för hyllkod** - T.ex. "{gång}-{ställning}-{plan}"
   - **Dimensioner** (valfritt) - Samma för alla hyllor
5. **Förhandsvisning visas:**
   - Exempel på hyllkoder som skapas
   - Totalt antal hyllor
   - T.ex. "A-01-1, A-01-2, A-01-3, A-01-4, A-02-1..." osv.
6. Klicka **"Generera X hyllplatser"**
7. **Alla hyllor skapas automatiskt**
   - T.ex. med A-F, 1-10, 1-4 = 6×10×4 = 240 hyllor

**Exempel på genererade hyllkoder:**
- A-01-1, A-01-2, A-01-3, A-01-4
- A-02-1, A-02-2, A-02-3, A-02-4
- ...
- F-10-1, F-10-2, F-10-3, F-10-4

### Placeringsassistent (AI-förslag)

Låt systemet föreslå optimal hyllplats för en artikel:

**När du lägger till artikel eller tar emot vara:**

1. Du är i artikelredigeringsläge eller mottagning
2. Fält för **"Hyllplats"** visas
3. Klicka **"Föreslå placering"**
4. **AI analyserar:**
   - Artikelns dimensioner (bredd, höjd, djup)
   - Lediga hyllplatser i aktuellt lagerställe
   - Hyllors dimensioner
   - Befintliga artiklar av samma typ (för gruppering)
   - Optimal packning
5. **Förslag visas:**
   - 3-5 alternativa hyllplatser
   - Motivering för varje ("Passar dimensioner perfekt", "Liknande artiklar här")
   - Fri kapacitet
6. **Välj ett förslag** eller ange manuellt

**Tips:**
- Gruppera liknande artiklar (t.ex. alla P2.6 moduler i samma gång)
- Tungviktigt nederst (plan 1)
- Lättviktigt och småsaker högre upp
- Högomsatta artiklar nära packstation

### Hyllkartvy

Visuell representation av lagret:

1. Öppna lagerställe
2. Gå till fliken **"Kartvy"**
3. **Se översikt:**
   - Alla hyllplatser i rutnät
   - **Färgkodning:**
     - Grön = Tom eller låg beläggning
     - Gul = Medel beläggning
     - Röd = Hög beläggning/full
   - Hyllkoder visas i rutorna

4. **Klicka på en hylla** för att se:
   - Vilka artiklar som finns där
   - Antal av varje artikel
   - Fri kapacitet

5. **Använd för:**
   - Snabb överblick över lagerbeläggning
   - Identifiera tomma platser
   - Planera omlastning

---

## Okända leveranser-sidan (UnknownDeliveries)

**Vad systemet gör:**
Sidan för okända leveranser hanterar paket som anländer utan tydlig dokumentation eller som inte kan matchas mot inköpsordrar. Systemet skapar utredningsärenden, tilldelar ansvarig person, lagrar foton av förpackning/innehåll, skickar notifieringar och låter dig senare koppla leveransen till rätt inköpsorder eller registrera som ny artikel.

**Så använder du sidan:**

### Översikt över okända leveranser

**Filterknappar:**
- **Under utredning** - Pågående ärenden
- **Löst** - Identifierade och hanterade
- **Alla** - Fullständig historik

**Varje leveranskort visar:**
- Referensnummer (från fraktsedel)
- Leveransdatum
- Beskrivning
- Tilldelad ansvarig
- Status med färgkodning
- Antal bilder uppladdade

### Registrera okänd leverans

**Metod 1 - Från Okända-sidan:**

1. Klicka **"+ Registrera okänd leverans"**
2. **Fyll i formulär:**
   - **Referensnummer** - Från fraktsedel, tracking-nummer, eller internt
   - **Leveransdatum** - När paketet anlände
   - **Beskrivning** - Vad ser du? Storlek, vikt, förpackning
   - **Välj ansvarig** - Vem ska utreda (dropdown med användare)
   - **Ladda upp bilder:**
     - Foto på förpackning utifrån
     - Foto på fraktsedel
     - Foto på innehåll (om öppnat)
   - **Anteckningar** - Övrig info
3. Klicka **"Spara"**

**Metod 2 - Via Skanna-sidan:**

1. Gå till **Skanna-sidan**
2. Välj läge **"Okänd leverans"**
3. Fotografera förpackning och innehåll
4. Fyll i samma uppgifter som ovan
5. Spara

**Vad händer:**
- Ett **utredningsärende skapas**
- Ansvarig person får **notifiering** (in-app och e-post om aktiverat)
- Leveransen visas under "Under utredning"
- Status: **"Väntar på utredning"**

### Utreda okänd leverans

Som ansvarig person:

1. Du får notifiering om ny okänd leverans
2. Gå till **Okända leveranser-sidan**
3. Klicka på leveransen för att öppna detaljer
4. **Granska information:**
   - Titta på uppladdade bilder
   - Läs beskrivning och anteckningar
   - Kontrollera referensnummer

5. **Försök identifiera:**
   - Vad är det för artiklar?
   - Från vilken leverantör?
   - Hör det till någon inköpsorder?
   - Kontrollera med kollegor/inköp

### Hantera identifierad leverans

**Alternativ 1 - Koppla till inköpsorder:**

Om du hittar rätt inköpsorder:

1. Öppna den okända leveransen
2. Klicka **"Koppla till inköpsorder"**
3. **Sök efter inköpsorder:**
   - Sök på PO-nummer
   - Leverantör
   - Projekt
   - Datum
4. Välj rätt order från listan
5. Bekräfta
6. **Du omdirigeras till Mottagningssidan**
7. Utför normal mottagning (se avsnitt om Mottagning)
8. Den okända leveransen markeras automatiskt som **"Löst"**

**Alternativ 2 - Registrera som ny artikel:**

Om leveransen inte hör till någon order (t.ex. reklamation, retursändning, gåva):

1. Öppna den okända leveransen
2. Klicka **"Registrera som artikel"**
3. **Artikelformulär öppnas:**
   - Fyll i artikeldata (eller använd Skanna om möjligt)
   - Ange lagersaldo (antal mottaget)
   - Välj hyllplats
   - Välj lagerställe
4. Klicka **"Spara artikel"**
5. Artikeln skapas och läggs till i lagret
6. Den okända leveransen markeras som **"Löst"**

**Alternativ 3 - Kan inte identifieras (ännu):**

Om du behöver mer information:

1. Öppna den okända leveransen
2. Klicka **"Redigera"**
3. **Uppdatera information:**
   - Lägg till nya anteckningar med vad du vet
   - Ladda upp fler bilder om du öppnat paketet
   - Ändra ansvarig om någon annan ska ta över
4. Spara
5. Leveransen förblir **"Under utredning"**
6. **Fysiskt:** Lägg paketet åt sidan på en särskild plats
7. Vänta på mer info (från leverantör, kollegor, etc.)
8. Uppdatera ärendet löpande

### Arkivera ärende

När ärendet är helt löst och du vill städa bort det:

1. Öppna leveransen
2. Klicka **"Arkivera"**
3. Bekräfta
4. Ärendet flyttas till "Löst"-filter
5. Syns inte längre i standardvy ("Under utredning")
6. Finns kvar i "Alla" för historik och spårbarhet

---

## Admin-sidan (Admin)

**Vad systemet gör:**
Admin-sidan samlar alla administrativa funktioner för systemhantering. Här hanterar du användare, leverantörer, rapporter, systeminställningar, lagervärdesberäkningar, lagerrörelserapporter och notifikationsinställningar. Endast användare med admin-roll har tillgång.

**Så använder du sidan:**

### Menyalternativ i Admin

Sidan visar en översikt med kort för varje admin-funktion. Klicka på ett kort för att öppna funktionen.

#### 1. Användare

**Vad det gör:**
Hantera alla användarkonton - bjud in nya, tilldela roller, inaktivera användare.

**Användning:**

1. **Klicka på "Användare"-kortet**
2. **Se användarlista:**
   - Alla aktiva användare
   - Namn, e-post, roll
   - Senaste inloggning
   - Status (aktiv/inaktiv)

3. **Bjud in ny användare:**
   - Klicka **"+ Bjud in användare"**
   - Ange e-postadress
   - Välj roll:
     - **Användare** - Normal åtkomst (lager, ordrar, mottagning)
     - **Admin** - Full åtkomst (allt + användarhantering, rapporter)
   - Klicka **"Skicka inbjudan"**
   - Personen får e-post med inloggningslänk
   - När de loggar in första gången sätter de eget lösenord

4. **Redigera användare:**
   - Klicka på användare i listan
   - **Ändra roll** - Uppgradera till Admin eller nedgradera till Användare
   - **Inaktivera konto** - Användaren kan inte längre logga in
   - **Återaktivera** - Om tidigare inaktiverad

5. **Visa inloggningshistorik:**
   - Se när användare loggat in senast
   - Spåra aktivitet

#### 2. Leverantörer

**Vad det gör:**
Hantera databas med leverantörer som används i inköpsordrar.

**Användning:**

1. **Klicka på "Leverantörer"-kortet**
2. **Se leverantörslista:**
   - Alla aktiva leverantörer
   - Namn, kontaktperson, e-post
   - Standard leveranstid

3. **Lägg till ny leverantör:**
   - Klicka **"+ Ny leverantör"**
   - **Fyll i formulär:**
     - Namn
     - Kontaktperson
     - E-post
     - Telefon
     - Adress
     - Webbsida
     - **Standard leveranstid** - Antal dagar (t.ex. 7)
     - Anteckningar
   - Klicka **"Spara"**

4. **Redigera leverantör:**
   - Klicka på leverantör i listan
   - Uppdatera uppgifter
   - Spara

5. **Inaktivera leverantör:**
   - Klicka på leverantör
   - Markera som inaktiv
   - Leverantören syns inte längre i dropdowns vid orderskapande
   - Historiska ordrar påverkas inte

#### 3. Lagerställen

**Vad det gör:**
Snabb översikt över lagerställen (länk till Warehouses-sidan).

**Användning:**
- Klicka kortet för att öppna Warehouses-sidan
- Se sammanfattning av alla lagerställen
- Beläggning och artikelantal

#### 4. Rapporter

**Vad det gör:**
Skapa schemalagda rapporter som skickas automatiskt via e-post.

**Användning:**

1. **Klicka på "Rapporter"-kortet**
2. **Se befintliga rapporter:**
   - Namn, typ, frekvens
   - Mottagare
   - Senast skickad
   - Nästa schemalagda
   - Status (aktiv/inaktiv)

3. **Skapa ny rapport:**
   - Klicka **"+ Ny rapport"**
   - **Välj rapporttyp:**
     - **Lagersummering** - Översikt med artiklar, saldo, värde
     - **Lagerrörelser** - Alla transaktioner för period
     - **Lågt lager** - Artiklar som behöver beställas
     - **Fullständig inventering** - Komplett lagerlista
   
   - **Välj frekvens:**
     - Daglig (skickas varje dag vid vald tid)
     - Veckovis (välj vilka dagar)
     - Månadsvis (välj datum)
   
   - **Ange mottagare:**
     - E-postadresser (kommaseparerade)
     - Kan vara interna och externa
   
   - **Lägg till filter (valfritt):**
     - Kategori (endast LED Module, endast Cables, etc.)
     - Lagerställe (endast Huvudlager)
     - Status (endast lågt lager)
     - Tidsperiod för lagerrörelser
   
   - **Datum för första rapportkörning:**
     - När ska första rapporten skickas
   
   - Klicka **"Skapa rapport"**

4. **Hantera rapport:**
   - **Pausa** - Stoppa tillfälligt (kan återaktiveras)
   - **Redigera** - Ändra filter, mottagare, frekvens
   - **Ta bort** - Permanent radering
   - **Skicka nu** - Kör manuellt direkt

5. **Visa rapporthistorik:**
   - Se när rapporter skickats
   - Vem som tog emot
   - Eventuella fel

#### 5. Lagervärde

**Vad det gör:**
Beräkna och visa totalt lagervärde baserat på antal × enhetskostnad.

**Användning:**

1. **Klicka på "Lagervärde"-kortet**
2. **Se värdeöversikt:**
   - **Totalt lagervärde** (stor siffra överst)
   - Fördelning per lagerställe (cirkeldiagram)
   - Fördelning företagsägt vs kundägt
   - Värde per kategori

3. **Filtrera:**
   - Välj lagerställe (endast Huvudlager)
   - Välj kategori (endast LED Module)
   - Välj datum (värdet vid specifikt datum)

4. **Exportera:**
   - Klicka **"Exportera till Excel"**
   - Fil laddas ner med:
     - Artikelnamn, antal, enhetskostnad, totalt värde
     - Summor per kategori
     - Totalsumma
   - Använd för ekonomirapportering

**Användningsfall:**
- Bokslut
- Försäkringsvärdering
- Budgetering
- Identifiera mest värdefulla artiklar

#### 6. Rörelser

**Vad det gör:**
Visa och analysera alla lagerrörelser (transaktioner).

**Användning:**

1. **Klicka på "Rörelser"-kortet**
2. **Se lista över alla rörelser:**
   - Datum och tid
   - Artikel
   - Typ (inleverans, uttag, justering, inventering)
   - Kvantitet (+/-) 
   - Tidigare saldo
   - Nytt saldo
   - Anledning
   - Vem som utförde

3. **Filtrera:**
   - **Artikel** - Endast en specifik artikel
   - **Typ** - Endast inleveranser, endast uttag, etc.
   - **Datum** - Från-till intervall
   - **Användare** - Vem som utförde rörelsen
   - **Lagerställe** - Vilken plats

4. **Sök:**
   - Sök på artikelnamn, batch, anledning

5. **Exportera:**
   - Klicka **"Exportera"**
   - Excel-fil med filtrerad data
   - Använd för:
     - Spårbarhet och revision
     - Analys av förbrukningsmönster
     - Identifiera avvikelser
     - Prognoser

**Användningsfall:**
- Spåra vem som plockade vad och när
- Hitta saknade artiklar
- Analysera förbrukningshastighet
- Revisionsspår

#### 7. Notifieringar

**Vad det gör:**
Konfigurera vilka notifikationer du vill få och via vilka kanaler.

**Användning:**

1. **Klicka på "Notifieringar"-kortet**
2. **Inställningar per användare:**
   
   **Aktivera kanaler:**
   - **In-app notiser** - Visas i systemet (klockikonen överst)
   - **E-postnotiser** - Skickas till din e-post
   - **Push-notiser** - Mobilvarningar (kräver PWA)
   
   **Välj händelser att notifiera om:**
   - ☑ Lågt lager - När artikel når minsta lagernivå
   - ☑ Slut i lager - När artikel når saldo 0
   - ☑ Nya ordrar - När order skapas
   - ☑ Orderstatus ändrad - När order plockas/levereras
   - ☑ Inkomna varor - När leverans registreras
   - ☑ Reparationer - När artikel skickas/återkommer
   - ☑ Avvikelser - Vid mottagningsproblem
   - ☑ Okända leveranser - När ny okänd leverans registreras
   
   **Endast kritiska notiser:**
   - Aktivera för att ENDAST få högprio-varningar
   - Filtrerar bort normala notiser

3. **Spara inställningar**

**Tips:**
- Aktivera push-notiser för viktiga händelser
- Använd "Endast kritiska" om du får för många notiser
- Olika användare kan ha olika inställningar

#### 8. PWA-inställningar

**Vad det gör:**
Konfigurera Progressive Web App-funktioner (offline, notiser).

**Användning:**

1. **Klicka på "PWA-inställningar"-kortet**
2. **Aktivera push-notiser:**
   - Klicka **"Aktivera push-notiser"**
   - Webbläsaren ber om tillåtelse
   - Godkänn
   - Du får nu mobilvarningar även när appen är stängd

3. **Hantera offline-cache:**
   - Se hur mycket data som cachats
   - Rensa cache om problem
   - Tvinga omsynkning

4. **Testa push-notis:**
   - Klicka **"Skicka testnotis"**
   - Du får en testnotifikation på enheten
   - Verifiera att det fungerar

**Rekommendation:**
- Aktivera push för viktiga varningar
- Använd PWA-läge för bästa prestanda

#### 9. Inställningar

**Vad det gör:**
Systemövergripande konfiguration.

**Användning:**

1. **Klicka på "Inställningar"-kortet**
2. **Konfigurera:**
   
   **Standard lagerställe:**
   - Välj vilket lagerställe som är standard
   - Används när ny artikel skapas
   
   **Auto-SKU generering:**
   - Aktivera/inaktivera automatisk artikelnumrering
   - Välj format (t.ex. ART-0001, ART-0002...)
   
   **Minsta lagernivå (global):**
   - Standardvärde för nya artiklar
   - Används om ingen specifik nivå anges
   - T.ex. 5 enheter
   
   **Språk:**
   - Svenska (standard)
   - Kan expanderas med fler språk
   
   **Tidzon:**
   - Välj tidzon för korrekt datering
   - Europa/Stockholm (standard)

3. **Spara inställningar**

---

## Tips och tricks

### Effektiv plockning

**1. Använd plocklistor:**
- Skriv ut innan du börjar
- Artiklar är sorterade efter hyllplats
- Optimerad väg genom lagret

**2. Snabbplockning med skanner:**
- Skanna streckkod för att verifiera artikel
- Plocka direkt utan att leta i system
- Snabbare och färre fel

**3. Gruppera ordrar:**
- Plocka flera små ordrar samtidigt
- Använd olika färgade märken
- Spara tid på gångar

### Inventering

**Löpande inventering:**
- Inventera en sektion per vecka
- Använd skanningsläget "Inventering"
- Mindre disruptivt än stoppning av hela lagret

**Stickprov:**
- Kontrollera 10% av artiklarna varje månad
- Fokus på högrisk-artiklar (dyra, snabbrörliga)
- Åtgärda avvikelser direkt

### Optimera lagerlayout

**ABC-analys:**
- **A-artiklar** (högomsatta) - Lägg nära packstation
- **B-artiklar** (medium) - Mittområdet
- **C-artiklar** (lågomsatta) - Längre bort

**Zonindelning:**
- Gruppera per kategori
- LED-moduler i en zon
- Kablar och tillbehör i en annan
- Enklare att hitta och plocka

### Hållbarhet och ordning

**Batch-spårning:**
- Använd alltid batch-nummer
- Rotera lager (FIFO - First In, First Out)
- Äldre artiklar först ut

**Etikettering:**
- Skriv ut etiketter för alla hyllplatser
- Använd QR-koder för snabb skanning
- Uppdatera vid omflyttningar

### Mobilanvändning

**PWA-läge är bäst:**
- Installera på hemskärmen
- Snabbare uppstart
- Fungerar offline
- Push-notiser

**Offline-stöd:**
- Systemet fungerar utan internet
- Ändringar synkas när du är online igen
- Perfekt för lager utan WiFi

**Batterioptimering:**
- Minska skärmljusstyrka
- Stäng appen mellan användning
- Använd batteriläge på enheten

---

## Felsökning

### Vanliga problem och lösningar

**Problem: Kan inte logga in**

*Lösning:*
1. Kontrollera att e-post och lösenord är korrekta
2. Prova "Glömt lösenord"
3. Kontakta admin för att verifiera att ditt konto är aktivt

---

**Problem: Artikeln dyker inte upp i sökning**

*Lösning:*
1. Kontrollera stavning
2. Prova söka på batch-nummer istället
3. Kontrollera att artikeln inte har filtrerats bort (status, lagerställe)
4. Rensa filter och försök igen

---

**Problem: AI-extraheringen fungerar inte**

*Lösning:*
1. Ta ny bild med bättre ljusförhållanden
2. Se till att etiketten är tydlig och i fokus
3. Prova olika vinkel
4. Fyll i manuellt om AI inte kan läsa etiketten

---

**Problem: Kan inte slutföra plockning**

*Lösning:*
1. Kontrollera att alla rader har plockad kvantitet
2. Om något saknas, ange 0 för den raden
3. Ordern kan markeras som "Ofullständig" och slutföras senare

---

**Problem: Fel lagersaldo**

*Lösning:*
1. Kontrollera historiken för artikeln
2. Hitta var avvikelsen uppstod
3. Justera saldot manuellt med anledning "Inventering"
4. Informera ansvarig om problemet

---

**Problem: Systemet känns långsamt**

*Lösning:*
1. Kontrollera internetuppkoppling
2. Stäng andra appar/flikar i webbläsaren
3. Rensa cache i webbläsaren:
   - Chrome: Inställningar → Sekretess → Rensa webbdata
   - Safari: Inställningar → Safari → Rensa historik
4. Uppdatera sidan (Ctrl+R / Cmd+R)
5. Starta om enheten om problemet kvarstår

---

**Problem: Push-notiser fungerar inte**

*Lösning:*
1. Kontrollera att notiser är aktiverade i systemet
2. Kontrollera enhetens notis-inställningar:
   - iOS: Inställningar → Notiser → [App]
   - Android: Inställningar → Appar → [App] → Notiser
3. Återinstallera PWA-appen om problemet kvarstår

---

**Problem: Offline-läge synkar inte**

*Lösning:*
1. Kontrollera att du har internetuppkoppling
2. Öppna appen när du är online
3. Vänta några sekunder medan synkning sker
4. Kontrollera under "Offline-status" i menyn

---

### Få hjälp

Om du stöter på problem som inte löses av ovanstående:

1. **Kontakta support:**
   - E-post: support@imvision.se
   - Beskriv problemet noggrant
   - Inkludera skärmdumpar om möjligt

2. **Dokumentation:**
   - Läs igenom relevant avsnitt i denna manual igen
   - Kolla systemdokumentationen för tekniska detaljer

3. **Feedbackfunktion:**
   - Använd feedback-knappen i appen
   - Föreslå förbättringar
   - Rapportera buggar

---

## Sammanfattning

IMvision Lager & Order är ett kraftfullt och flexibelt system designat för moderna lagermiljöer. Med AI-driven skanning, offline-stöd och komplett spårbarhet får du full kontroll över ditt lager.

**Kom ihåg:**
- Använd PWA-läget för bästa upplevelse
- Skanna regelbundet för korrekta saldo
- Använd batch-nummer för spårbarhet
- Håll hyllplatser uppdaterade
- Inventera löpande
- Utnyttja rapporter för optimering

**Lycka till med ditt lagerarbete!**

---

*Version 1.0 - Senast uppdaterad: 2026-02-13*