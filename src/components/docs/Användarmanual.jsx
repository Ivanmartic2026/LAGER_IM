# IMvision Lager & Order System - Användarmanual

## Innehållsförteckning
1. [Komma igång](#komma-igång)
2. [Lagerhantering](#lagerhantering)
3. [Skanning och registrering](#skanning-och-registrering)
4. [Orderhantering](#orderhantering)
5. [Inköpsordrar](#inköpsordrar)
6. [Reparationshantering](#reparationshantering)
7. [Rapporter och export](#rapporter-och-export)
8. [Administration](#administration)
9. [Mobil användning](#mobil-användning)
10. [Felsökning](#felsökning)

---

## Komma igång

### Första inloggningen
1. Öppna systemet i din webbläsare
2. Logga in med din e-postadress och lösenord
3. Du kommer till startsidan (Dashboard)

### Startsidan - Översikt
Startsidan visar:
- **Statistik**: Totalt antal artiklar, lågt lager, aktiva ordrar, reparationer
- **Snabblänkar**: Direktåtkomst till vanliga funktioner
- **Senaste aktivitet**: Vad som hänt nyligen i systemet
- **Varningar**: Lågt lager, försenade ordrar, etc.

### Navigation
- **Desktop**: Navigationsmeny längst ner på skärmen
- **Mobil**: Hamburger-meny uppe till höger + snabbnavigering längst ner
- **Sök**: Sökfält finns på de flesta sidor för snabb åtkomst

---

## Lagerhantering

### 2.1 Visa alla artiklar

**Steg-för-steg:**
1. Klicka på **"Lager"** i navigationsmenyn
2. Du ser nu alla artiklar i en lista
3. Varje artikel visar:
   - Bild
   - Lagersaldo (antal)
   - Artikelnummer och batch
   - Benämning och tillverkare
   - Hyllplats
   - Status

### 2.2 Söka efter artikel

**Tre sätt att söka:**

**Metod 1: Fritextsök**
1. På Lagersidan, skriv i sökfältet längst upp
2. Sök efter:
   - Artikelnummer
   - Batch nummer
   - Benämning
   - Tillverkare
3. Resultatet uppdateras direkt

**Metod 2: Filtrera**
1. Under sökfältet finns filter:
   - **Status**: Alla, Aktiv, Lågt, Slut, Reparation
   - **Lagerställe**: Välj specifikt lager
   - **Lagertyp**: Företagsägt eller Kundägt
   - **Kategori**: LED Module, Cabinet, etc.
2. Klicka på önskat filter
3. Listan uppdateras automatiskt

**Metod 3: Sortera**
1. Klicka på sorteringsknapparna:
   - **Nyast**: Senast tillagda först
   - **Namn**: Alfabetisk ordning
   - **Batch**: Efter batch-nummer
   - **Hylla**: Efter hyllplacering
   - **Leverantör**: Grupperad efter leverantör
   - **Saldo**: Högst antal först
2. Listan sorteras om direkt

### 2.3 Visa artikeldetaljer

**Steg:**
1. Klicka på en artikel i listan
2. Detaljvyn öppnas med:
   - **Översikt**: All information om artikeln
   - **Montering**: Om artikeln är en produkt med komponenter
   - **Filer**: Uppladdade dokument och bilder
   - **Historik**: Alla lagerrörelser
   - **Ordrar**: Vilka ordrar som innehåller artikeln
   - **Reparation**: Reparationshistorik

**I detaljvyn kan du:**
- Redigera artikeluppgifter
- Justera lagersaldo
- Skicka på reparation
- Ladda ner etiketter
- Ta bort artikel

### 2.4 Redigera artikel

**Steg:**
1. Öppna artikelns detaljvy
2. Klicka på **"Redigera"** (penna-ikonen)
3. Redigeringsformuläret öppnas
4. Ändra önskade fält:
   - Grundinformation (namn, tillverkare, etc.)
   - Mått och vikt
   - Lagring (hylla, lager, batch)
   - Tekniska specifikationer
   - Bilder
5. Klicka **"Spara ändringar"**

**Tips:**
- Placeringsförslag visas automatiskt baserat på artikelns storlek
- SKU kan genereras automatiskt
- Du kan lägga till flera bilder

### 2.5 Justera lagersaldo

**När du behöver lägga till eller ta bort från lagret manuellt:**

**Lägg till i lager:**
1. Öppna artikelns detaljvy
2. Klicka på **"+ Lägg till"**
3. Ange antal
4. Ange anledning (t.ex. "Funnet vid inventering")
5. Klicka **"Lägg till"**
6. Lagersaldot uppdateras

**Ta bort från lager:**
1. Öppna artikelns detaljvy
2. Klicka på **"- Ta bort"**
3. Ange antal
4. Ange anledning (t.ex. "Skadad", "Internt bruk")
5. Klicka **"Ta bort"**
6. Lagersaldot minskas

**Notera:**
- Alla justeringar loggas i Historik
- Vid borttagning skapas en lagerrörelse av typ "adjustment"

### 2.6 Exportera lagerdata

**Export till Excel:**
1. På Lagersidan, klicka **"Excel"**
2. Systemet genererar en Excel-fil
3. Filen laddas ner automatiskt
4. Filen innehåller alla artiklar med alla kolumner

**Export till CSV:**
1. På Lagersidan, klicka **"CSV"**
2. CSV-fil genereras och laddas ner
3. Kan öppnas i Excel eller Google Sheets

**Vad exporteras:**
- Artikelnummer, Batch, Namn
- Tillverkare, Kategori, Serie
- Lagersaldo, Hyllplats, Lagerställe
- Mått, Vikt
- Status, Datum, etc.

### 2.7 Importera artiklar

**Förbered din Excel-fil:**
- Kolumner kan heta vad som helst
- Viktiga kolumner: Namn, Batch, Tillverkare, Antal, Hylla
- Exempel:
  ```
  Namn | Batch | Tillverkare | Antal | Hylla | Kategori
  P2.6 Indoor | B123 | Unilumin | 50 | A1-B2 | LED Module
  ```

**Import steg-för-steg:**
1. På Lagersidan, klicka **"Importera"**
2. Välj din Excel-fil (.xlsx)
3. Systemet analyserar filen

**Om kolumner behöver mappas:**
4. Du ser en mappningsvy
5. För varje kolumn i din fil:
   - Välj vilket fält i systemet den motsvarar
   - Exempel: "Produktnamn" → "Benämning"
6. Klicka **"Bekräfta mappning"**

**Förhandsgranska:**
7. Du ser alla artiklar som ska importeras
8. Markera vilka du vill importera (eller välj alla)
9. Välj lagerställe (om inte angivet i filen)
10. Klicka **"Importera X artiklar"**

**Resultat:**
- Nya artiklar skapas
- Lagerrörelser skapas automatiskt
- Du får en sammanfattning

**Tips:**
- Systemet känner igen vanliga kolumnnamn automatiskt
- Dubbletter varnas för (baserat på batch/namn)
- Om artikeln redan finns, kan den uppdateras istället

### 2.8 Bulk-redigera artiklar

**När du vill ändra många artiklar samtidigt:**

**Steg:**
1. På Lagersidan, markera checkboxen bredvid varje artikel du vill ändra
   - Eller klicka checkboxen i header för att välja alla
2. En blå toolbar visas längst upp
3. Klicka **"Redigera"**
4. Välj vad du vill ändra:
   - Lagerställe
   - Status
   - Lagertyp
5. Välj nytt värde
6. Klicka **"Spara ändringar"**
7. Alla valda artiklar uppdateras

**Bulk-ta bort:**
1. Markera artiklar som ovan
2. Klicka **"Ta bort"**
3. Bekräfta
4. Alla valda artiklar tas bort

**Varning:** Bulk-borttagning kan inte ångras!

---

## Skanning och registrering

### 3.1 Skanna ny artikel

**Mobil är bäst för skanning!**

**Steg:**
1. Gå till **"Lager"** → Klicka på **"Skanna"** (kamera-ikon)
2. Välj läge: **"Registrera ny artikel"**
3. Klicka **"Ta foto"**
4. Rikta kameran mot artikelns etikett/förpackning
5. Ta foto när etiketten syns tydligt
6. Systemet analyserar bilden med AI

**AI-analys:**
- Läser text på etiketten (OCR)
- Extraherar: Tillverkare, Modellnummer, Batch, Specifikationer
- Fyller i formuläret automatiskt

**Granska och komplettera:**
7. Kontrollera all extraherad data
8. Fyll i/ändra fält som behövs:
   - Benämning (om ej automatiskt)
   - Batch nummer
   - Antal
   - Hyllplats (välj från lista eller skriv ny)
   - Lagerställe
   - Tillverkare
9. Ladda upp fler bilder om önskat
10. Klicka **"Spara artikel"**

**Resultat:**
- Artikeln skapas i systemet
- Lagersaldo läggs till
- Lagerrörelse skapas
- QR-kod genereras (kan laddas ner)

**Tips:**
- Ta tydliga bilder i bra belysning
- Inkludera all text på etiketten
- AI förstår flera språk
- Du kan alltid redigera efteråt

### 3.2 Ta emot leverans (Inbound)

**När du får en leverans utan inköpsorder:**

**Steg:**
1. Gå till **"Lager"** → **"Skanna"**
2. Välj läge: **"Ta emot leverans"**
3. Skanna/fotografera varje artikel
4. För varje artikel:
   - Granska AI-data
   - Ange antal mottaget
   - Välj hyllplats
   - Spara
5. Upprepa för alla artiklar i leveransen

**Systemet:**
- Lägger till kvantitet till befintliga artiklar
- Skapar nya artiklar om de inte finns
- Skapar lagerrörelser för allt

### 3.3 Justera lager (via skanning)

**Snabba lagerjusteringar:**

**Steg:**
1. **"Skanna"** → Välj **"Justera lager"**
2. Skanna artikel (QR-kod eller etikett)
3. Systemet hittar artikeln
4. Välj operation:
   - Lägg till
   - Ta bort
5. Ange antal
6. Ange anledning
7. Spara

**Användningsfall:**
- Inventering
- Hitta/förlora artiklar
- Snabba korrigeringar

### 3.4 Okänd leverans

**När ni får artiklar ni inte kan identifiera:**

**Steg:**
1. **"Skanna"** → Välj **"Okänd leverans"**
2. Fotografera artikeln
3. Fyll i så mycket som möjligt
4. Ange referensnummer (följesedelsnummer, etc.)
5. Spara med status **"unknown_delivery"**

**Utredning:**
6. Gå till **"Okända"** i menyn
7. Du ser alla okända leveranser
8. Klicka på en artikel
9. Tilldela till dig själv eller kollega
10. Lägg till kommentarer under utredning
11. När utrett:
    - Uppdatera artikel med korrekt info
    - Ändra status till "active"
    - Koppla till inköpsorder om relevant

**Systemet:**
- Håller koll på vem som utreder
- Notifierar vid nya okända leveranser
- Historik sparas

### 3.5 Ladda ner etiketter

**Efter registrering av ny artikel:**

**A4-etikett (för arkivering):**
1. Öppna artikelns detaljvy
2. Klicka **"Ladda ner A4-etikett"**
3. PDF genereras
4. Innehåller: QR-kod, Namn, Batch, Hylla, Bild
5. Skriv ut och sätt på förpackning

**Liten etikett (58mm, för termoskrivare):**
1. Artikeldetaljvy → **"Ladda ner liten etikett"**
2. PDF för 58mm etikett
3. Skriv ut på termoskrivare
4. Sätt på enskilda enheter

**QR-kod:**
- Varje artikel får unik QR-kod
- Skanna för snabb åtkomst
- Kan användas för inventering

---

## Orderhantering

### 4.1 Skapa ny order

**Steg-för-steg:**
1. Gå till **"Ordrar"**
2. Klicka **"+ Ny order"** (blå knapp uppe till höger)
3. Fyll i orderinformation:
   - **Kundnamn**: Obligatoriskt
   - **Kundreferens**: Er referens/projektnummer
   - **Leveransdatum**: Önskat datum
   - **Leveransadress**: Vart ska det skickas
   - **Prioritet**: Normal, Hög, Urgent
   - **Anteckningar**: Extra info

**Lägg till artiklar:**
4. Under "Orderrader", klicka **"Lägg till artikel"**
5. Sök efter artikel (namn, batch, artikelnummer)
6. Välj artikel från listan
7. Ange antal
8. Artikeln läggs till i ordern
9. Upprepa för alla artiklar

**Kontroll:**
10. Se över alla rader
11. Kontrollera att lagersaldo finns för alla artiklar
    - Rött = inte tillräckligt i lager
    - Grönt = finns i lager

**Spara:**
12. Klicka **"Spara order"**
13. Ordern får status "Draft" (utkast)

**Nästa steg:**
14. Ändra status till **"Redo att plocka"** när den ska plockas

### 4.2 Visa ordrar

**På Ordrar-sidan ser du:**
- Lista över alla ordrar
- Status för varje order
- Kundnamn och referens
- Antal artiklar
- Leveransdatum

**Filtrera ordrar:**
- Status: Alla, Utkast, Redo, Plockas, Plockad, Levererad
- Prioritet: Visa endast urgenta
- Datum: Välj tidsperiod

**Sortera:**
- Efter datum
- Efter kund
- Efter prioritet

### 4.3 Plocka order - Detaljerad guide

**Förberedelse:**
1. På Ordrar-sidan, hitta ordern som ska plockas
2. Kontrollera att status är **"Redo att plocka"**
3. Klicka på ordern för att öppna detaljvy
4. Klicka **"Börja plocka"**

**Plockvyn öppnas:**
5. Du ser nu alla orderrader sorterade efter hyllplats
   - Alla A-hyllor först, sedan B, osv.
   - Effektiv plockväg

**För varje artikel:**

**Metod 1: Manuell registrering**
6. Gå till hyllplatsen som anges
7. Hitta artikeln (kolla batch-nummer)
8. Plocka rätt antal
9. I appen:
   - Ange antal du plockade
   - Om du plockade allt → klicka checkboxen
   - Om partiell plock → ange bara det antal du hittade
10. Klicka **"Nästa"**

**Metod 2: Skanning (rekommenderas)**
6. När du står vid hyllan
7. Klicka **"Skanna"** på artikelraden
8. Skanna artikelns QR-kod eller streckkod
9. Systemet bekräftar att det är rätt artikel
10. Ange antal
11. Klicka **"Bekräfta"**

**Under plockning:**
- Se framsteg i toppen (5/10 artiklar plockade)
- Lägg till anteckningar per rad om något är fel
- Rapportera problem direkt i appen

**Avvikelser:**

**Om artikel saknas helt:**
1. Markera raden
2. Klicka **"Rapportera brist"**
3. Ange vad som saknas
4. Fortsätt med nästa artikel
5. Ordern markeras som "ofullständig"

**Om fel antal i lager:**
1. Plocka vad som finns
2. Ange faktiskt plockad kvantitet
3. Lägg till kommentar
4. Systemet justerar lagersaldo

**Slutför plockning:**
12. När alla rader är plockade
13. Granska sammanfattning
14. Klicka **"Slutför plockning"**

**Systemet utför:**
- Uppdaterar lagersaldo för alla artiklar
- Skapar lagerrörelser (outbound) för varje artikel
- Ändrar orderstatus till "Picked"
- Notifierar ansvarig

**Efter plockning:**
15. Ladda ner följesedel (PDF)
16. Skriv ut
17. Lägg i paketet
18. Markera order som "Levererad" när den skickats

### 4.4 Partiell plockning

**Om du inte kan plocka allt nu:**

**Steg:**
1. Plocka det som finns tillgängligt
2. Ange faktiskt plockad kvantitet per rad
3. Klicka **"Spara framsteg"**
4. Ordern får status "Plockas" (pågående)
5. Du kan fortsätta senare

**Återuppta:**
6. Öppna samma order
7. Klicka **"Fortsätt plocka"**
8. Redan plockade rader är markerade
9. Fortsätt med resterande

**Systemet:**
- Håller reda på vad som är plocket
- Visar restkvantitet
- Kan ha flera personer som plockar samtidigt

### 4.5 Fakturera order

**När ordern är plockad och levererad:**

**Steg:**
1. Öppna ordern
2. Klicka **"Fakturera"**
3. En dialog öppnas
4. Ange:
   - **Fakturanummer från Fortnox**: Obligatoriskt
   - **Faktureringsdatum**: Automatiskt till idag
   - **Anteckningar**: Extra info om behövs
5. Klicka **"Spara fakturering"**

**Systemet:**
- Markerar ordern som fakturerad
- Sparar fakturanummer
- Loggar datum och vem som fakturerade
- Visar detta i orderhistoriken

**Statistik:**
- Fakturerade ordrar syns i rapporter
- Kan filtreras på fakturerad/ej fakturerad

### 4.6 Länka internt uttag till order

**Om någon plockade artiklar innan ordern skapades:**

**Scenario:**
- Tekniker plockade ut komponenter för installation
- Registrerades som "Internt uttag"
- Nu vill du koppla det till en order

**Steg:**
1. Gå till ordern
2. Klicka **"Koppla uttag"**
3. Du ser lista på "pending" uttag
4. Markera de uttag som hör till ordern
5. Klicka **"Koppla till order"**

**Systemet:**
- Kopplar uttaget till ordern
- Ändrar uttags status till "linked"
- Visar kopplingen i orderhistorik

### 4.7 Exportera order

**Följesedel/Plocklista:**
1. Öppna order
2. Klicka **"Exportera PDF"**
3. PDF genereras
4. Innehåller:
   - Orderinformation
   - Alla artiklar med antal
   - Sorterade per hylla
   - Plockstatus
5. Ladda ner och skriv ut

**Flera ordrar samtidigt:**
1. På Ordrar-sidan
2. Markera flera ordrar (checkboxar)
3. Klicka **"Exportera valda"**
4. En stor PDF med alla ordrar skapas
5. Varje order på egen sida

### 4.8 Avbryta order

**Om order inte ska genomföras:**

**Steg:**
1. Öppna ordern
2. Klicka **"..."** (mer-meny)
3. Välj **"Avbryt order"**
4. Bekräfta
5. Ange anledning (frivilligt)

**Systemet:**
- Ändrar status till "Cancelled"
- Om delvis plockad → återför lagerrörelser
- Notifierar relevanta personer

**Notera:**
- Avbrutna ordrar syns fortfarande i historiken
- Kan inte återaktiveras (skapa ny order istället)

---

## Inköpsordrar

### 5.1 Skapa inköpsorder

**Steg:**
1. Gå till **"Inköp"**
2. Klicka **"+ Ny inköpsorder"**
3. Fyll i information:
   - **Leverantör**: Välj från listan eller skapa ny
   - **Fortnox Projektnummer**: Obligatoriskt
   - **Förväntat leveransdatum**: När ni förväntar er leverans
   - **Orderdatum**: Automatiskt till idag
   - **Anteckningar**: Extra info till leverantören

**Lägg till artiklar:**
4. Klicka **"Lägg till artikel"**
5. Sök och välj artikel
   - Om artikel inte finns → skapa ny först
6. Ange:
   - **Antal att beställa**
   - **Enhetspris**: Pris per styck
7. Artikeln läggs till
8. Upprepa för alla artiklar

**Beräkningar:**
- Totalkostnad beräknas automatiskt
- Syns längst ner

**Spara:**
9. Klicka **"Spara inköpsorder"**
10. Status: "Draft" (utkast)

### 5.2 Skicka inköpsorder till leverantör

**När inköpsordern är klar att skickas:**

**Steg:**
1. Öppna inköpsordern
2. Klicka **"Exportera PDF"**
3. PDF genereras med:
   - Er information
   - Leverantörsinformation
   - Alla artiklar med antal och priser
   - Totalsumma
   - Leveransadress
4. Ladda ner PDF

**Skicka via email:**
5. Öppna ert mail-program
6. Bifoga PDF:en
7. Skicka till leverantören

*Alternativt (om integrerat):*
5. Klicka **"Skicka via email"**
6. Bekräfta leverantörens email
7. PDF skickas automatiskt

**Uppdatera status:**
8. I appen, ändra status till **"Ordered"** (beställd)
9. Nu väntar ni på leverans

### 5.3 Ta emot inköpsorder

**När leverans kommer:**

**Steg:**
1. Gå till **"Inköp"**
2. Hitta inköpsordern (status: Ordered eller Prepaid)
3. Klicka på ordern
4. Klicka **"Ta emot"**

**Mottagningsvy öppnas:**
5. Du ser alla orderrader
6. För varje artikel:

**Mottagning per artikel:**
7. Kontrollera artikeln fysiskt
8. Ange **antal mottaget**
   - Om allt kom → ange beställd kvantitet
   - Om delvis → ange vad som faktiskt kom
9. Välj **hyllplats** där artikeln ska placeras
10. **Kvalitetskontroll** (optional):
    - Markera checkbox om kontroll gjord
    - Lägg till anteckningar om fel
11. **Avvikelser** (om något är fel):
    - Markera "Avvikelse"
    - Ange anledning (skada, fel antal, fel artikel)
12. **Foto** (rekommenderas):
    - Ta foto på följesedel
    - Ta foto på eventuella skador
13. Klicka **"Bekräfta mottagning"** för artikeln

**Upprepa för alla artiklar i leveransen**

**Slutför mottagning:**
14. När alla artiklar är mottagna
15. Granska sammanfattning
16. Klicka **"Slutför mottagning"**

**Systemet utför:**
- Uppdaterar lagersaldo för alla artiklar
- Skapar lagerrörelser (inbound)
- Uppdaterar inköpsorderstatus
  - Om allt mottaget → "Received"
  - Om delvis → "Partially Received"
- Skapar mottagningspost (ReceivingRecord)
- Notifierar inköpsansvarig

### 5.4 Delvis mottagning

**Om inte all beställd vara kommer:**

**Steg:**
1. Ta emot som vanligt (se ovan)
2. Ange faktiskt mottagen kvantitet per artikel
3. Artiklar som inte kom → lämna antal = 0
4. Slutför mottagning

**Resultat:**
- Inköpsorder får status "Partially Received"
- Restkvantitet visas tydligt
- När resten kommer:
  - Öppna samma inköpsorder
  - Klicka "Ta emot" igen
  - Fortsätt från där ni slutade

**Systemet:**
- Håller reda på vad som är mottaget
- Visar restkvantitet
- Kan ha flera mottagningar för samma order

### 5.5 Avvikelser och reklamationer

**Om något är fel med leveransen:**

**Under mottagning:**
1. Markera artikeln med avvikelse
2. Markera checkbox "Avvikelse"
3. Ange typ av avvikelse:
   - Fel antal
   - Skadad vara
   - Fel artikel
   - Kvalitetsbrist
4. Beskriv detaljerat
5. Ta foto på problemet
6. Slutför mottagning

**Efter mottagning:**
7. Gå till **"Inköp"** → Välj inköpsordern
8. Klicka **"Visa mottagningar"**
9. Du ser alla mottagningsposter
10. Klicka på den med avvikelse
11. Detaljer om avvikelsen visas
12. Använd detta som underlag för reklamation

**Statistik:**
- Avvikelser per leverantör sparas
- Kan användas för leverantörsutvärdering

### 5.6 Inköpsförslag (automatiskt)

**Systemet kan föreslå vad som behöver beställas:**

**Steg:**
1. Gå till **"Inköp"**
2. Klicka **"Generera förslag"**
3. Systemet analyserar:
   - Artiklar med lågt lager
   - Kommande ordrar
   - Historisk förbrukning
4. En lista med förslag visas
5. För varje artikel:
   - Visa nuvarande saldo
   - Visa min-nivå
   - Föreslaget antal att beställa
   - Leverantör

**Skapa inköpsorder från förslag:**
6. Markera de artiklar du vill beställa
7. Klicka **"Skapa inköpsorder"**
8. Systemet grupperar per leverantör
9. En inköpsorder skapas per leverantör
10. Granska och justera
11. Spara

**Tips:**
- Kör detta regelbundet (t.ex. varje måndag)
- Kontrollera leveranstider
- Beställ i god tid innan artikeln tar slut

---

## Reparationshantering

### 6.1 Skicka artikel på reparation

**När en artikel är trasig:**

**Steg:**
1. Hitta artikeln i **"Lager"**
2. Öppna artikelns detaljvy
3. Klicka **"Skicka på reparation"**
4. En dialog öppnas
5. Fyll i:
   - **Antal som ska repareras**: Från lagret
   - **Anledning**: Vad är fel? (t.ex. "LED-pixlar döda", "Strömförsörjning defekt")
   - **Reparationsdatum**: När skickas det? (automatiskt idag)
   - **Anteckningar**: Extra info
6. Klicka **"Skicka"**

**Systemet:**
- Minskar lagersaldo med angivet antal
- Ändrar artikel status till "on_repair"
- Skapar RepairLog med status "in_progress"
- Skapar lagerrörelse (outbound)
- Notifierar ansvarig

**Artikeln visas nu:**
- I **"Reparation"**-vyn
- Filtrerat på status "on_repair" i lager

### 6.2 Visa reparationer

**Översikt över alla reparationer:**

**Steg:**
1. Gå till **"Reparation"** i menyn
2. Du ser lista på alla reparationer
3. För varje reparation visas:
   - Artikel (namn, batch)
   - Antal på reparation
   - Status (Pågående, Slutförd, Kasserad)
   - Startdatum
   - Anledning
   - Vem som skickade

**Filtrera:**
- **Status**: Pågående, Slutförd, Kasserad
- **Datum**: Tidsperiod
- **Artikel**: Sök specifik artikel

**Statistik:**
- Totalt antal på reparation
- Äldsta reparation (varning om länge sedan)
- Per kategori

### 6.3 Återföra från reparation

**När reparation är klar:**

**Steg:**
1. I **"Reparation"**-vyn, hitta reparationen
2. Klicka på reparationen
3. Klicka **"Återför från reparation"**
4. En dialog öppnas
5. Fyll i:
   - **Returnerad kvantitet**: Hur många kom tillbaka och fungerar?
   - **Kasserad kvantitet**: Hur många gick inte att reparera?
   - **Total ska matcha antal på reparation**
   - **Anteckningar**: Vad gjordes? (t.ex. "Bytte LED-moduler", "Ej reparerbar")
   - **Slutdatum**: När kom det tillbaka? (automatiskt idag)
6. Klicka **"Återför"**

**Exempel:**
- Skickade 10 st på reparation
- 8 st reparerade och fungerar → Returnerad: 8
- 2 st gick inte att reparera → Kasserad: 2
- Total: 10 ✓

**Systemet:**
- Ökar lagersaldo med returnerad kvantitet
- Tar inte med kasserad i lager
- Uppdaterar RepairLog status till "completed"
- Ändrar artikel status tillbaka till "active" (om lagersaldo > 0)
- Skapar lagerrörelse (inbound för returnerad)
- Loggar kasserad kvantitet

### 6.4 Reparationshistorik

**Se alla reparationer för en artikel:**

**Steg:**
1. Öppna artikelns detaljvy
2. Klicka på fliken **"Reparation"**
3. Du ser alla reparationer för denna artikel
4. För varje reparation:
   - Start- och slutdatum
   - Antal skickade/returnerade/kasserade
   - Anledning
   - Vem som hanterade
   - Status

**Användning:**
- Identifiera problematiska artiklar (många reparationer)
- Beslut om att fasa ut artikel
- Statistik för leverantörsutvärdering

### 6.5 Exportera reparationsrapport

**För uppföljning eller ekonomi:**

**Steg:**
1. Gå till **"Reparation"**
2. Klicka **"Exportera rapport"**
3. Välj tidsperiod
4. Välj format: Excel eller PDF
5. PDF genereras
6. Innehåller:
   - Alla reparationer i perioden
   - Totala kostnader (om angett)
   - Kasserad kvantitet och värde
   - Statistik per kategori/leverantör

**Användning:**
- Månadsrapporter
- Kostnadsuppföljning
- Beslutsunderlag för inköp

---

## Rapporter och export

### 7.1 Lagersaldorapport

**Aktuell översikt av allt i lager:**

**Steg:**
1. Gå till **"Rapporter"**
2. Välj **"Lagersaldo"**
3. Välj filter:
   - Lagerställe
   - Kategori
   - Status
4. Klicka **"Generera rapport"**

**Rapporten visar:**
- Alla artiklar med nuvarande saldo
- Värde per artikel (antal × enhetspris)
- Totalt lagervärde
- Grupperat per kategori/lager

**Export:**
5. Klicka **"Exportera Excel"** eller **"Exportera PDF"**
6. Använd för:
   - Bokföring
   - Inventering
   - Försäkring

### 7.2 Lagerrörelse-rapport

**Se alla in- och utflöden:**

**Steg:**
1. **"Rapporter"** → **"Lagerrörelser"**
2. Välj period (t.ex. senaste månaden)
3. Välj artikel (eller alla)
4. Generera

**Rapporten visar:**
- Alla transaktioner (inbound, outbound, adjustment)
- Datum och tid
- Kvantitet
- Anledning/referens
- Vem som gjorde det
- Tidigare och nytt saldo

**Användning:**
- Spåra vart artiklar tagit vägen
- Upptäcka fel
- Revision

### 7.3 Lågt lager-rapport

**Artiklar som behöver beställas:**

**Steg:**
1. **"Rapporter"** → **"Lågt lager"**
2. Rapporten genereras automatiskt
3. Visar artiklar där:
   - Lagersaldo ≤ minsta lagernivå
   - Status = "low_stock"

**För varje artikel:**
- Nuvarande saldo
- Min-nivå
- Föreslaget att beställa
- Leverantör
- Leveranstid

**Åtgärd:**
4. Exportera listan
5. Använd för inköpsförslag
6. Eller skapa inköpsorder direkt

### 7.4 Order-rapport

**Analys av ordrar:**

**Steg:**
1. **"Rapporter"** → **"Ordrar"**
2. Välj period
3. Välj kund (eller alla)
4. Generera

**Rapporten visar:**
- Antal ordrar per kund
- Total omsättning per kund
- Mest sålda artiklar
- Genomsnittlig orderstorlek
- Ledtid (från order till leverans)

**Användning:**
- Försäljningsanalys
- Identifiera nyckelkunder
- Lagerplanering (vad säljer vi mest?)

### 7.5 Inköpsrapport

**Analys av inköp:**

**Steg:**
1. **"Rapporter"** → **"Inköp"**
2. Välj period
3. Välj leverantör (eller alla)

**Rapporten visar:**
- Total inköpskostnad per leverantör
- Antal inköpsordrar
- Genomsnittlig leveranstid
- Avvikelser och problem
- Mest köpta artiklar

**Användning:**
- Leverantörsutvärdering
- Kostnadsuppföljning
- Förhandlingsunderlag

### 7.6 Lagervärde över tid

**Se hur lagervärdet utvecklas:**

**Steg:**
1. **"Rapporter"** → **"Lagervärde"**
2. Välj tidsperiod (t.ex. senaste året)
3. Graf visas

**Grafen visar:**
- Lagervärde per månad
- Trend (ökar/minskar)
- Uppdelat per kategori eller lagerställe

**Användning:**
- Ekonomisk uppföljning
- Identifiera kapitalbindning
- Budgetplanering

### 7.7 Schemalagda rapporter

**Automatiska rapporter via email:**

**Steg:**
1. **"Admin"** → **"Rapportscheman"**
2. Klicka **"Nytt schema"**
3. Välj:
   - Rapporttyp (lagersaldo, lågt lager, etc.)
   - Frekvens (daglig, veckovis, månadsvis)
   - Mottagare (email-adresser)
   - Filter (om några)
4. Spara

**Systemet:**
- Genererar rapport automatiskt vid vald tid
- Skickar via email till alla mottagare
- Excel-fil bifogad

**Användningsfall:**
- Måndagsrapport om lågt lager → till inköpsansvarig
- Månadsrapport lagervärde → till ekonomi
- Veckorapport ordrar → till VD

---

## Administration

### 8.1 Användarhantering

**Bjuda in ny användare:**

**Steg:**
1. Gå till **"Admin"** → **"Användare"**
2. Klicka **"Bjud in användare"**
3. Ange:
   - Email-adress
   - Roll: Admin eller User
4. Klicka **"Skicka inbjudan"**

**Användaren:**
5. Får ett email med inbjudan
6. Klickar på länk
7. Skapar lösenord
8. Kan logga in

**Roller:**
- **Admin**: Full åtkomst, kan ändra inställningar, bjuda in användare
- **User**: Normal åtkomst, kan hantera lager och ordrar

**Ta bort användare:**
1. I användarlistan
2. Klicka på användare
3. **"Inaktivera"** eller **"Ta bort"**
4. Användaren kan inte längre logga in

### 8.2 Leverantörshantering

**Lägg till leverantör:**

**Steg:**
1. **"Admin"** → **"Leverantörer"**
2. Klicka **"Ny leverantör"**
3. Fyll i:
   - Namn
   - Kontaktperson
   - Email
   - Telefon
   - Adress
   - Webbsida
   - Standard leveranstid (i dagar)
   - Anteckningar
4. Spara

**Redigera leverantör:**
1. Klicka på leverantör i listan
2. Ändra uppgifter
3. Spara

**Inaktivera leverantör:**
1. Öppna leverantör
2. Markera "Inaktiv"
3. Leverantören visas inte längre i dropdowns
4. Historik bevaras

### 8.3 Lagerställen och hyllor

**Skapa lagerställe:**

**Steg:**
1. Gå till **"Lagerställen"**
2. Klicka **"Nytt lagerställe"**
3. Fyll i:
   - Namn (t.ex. "Huvudlager", "Lager A")
   - Kort kod (t.ex. "HL", "LA")
   - Adress
   - Kontaktperson
   - Anteckningar
4. Spara

**Skapa hyllor:**

**Manuellt, en och en:**
1. Öppna lagerställe
2. Klicka **"Ny hylla"**
3. Fyll i:
   - Hyllkod (t.ex. "A1-B2", "G-04-03")
   - Gång (A, B, C)
   - Ställning (1, 2, 3)
   - Nivå (1, 2, 3)
   - Mått (bredd, höjd, djup i cm)
4. Spara

**Bulk-skapa hyllor:**
1. Öppna lagerställe
2. Klicka **"Skapa flera hyllor"**
3. Ange mönster:
   - Gångar: A-F
   - Ställningar: 1-10
   - Nivåer: 1-4
   - Format: "Gång-Ställning-Nivå" (t.ex. A-1-1, A-1-2, ...)
4. Förhandsgranska
5. Klicka **"Skapa"**
6. Alla hyllor skapas automatiskt

**Layout-vy:**
1. Öppna lagerställe
2. Klicka **"Visa layout"**
3. Visuell representation av alla hyllor
4. Färgkodning:
   - Grön = mycket plats
   - Gul = halvfull
   - Röd = full

### 8.4 Notifieringsinställningar

**Personliga inställningar:**

**Steg:**
1. Klicka på din profil (uppe till höger)
2. **"Inställningar"** → **"Notifieringar"**
3. Aktivera/inaktivera:
   - In-app notifieringar (i systemet)
   - Email-notifieringar
   - Orderstatus-ändringar
   - Lågt lager-varningar
   - Inköpsorder-uppdateringar
   - Reparations-uppdateringar
   - Endast kritiska (prioritet: hög/kritisk)
4. Spara

**Push-notifieringar (mobil):**
5. I samma vy, klicka **"Aktivera push"**
6. Tillåt i webbläsaren
7. Du får nu notifieringar även när appen är stängd

### 8.5 Systeminställningar

**Endast för admins:**

**Steg:**
1. **"Admin"** → **"Inställningar"**
2. Konfigurera:

**Lager:**
- Standard minsta lagernivå (varning när under)
- Automatiska statusändringar (lågt lager, slut i lager)

**Ordrar:**
- Standard prioritet för nya ordrar
- Automatisk reservering av lager vid order

**Notifieringar:**
- Vem ska få varningar om lågt lager?
- Notifiera vid nya okända leveranser

**Export:**
- Standard export-format (Excel/CSV)
- Vilka kolumner ska inkluderas

3. Spara ändringar

### 8.6 Backup och historik

**Backup:**
- Systemet tar automatisk backup varje natt
- All data sparas i 30 dagar
- Vid problem, kontakta support för återställning

**Historik och audit log:**
1. **"Admin"** → **"Systemlogg"**
2. Visa alla händelser:
   - Vem gjorde vad
   - När
   - På vilken artikel/order/etc.
3. Filtrera på:
   - Användare
   - Datum
   - Åtgärd (skapa, redigera, ta bort)

**Användning:**
- Revision
- Spåra fel
- Säkerhetsövervakning

---

## Mobil användning

### 9.1 Installera som app (PWA)

**iOS (iPhone/iPad):**
1. Öppna systemet i Safari
2. Klicka på delnings-knappen (fyrkant med pil upp)
3. Scrolla ner, välj **"Lägg till på hemskärmen"**
4. Namnge (t.ex. "IMvision")
5. Klicka **"Lägg till"**
6. Nu finns appen på hemskärmen
7. Öppna härifrån → fullskärmsläge utan Safari-gränssnitt

**Android:**
1. Öppna systemet i Chrome
2. En banner visas längst ner: **"Installera app"**
3. Klicka **"Installera"**
4. Appen läggs till på hemskärmen
5. Öppna härifrån

**Fördelar:**
- Snabbare
- Fungerar offline
- Push-notifieringar
- App-känsla (ingen webbläsar-UI)

### 9.2 Offline-funktionalitet

**Vad fungerar offline:**
- Visa lager (cached data)
- Söka och filtrera (i cached data)
- Skapa/redigera artiklar (sparas när online igen)
- Justera lager
- Registrera ordrar

**Vad INTE fungerar offline:**
- Export (kräver server)
- AI-skanning (kräver internet)
- Synkronisering med Fortnox

**Hur det fungerar:**
1. När du är online, cachar systemet data
2. När du går offline:
   - Gul banner visas: "Offline-läge"
   - Du kan fortsätta arbeta
   - Ändringar sparas lokalt
3. När du kommer online igen:
   - Grön banner: "Online igen"
   - Alla ändringar synkas automatiskt
   - Du får bekräftelse

**Tips för fältarbete:**
- Öppna lager-sidan innan du går ut (cachar data)
- Gör alla skanningar/registreringar
- Synkar när du kommer tillbaka till WiFi

### 9.3 Mobiloptimerad UX

**Navigation:**
- Hamburger-meny (tre streck) uppe till höger
- Snabbnavigering längst ner
- Stor, klickbar knappar

**Skanning:**
- Stor kamera-knapp
- Optimerad för att hålla telefonen med en hand
- Auto-fokus och exponering

**Listor:**
- Scroll-vänliga
- Stora touch-ytor
- Swipe-gester (kommande)

**Formulär:**
- Anpassade keyboard för olika fält
  - Nummer → numeriskt keyboard
  - Email → email-keyboard
- Auto-zoom på input (iOS)

---

## Felsökning

### 10.1 Vanliga problem och lösningar

#### Problem: "Artikeln finns inte i lager trots att den borde"

**Möjliga orsaker:**
1. Fel lagerställe valt i filter
2. Artikel har status "on_repair" eller "discontinued"
3. Fel batch-nummer

**Lösning:**
1. Ta bort alla filter
2. Sök på namn istället för batch
3. Kontrollera status-filter
4. Sök i "Reparation"-vyn om på reparation

#### Problem: "Kan inte plocka order - säger att artikel saknas"

**Möjliga orsaker:**
1. Artikeln är reserverad för annan order
2. Lagersaldo stämmer inte (räknefel)
3. Fel batch vald

**Lösning:**
1. Kontrollera artikelns detaljvy → se reserverat antal
2. Gör en inventering (räkna fysiskt)
3. Justera lagersaldo om fel
4. Om artikel verkligen saknas:
   - Markera som "brist" i plockningen
   - Skapa inköpsorder för att beställa mer

#### Problem: "AI-skanningen extraherar fel data"

**Möjliga orsaker:**
1. Suddig bild
2. Dålig belysning
3. Text delvis skymd

**Lösning:**
1. Ta om bilden:
   - Bra ljus
   - Håll telefonen stilla
   - Se till att all text syns
2. Granska alltid AI-data
3. Korrigera manuellt
4. Systemet lär sig över tid

#### Problem: "Inköpsorder visar fel status"

**Vanligt scenario:**
- Mottagning delvis genomförd
- Status visar fortfarande "Ordered"

**Lösning:**
1. Kontrollera att mottagning slutfördes
2. Kolla "Visa mottagningar" på ordern
3. Om inte slutförd → fortsätt mottagning
4. Om systemfel → kontakta support

#### Problem: "Kan inte logga in"

**Lösning:**
1. Kontrollera stavning av email
2. Glömt lösenord → klicka "Glömt lösenord"
3. Kolla om användare är inaktiverad → kontakta admin
4. Rensa cache i webbläsare

#### Problem: "Export fungerar inte"

**Möjliga orsaker:**
1. Popup-blockering i webbläsaren
2. Ingen data att exportera (fel filter)
3. Nätverksproblem

**Lösning:**
1. Tillåt popups från sidan
2. Ta bort filter, försök igen
3. Kontrollera internetanslutning
4. Testa i annan webbläsare

### 10.2 Kontakta support

**När ska du kontakta support:**
- Systemfel/buggar
- Data som försvunnit
- Behöver återställa från backup
- Användare som inte kan logga in
- Tekniska frågor om integrationer

**Kontaktinfo:**
- Email: support@imvision.se
- Telefon: [nummer]
- Öppettider: Mån-Fre 08:00-17:00

**Inkludera alltid:**
- Vad du försökte göra
- Vad som hände
- Felmeddelande (om något)
- Skärmdump
- Vilken enhet/webbläsare

### 10.3 FAQ

**Q: Kan jag använda systemet på flera enheter samtidigt?**
A: Ja! Logga in på mobil, surfplatta och dator samtidigt. Data synkas realtid.

**Q: Vad händer om jag raderar en artikel av misstag?**
A: Kontakta support direkt. Vi kan återställa från backup inom 30 dagar.

**Q: Kan flera personer plocka samma order?**
A: Ja, systemet hanterar det. Varje person ser vad som redan plockats.

**Q: Hur lång tid sparas historik?**
A: All historik (lagerrörelser, ordrar, etc.) sparas för alltid.

**Q: Kan jag importera data från mitt gamla system?**
A: Ja! Exportera till Excel från gamla systemet, importera här. Kontakta oss för hjälp.

**Q: Vad kostar extra lagringsutrymme för bilder?**
A: [Priser enligt er plan]. Vanligtvis räcker standard.

**Q: Kan systemet integreras med vår webshop?**
A: Ja, via API. Kontakta oss för mer info.

**Q: Fungerar streckkodsskanning?**
A: Ja, för 1D och 2D streckkoder. Även QR-koder.

**Q: Kan jag ångra en lagerjustering?**
A: Delvis - du ser vad som gjordes i historiken och kan justera tillbaka manuellt. Ingen auto-undo funktion.

**Q: Vad händer vid strömavbrott/nätverksbortfall?**
A: Systemet arbetar offline, synkar när online igen. Ingen data förloras.

---

## Bästa Praxis

### Dagliga rutiner
**Morgon:**
1. Kolla notifieringar
2. Titta på "Lågt lager"-varningar
3. Prioritera dagens ordrar

**Under dagen:**
4. Registrera inkommande leveranser direkt
5. Plocka ordrar löpande
6. Justera lager vid avvikelser

**Kväll:**
7. Slutför dagens plockning
8. Uppdatera orderstatus
9. Snabb översikt av morgondagens ordrar

### Veckovisa rutiner
**Måndag:**
- Generera inköpsförslag
- Skapa inköpsordrar för veckan

**Fredag:**
- Inventering av högfrekventa artiklar
- Veckorapport till ansvarig

### Månadsvisa rutiner
- Full inventering av lager
- Rensa gamla/utgångna artiklar
- Genomgång av reparationer (följa upp långdragna)
- Leverantörsutvärdering
- Lagervärde-rapport till ekonomi

### Tips för effektiv användning
1. **Skanna allt**: Använd AI-skanning istället för manuell input
2. **Håll hyllplatser uppdaterade**: Gör det lätt att hitta
3. **Dokumentera med bilder**: Ta foto på allt (följesedlar, skador)
4. **Följ status-flöden**: Uppdatera status löpande
5. **Utnyttja notifieringar**: Reagera snabbt på lågt lager
6. **Exportera regelbundet**: Ha backup av data
7. **Håll rent**: Ta bort utgångna/duplicerade artiklar
8. **Använd batch-nummer**: Underlättar spårning
9. **Kommentera**: Lägg till anteckningar vid avvikelser
10. **Mobil först**: Använd appen i lagret, inte desktop

---

## Snabbreferens

### Tangentbordsgenvägar (Desktop)
- `Ctrl + K` - Öppna snabbsök
- `Ctrl + N` - Ny artikel/order (beroende på sida)
- `Ctrl + S` - Spara formulär
- `Esc` - Stäng dialog/modal
- `Ctrl + P` - Skriv ut (på order/artikel)

### Statuskoder
**Artiklar:**
- 🟢 Active - I lager och tillgänglig
- 🟡 Low Stock - Under minsta lagernivå
- 🔴 Out of Stock - Slut i lager
- 🟠 On Repair - På reparation
- ⚪ Discontinued - Utgången produkt
- 🔵 Unknown Delivery - Okänd ursprung

**Ordrar:**
- 📝 Draft - Utkast
- ✅ Ready to Pick - Redo att plocka
- 🔄 Picking - Plockas just nu
- 📦 Picked - Plockad, redo att skickas
- 🚚 Delivered - Levererad
- ❌ Cancelled - Avbruten

**Inköpsordrar:**
- 📝 Draft - Utkast
- 📤 Ordered - Beställd hos leverantör
- 💰 Prepaid - Förbetalad
- 📥 Received - Mottagen
- ❌ Cancelled - Avbruten

### Ikoner i systemet
- 📷 Kamera - Skanning
- 📊 Graf - Statistik
- ⚙️ Kugghjul - Inställningar
- 🔔 Klocka - Notifieringar
- ⚡ Blixt - Snabbåtgärd
- 📋 Clipboard - Plocklista
- 🏷️ Etikett - Ladda ner label
- 🔍 Förstoringsglas - Sök
- ✏️ Penna - Redigera
- 🗑️ Papperskorg - Ta bort

---

## Appendix

### Ordlista
- **Batch**: Parti-/satsnummer från tillverkare
- **SKU**: Stock Keeping Unit, unikt artikelnummer
- **Inbound**: Inkommande lagertransaktion
- **Outbound**: Utgående lagertransaktion
- **Plockning**: Att hämta artiklar för en order
- **Lagerrörelse**: All förändring av lagersaldo
- **RepairLog**: Post om artikel på reparation
- **PWA**: Progressive Web App, fungerar som native app
- **QR-kod**: 2D streckkod för snabb skanning

### Kontaktinformation
**IMvision AB**
Adress: [Adress]
Email: info@imvision.se
Telefon: [Telefonnummer]
Webb: www.imvision.se

**Support:**
Email: support@imvision.se
Telefon: [Supportnummer]
Öppettider: Mån-Fre 08:00-17:00

---

*Senast uppdaterad: 2026-02-13*
*Version: 2.0*
*© 2026 IMvision AB*