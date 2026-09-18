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
| MONGODB_URI | Anslutningssträng till MongoDB |
| DB_NAME | Namn på MongoDB-databasen |
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

- Backend: https://grupp5.jsramverk.se
- Frontend: https://grupp5.github.io/dv1677-ht26-grupp5-frontend

## Tillvägagångssätt

Dokumentera löpande vad ni gjort och hur ni löst problem.

- Vecka 1: Vi valde projektet bokningssytem då vi helt enkelt kände att det var roligare och passade oss bättre. Vi skapade ett backend repo och överförde grundkoden från kursen. Vi valde React som ramverk då vi använt det tidigare. 
- Vecka 2: Vi skapade PUT routes för resources samt booking som uppdaterar informationen. Först var vi lite förvirrade hur vi ksulle testa uppdateringen men insåg sen att postman existerar vilket gjorde det mycket enklare att säkerställa att routen uppdaterade istället för att skapa ny.
Vi gjorde även valet att byta ramverk till Vue istället för react då vi vill utvidga våra kunskaper och ser detta som en bra möjlighet attt göra det.
- Vecka 3: ...