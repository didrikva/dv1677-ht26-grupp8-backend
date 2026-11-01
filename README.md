# dv1677-ht26-grupp5-backend

## Gruppmedlemmar

| Namn | GitHub |
|------|--------|
| Didrik Varma | @didrikva |
| Zoe Waters | @zoebalowi |

## Projektval

Vi har valt **bokningssystem**.

Motivering: Vi valde bokningssystemet så vi ansåg att det verkade roligare. Bokningssytem är något vi ändå använder ofta och det känns roligare än en texteditor. Under första föreläsningens gång kände vi båda att bokningssytemet var mer lockande för oss båda.

## Teknikval

**Frontend-ramverk:** Vue

Motivering: Först tänkte vi utveckla Frontend i React då vi båda använt det tidigare. Efter en liten kommentar av Mattias att vi borde ta chansen att testa något nytt gick vi helt in på den banan för att vidga vår kunskap. Därför har vi nu valt att använda ramverket Vue istället. Vi tittade upp lite snabbt hur det såg ut och skiljer sig inte allt för mycket från React samt att det verkar ganska lättlärt då vi båda använt HTML, css och javascript tiidgare.

## Kör lokalt

git clone <repo-url>
cd dv1677-ht26-grupp5-backend
cp .env.example .env
npm install
npm start

**Miljövariabler** (se .env.example):

| Variabel | Beskrivning |
|----------|-------------|
| MONGODB_URI | mongodb://root:secret@localhost:27017/ |
| DB_NAME | jsramverk |
| PORT | Port 3000 |

## Databas

Vi använder **MongoDB**, körd som en Docker-container (`docker-compose.yml`).

Starta backend + MongoDB lokalt:

```
docker compose up -d
```

Detta startar en `mongodb`-container samt bygger och startar backend-appen (`app`-servicen), som ansluter till `mongodb://mongodb:27017` via `MONGODB_URI`.

Om ni istället kör backend direkt med `npm start` (utan docker-compose), starta bara MongoDB-containern separat:

```
docker run -d --name mongo -p 27017:27017 mongo:latest
```

och se till att `.env` innehåller:

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=jsramverk
```

## Tester

npm test

## Driftsatt

- Backend: https://dv1677-laforge.nplab.bth.se
- Frontend: https://didrikva.github.io/dv1677-ht26-grupp8-frontend/

## Tillvägagångssätt

Dokumentera löpande vad ni gjort och hur ni löst problem.

- Vecka 1: Vi valde projektet bokningssytem då vi helt enkelt kände att det var roligare och passade oss bättre. Vi skapade ett backend repo och överförde grundkoden från kursen. Vi valde React som ramverk då vi använt det tidigare. 
- Vecka 2: Vi skapade PUT routes för resources samt booking som uppdaterar informationen. Först var vi lite förvirrade hur vi ksulle testa uppdateringen men insåg sen att postman existerar vilket gjorde det mycket enklare att säkerställa att routen uppdaterade istället för att skapa ny.
Vi gjorde även valet att byta ramverk till Vue istället för react då vi vill utvidga våra kunskaper och ser detta som en bra möjlighet attt göra det.
- Vecka 3: Vi har migrerat databasen från SQLite till MongoDB och är nästan helt klara med vår Docker-uppsättning. Vi inväntar dock fortfarande vår VPS, eftersom vi fixade SSH-nycklarna lite sent. Vi börja ändra mjs filer till js filer samt en mindre grund till api i backend. 
- Vecka 4: Vi har kopierat testfiler från exempelrepot och anpassat lite, det kommer inte fungera ännu men grunden är på plats och nästa veckas arbete kommer nog det mesta vara fixat.
- Vecka 5: Vi gjorde klart backend deployment samt gjorde klart testerna för api-routes. 
Vi började på frontend deployment och det gick ganska snabbt och enkelt eftersom vi utgick ifrån filerna i kursrepot. Problemet vi fick denna veckan var api. Efter allt var kopplat mellan backend och frontend fungerade allt lokalt. När vi sedan pushat allt och testade på github pages hittade inte frontend några resurser. Problemet? Jo databasen var inte fyllt innuti vpsen vilket ledde till en tom lista som resultat.

# Redovisning projekt

## Brokern
Var: Integrationen finns i domain/ och hanteras framför allt genom syncResources.js samt bokningslogiken i controllers/bookings.js. Konfigurationen för brokern hanteras via miljövariabler.

Hur: Vi använder brokern för att hämta information om tillgängliga resurser och genomföra bokningar hos de externa leverantörerna Proxmox, MAAS och OpenStack. Vid synkronisering hämtas resursernas information genom inventory. När en användare bokar en resurs skickas en förfrågan till brokern med allocate, och vid avbokning används withdraw. På så sätt hanteras själva tilldelningen av resurser av brokern i stället för direkt mot respektive leverantör.

Valde bort: Att kommunicera direkt med varje resurs API. Genom att använda brokern får vi ett gemensamt gränssnitt för flera olika resurser och slipper implementera separat logik för varje tjänst.

## Krav 1 – JWT-autentisering

- var: Implementerat i `controllers/authController.js` (registrering och inloggning), `middleware/auth.js` (`requireAuth`) och `routes/auth.js`. Bokningsroutes i `routes/bookings.js` skyddas med `requireAuth`.

- Hur: Lösenord hashas med bcrypt. Vid inloggning signeras en JWT (2 h, `JWT_SECRET` från miljövariabel). Middleware verifierar token före varje skyddad route och lägger användaren i `req.user`. Bokningar sparas med `bookedBy` från token, och läs, ändra och avboka söker bara bland användarens egna, så man bara når sitt eget innehåll.

- Valde bort: Refresh-tokens. Token gäller i 2 timmar och när den gått ut loggar användaren in igen. Det var enklare och räckte för projektet.


## Krav 2 — websocket och realtid

Var: WebSocket-funktionaliteten implementeras i server.js med Socket.IO. Händelser för kommentarer hanteras i `controllers/comments.js` samt `controller/bookings`, där uppdateringar skickas till anslutna klienter. Tester i `tests/socket.test.js`

Hur: Vi använder Socket.IO för att skicka uppdateringar i realtid när kommentarer skapas eller tas bort. Klienter ansluter till servern och kan gå med i ett rum kopplat till en specifik bokning. När en kommentar skapas skickas händelsen comment:created till klienterna i rummet. När en kommentar tas bort skickas comment:deleted. På så sätt behöver användaren inte ladda om sidan för att se att kommentarerna har uppdaterats. När en bokning sker skickas booking:created för att uppdatera andra anslutna i rummet om att resurserna är upptagna. Anslutningen till ett bokningsrum kontrolleras med JWT och användarens ägarskap av bokningen.

Valde bort: Att uppdatera kommentarerna genom att regelbundet hämta dem från API. WebSocket ger i stället möjlighet att skicka uppdateringar direkt när något händer och minskar behovet av upprepade API-anrop. 

## Krav 3 — kommentarer

Var: Implementeringen finns i `controllers/comments.js` och `routes/comments.js`, där API-anropen för att skapa, hämta och ta bort kommentarer hanteras. Kommentarerna sparas i en egen tabell i MongoDB. Tester i `tests/comments.test.js`

Hur: Användare kan skapa och läsa kommentarer på sina egna bokningar samt ta bort sina egna kommentarer. Varje kommentar kopplas till en bokning genom bookingId och till användaren som skrev den genom author. Backend kontrollerar att användaren äger bokningen innan kommentarer hämtas eller skapas. Vid borttagning kontrolleras även att användaren är den som skrivit kommentaren. Om en bokning avbokas tas dess kommentarer också bort. Tillsammans med WebSocket-funktionaliteten uppdateras kommentarerna direkt hos andra användare som tittar på samma bokning.

Valde bort: Att tillåta kommentarer på resurser i allmänhet i stället för på specifika bokningar. Genom att koppla kommentarerna till bokningar kan vi begränsa åtkomsten till berörda användare och hålla diskussionen kopplad till rätt bokning. Detta skulle också göra bokningar publika för att andra ska kunna kommentera bokningar, men vi kom fram till att det finns ingen anlending för andra tat kunna kommentera din bokning.

## Krav 4 — Projektspecifikt
- var: Logiken ligger i egna moduler i `domain/`: `overlap.js` (krockar), `availability.js` (lediga tider) och `policy.js` (regler). `controllers/bookings.js` limmar ihop allt med databasen och brokern. Tester finns i `tests/domain.test.js` och `tests/overlap-api.test.js`.

- hur: Två bokningar krockar om `start_a < slut_b && start_b < slut_a`. Vi kör strikt `<`, så kant i kant är lugnt (slutar 10:00 och börjar 10:00 krockar inte). Samma villkor finns som Mongo-fråga i `findConflict`, och avbokade räknas inte. Statuskoder: **201** när en bokning skapas, **200** för lyckad läsning, ändring och avbokning. **400** när förfrågan är trasig (t.ex. start efter slut eller datum som inte är `YYYY-MM-DD`). **401** utan giltig token. **404** när bokningen eller resursen inte finns, och även för andras bokningar så vi inte avslöjar att de finns (därför inte 403). **409** vid krock eller när brokern nekar, eftersom förfrågan är ok men läget tillåter den inte (därför inte 400). **422** när en regel bryts, så frontend kan visa regeltexten. **503** när brokern är nere. `ledigaTider` sorterar bokningarna och plockar ut luckorna under dygnet (UTC) via `GET /api/resources/:id/availability`. Reglerna är rena funktioner utan databasanrop: max 4 timmar per bokning, inte bakåt i tiden och max 3 aktiva bokningar per användare (så ingen tar över alla resurser). Bokningar görs mot brokern (`allocate` och `withdraw`). Tider sparas i UTC och visas lokalt i frontend. Man kan bara ändra eller avboka sina egna bokningar.

- Valde bort: Atomär krockkoll och insättning, så två som bokar exakt samtidigt kan båda slinka igenom. Fixen vore ett unikt index eller en transaktion, men vi nämner det bara. Krockkollen körs bara på odelbara resurser (MAAS), för på Proxmox och OpenStack avgör brokern.

## Krav 5 — notifikationer av extern tjänst

- var: `services/notify.js` (funktionen `notifiera`) och `controllers/bookings.js` (`createBooking` och `cancelBooking`). Test i `tests/notify.test.js`.

- hur: Vi skickar en notis till en Discord-webhook när en bokning skapas (grön) och när den avbokas (röd). Notisen innehåller resursnamn och start- och sluttid i UTC. Webhook-URL:en ligger i miljövariabeln `DISCORD_WEBHOOK_URL`, inte i koden. Anropet görs utan `await`, så användaren inte behöver vänta på Discord. Alla fel fångas och loggas, och anropet har 5 sekunders timeout, så en trasig notis aldrig sabbar en bokning. Saknas URL:en hoppas notisen bara över, så appen funkar lokalt utan webhook.

- Valde bort: E-post (Mailgun/Sendgrid), eftersom en webhook via discord är något vi gjort innan i andra kurser och kändes som det snabbare och lättare beslutet.

## Krav 6 — fördjupad testing

Var: Testerna finns i `tests/` och använder Vitest. Vi har bland annat tester för autentisering, bokningar, domänlogik, notifikationer, integration och WebSocket-funktionalitet.

Hur: Vi har delat upp testerna för att kontrollera olika delar av applikationen. En del tester kontrollerar enskilda funktioner och regler, exempelvis krockhantering och tillgänglighet. Andra testar API beteende genom att skicka HTTP-förfrågningar och kontrollera svar, statuskoder och data. Vi har även tester för autentisering och notifikationer. För WebSocket har vi ett test där två klienter ansluter till samma bokningsrum och kontrollerar att händelser om skapade och borttagna kommentarer skickas vidare till den andra klienten. Vi försökte uppnå hög testprocent på de flesta dlearna och vi tycker att vi lyckades bra. Några filer har 100% medans andra ligger runt 80-90%. Vi gjorde många olika tester för att testa de flesta möjliga utfallen.

Valde bort: Att enbart förlita oss på manuella tester. Automatiserade tester gör det möjligt att kontrollera att funktionaliteten fortsätter fungera när koden ändras och gör det enklare att upptäcka fel tidigt, framförallt kan detta leda till problem i frontend testerna.